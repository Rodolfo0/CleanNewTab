import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const budgets = {
  script: 220 * 1024,
  stylesheet: 40 * 1024,
};

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

async function checkBrowser(browser) {
  const outputDirectory = path.join(root, "dist", browser);
  const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
  const assets = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => ({
      budget: budgets.script,
      kind: "script",
      source: match[1],
    })),
    ...[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((match) => ({
      budget: budgets.stylesheet,
      kind: "stylesheet",
      source: match[1],
    })),
  ];

  if (assets.length === 0) {
    throw new Error(`No se encontraron assets iniciales en dist/${browser}/index.html.`);
  }

  for (const asset of assets) {
    const relativePath = asset.source.replace(/^\.\//, "");
    const contents = await readFile(path.join(outputDirectory, relativePath));
    const gzipBytes = gzipSync(contents).byteLength;
    if (gzipBytes > asset.budget) {
      throw new Error(
        `${browser}: ${asset.kind} inicial ${relativePath} pesa ${formatKiB(gzipBytes)} gzip; ` +
          `el presupuesto es ${formatKiB(asset.budget)}.`,
      );
    }
    process.stdout.write(
      `${browser}: ${asset.kind} inicial ${formatKiB(gzipBytes)} gzip ` +
        `(límite ${formatKiB(asset.budget)})\n`,
    );
  }
}

for (const browser of ["chrome", "firefox"]) {
  await checkBrowser(browser);
}
