/** Refresh only capacity metadata; no layout, captions, identifiers or source artwork changes. */
import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import { compactCapacityMetadata } from "./capacity-annotations.mjs";
import { CAPACITY_SOURCE, splitCapacityExplanation } from "../shared/capacity-reference.ts";

for (const id of ['cdn','distributed-cache','kv-store','social-feed-distributed-cache']) {
  for (const relative of [`../server/generated/${id}-template.ts`,`../examples/${id}.system-canvas.json`]) {
    const url = new URL(relative,import.meta.url);
    const source = await readFile(url,'utf8');
    const declaration = relative.endsWith('.ts') ? source.match(/export const \w+: TemplateDefinition = /) : undefined;
    const prefix = declaration ? source.slice(0,declaration.index+declaration[0].length) : '';
    const document = JSON.parse(source.slice(prefix.length).trim().replace(/;$/,''));
    for (const element of document.scene.elements) {
      if (element.type === 'system' && element.capacity &&
        (splitCapacityExplanation(element.metadata?.explanation).hasCapacityNotes || element.metadata?.sourcePath?.includes(CAPACITY_SOURCE))) compactCapacityMetadata(element);
    }
    await writeFile(url,`${prefix}${JSON.stringify(document,null,2)}${declaration?';':''}\n`);
  }
}
