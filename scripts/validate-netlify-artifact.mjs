import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const requiredFiles = [
  "dist/_redirects",
  "dist/og.png",
  ".netlify/functions-internal/server/main.mjs",
  ".netlify/functions-internal/server/server.mjs",
];

for (const relativePath of requiredFiles) {
  await access(path.join(projectRoot, relativePath));
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

console.log("Validated Netlify artifact: static assets, Nitro function, and routing are present.");
