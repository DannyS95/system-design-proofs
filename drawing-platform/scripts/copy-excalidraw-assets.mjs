import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(
  projectRoot,
  "node_modules/@excalidraw/excalidraw/dist/prod/fonts",
);
const destination = resolve(projectRoot, "public/excalidraw-assets");

await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

console.log("Prepared local Excalidraw font assets.");
