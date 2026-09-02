import { createHash } from "node:crypto";
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
  "dist/favicon.ico",
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
  'rel="icon" href="/favicon.ico',
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
for (const [iconPath, expectedWidth, expectedHeight] of [
  ["dist/apple-icon", 180, 180],
  ["dist/icon0", 48, 48],
  ["dist/icon1", 192, 192],
  ["dist/og.png", 1200, 630],
]) {
  const icon = await readFile(path.join(projectRoot, iconPath));
  if (!icon.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${iconPath} is not a PNG artifact.`);
  }
  if (icon.readUInt32BE(16) !== expectedWidth || icon.readUInt32BE(20) !== expectedHeight) {
    throw new Error(`${iconPath} does not have the expected dimensions.`);
  }
}

const favicon = await readFile(path.join(projectRoot, "dist/favicon.ico"));
if (
  favicon.readUInt16LE(0) !== 0 ||
  favicon.readUInt16LE(2) !== 1 ||
  favicon.readUInt16LE(4) < 1 ||
  (favicon[6] || 256) !== 64 ||
  (favicon[7] || 256) !== 64
) {
  throw new Error("The browser favicon is not the expected 64-pixel ICO artifact.");
}
if (
  createHash("sha256").update(favicon).digest("hex") !==
  "4ffb3392f942cdb32f65a0ae18fe3e9536dc2bea0bde46d5ac87eed812701865"
) {
  throw new Error("The browser favicon does not match the reviewed Chess Lab identity.");
}

const socialImage = await readFile(path.join(projectRoot, "dist/og.png"));
if (
  createHash("sha256").update(socialImage).digest("hex") !==
  "9b9310d40e4d395ce772f9f9f582904eedde3d65898258fdf11b184d784be564"
) {
  throw new Error("The social image does not match the reviewed Chess Lab identity.");
}

const manifest = JSON.parse(
  await readFile(path.join(projectRoot, "dist/manifest.webmanifest"), "utf8"),
);
if (!Array.isArray(manifest.icons) || manifest.icons.length !== 5) {
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
for (const requiredRedirectControl of [
  'from = "https://chess-labs.netlify.app/*"',
  'to = "https://chess.measuredstudios.com/:splat"',
  "status = 301",
  "force = true",
]) {
  if (!netlifyConfig.includes(requiredRedirectControl)) {
    throw new Error(
      `Netlify configuration is missing default-domain redirect control: ${requiredRedirectControl}`,
    );
  }
}

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
