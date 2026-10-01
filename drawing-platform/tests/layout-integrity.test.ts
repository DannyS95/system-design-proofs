import { describe, expect, it, vi } from "vitest";

import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { createEmptyScene, type CanvasConnectorElement, type CanvasElement, type CanvasShapeElement, type CanvasSystemElement } from "../shared/contracts.js";
import { arrowheadSize, connectorClearance, SPACING } from "../shared/layout-standard.js";
import { validateBoardLayout } from "../shared/layout-validator.js";
import { getConnectorLabelBounds, minimumTextHeight, preferredTextWidth } from "../src/editor/text-layout.js";
import * as textLayout from "../src/editor/text-layout.js";

const style = {
  fill: "#ffffff", stroke: "#344054", strokeWidth: 2,
  strokeStyle: "solid" as const, opacity: 1, textColor: "#1d2939",
};
const rectangle = (id: string, x: number, y: number, width = 60, height = 60): CanvasShapeElement => ({
  id, type: "shape", shape: "rectangle", x, y, width, height, rotation: 0, style,
});
const card = (id: string, x = 0, y = 0): CanvasSystemElement => {
  const element: CanvasSystemElement = {
    ...rectangle(id, x, y), type: "system", title: "Cache", subtitle: "TTL = 60s",
    body: "Miss → database", iconId: "cache", variant: "cache",
  };
  element.width = preferredTextWidth(element);
  element.height = minimumTextHeight(element);
  return element;
};
const route = (
  id: string, points: [number, number][], options: Partial<CanvasConnectorElement> = {},
): CanvasConnectorElement => ({
  id, type: "connector", x: 0, y: 0,
  width: Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)),
  height: Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y)),
  rotation: 0, style, points, startArrow: "none", endArrow: "arrow", ...options,
});
const check = (...elements: CanvasElement[]) =>
  validateBoardLayout({ ...createEmptyScene(), elements });
const codes = (...elements: CanvasElement[]) => check(...elements).map(({ code }) => code);

describe("generated board layout validator rejects geometry regressions", () => {
  it("accepts measured content, separated arrows, and boundary attachments without mutating the scene", () => {
    const source = card("source");
    const target = card("target", source.width + 180);
    const connector = route("read", [[source.width, source.height / 2], [target.x, source.height / 2]], {
      label: "read", startBinding: source.id, endBinding: target.id,
    });
    const scene = { ...createEmptyScene(), elements: [source, target, connector] };
    const before = structuredClone(scene);
    expect(validateBoardLayout(scene)).toEqual([]);
    expect(scene).toEqual(before);
  });

  it("detects narrow and clipped content independently of renderer auto-growth", () => {
    expect(codes({ ...card("clipped"), height: 12 })).toContain("text-overflow");
    expect(codes({ ...card("narrow"), width: 12 })).toContain("text-overflow");
    expect(codes({ ...rectangle("caption", 0, 0, 30, 24), label: "UnbreakableConfiguration", fontSize: 24 }))
      .toContain("text-overflow");
  });

  it("rejects oversized cards and banners even when their text fits", () => {
    expect(codes({ ...card("empty-bottom"), height: 400 })).toContain("oversized-element");
    expect(codes({ ...card("empty-side"), width: 1500 })).toContain("oversized-element");
  });

  it("allows space actually occupied by boundary ports without exempting phantom bindings", () => {
    const node = { ...card("ports"), height: 240 };
    const high = route("high", [[node.width, 22], [node.width + 120, 22]], { startBinding: node.id });
    const low = route("low", [[node.width, 218], [node.width + 120, 218]], { startBinding: node.id });
    expect(codes(node, high, low)).not.toContain("oversized-element");
    expect(codes(node, high)).toContain("oversized-element");
    expect(codes(node, { ...high, x: 100 }, { ...low, x: 100 })).toContain("oversized-element");
  });

  it("requires explicit nesting and fits containers to their children", () => {
    const parent = { ...rectangle("group", 0, 0, 124, 124), layoutRole: "container" as const };
    const child = { ...rectangle("child", 32, 32), parentId: parent.id };
    expect(check(parent, child)).toEqual([]);
    expect(codes(parent, { ...child, parentId: undefined })).toContain("element-overlap");
    expect(codes(parent, { ...child, x: 100 })).toContain("child-outside-parent");
    expect(codes({ ...parent, height: 600 }, child)).toContain("oversized-container");
  });

  it("allows an explicit ring mechanism but still detects colliding ring tokens", () => {
    const ring = {
      ...rectangle("ring", 0, 0, 240, 240), shape: "ellipse" as const,
      layoutRole: "mechanism" as const, layoutGroup: "hash-ring",
    };
    const token = { ...rectangle("token", 210, 100, 40, 40), layoutGroup: "hash-ring" };
    expect(check(ring, token)).toEqual([]);
    expect(codes(ring, token, { ...token, id: "second-token", y: 110 })).toContain("element-overlap");
    expect(codes({ ...ring, layoutGroup: undefined }, token)).toContain("element-overlap");
  });

  it("detects label collisions, including labels next to unrelated nodes", () => {
    const a = route("read", [[0, 100], [240, 100]], { label: "GET", labelPosition: [120, 60] });
    const b = route("write", [[0, 200], [240, 200]], { label: "SET", labelPosition: [125, 60] });
    expect(codes(a, b)).toContain("label-overlap");
    expect(codes(a, rectangle("node", 115, 50))).toContain("label-element-overlap");
  });

  it("detects a rendered label plate that undercuts its wrapped text", () => {
    const getBounds = textLayout.getConnectorLabelBounds;
    const brokenPlate = vi.spyOn(textLayout, "getConnectorLabelBounds").mockImplementation((element) => {
      const bounds = getBounds(element);
      return bounds ? { ...bounds, width: 10, height: 10 } : undefined;
    });
    try {
      expect(codes(route("clipped-label", [[0, 0], [200, 0]], { label: "GET" })))
        .toContain("label-overflow");
    } finally { brokenPlate.mockRestore(); }
  });

  it("detects lines crossing their own or another connector's label", () => {
    const labeled = route("read", [[0, 100], [240, 100]], { label: "GET", labelPosition: [120, 60] });
    const crossing = route("monitor", [[120, 0], [120, 90]]);
    expect(codes(labeled, crossing)).toContain("label-route-crossing");
    expect(codes({ ...labeled, labelPosition: [120, 100] })).toContain("label-route-crossing");
    const bounds = getConnectorLabelBounds(labeled)!;
    expect(bounds.y + bounds.height).toBeLessThan(100);
  });

  it("detects crossings through nodes when both route endpoints are outside", () => {
    expect(codes(rectangle("unrelated", 80, 80), route("cut-through", [[0, 100], [200, 100]])))
      .toContain("connector-element-crossing");
    expect(codes({ ...rectangle("rotated", 80, 80), rotation: Math.PI / 4 }, route("diagonal", [[0, 0], [200, 200]])))
      .toContain("connector-element-crossing");
  });

  it("detects coincident paths regardless of direction or segment subdivision", () => {
    const first = route("a", [[0, 100], [200, 100]]);
    const reversed = route("b", [[200, 100], [150, 100], [40, 100]]);
    expect(codes(first, reversed)).toContain("coincident-routes");
    expect(codes(first, route("c", [[200, 100], [300, 100]]))).not.toContain("coincident-routes");
  });

  it("makes parallel clearance relative to both neighboring arrows and strokes", () => {
    const thin = route("thin", [[0, 100], [200, 100]]);
    const thick = route("thick", [[0, 125], [200, 125]], { style: { ...style, strokeWidth: 12 } });
    const gap = connectorClearance(thin, thick);
    expect(gap).toBeGreaterThan(connectorClearance(thin, thin));
    expect(codes(thin, thick)).toContain("parallel-route-clearance");
    expect(codes(thin, { ...thick, points: [[0, 100 + gap], [200, 100 + gap]] }))
      .not.toContain("parallel-route-clearance");
    expect(arrowheadSize(200)).toBe(14);
    expect(arrowheadSize(1)).toBe(10);
  });

  it("checks diagonal parallel segments and independent route intersections", () => {
    const a = route("a", [[0, 0], [100, 100]]);
    const b = route("b", [[0, 10], [100, 110]]);
    expect(codes(a, b)).toContain("parallel-route-clearance");
    expect(codes(a, route("cross", [[0, 100], [100, 0]]))).toContain("route-crossing");
  });

  it("rejects arrowheads entering target or unrelated content", () => {
    const target = rectangle("target", 100, 50);
    expect(codes(target, route("inside", [[0, 80], [120, 80]], { endBinding: target.id })))
      .toContain("arrowhead-interior");
    expect(codes(target, route("boundary", [[0, 80], [100, 80]], { endBinding: target.id })))
      .not.toContain("arrowhead-interior");
    // A tip outside a card is insufficient: the arrow's wing can still enter it.
    expect(codes(rectangle("near-wing", 89, 81, 8, 8), route("wing", [[0, 80], [100, 80]])))
      .toContain("arrowhead-interior");
  });

  it("checks arrow wings against label plates as well as route centerlines", () => {
    const arrow = route("arrow-wing", [[0, 80], [100, 80]]);
    const label = route("nearby-label", [[0, 200], [200, 200]], {
      label: "X", fontSize: 14, labelPosition: [98, 98],
    });
    expect(codes(arrow, label)).toContain("arrowhead-label-overlap");
  });

  it("detects accidental empty board strips without inspecting camera or board identity", () => {
    expect(codes(card("left"), card("right", 2200))).toContain("excessive-content-bounds");
    expect(codes(card("top"), card("bottom", 0, 2200))).toContain("excessive-content-bounds");
    expect(codes(card("near"), card("next", 0, 100 + SPACING.section)))
      .not.toContain("excessive-content-bounds");
    expect(codes(card("near-loop"), route("empty-loop", [[250, 20], [6000, 20], [6000, 80], [250, 80]])))
      .toContain("excessive-content-bounds");
  });

  it("ignores deleted and invisible objects without hiding live failures", () => {
    const node = card("visible");
    expect(check(node, { ...node, id: "deleted", deleted: true }, {
      ...node, id: "invisible", style: { ...style, opacity: 0 },
    })).toEqual([]);
  });
});

describe("every selectable built-in template follows the shared layout standard", () => {
  for (const template of DEFAULT_TEMPLATES) {
    it(`${template.id} has no layout integrity defects`, () => {
      expect(validateBoardLayout(template.scene)).toEqual([]);
    });
  }
});
