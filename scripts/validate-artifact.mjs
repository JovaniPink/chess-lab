import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const requiredFiles = [
  "dist/index.html",
  "dist/_redirects",
  "dist/favicon.svg",
  "dist/manifest.webmanifest",
  "dist/og.png",
  "dist/robots.txt",
  "dist/sitemap.xml",
  ".netlify/functions-internal/server/main.mjs",
  ".netlify/functions-internal/server/server.mjs",
];

for (const relativePath of requiredFiles) {
  await access(path.join(projectRoot, relativePath));
}

const renderedHomepage = await readFile(path.join(projectRoot, "dist/index.html"), "utf8");
if (
  !/Jovani Chess Lab/i.test(renderedHomepage) ||
  !/One loose knight opened the road to mate/i.test(renderedHomepage)
) {
  throw new Error("The prerendered Netlify homepage does not contain the Chess Lab shell.");
}

const robots = await readFile(path.join(projectRoot, "dist/robots.txt"), "utf8");
if (!/^Allow: \/$/m.test(robots) || /^Disallow: \/$/m.test(robots)) {
  throw new Error("The production Netlify artifact is not indexable.");
}
if (!/Sitemap: https:\/\/chess-labs\.netlify\.app\/sitemap\.xml/.test(robots)) {
  throw new Error("The production robots file does not use the canonical Netlify URL.");
}

const functionWrapper = await readFile(
  path.join(projectRoot, ".netlify/functions-internal/server/server.mjs"),
  "utf8",
);
if (!/export \{ default \} from "\.\/main\.mjs"/.test(functionWrapper)) {
  throw new Error("Netlify artifact does not export Nitro's server handler.");
}
if (!/path: "\/\*"/.test(functionWrapper)) {
  throw new Error("Netlify artifact does not route application requests to Nitro.");
}

console.log(
  "Validated Netlify artifact: prerendered app, metadata routes, static assets, Nitro fallback, and routing are present.",
);
