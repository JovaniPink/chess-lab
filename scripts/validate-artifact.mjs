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
