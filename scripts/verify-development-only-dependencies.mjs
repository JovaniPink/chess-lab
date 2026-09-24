import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const npmExecutable = process.env.npm_execpath;
if (!npmExecutable) {
  throw new Error("Run this guard through the integrity-pinned npm script boundary.");
}

const tree = JSON.parse(
  execFileSync(process.execPath, [npmExecutable, "ls", "--omit=dev", "--all", "--json"], {
    encoding: "utf8",
  }),
);

const forbiddenProductionPackages = new Set(["extract-zip", "image-size"]);
const violations = [];

function parseVersion(version) {
  return version.split("-")[0].split(".").map(Number);
}

function isAtLeast(version, minimum) {
  const current = parseVersion(version);
  const expected = parseVersion(minimum);

  for (let index = 0; index < Math.max(current.length, expected.length); index += 1) {
    const difference = (current[index] ?? 0) - (expected[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }

  return true;
}

function isFixedSharp(version) {
  return isAtLeast(version, "0.35.4");
}

function visit(dependencies = {}, path = []) {
  for (const [name, dependency] of Object.entries(dependencies)) {
    const currentPath = [...path, `${name}@${dependency.version ?? "unknown"}`];

    if (forbiddenProductionPackages.has(name)) {
      violations.push(currentPath.join(" > "));
    }

    if (name === "sharp" && !isFixedSharp(dependency.version ?? "0.0.0")) {
      violations.push(currentPath.join(" > "));
    }

    visit(dependency.dependencies, currentPath);
  }
}

visit(tree.dependencies);

const lockedPackages = lock.packages ?? {};
const minimumNetlifyVersions = [
  ["node_modules/netlify-cli", "netlify-cli", "27.8.1"],
  ["node_modules/@netlify/dev", "@netlify/dev", "5.1.2"],
  ["node_modules/@netlify/functions-dev", "@netlify/functions-dev", "2.0.7"],
];

for (const [path, name, minimum] of minimumNetlifyVersions) {
  const version = lockedPackages[path]?.version ?? "0.0.0";
  if (!isAtLeast(version, minimum)) {
    violations.push(`package-lock.json: ${name}@${version} is older than ${minimum}`);
  }
}

const netlifyDevUtilsPaths = Object.entries(lockedPackages).filter(([path]) =>
  path.endsWith("node_modules/@netlify/dev-utils"),
);
if (netlifyDevUtilsPaths.length === 0) {
  violations.push("package-lock.json: no @netlify/dev-utils path is present");
}
for (const [path, metadata] of netlifyDevUtilsPaths) {
  if (!isAtLeast(metadata.version ?? "0.0.0", "6.0.1")) {
    violations.push(`${path}@${metadata.version ?? "unknown"} is older than 6.0.1`);
  }
}

for (const removedPackage of ["image-size", "extract-zip"]) {
  const removedPaths = Object.entries(lockedPackages)
    .filter(
      ([path]) =>
        path === `node_modules/${removedPackage}` ||
        path.endsWith(`/node_modules/${removedPackage}`),
    )
    .map(([path, metadata]) => `${path}@${metadata.version ?? "unknown"}`);

  if (removedPaths.length > 0) {
    violations.push(`package-lock.json reintroduced ${removedPackage}: ${removedPaths.join(", ")}`);
  }
}

if (violations.length > 0) {
  console.error(
    `Dependency security contract failed:\n${violations
      .map((violation) => `- ${violation}`)
      .join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "Verified: extract-zip and image-size are absent from the lockfile; Sharp is >=0.35.4; the supported Netlify 27.8 toolchain is locked.",
  );
}
