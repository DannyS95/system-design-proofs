import { describe, expect, it } from "vitest";

import {
  createEmptyScene,
  type BoardScene,
  type CanvasConnectorElement,
  type CanvasElement,
  type CanvasElementStyle,
  type CanvasShapeElement,
  type CanvasSystemElement,
  type CanvasTextElement,
} from "../shared/contracts.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { layoutGeneratedScene, tidySceneLayout } from "../shared/generated-layout.js";
import { LAYOUT_STANDARD, SPACING } from "../shared/layout-standard.js";
import { validateBoardLayout } from "../shared/layout-validator.js";
import { parseBoardScene } from "../shared/validation.js";
import {
  getConnectorLabelBounds,
  getSystemTextLayout,
  measureTextWidth,
  minimumTextHeight,
} from "../src/editor/text-layout.js";

const style: CanvasElementStyle = {
  fill: "#ffffff", stroke: "#496b8a", strokeWidth: 2,
  strokeStyle: "solid", opacity: 1, textColor: "#17212b",
};
const card = (id: string, x = 0, y = 0, overrides: Partial<CanvasSystemElement> = {}): CanvasSystemElement => ({
  id, type: "system", x, y, width: 160, height: 80, rotation: 0, style,
  iconId: "server", title: id, subtitle: "versioned RAM copy", variant: "cache", ...overrides,
});
const heading = (id: string, x: number, y: number, parentId?: string): CanvasTextElement => ({
  id, type: "text", x, y, width: 800, height: 24, rotation: 0, style,
  text: "REQUEST ROUTING", fontSize: 20, fontFamily: "sans", fontWeight: 700, align: "left",
  ...(parentId ? { parentId } : {}),
});
const frame = (id: string, x: number, y: number, parentId?: string): CanvasShapeElement => ({
  id, type: "shape", shape: "rectangle", x, y, width: 1800, height: 1000,
  rotation: 0, style, layoutRole: "container", ...(parentId ? { parentId } : {}),
});
const route = (id: string, from: CanvasSystemElement, to: CanvasSystemElement, label?: string): CanvasConnectorElement => ({
  id, type: "connector", x: from.x + from.width, y: from.y + from.height / 2,
  width: to.x - from.x - from.width, height: 0, rotation: 0, style,
  points: [[0, 0], [to.x - from.x - from.width, 0]],
  startArrow: "none", endArrow: "arrow", startBinding: from.id, endBinding: to.id,
  ...(label ? { label } : {}),
});
const sceneWith = (...elements: CanvasElement[]): BoardScene => ({ ...createEmptyScene(), elements });
const element = <T extends CanvasElement>(scene: BoardScene, id: string): T => {
  const found = scene.elements.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing fixture element ${id}`);
  return found as T;
};
const right = (item: CanvasElement) => item.x + item.width;
const bottom = (item: CanvasElement) => item.y + item.height;

describe("shared generated layout pipeline", () => {
  it("preserves deliberate container padding during packing and compaction", () => {
    const outer = { ...frame("plane", 0, 0), containerPadding: SPACING.section };
    const child = card("service", 100, 100, { parentId: outer.id });
    const scene = layoutGeneratedScene(sceneWith(outer, child));
    expect(parseBoardScene(scene)).toEqual(scene);
    expect(() => parseBoardScene(sceneWith({ ...outer, containerPadding: -1 }, child))).toThrow();
    const packed = element<CanvasShapeElement>(scene, outer.id);
    const content = element<CanvasSystemElement>(scene, child.id);
    expect(content.x - packed.x).toBe(SPACING.section);
    expect(content.y - packed.y).toBe(SPACING.section);
    expect(right(packed) - right(content)).toBe(SPACING.section);
    expect(bottom(packed) - bottom(content)).toBe(SPACING.section);
    expect(validateBoardLayout(scene)).toEqual([]);
  });

  it("puts a plain section heading above the component row instead of beside its first card", () => {
    const input = sceneWith(heading("request-heading", 20, 20), card("Client", 20, 65), card("API", 240, 65));
    const laidOut = layoutGeneratedScene(input);
    const title = element<CanvasTextElement>(laidOut, "request-heading");
    const client = element<CanvasSystemElement>(laidOut, "Client");
    const api = element<CanvasSystemElement>(laidOut, "API");

    expect(client.y - bottom(title)).toBeGreaterThanOrEqual(SPACING.compact);
    expect(api.y).toBe(client.y);
    expect(title.x).toBe(client.x);
    expect(laidOut.elements.some((item) => item.type === "shape")).toBe(false);
  });

  it("measures arbitrary content before placing neighbors, with no clipping or oversized empty cards", () => {
    const short = card("short", 0, 0, { title: "Cache", subtitle: "TTL=60s", body: "Miss → origin", width: 1500, height: 600 });
    const long = card("long", 100, 0, {
      title: "WWWW request ownership and 缓存节点 selection across the replica set",
      subtitle: "partition key=user_id · replica factor=3",
      body: "Select the newest version returned by the required quorum and refill the selected shard after an authoritative read.",
      width: 24, height: 24,
    });
    const input = sceneWith(short, long);
    const before = structuredClone(input);
    const first = layoutGeneratedScene(input);
    const second = layoutGeneratedScene(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(element(first, "short").width).toBeLessThan(short.width);
    expect(element(first, "short").height).toBeLessThan(short.height);
    const fitted = element<CanvasSystemElement>(first, "long");
    const text = getSystemTextLayout(fitted);
    expect(fitted.height).toBeGreaterThanOrEqual(minimumTextHeight(fitted));
    expect(text.title.lines.length + (text.body?.lines.length ?? 0)).toBeGreaterThan(2);
    expect(text.title.lines.every((line) => measureTextWidth(line, text.title.fontSize) <= text.width)).toBe(true);
    expect(text.body?.lines.every((line) => measureTextWidth(line, text.body!.fontSize) <= text.width)).toBe(true);
    expect(fitted.x - right(element(first, "short"))).toBeGreaterThanOrEqual(SPACING.sibling);
    expect(validateBoardLayout(first)).toEqual([]);
  });

  it("shrink-wraps nested frames around separate header and child rows", () => {
    const outer = frame("outer", 0, 0);
    const inner = { ...frame("inner", 40, 80, "outer"), width: 1000, height: 650 };
    const input = sceneWith(
      outer, heading("outer-label", 20, 12, "outer"),
      inner, heading("inner-label", 60, 92, "inner"),
      card("replica-a", 60, 110, { parentId: "inner", body: "Temporary RAM copy" }),
      card("replica-b", 100, 115, { parentId: "inner", body: "Temporary RAM copy" }),
    );
    const laidOut = layoutGeneratedScene(input);
    for (const id of ["inner", "outer"]) {
      const parent = element<CanvasShapeElement>(laidOut, id);
      const children = laidOut.elements.filter((child) => child.parentId === id);
      expect(Math.min(...children.map((child) => child.x)) - parent.x).toBe(LAYOUT_STANDARD.sectionPadding);
      expect(Math.min(...children.map((child) => child.y)) - parent.y).toBe(LAYOUT_STANDARD.sectionPadding);
      expect(right(parent) - Math.max(...children.map(right))).toBe(LAYOUT_STANDARD.sectionPadding);
      expect(bottom(parent) - Math.max(...children.map(bottom))).toBe(LAYOUT_STANDARD.sectionPadding);
    }
    const first = element(laidOut, "replica-a"), second = element(laidOut, "replica-b");
    const clearX = Math.max(second.x - right(first), first.x - right(second));
    const clearY = Math.max(second.y - bottom(first), first.y - bottom(second));
    expect(Math.max(clearX, clearY)).toBeGreaterThanOrEqual(SPACING.sibling);
    expect(first.y - bottom(element(laidOut, "inner-label"))).toBeGreaterThanOrEqual(SPACING.compact);
    expect(element(laidOut, "outer").width).toBeLessThan(outer.width);
    expect(element(laidOut, "outer").height).toBeLessThan(outer.height);
    expect(validateBoardLayout(laidOut)).toEqual([]);
  });

  it("reserves a connected-card corridor for the measured operation label", () => {
    const source = card("API", 0, 0), target = card("Database", 200, 0);
    const input = sceneWith(source, target, route("fallback", source, target, "MISS · READ AUTHORITATIVE VERSION"));
    const laidOut = layoutGeneratedScene(input);
    const from = element(laidOut, source.id), to = element(laidOut, target.id);
    const connector = element<CanvasConnectorElement>(laidOut, "fallback");
    const label = getConnectorLabelBounds(connector)!;

    expect(to.x - right(from)).toBeGreaterThanOrEqual(label.width + SPACING.connector * 2);
    expect(label.x).toBeGreaterThan(right(from));
    expect(label.x + label.width).toBeLessThan(to.x);
    expect(validateBoardLayout(laidOut)).toEqual([]);
  });

  it("preserves a named mechanism's local ring and token geometry under common translation", () => {
    const ring: CanvasShapeElement = {
      ...frame("ring-outline", 800, 600), shape: "ellipse", width: 400, height: 400,
      layoutRole: "mechanism", layoutGroup: "custom-placement-ring",
    };
    const top: CanvasShapeElement = {
      ...ring, id: "north-token", x: 970, y: 570, width: 60, height: 60, iconId: "virtual-node",
    };
    const east: CanvasShapeElement = { ...top, id: "east-token", x: 1170, y: 770 };
    const input = sceneWith(heading("key-placement-heading", 800, 520), ring, top, east);
    const laidOut = layoutGeneratedScene(input);
    const fittedRing = element<CanvasShapeElement>(laidOut, ring.id);

    expect(fittedRing).toMatchObject({ shape: "ellipse", width: 400, height: 400 });
    for (const token of [top, east]) {
      const moved = element<CanvasShapeElement>(laidOut, token.id);
      expect([moved.x - fittedRing.x, moved.y - fittedRing.y, moved.width, moved.height])
        .toEqual([token.x - ring.x, token.y - ring.y, token.width, token.height]);
    }
  });

  it("applies a chosen tidy profile to spacing while preserving authored text and typography", () => {
    const source = card("Source", 0, 0, { titleFontSize: 31, bodyFontSize: 22, body: "Custom consequence" });
    const target = card("Target", 450, 0, { titleFontSize: 31, bodyFontSize: 22, body: "Custom consequence" });
    const input = sceneWith(source, target);
    const before = structuredClone(input);
    const compact = tidySceneLayout(input, { nodeGap: 32, edgeClearance: 24 });
    const spacious = tidySceneLayout(input, { nodeGap: 128, edgeClearance: 72 });

    expect(spacious.appState.layoutSpacing).toEqual({ nodeGap: 128, edgeClearance: 72 });
    expect(element(spacious, "Target").x - right(element(spacious, "Source")))
      .toBeGreaterThan(element(compact, "Target").x - right(element(compact, "Source")));
    expect(element(spacious, "Source")).toMatchObject({ titleFontSize: 31, bodyFontSize: 22, title: "Source", body: "Custom consequence" });
    expect(input).toEqual(before);
  });

  it("increases separation between independent arrows when the applied clearance grows", () => {
    const source = card("Source", 0, 0), target = card("Target", 450, 0);
    const input = sceneWith(source, target, route("read", source, target), route("write", source, target));
    const compact = tidySceneLayout(input, { nodeGap: 32, edgeClearance: 24 });
    const spacious = tidySceneLayout(input, { nodeGap: 32, edgeClearance: 72 });
    const portDistance = (scene: BoardScene) => {
      const read = element<CanvasConnectorElement>(scene, "read");
      const write = element<CanvasConnectorElement>(scene, "write");
      return Math.abs(read.y + read.points[0][1] - write.y - write.points[0][1]);
    };

    expect(portDistance(spacious)).toBeGreaterThanOrEqual(72);
    expect(portDistance(spacious)).toBeGreaterThan(portDistance(compact));
    expect(validateBoardLayout(spacious)).toEqual([]);
  });
});


describe("whole-board tidy", () => {
  it("separates nodes dropped at exactly the same coordinates without a selection", () => {
    const input = sceneWith(card("A"), card("B"), card("C"));
    const next = tidySceneLayout(input, { nodeGap: 128, edgeClearance: 24 });
    const [a, b, c] = next.elements;
    expect(b.x - right(a)).toBeGreaterThanOrEqual(128);
    expect(c.x - right(b)).toBeGreaterThanOrEqual(128);
    expect(input.elements.every(item => item.x === 0)).toBe(true);
  });

  it("does not move locked objects or let deleted objects affect layout", () => {
    expect(() => tidySceneLayout(sceneWith(card("locked", 0, 0, { locked: true })), { nodeGap: 64, edgeClearance: 24 })).toThrow(/Unlock/);
    const deleted = card("deleted", 0, 0, { deleted: true, locked: true });
    const next = tidySceneLayout(sceneWith(card("A"), deleted), { nodeGap: 64, edgeClearance: 24 });
    expect(next.elements[1]).toEqual(deleted);
    const empty = tidySceneLayout(createEmptyScene(), { nodeGap: 64, edgeClearance: 24 });
    expect(empty.appState.camera).toEqual(createEmptyScene().appState.camera);
  });
});


it("reroutes the hash-ring exit when increasing clearance blocks its old port", () => {
  let scene = structuredClone(DEFAULT_TEMPLATES.find(template => template.id === "distributed-cache")!.scene);
  scene.elements.forEach(element => { element.locked = false; });
  const ids = scene.elements.map(element => element.id);
  for (const spacing of [
    { nodeGap: 32, edgeClearance: 24 }, { nodeGap: 96, edgeClearance: 24 },
    { nodeGap: 160, edgeClearance: 24 }, { nodeGap: 160, edgeClearance: 64 },
    { nodeGap: 160, edgeClearance: 96 },
  ]) scene = tidySceneLayout(scene, spacing);
  expect(scene.appState.layoutSpacing).toEqual({ nodeGap: 160, edgeClearance: 96 });
  expect(scene.elements.map(element => element.id)).toEqual(ids);
  const exit = element<CanvasConnectorElement>(scene, "selected-vnode-to-shard-b");
  expect(exit.startBinding).toBe("vnode-b-selected");
  expect(exit.endBinding).toBe("cache-shard-b-logical");
  expect(exit.points.length).toBeGreaterThan(1);
});
