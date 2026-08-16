import { execFileSync } from "node:child_process";

const tree = JSON.parse(
  execFileSync("npm", ["ls", "--omit=dev", "--all", "--json"], {
    encoding: "utf8",
  }),
);

const forbiddenProductionPackages = new Set(["extract-zip", "image-size"]);
const violations = [];

function isFixedSharp(version) {
  const [major = 0, minor = 0, patch = 0] = version.split("-")[0].split(".").map(Number);

  return major > 0 || (major === 0 && (minor > 35 || (minor === 35 && patch >= 0)));
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

if (violations.length > 0) {
  console.error(
    `Development-only dependency exception leaked into production:\n${violations
      .map((violation) => `- ${violation}`)
      .join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "Verified: extract-zip and image-size are absent from production, and production Sharp is >=0.35.0.",
  );
}
