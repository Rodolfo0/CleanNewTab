import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { build as viteBuild } from "vite";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOAuthBrokerUrl =
  "https://clean-new-tab-oauth.fuzzyrodo.workers.dev";

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

  const brokerUrl = new URL(
    process.env.FIREFOX_OAUTH_BROKER_URL ?? defaultOAuthBrokerUrl,
  );
  if (brokerUrl.protocol !== "https:" || brokerUrl.pathname !== "/") {
    throw new Error(
      "FIREFOX_OAUTH_BROKER_URL must be an HTTPS origin without a path.",
    );
  }

  await viteBuild({
    configFile: false,
    publicDir: false,
    define: {
      __BROWSER__: JSON.stringify(browser),
      __OAUTH_BROKER_URL__: JSON.stringify(brokerUrl.origin),
    },
    build: {
      emptyOutDir: false,
      minify: false,
      outDir,
      rollupOptions: {
        input: path.join(root, "src", "background", "index.ts"),
        output: {
          entryFileNames: "background.js",
          format: "iife",
          name: "CleanNewTabBackground",
        },
      },
    },
  });

  const manifestPath = path.join(outDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.host_permissions = [
    ...new Set([...(manifest.host_permissions ?? []), `${brokerUrl.origin}/*`]),
  ];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
