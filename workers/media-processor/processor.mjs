import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCropPlan } from "./crop-plan.mjs";

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "MEDIA_JOB_ID"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY;
const jobId = process.env.MEDIA_JOB_ID;
const bucket = process.env.MEDIA_BUCKET || "post-files";
const workspaceDir = join("/tmp", `media-${jobId}`);

function apiHeaders(extra = {}) {
  return {
    apikey: secretKey,
    authorization: `Bearer ${secretKey}`,
    ...extra,
  };
}

function encodeObjectPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function rest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: apiHeaders({
      "content-type": "application/json",
      ...(options.headers || {}),
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${message.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function updateJob(values) {
  await rest(`social_media_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      ...values,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code}): ${stderr.slice(-1200)}`));
    });
  });
}

async function probeVideo(inputPath) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      inputPath,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`ffprobe failed (${code}): ${stderr.slice(-600)}`));
    });
  });
  const parsed = JSON.parse(output);
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error("Video dimensions could not be detected");
  }
  return { width: Number(stream.width), height: Number(stream.height) };
}

async function processJob() {
  const [job] = await rest(
    `social_media_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`,
  );
  if (!job) throw new Error("Media job not found");
  if (job.status === "completed" || job.status === "cancelled") return;

  const [source] = await rest(
    `social_post_files?id=eq.${encodeURIComponent(job.source_file_id)}&select=*`,
  );
  if (!source) throw new Error("Source file not found");
  if (!source.content_type.startsWith("video/")) {
    throw new Error("Only video inputs are supported");
  }

  await updateJob({
    status: "processing",
    error_code: "",
    error_message: "",
    started_at: new Date().toISOString(),
    attempts: Number(job.attempts || 0) + 1,
  });

  await mkdir(workspaceDir, { recursive: true });
  const inputPath = join(workspaceDir, "input-video");
  const outputPath = join(workspaceDir, "output.mp4");
  const sourceResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeObjectPath(source.storage_path)}`,
    { headers: apiHeaders() },
  );
  if (!sourceResponse.ok) {
    throw new Error(`Source download failed (${sourceResponse.status})`);
  }
  await writeFile(inputPath, Buffer.from(await sourceResponse.arrayBuffer()));

  const dimensions = await probeVideo(inputPath);
  const plan = createCropPlan(
    dimensions.width,
    dimensions.height,
    job.crop_config,
  );

  await run("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    inputPath,
    "-vf",
    plan.filter,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-maxrate",
    "2600k",
    "-bufsize",
    "5200k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  const storagePath =
    `${job.workspace_id}/${job.post_id}/processed/${job.id}.mp4`;
  const outputBytes = await readFile(outputPath);
  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(storagePath)}`,
    {
      method: "POST",
      headers: apiHeaders({
        "content-type": "video/mp4",
        "x-upsert": "false",
      }),
      body: outputBytes,
    },
  );
  if (!uploadResponse.ok) {
    throw new Error(`Output upload failed (${uploadResponse.status})`);
  }

  const fileInfo = await stat(outputPath);
  const outputName =
    `${source.file_name.replace(/\.[^.]+$/, "")}-${job.crop_config.aspect.replace(":", "x")}.mp4`;
  const [outputFile] = await rest("social_post_files", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      workspace_id: job.workspace_id,
      post_id: job.post_id,
      storage_path: storagePath,
      file_name: outputName,
      content_type: "video/mp4",
      file_size: fileInfo.size,
      created_by: job.requested_by,
      media_variant: "processed",
      generated_from_file_id: source.id,
    }),
  });

  await updateJob({
    status: "completed",
    output_file_id: outputFile.id,
    output_storage_path: storagePath,
    completed_at: new Date().toISOString(),
  });
}

try {
  await processJob();
} catch (error) {
  const message = error instanceof Error ? error.message : "Media processing failed";
  await updateJob({
    status: "failed",
    error_code: "PROCESSING_FAILED",
    error_message: message.slice(0, 500),
    completed_at: new Date().toISOString(),
  }).catch(() => undefined);
  throw error;
} finally {
  await rm(workspaceDir, { recursive: true, force: true });
}
