import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const netlifyContext = process.env.CONTEXT ?? "production";
const isProduction = netlifyContext === "production";
const productionSiteUrl = "https://chess.measuredstudios.com";
const requiredFiles = [
  "dist/index.html",
  "dist/_redirects",
  "dist/apple-icon",
  "dist/favicon.svg",
  "dist/icon.svg",
  "dist/icon0",
  "dist/icon1",
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
  !/Chess Lab by Measured Studios/i.test(renderedHomepage) ||
  !/One loose knight opened the road to mate/i.test(renderedHomepage)
) {
  throw new Error("The prerendered Netlify homepage does not contain the Chess Lab shell.");
}

if (
  isProduction &&
  !renderedHomepage.includes(`<link rel="canonical" href="${productionSiteUrl}"`)
) {
  throw new Error("The production homepage does not use the Measured Studios canonical URL.");
}

if (
  isProduction &&
  (!renderedHomepage.includes(`<meta property="og:url" content="${productionSiteUrl}"`) ||
    !renderedHomepage.includes(`"url":"${productionSiteUrl}"`))
) {
  throw new Error("The production Open Graph or structured-data URL is not canonical.");
}

for (const expectedTag of [
  'rel="icon" href="/icon.svg',
  'rel="icon" href="/icon0',
  'rel="icon" href="/icon1',
  'rel="apple-touch-icon" href="/apple-icon',
]) {
  if (!renderedHomepage.includes(expectedTag)) {
    throw new Error(`The production homepage is missing favicon metadata: ${expectedTag}`);
  }
}

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const iconPath of ["dist/apple-icon", "dist/icon0", "dist/icon1"]) {
  const icon = await readFile(path.join(projectRoot, iconPath));
  if (!icon.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${iconPath} is not a PNG artifact.`);
  }
}

const manifest = JSON.parse(
  await readFile(path.join(projectRoot, "dist/manifest.webmanifest"), "utf8"),
);
if (!Array.isArray(manifest.icons) || manifest.icons.length !== 4) {
  throw new Error("The web manifest does not publish the complete favicon set.");
}

const robots = await readFile(path.join(projectRoot, "dist/robots.txt"), "utf8");
if (isProduction) {
  if (!/^Allow: \/$/m.test(robots) || /^Disallow: \/$/m.test(robots)) {
    throw new Error("The production Netlify artifact is not indexable.");
  }
  if (!robots.includes(`Sitemap: ${productionSiteUrl}/sitemap.xml`)) {
    throw new Error("The production robots file does not use the Measured Studios canonical URL.");
  }
} else if (!/^Disallow: \/$/m.test(robots) || /^Allow: \/$/m.test(robots)) {
  throw new Error(`The ${netlifyContext} Netlify artifact must remain non-indexable.`);
} else if (/^Sitemap:/m.test(robots)) {
  throw new Error(`The ${netlifyContext} robots file must not advertise a sitemap.`);
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

const netlifyConfig = await readFile(path.join(projectRoot, "netlify.toml"), "utf8");
for (const requiredControl of [
  "Content-Security-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Permissions-Policy",
  "X-Permitted-Cross-Domain-Policies",
  "status = 200",
  "window_limit = 120",
  'aggregate_by = ["ip", "domain"]',
]) {
  if (!netlifyConfig.includes(requiredControl)) {
    throw new Error(`Netlify configuration is missing required control: ${requiredControl}`);
  }
}

console.log(
  `Validated ${netlifyContext} Netlify artifact: prerendered app, metadata routes, static assets, Nitro fallback, robots policy, and routing are present.`,
);
