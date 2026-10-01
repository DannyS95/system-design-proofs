import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApp } from "../server/app.js";
import { FileBoardStore } from "../server/board-store.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { isSystemIconId } from "../src/editor/SystemIcon.js";
import type {
  BoardDocument,
  CanvasConnectorElement,
  CanvasElement,
  CanvasSystemElement,
} from "../shared/contracts.js";
import {
  parseBoardDocument,
  parseTemplateDefinition,
} from "../shared/validation.js";

function kvTemplate() {
  const template = DEFAULT_TEMPLATES.find(({ id }) => id === "kv-store");
  if (!template) throw new Error("The default KV-store template is missing");
  return template;
}

function elementById(id: string): CanvasElement {
  const element = kvTemplate().scene.elements.find((candidate) => candidate.id === id);
  if (!element) throw new Error(`Missing KV element ${id}`);
  return element;
}

function connectorById(id: string): CanvasConnectorElement {
  const element = elementById(id);
  if (element.type !== "connector") throw new Error(`${id} is not a connector`);
  return element;
}

function systemById(id: string): CanvasSystemElement {
  const element = elementById(id);
  if (element.type !== "system") throw new Error(`${id} is not a system node`);
  return element;
}

describe("KV-store topology template", () => {
  it("is a compact schema-v2 scene made from native semantic elements", () => {
    const template = parseTemplateDefinition(kvTemplate());
    const ids = template.scene.elements.map(({ id }) => id);
    const connectors = template.scene.elements.filter(({ type }) => type === "connector");
    const systems = template.scene.elements.filter(({ type }) => type === "system");

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(connectors.length).toBeGreaterThanOrEqual(18);
    expect(systems.length).toBeGreaterThanOrEqual(20);
    expect(template.scene.elements.length).toBeLessThanOrEqual(80);
    expect(template.scene.elements.every(({ type }) => ["system", "shape", "text", "connector", "image"].includes(type))).toBe(true);
    expect(template.scene.elements.every(({ locked }) => locked === true)).toBe(true);
    expect(systems.every((element) => element.type === "system" && isSystemIconId(element.iconId))).toBe(true);
    expect(template.scene.appState).toMatchObject({
      camera: { zoom: expect.any(Number) },
      background: { pattern: "dots", spacing: 24 },
    });
  });

  it("gives every routing layer its own icon and transfers ownership to KV data routing", () => {
    const rail = [
      ["route-internet", "internet"],
      ["route-global", "global-routing"],
      ["route-edge", "edge-pop"],
      ["route-cluster", "load-balancer"],
      ["route-service", "service-routing"],
      ["route-application", "application-router"],
      ["route-data", "data-router"],
    ] as const;
    const nodes = rail.map(([id, iconId]) => {
      const node = systemById(id);
      expect(node.iconId).toBe(iconId);
      return node;
    });
    expect(nodes.map(({ x }) => x)).toEqual([...nodes.map(({ x }) => x)].sort((a, b) => a - b));
    expect(connectorById("route-data-ownership")).toMatchObject({
      startBinding: "route-data",
      endBinding: "hash-placement",
      label: expect.stringMatching(/data routing takes over/i),
    });
  });

  it("anchors PUT, GET, preferred replicas, quorum responses, and every repair trigger", () => {
    expect(connectorById("route-client-coordinator")).toMatchObject({ startBinding: "client", endBinding: "coordinator", label: expect.stringMatching(/PUT.*GET/) });
    expect(connectorById("route-coordinator-placement")).toMatchObject({ startBinding: "coordinator", endBinding: "hash-placement", label: "hash(key)" });
    expect(["placement-b", "placement-c", "placement-d"].map((id) => connectorById(id).endBinding)).toEqual(["replica-b", "replica-c", "replica-d"]);
    expect(systemById("quorum-result").subtitle).toMatch(/W=2.*R=2/);

    expect(connectorById("sloppy-quorum-route")).toMatchObject({ startBinding: "hash-placement", endBinding: "fallback-e", label: expect.stringMatching(/D down.*sloppy quorum/i) });
    expect(systemById("fallback-e").subtitle).toMatch(/temporary copy.*hint.*D/i);
    expect(connectorById("hinted-handoff-route")).toMatchObject({ startBinding: "fallback-e", endBinding: "replica-d", label: expect.stringMatching(/D heals.*hinted handoff/i) });
    expect(connectorById("read-repair-route")).toMatchObject({ startBinding: "quorum-result", endBinding: "replica-d", label: expect.stringMatching(/stale read.*read repair/i) });
    expect(connectorById("anti-entropy-route")).toMatchObject({ startBinding: "replica-b", endBinding: "replica-d", startArrow: "arrow", endArrow: "arrow", style: { strokeStyle: "dotted" } });
  });

  it("shows the concurrent sibling route without explanatory prose cards", () => {
    expect(connectorById("writer-a-route")).toMatchObject({ endBinding: "version-compare", label: "PUT vA" });
    expect(connectorById("writer-b-route")).toMatchObject({ endBinding: "version-compare", label: "PUT vB" });
    expect(connectorById("incomparable-route")).toMatchObject({ endBinding: "siblings", label: "incomparable" });
    expect(connectorById("siblings-to-app")).toMatchObject({ startBinding: "siblings", endBinding: "application-merge", label: "return both" });
    expect(connectorById("reconciled-put-route").endBinding).toBe("coordinator");

    const standaloneText = kvTemplate().scene.elements.filter(({ type }) => type === "text");
    expect(standaloneText).toHaveLength(6);
    expect(standaloneText.every((element) => element.type === "text" && element.text.split("\n").every((line) => line.length < 80))).toBe(true);
  });

  it("keeps the checked-in editable v2 example aligned with the API template", async () => {
    const contents = await readFile(new URL("../examples/kv-store.system-canvas.json", import.meta.url), "utf8");
    const document = parseBoardDocument(JSON.parse(contents) as unknown);
    expect(document).toMatchObject({ schemaVersion: 2, id: "kv-store-learning-map", revision: 0, scene: kvTemplate().scene });
  });

  it("is listed by the API and creates independent revision-zero boards", async () => {
    const directory = await mkdtemp(join(tmpdir(), "system-canvas-kv-template-"));
    let sequence = 0;
    const store = new FileBoardStore({ dataDirectory: directory, idFactory: () => `kv-copy-${++sequence}` });
    const app = await buildApp({ store });

    try {
      const templatesResponse = await app.inject({ method: "GET", url: "/api/templates" });
      expect(templatesResponse.statusCode).toBe(200);
      expect(templatesResponse.json().templates).toContainEqual({ id: "kv-store", name: kvTemplate().name, description: kvTemplate().description, elementCount: kvTemplate().scene.elements.length });

      const firstResponse = await app.inject({ method: "POST", url: "/api/boards", payload: { name: "KV Store", templateId: "kv-store" } });
      expect(firstResponse.statusCode).toBe(201);
      const first = firstResponse.json<BoardDocument>();
      expect(first).toMatchObject({ name: "KV Store", revision: 0, scene: kvTemplate().scene });

      first.scene.elements[0].x = -99_999;
      const secondResponse = await app.inject({ method: "POST", url: "/api/boards", payload: { name: "Another copy", templateId: "kv-store" } });
      const second = secondResponse.json<BoardDocument>();
      expect(secondResponse.statusCode).toBe(201);
      expect(second.id).not.toBe(first.id);
      expect(second.scene.elements[0].x).not.toBe(-99_999);
      expect(kvTemplate().scene.elements).toEqual(second.scene.elements);
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
