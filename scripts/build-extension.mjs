import { cp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const browser of ["chrome", "firefox"]) {
  const outDir = path.join(root, "dist", browser);

  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite", "build", "--outDir", outDir],
    { cwd: root, stdio: "inherit" },
  );

  await mkdir(outDir, { recursive: true });
  await cp(
    path.join(root, "manifests", `${browser}.json`),
    path.join(outDir, "manifest.json"),
  );
}
