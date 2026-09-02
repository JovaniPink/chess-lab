import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, rootUrl), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [project, tsconfig, netlify, vite, nvmRuntime, favicon, socialImage] = await Promise.all([
  readJson("package.json"),
  readJson("tsconfig.json"),
  readFile(new URL("netlify.toml", rootUrl), "utf8"),
  readFile(new URL("vite.config.ts", rootUrl), "utf8"),
  readFile(new URL(".nvmrc", rootUrl), "utf8"),
  readFile(new URL("public/favicon.ico", rootUrl)),
  readFile(new URL("public/og.png", rootUrl)),
]);

const failures = [];
if (project.devEngines?.runtime?.version !== "^22.22.2 || ^24.15.0") {
  failures.push("devEngines.runtime must retain the Node 22 and 24 range");
}
if (project.devEngines?.runtime?.onFail !== "error") {
  failures.push("devEngines.runtime.onFail must remain error");
}
if (
  project.devEngines?.packageManager?.version !== "12.0.2" ||
  project.devEngines?.packageManager?.onFail !== "warn"
) {
  failures.push("the npm 12.0.2 bootstrap boundary must remain explicit");
}
if (nvmRuntime.trim() !== "22.22.2") {
  failures.push(".nvmrc must select Node 22.22.2");
}
if (project.devDependencies?.eslint !== "9.39.5") {
  failures.push("ESLint must remain on the peer-compatible 9.39.5 line");
}

for (const [dependency, decision] of Object.entries({
  esbuild: false,
  "esbuild@0.28.1": true,
  fsevents: false,
  "netlify-cli": false,
  "unix-dgram": false,
  "unrs-resolver": false,
})) {
  if (project.allowScripts?.[dependency] !== decision) {
    failures.push(`allowScripts.${dependency} must remain ${decision}`);
  }
}

for (const [sectionName, dependencies] of Object.entries({
  dependencies: project.dependencies,
  devDependencies: project.devDependencies,
})) {
  for (const [dependency, version] of Object.entries(dependencies ?? {})) {
    if (/^[~^*]|\s-\s|\|\||\bx\b/i.test(version)) {
      failures.push(`${sectionName}.${dependency} must use an exact version: ${version}`);
    }
  }
}

if (!netlify.includes('command = "corepack npm run build"')) {
  failures.push("Netlify must execute the integrity-pinned npm build command");
}
for (const [name, value] of [
  ["NODE_VERSION", "22.22.2"],
  ["NPM_VERSION", "12.0.2"],
]) {
  if (!netlify.includes(`${name} = "${value}"`)) {
    failures.push(`Netlify must retain ${name} ${value}`);
  }
}
if (!vite.includes("vinext()") || !/preset:\s*["']netlify["']/.test(vite)) {
  failures.push("Vinext and Nitro's Netlify preset must remain the runtime boundary");
}

for (const path of [".next/types/**/*.ts", ".next/dev/types/**/*.ts"]) {
  if (!(tsconfig.include ?? []).includes(path)) {
    failures.push(`tsconfig.json must include ${path}`);
  }
}
for (const path of [
  "app/apple-icon.tsx",
  "app/icon.svg",
  "app/icon0.tsx",
  "app/icon1.tsx",
  "app/manifest.ts",
  "app/robots.ts",
  "app/sitemap.ts",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/og.png",
]) {
  try {
    await readFile(new URL(path, rootUrl));
  } catch {
    failures.push(`Vinext compatibility profile requires ${path}`);
  }
}

const isIco =
  favicon.length >= 22 &&
  favicon.readUInt16LE(0) === 0 &&
  favicon.readUInt16LE(2) === 1 &&
  favicon.readUInt16LE(4) >= 1 &&
  (favicon[6] || 256) >= 48 &&
  (favicon[7] || 256) >= 48;
if (!isIco) failures.push("public/favicon.ico must contain a 48-pixel or larger icon");
if (sha256(favicon) !== "4ffb3392f942cdb32f65a0ae18fe3e9536dc2bea0bde46d5ac87eed812701865") {
  failures.push("the reviewed Chess Lab favicon bytes changed");
}
if (sha256(socialImage) !== "9b9310d40e4d395ce772f9f9f582904eedde3d65898258fdf11b184d784be564") {
  failures.push("the reviewed Chess Lab social image bytes changed");
}
if (project.scripts?.["audit:dependencies"] !== "node scripts/audit-dependencies.mjs") {
  failures.push("the allowlisted full dependency-audit gate must remain wired");
}

if (failures.length > 0) {
  console.error(`Vinext compatibility-profile contract failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    "Vinext compatibility-profile contract passed: exact dependencies, dual TypeScript lanes, install policy, Netlify runtime, identity assets, and audit boundary are intact.",
  );
}
