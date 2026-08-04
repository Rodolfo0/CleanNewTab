import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
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

  if (browser === "firefox" && process.env.FIREFOX_OAUTH_BROKER_URL) {
    const brokerUrl = new URL(process.env.FIREFOX_OAUTH_BROKER_URL);
    if (brokerUrl.protocol !== "https:" || brokerUrl.pathname !== "/") {
      throw new Error(
        "FIREFOX_OAUTH_BROKER_URL must be an HTTPS origin without a path.",
      );
    }

    const backgroundPath = path.join(outDir, "background.js");
    const background = await readFile(backgroundPath, "utf8");
    await writeFile(
      backgroundPath,
      background.replaceAll(
        "__FIREFOX_OAUTH_BROKER_URL__",
        brokerUrl.origin,
      ),
    );

    const manifestPath = path.join(outDir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.host_permissions = [
      ...new Set([...(manifest.host_permissions ?? []), `${brokerUrl.origin}/*`]),
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}
