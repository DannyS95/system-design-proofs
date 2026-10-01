/** Update only template references; preserve authored geometry and preview artwork. */
import { URL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { applyAppReferenceLinks } from "./app-architecture-details.mjs";

const moduleUrl = new URL("../server/generated/system-canvas-app-template.ts", import.meta.url);
const exampleUrl = new URL("../examples/system-canvas-app.system-canvas.json", import.meta.url);
const source = await readFile(moduleUrl, "utf8");
const marker = "export const SYSTEM_CANVAS_APP_TEMPLATE: TemplateDefinition = ";
const index = source.indexOf(marker) + marker.length;
if (index < marker.length) throw new Error("Missing generated template declaration.");
const template = JSON.parse(source.slice(index).trim().replace(/;$/, ""));
const example = JSON.parse(await readFile(exampleUrl, "utf8"));
applyAppReferenceLinks(template.scene.elements);
applyAppReferenceLinks(example.scene.elements);
await writeFile(moduleUrl, `${source.slice(0,index)}${JSON.stringify(template,null,2)};\n`);
await writeFile(exampleUrl, `${JSON.stringify(example,null,2)}\n`);
