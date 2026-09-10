import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptsDirectory, "..");
const websiteRoot = path.join(repositoryRoot, "website");
const sourcePath = path.join(repositoryRoot, "CHANGELOG.md");
const generatedDirectory = path.join(websiteRoot, "src", "generated");
const generatedPagePath = path.join(websiteRoot, "src", "pages", "changelog.md");
const generatedReleasesPath = path.join(
  generatedDirectory,
  "changelog-releases.ts",
);

const source = await readFile(sourcePath, "utf8");
const releaseHeadingPattern =
  /^## \[([^\]]+)\]\(([^)]+)\)(?: \((\d{4}-\d{2}-\d{2})\))?$/gm;
const releaseMatches = [...source.matchAll(releaseHeadingPattern)];

if (releaseMatches.length === 0) {
  throw new Error("CHANGELOG.md no contiene ninguna release reconocible.");
}

function stripMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const releases = releaseMatches.map((match, index) => {
  const start = match.index ?? 0;
  const end = releaseMatches[index + 1]?.index ?? source.length;
  const releaseBody = source.slice(start + match[0].length, end);
  const entries = [...releaseBody.matchAll(/^\s*[*-]\s+(.+)$/gm)]
    .map((entry) => stripMarkdown(entry[1]))
    .filter(Boolean)
    .slice(0, 4);

  return {
    version: match[1],
    compareUrl: match[2],
    date: match[3] ?? null,
    entries,
  };
});

const pageBody = source.replace(/^# Changelog\s*/m, "").trimStart();
const generatedPage = `---
layout: ../layouts/ChangelogLayout.astro
title: "Novedades de Clean New Tab"
description: "Historial de cambios, mejoras y correcciones de Clean New Tab."
---

${pageBody}
`;

const generatedReleases = `export const changelogReleases = ${JSON.stringify(
  releases,
  null,
  2,
)} as const;
`;

await mkdir(generatedDirectory, { recursive: true });
await writeFile(generatedPagePath, generatedPage);
await writeFile(generatedReleasesPath, generatedReleases);
