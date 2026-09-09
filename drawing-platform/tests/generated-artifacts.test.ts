import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(projectDirectory, "..");
const fontCacheDirectory = resolve(tmpdir(), "system-canvas-font-cache");
process.env.XDG_CACHE_HOME ||= fontCacheDirectory;

const artifacts = [
  { directory: "cdn", markdown: "README.md" },
  { directory: "distributed-cache", markdown: "README.md" },
  { directory: "kv-store", markdown: "readme.md" },
  { directory: "social-feed-distributed-cache", markdown: "README.md" },
  { directory: "drawing-platform", markdown: "README.md" },
] as const;

describe("generated design previews", () => {
  it.each(artifacts)(
    "keeps the $directory PNG synchronized with its SVG and Markdown",
    async ({ directory, markdown }) => {
      await mkdir(fontCacheDirectory, { recursive: true });
      const artifactDirectory = resolve(repositoryDirectory, directory);
      const [svg, png, markdownSource] = await Promise.all([
        readFile(resolve(artifactDirectory, "architecture.svg")),
        readFile(resolve(artifactDirectory, "system-canvas.png")),
        readFile(resolve(artifactDirectory, markdown), "utf8"),
      ]);
      const expectedPng = await sharp(svg)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.equals(expectedPng)).toBe(true);
      expect(markdownSource).toContain("](./system-canvas.png)");
    },
  );
});
