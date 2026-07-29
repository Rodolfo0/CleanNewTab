import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = path.join(root, "artifacts");
const extensionArchive = path.join(
  artifactsDir,
  "clean-new-tab-firefox-0.1.0.zip",
);
const sourceArchive = path.join(
  artifactsDir,
  "clean-new-tab-source-0.1.0.zip",
);

await mkdir(artifactsDir, { recursive: true });
await Promise.all([
  rm(extensionArchive, { force: true }),
  rm(sourceArchive, { force: true }),
]);

execFileSync("zip", ["-q", "-r", extensionArchive, "."], {
  cwd: path.join(root, "dist", "firefox"),
});

execFileSync(
  "zip",
  [
    "-q",
    "-r",
    sourceArchive,
    "src",
    "public",
    "manifests",
    "scripts",
    "docs",
    "index.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.js",
    "eslint.config.js",
    "README.md",
  ],
  { cwd: root },
);
