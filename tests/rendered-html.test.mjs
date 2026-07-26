import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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
  assert.match(html, /業務データはアカウントごとに保護されます/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("starter preview files are not part of the finished site", async () => {
  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});
