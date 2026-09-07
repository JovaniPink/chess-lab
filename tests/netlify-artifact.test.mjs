import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const netlifyCli = fileURLToPath(
  new URL("../node_modules/netlify-cli/bin/run.js", import.meta.url),
);

test("Netlify edge rules preserve the prerendered metadata MIME types", async () => {
  const netlifyRequire = createRequire(netlifyCli);
  const { parseAllHeaders } = await import(
    pathToFileURL(netlifyRequire.resolve("@netlify/headers-parser")).href
  );
  const { headers, errors } = await parseAllHeaders({
    netlifyConfigPath: path.join(projectRoot, "netlify.toml"),
    headersFiles: [path.join(projectRoot, "dist/_headers")],
    minimal: false,
  });
  assert.deepEqual(errors, []);

  for (const [route, contentType] of [
    ["/icon0", "image/png"],
    ["/icon1", "image/png"],
    ["/apple-icon", "image/png"],
    ["/manifest.webmanifest", "application/manifest+json"],
  ]) {
    const matchingHeaders = headers.filter(({ forRegExp }) => forRegExp.test(route));
    const values = new Headers();
    for (const rule of matchingHeaders) {
      for (const [name, value] of Object.entries(rule.values)) values.set(name, value);
    }
    assert.equal(values.get("content-type"), contentType, route);
    assert.equal(values.get("x-content-type-options"), "nosniff", route);
  }
});

test("the packaged Netlify site serves the production Chess Lab", async (t) => {
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
    assert.match(
      response.headers.get("content-security-policy") ?? "",
      /default-src 'self'.*object-src 'none'.*frame-ancestors 'none'.*connect-src 'self'/,
    );
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-permitted-cross-domain-policies"), "none");
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
    const html = await response.text();
    assert.match(html, /Chess Lab by Measured Studios/i);
    assert.match(html, /One loose knight opened the road to mate/i);
    assert.match(html, /og\.png/i);
    assert.match(html, /favicon\.ico/i);
    assert.match(html, /<link rel="canonical" href="https:\/\/chess\.measuredstudios\.com"/);
    assert.match(html, /<meta property="og:url" content="https:\/\/chess\.measuredstudios\.com"/);
    assert.match(html, /"url":"https:\/\/chess\.measuredstudios\.com"/);

    const faviconResponse = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
    assert.equal(faviconResponse.status, 200);
    assert.match(
      faviconResponse.headers.get("content-type") ?? "",
      /^image\/(?:x-icon|vnd\.microsoft\.icon)\b/i,
    );
    const favicon = Buffer.from(await faviconResponse.arrayBuffer());
    assert.equal(
      createHash("sha256").update(favicon).digest("hex"),
      "4ffb3392f942cdb32f65a0ae18fe3e9536dc2bea0bde46d5ac87eed812701865",
    );

    for (const [route, size] of [
      ["icon0", 48],
      ["icon1", 192],
      ["apple-icon", 180],
    ]) {
      await t.test(`${route} serves PNG bytes with the declared size`, async () => {
        const iconResponse = await fetch(`http://127.0.0.1:${port}/${route}`);
        assert.equal(iconResponse.status, 200);
        // Netlify CLI's proxy overwrites custom Content-Type in writeHead.
        // The edge MIME rules are checked separately with Netlify's parser above.
        assert.equal(iconResponse.headers.get("x-content-type-options"), "nosniff");
        const icon = Buffer.from(await iconResponse.arrayBuffer());
        assert.deepEqual(icon.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        assert.equal(icon.readUInt32BE(16), size);
        assert.equal(icon.readUInt32BE(20), size);
      });
    }

    await t.test("the web manifest serves JSON with the manifest MIME type", async () => {
      const manifestResponse = await fetch(`http://127.0.0.1:${port}/manifest.webmanifest`);
      assert.equal(manifestResponse.status, 200);
      assert.match(
        manifestResponse.headers.get("content-type") ?? "",
        /^application\/manifest\+json\b/i,
      );
      assert.equal(manifestResponse.headers.get("x-content-type-options"), "nosniff");
      const manifest = await manifestResponse.json();
      assert.equal(manifest.name, "Chess Lab by Measured Studios");
      assert.equal(manifest.start_url, "/");
      assert.equal(manifest.icons.length, 5);
    });
  } finally {
    stopProcess(child);
  }
});

test("the packaged Netlify function renders the root path", async () => {
  const handlerUrl = pathToFileURL(
    path.join(projectRoot, ".netlify/functions-internal/server/main.mjs"),
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(handlerUrl.href);

  const response = await handler(new Request("https://chess.measuredstudios.com/"));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Chess Lab by Measured Studios/i);
  assert.match(html, /One loose knight opened the road to mate/i);
});

test("the production bundle permits indexing", async () => {
  const handlerUrl = pathToFileURL(
    path.join(projectRoot, ".netlify/functions-internal/server/main.mjs"),
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(handlerUrl.href);

  const response = await handler(new Request("https://chess.measuredstudios.com/robots.txt"));

  assert.equal(response.status, 200);
  const robots = await response.text();
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
  assert.match(robots, /Sitemap: https:\/\/chess\.measuredstudios\.com\/sitemap\.xml/);
});

test("the packaged function serves the public knowledge projection", async () => {
  const handlerUrl = pathToFileURL(
    path.join(projectRoot, ".netlify/functions-internal/server/main.mjs"),
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(handlerUrl.href);

  const response = await handler(new Request("https://chess.measuredstudios.com/knowledge.json"));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const index = await response.json();
  assert.equal(index.projectId, "chess-lab");
  assert.equal(index.objects.length, 13);
  assert.equal(index.objects.filter(({ kind }) => kind === "source").length, 1);
  assert.equal(index.objects.filter(({ kind }) => kind === "scenario").length, 5);
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
