import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const netlifyCli = fileURLToPath(
  new URL("../node_modules/netlify-cli/bin/run.js", import.meta.url),
);

test("the packaged Netlify function renders the production Chess Lab", async () => {
  const port = await availablePort();
  const functionsPort = await availablePort();
  const output = [];
  const child = spawn(
    process.execPath,
    [
      netlifyCli,
      "serve",
      "--offline",
      "--context",
      "production",
      "--port",
      String(port),
      "--functions-port",
      String(functionsPort),
    ],
    {
      cwd: projectRoot,
      detached: process.platform !== "win32",
      env: { ...process.env, BROWSER: "none", NO_UPDATE_NOTIFIER: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));

  try {
    const response = await waitForResponse(`http://127.0.0.1:${port}/`, child, output);

    assert.equal(response.status, 200, output.join(""));
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /Jovani Chess Lab/i);
    assert.match(html, /One loose knight opened the road to mate/i);
    assert.match(html, /og\.png/i);
  } finally {
    stopProcess(child);
  }
});

test("the production bundle permits indexing", async () => {
  const handlerUrl = pathToFileURL(
    path.join(projectRoot, ".netlify/functions-internal/server/main.mjs"),
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(handlerUrl.href);

  const response = await handler(new Request("https://chess-labs.netlify.app/robots.txt"));

  assert.equal(response.status, 200);
  const robots = await response.text();
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
  assert.match(robots, /Sitemap: https:\/\/.+\/sitemap\.xml/);
});

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForResponse(url, child, output) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Netlify serve exited with ${child.exitCode}.\n${output.join("")}`);
    }

    try {
      return await fetch(url, { signal: AbortSignal.timeout(1_000) });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Timed out waiting for Netlify serve.\n${output.join("")}`);
}

function stopProcess(child) {
  if (child.exitCode !== null || child.pid === undefined) return;

  if (process.platform === "win32") {
    child.kill("SIGTERM");
  } else {
    process.kill(-child.pid, "SIGTERM");
  }
}
