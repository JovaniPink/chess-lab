import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("the Netlify function renders the finished Chess Lab shell", async () => {
  const functionUrl = pathToFileURL(
    new URL("../.netlify/functions-internal/server/main.mjs", import.meta.url).pathname,
  );
  functionUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(functionUrl.href);

  const response = await handler(
    new Request("https://chess-lab.example/", { headers: { accept: "text/html" } }),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Jovani Chess Lab/i);
  assert.match(html, /One loose knight opened the road to mate/i);
  assert.match(html, /og\.png/i);
});
