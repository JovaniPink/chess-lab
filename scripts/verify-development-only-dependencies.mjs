import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const tree = JSON.parse(
  execFileSync("npm", ["ls", "--omit=dev", "--all", "--json"], {
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
  return isAtLeast(version, "0.35.0");
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
const netlifyCliVersion = lockedPackages["node_modules/netlify-cli"]?.version ?? "0.0.0";
const netlifyDevUtilsVersion =
  lockedPackages["node_modules/@netlify/dev-utils"]?.version ?? "0.0.0";

if (!isAtLeast(netlifyCliVersion, "27.1.2")) {
  violations.push(`package-lock.json: netlify-cli@${netlifyCliVersion} is older than 27.1.2`);
}

if (!isAtLeast(netlifyDevUtilsVersion, "5.0.0")) {
  violations.push(
    `package-lock.json: root @netlify/dev-utils@${netlifyDevUtilsVersion} is older than 5.0.0`,
  );
}

const imageSizePaths = Object.entries(lockedPackages)
  .filter(
    ([path]) => path === "node_modules/image-size" || path.endsWith("/node_modules/image-size"),
  )
  .map(([path, metadata]) => `${path}@${metadata.version ?? "unknown"}`);

if (imageSizePaths.length > 0) {
  violations.push(`package-lock.json reintroduced image-size: ${imageSizePaths.join(", ")}`);
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
    "Verified: extract-zip and image-size are absent from production; production Sharp is >=0.35.0; the Netlify lock uses dev-utils >=5.0.0 with no image-size path.",
  );
}
