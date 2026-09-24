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

// No advisory exception is currently ratified. Adding one requires a documented review in
// docs/dependency-security.md and an exact causal-path check here.
const vulnerabilities = report.vulnerabilities ?? {};
const failures = [];

for (const [name, entry] of Object.entries(vulnerabilities)) {
  failures.push(`unexpected ${entry.severity} advisory path: ${name}`);
}

const metadata = report.metadata?.vulnerabilities ?? {};
for (const severity of ["critical", "high", "moderate", "low", "info", "total"]) {
  if (metadata[severity] !== 0) {
    failures.push(`unexpected audit totals: ${JSON.stringify(metadata)}`);
    break;
  }
}

if (failures.length > 0) {
  console.error(`Full dependency audit contract failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    "Full npm audit completed: no advisories at any severity across production and development dependencies.",
  );
}
