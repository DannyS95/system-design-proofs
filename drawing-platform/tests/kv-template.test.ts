import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApp } from "../server/app.js";
import { FileBoardStore } from "../server/board-store.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import type { BoardDocument } from "../shared/contracts.js";
import {
  parseBoardDocument,
  parseTemplateDefinition,
} from "../shared/validation.js";

function kvTemplate() {
  const template = DEFAULT_TEMPLATES.find(({ id }) => id === "kv-store");
  if (!template) {
    throw new Error("The default KV-store template is missing");
  }
  return template;
}

function sceneText(): string {
  return kvTemplate()
    .scene.elements.map((element) => {
      if (typeof element !== "object" || element === null || !("text" in element)) {
        return "";
      }
      return typeof element.text === "string" ? element.text : "";
    })
    .join("\n");
}

describe("KV-store teaching template", () => {
  it("is a valid, compact, editable scene with stable unique element IDs", () => {
    const template = parseTemplateDefinition(kvTemplate());
    const elements = template.scene.elements as Array<Record<string, unknown>>;
    const ids = elements.map(({ id }) => id);
    const arrows = elements.filter(({ type }) => type === "arrow");

    expect(template).toMatchObject({
      id: "kv-store",
      name: expect.stringMatching(/key.?value/i),
    });
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(arrows.length).toBeGreaterThanOrEqual(5);
    expect(elements.length).toBeLessThanOrEqual(75);
  });

  it("covers the request path, invariant, failure semantics, and convergence", () => {
    const text = sceneText();

    expect(text).toMatch(/client/i);
    expect(text).toMatch(/\bGET\b.*\bPUT\b|\bPUT\b.*\bGET\b/is);
    expect(text).toMatch(/coordinator/i);
    expect(text).toMatch(/hash\s*\(\s*key\s*\)|consistent hash/i);
    expect(text).toMatch(/replica set|replication factor|\bN replicas?\b/i);
    expect(text).toMatch(/\bW\b.{0,40}(ack|writ|repl)|write quorum/i);
    expect(text).toMatch(/\bR\b.{0,40}(response|read|repl)|read quorum/i);
    expect(text).toMatch(/version metadata|compare versions/i);
    expect(text).toMatch(/stale/i);
    expect(text).toMatch(/concurrent|conflict/i);
    expect(text).toMatch(/temporary divergence|available under failure|keep.{0,20}operating/i);
    expect(text).toMatch(/read repair/i);
    expect(text).toMatch(/anti.?entropy/i);
  });

  it("keeps the checked-in editable example aligned with the API template", async () => {
    const contents = await readFile(
      new URL("../examples/kv-store.system-canvas.json", import.meta.url),
      "utf8",
    );
    const document = parseBoardDocument(JSON.parse(contents) as unknown);

    expect(document).toMatchObject({
      schemaVersion: 1,
      id: "kv-store-learning-map",
      revision: 0,
      scene: kvTemplate().scene,
    });
  });

  it("is listed by the API and creates independent revision-zero boards", async () => {
    const directory = await mkdtemp(join(tmpdir(), "system-canvas-kv-template-"));
    let sequence = 0;
    const store = new FileBoardStore({
      dataDirectory: directory,
      idFactory: () => `kv-copy-${++sequence}`,
    });
    const app = await buildApp({ store });

    try {
      const templatesResponse = await app.inject({
        method: "GET",
        url: "/api/templates",
      });
      expect(templatesResponse.statusCode).toBe(200);
      expect(templatesResponse.json().templates).toContainEqual({
        id: "kv-store",
        name: kvTemplate().name,
        description: kvTemplate().description,
        elementCount: kvTemplate().scene.elements.length,
      });

      const firstResponse = await app.inject({
        method: "POST",
        url: "/api/boards",
        payload: { name: "KV Store", templateId: "kv-store" },
      });
      expect(firstResponse.statusCode).toBe(201);
      const first = firstResponse.json<BoardDocument>();
      expect(first).toMatchObject({
        name: "KV Store",
        revision: 0,
        scene: kvTemplate().scene,
      });

      (first.scene.elements[0] as Record<string, unknown>).x = -99_999;
      const secondResponse = await app.inject({
        method: "POST",
        url: "/api/boards",
        payload: { name: "Another copy", templateId: "kv-store" },
      });
      const second = secondResponse.json<BoardDocument>();
      expect(secondResponse.statusCode).toBe(201);
      expect(second.id).not.toBe(first.id);
      expect((second.scene.elements[0] as Record<string, unknown>).x).not.toBe(
        -99_999,
      );
      expect(kvTemplate().scene.elements).toEqual(second.scene.elements);
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
