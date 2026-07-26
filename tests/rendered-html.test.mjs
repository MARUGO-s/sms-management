import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Instatic TalksX operations console", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Instatic TalksX<\/title>/i);
  assert.match(html, /ログイン/);
  assert.match(html, /Googleで続ける/);
  assert.match(html, /業務データはアカウントごとに保護されます/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the protected administrator route", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /管理コンソール/);
  assert.match(html, /管理者権限を確認しています/);
});

test("starter preview files are not part of the finished site", async () => {
  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});

test("store affiliation, administrator schedules, and knowledge maps remain wired into the app", async () => {
  const [
    consoleSource,
    adminSource,
    migrationSource,
    graphAsset,
    environmentAsset,
    graphStats,
    packageSource,
    agentRules,
  ] =
    await Promise.all([
    readFile(new URL("../app/social-console.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-console.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../supabase/migrations/20260726130739_add_social_store_affiliation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../public/system-map/graph.html", import.meta.url), "utf8"),
    readFile(
      new URL("../public/system-map/environment.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../public/system-map/graph-stats.json", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
  ]);

  assert.match(consoleSource, /所属店舗/);
  assert.match(consoleSource, /social_store_id/);
  assert.match(adminSource, /予約予定/);
  assert.match(adminSource, /店舗別運用状況/);
  assert.match(adminSource, /全店舗/);
  assert.match(adminSource, /システムマップ/);
  assert.match(adminSource, /\/system-map\/graph\.html/);
  assert.match(adminSource, /\/system-map\/environment\.html/);
  assert.match(adminSource, /\/system-map\/graph-stats\.json/);
  assert.match(adminSource, /実行環境・AI知識循環/);
  assert.match(migrationSource, /create table public\.social_stores/);
  assert.match(migrationSource, /'BLU NERO'/);
  assert.match(graphAsset, /vis-network/);
  assert.match(environmentAsset, /Graphify × Obsidian × AI/);
  assert.match(environmentAsset, /AI・Graphify・Obsidian知識循環/);
  const parsedStats = JSON.parse(graphStats);
  assert.ok(parsedStats.nodes > 0);
  assert.ok(parsedStats.edges > 0);
  assert.ok(parsedStats.communities > 0);
  assert.match(packageSource, /"knowledge:update"/);
  assert.match(packageSource, /"knowledge:check"/);
  assert.match(agentRules, /Graphify-first investigation/);
  assert.match(agentRules, /Obsidian/);
});

test("video crop jobs keep originals and use the protected worker flow", async () => {
  const [consoleSource, editorSource, migrationSource, workerSource] =
    await Promise.all([
      readFile(new URL("../app/social-console.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/media-editor.tsx", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../supabase/migrations/20260726135609_add_social_media_processing.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../workers/media-processor/processor.mjs", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(consoleSource, /動画をクロップ|クロップ設定/);
  assert.match(consoleSource, /media-jobs/);
  assert.match(consoleSource, /処理を再実行/);
  assert.match(editorSource, /"1:1".*"4:5".*"9:16".*"16:9"/s);
  assert.match(migrationSource, /create table public\.social_media_jobs/);
  assert.match(migrationSource, /media_variant/);
  assert.match(workerSource, /generated_from_file_id/);
  assert.match(workerSource, /libx264/);
});
