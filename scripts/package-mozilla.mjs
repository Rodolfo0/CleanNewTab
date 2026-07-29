import { mkdir, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const version = packageJson.version;
const artifactsDir = path.join(root, "artifacts");
const chromeArchive = path.join(
  artifactsDir,
  `clean-new-tab-chrome-${version}.zip`,
);
const extensionArchive = path.join(
  artifactsDir,
  `clean-new-tab-firefox-${version}.zip`,
);
const sourceArchive = path.join(
  artifactsDir,
  `clean-new-tab-source-${version}.zip`,
);

await mkdir(artifactsDir, { recursive: true });
await Promise.all([
  rm(chromeArchive, { force: true }),
  rm(extensionArchive, { force: true }),
  rm(sourceArchive, { force: true }),
]);

execFileSync("zip", ["-q", "-r", chromeArchive, "."], {
  cwd: path.join(root, "dist", "chrome"),
});

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
