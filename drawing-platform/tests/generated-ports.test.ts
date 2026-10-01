import { describe, expect, it } from "vitest";
import { createEmptyScene, type CanvasConnectorElement, type CanvasShapeElement } from "../shared/contracts.js";
import { layoutGeneratedScene } from "../shared/generated-layout.js";

const style = { fill: "#ffffff", stroke: "#3972d6", strokeWidth: 2,
  strokeStyle: "solid" as const, opacity: 1, textColor: "#17212b" };
const node = (id: string, x: number, y: number, shape: CanvasShapeElement["shape"] = "rectangle"): CanvasShapeElement => ({
  id, type: "shape", shape, label: id, x, y, width: 120, height: 120, rotation: 0, style,
});
const route = (id: string, source: CanvasShapeElement, target: CanvasShapeElement): CanvasConnectorElement => ({
  id, type: "connector", x: source.x + source.width, y: source.y + source.height / 2,
  width: target.x - source.x - source.width, height: target.y - source.y, rotation: 0, style,
  points: [[0, 0], [target.x - source.x - source.width, target.y - source.y]],
  startArrow: "none", endArrow: "arrow", startBinding: source.id, endBinding: target.id,
});

describe("generated connector ports", () => {
  it("keeps each independent endpoint distinct after assigning placed destination sides", () => {
    const source = node("source", 0, 160);
    const top = node("top", 350, 0), middle = node("middle", 350, 160), bottom = node("bottom", 350, 320);
    const scene = layoutGeneratedScene({ ...createEmptyScene(), elements: [
      source, top, middle, bottom,
      route("z-bottom", source, bottom), route("a-top", source, top), route("m-middle", source, middle),
    ] });
    const endpoints = scene.elements.filter((e): e is CanvasConnectorElement => e.type === "connector")
      .map((e) => [e.x + e.points[0][0], e.y + e.points[0][1]]);
    expect(new Set(endpoints.map((p) => p.join(","))).size).toBe(3);
    const placed = scene.elements.find((e) => e.id === source.id)!;
    expect(endpoints.every(([x, y]) =>
      ((x === placed.x || x === placed.x + placed.width) && y >= placed.y && y <= placed.y + placed.height) ||
      ((y === placed.y || y === placed.y + placed.height) && x >= placed.x && x <= placed.x + placed.width))).toBe(true);
  });

  it.each(["ellipse", "diamond"] as const)("terminates ports on the visible %s boundary", (kind) => {
    const source = node("source", 0, 160, kind), target = node("target", 350, 160);
    const scene = layoutGeneratedScene({ ...createEmptyScene(), elements: [source, target, route("request", source, target)] });
    const placed = scene.elements.find((e) => e.id === source.id)!;
    const connector = scene.elements.find((e): e is CanvasConnectorElement => e.type === "connector")!;
    const x = (connector.x + connector.points[0][0] - placed.x - placed.width / 2) / (placed.width / 2);
    const y = (connector.y + connector.points[0][1] - placed.y - placed.height / 2) / (placed.height / 2);
    expect(kind === "ellipse" ? x * x + y * y : Math.abs(x) + Math.abs(y)).toBeCloseTo(1);
  });
});
