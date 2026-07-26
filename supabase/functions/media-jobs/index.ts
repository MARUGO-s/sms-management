import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type DispatchPayload = {
  action?: "dispatch";
  jobId?: string;
};

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function response(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function encodeBase64Url(value: Uint8Array | string) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function privateKeyBytes(pem: string) {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replaceAll(/\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    encodeBase64Url(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join(".");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${encodeBase64Url(new Uint8Array(signature))}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Google authentication failed (${tokenResponse.status})`);
  }
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error("Google access token is missing");
  return tokenData.access_token;
}

const mediaJobsFunction = {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return response({ error: "Method not allowed" }, 405);
    }

    const payload = await req.json().catch(() => null) as DispatchPayload | null;
    if (payload?.action !== "dispatch" || !payload.jobId) {
      return response({ error: "action and jobId are required" }, 400);
    }

    const { data: job, error: jobError } = await ctx.supabase
      .from("social_media_jobs")
      .select("id, workspace_id, status")
      .eq("id", payload.jobId)
      .maybeSingle();
    if (jobError) return response({ error: jobError.message }, 500);
    if (!job) return response({ error: "Media job not found" }, 404);
    if (job.status === "completed" || job.status === "cancelled") {
      return response({ ok: true, status: job.status });
    }
    if (job.status === "processing") {
      return response({ ok: true, status: "processing" }, 202);
    }

    const rawServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const projectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
    const region = Deno.env.get("GOOGLE_CLOUD_REGION");
    const cloudRunJob = Deno.env.get("GOOGLE_CLOUD_RUN_JOB_NAME");
    if (!rawServiceAccount || !projectId || !region || !cloudRunJob) {
      await ctx.supabaseAdmin
        .from("social_media_jobs")
        .update({
          status: "queued",
          error_code: "",
          error_message: "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return response(
        {
          ok: true,
          queued: true,
          configured: false,
          message: "Cloud Run is not connected yet",
        },
        202,
      );
    }

    try {
      const serviceAccount = JSON.parse(rawServiceAccount) as GoogleServiceAccount;
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error("Google service account is incomplete");
      }
      const accessToken = await getGoogleAccessToken(serviceAccount);
      const resource =
        `projects/${projectId}/locations/${region}/jobs/${cloudRunJob}`;
      const runResponse = await fetch(
        `https://run.googleapis.com/v2/${resource}:run`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            overrides: {
              containerOverrides: [
                {
                  env: [
                    { name: "MEDIA_JOB_ID", value: job.id },
                    { name: "MEDIA_BUCKET", value: "post-files" },
                  ],
                },
              ],
              taskCount: 1,
              timeout: "900s",
            },
          }),
        },
      );
      const runData = await runResponse.json().catch(() => ({})) as {
        name?: string;
        error?: { message?: string };
      };
      if (!runResponse.ok) {
        throw new Error(
          runData.error?.message ??
            `Cloud Run dispatch failed (${runResponse.status})`,
        );
      }

      const { error: updateError } = await ctx.supabaseAdmin
        .from("social_media_jobs")
        .update({
          status: "processing",
          provider_run_name: runData.name ?? "",
          error_code: "",
          error_message: "",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (updateError) throw updateError;

      return response({
        ok: true,
        configured: true,
        status: "processing",
      }, 202);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cloud Run dispatch failed";
      await ctx.supabaseAdmin
        .from("social_media_jobs")
        .update({
          status: "failed",
          error_code: "DISPATCH_FAILED",
          error_message: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return response({ error: message }, 502);
    }
  }),
};

export default mediaJobsFunction;
