import { spawnSync } from "node:child_process";

const npmExecutable = process.env.npm_execpath;
if (!npmExecutable) {
  throw new Error("Run this audit through the integrity-pinned npm script boundary.");
}

const audit = spawnSync(
  process.execPath,
  [npmExecutable, "audit", "--audit-level=high", "--json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  throw new Error(
    `npm audit did not return a JSON report: ${audit.stderr.trim() || `exit ${audit.status}`}`,
  );
}

const allowedPackages = new Set(["@netlify/dev", "@netlify/functions-dev", "extract-zip"]);
const vulnerabilities = report.vulnerabilities ?? {};
const observedPackages = new Set(Object.keys(vulnerabilities));
const failures = [];

for (const name of observedPackages) {
  if (!allowedPackages.has(name)) {
    failures.push(`unexpected ${vulnerabilities[name].severity} advisory path: ${name}`);
  }
}
for (const name of allowedPackages) {
  if (!observedPackages.has(name)) {
    failures.push(`documented exception ${name} disappeared; remove or re-ratify the exception`);
  }
}

const extractZipVia = vulnerabilities["extract-zip"]?.via ?? [];
const extractZipAdvisories = extractZipVia.filter(
  (entry) => typeof entry === "object" && entry !== null,
);
if (
  extractZipAdvisories.length !== 1 ||
  extractZipAdvisories[0].url !== "https://github.com/advisories/GHSA-jmr9-qjv8-65gv" ||
  extractZipAdvisories[0].severity !== "high"
) {
  failures.push("extract-zip must resolve only to the reviewed GHSA-jmr9-qjv8-65gv advisory");
}

for (const [name, expectedVia] of [
  ["@netlify/dev", ["@netlify/functions-dev"]],
  ["@netlify/functions-dev", ["extract-zip"]],
]) {
  const entry = vulnerabilities[name];
  const via = entry?.via ?? [];
  if (
    entry?.severity !== "high" ||
    via.length !== expectedVia.length ||
    via.some((value, index) => value !== expectedVia[index])
  ) {
    failures.push(`${name} must remain only a wrapper around ${expectedVia.join(", ")}`);
  }
}

const metadata = report.metadata?.vulnerabilities ?? {};
if (
  metadata.critical !== 0 ||
  metadata.moderate !== 0 ||
  metadata.low !== 0 ||
  metadata.info !== 0 ||
  metadata.high !== allowedPackages.size ||
  metadata.total !== allowedPackages.size
) {
  failures.push(`unexpected audit totals: ${JSON.stringify(metadata)}`);
}

if (failures.length > 0) {
  console.error(`Full dependency audit contract failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    "Full npm audit completed: exactly 3 high-severity development-only paths remain, all caused by reviewed GHSA-jmr9-qjv8-65gv in Netlify tooling; no other findings.",
  );
}
