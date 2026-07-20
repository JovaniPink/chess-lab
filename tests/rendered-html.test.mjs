import assert from "node:assert/strict";
import test from "node:test";

test("the deployable worker renders the finished Chess Lab shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("https://chess-lab.example/", { headers: { accept: "text/html" } }),
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

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Jovani Chess Lab/i);
  assert.match(html, /One loose knight opened the road to mate/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /codex-preview/i);
});
