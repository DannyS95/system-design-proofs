import { describe, expect, it } from "vitest";

import type {
  CanvasElementStyle,
  CanvasSystemElement,
  CanvasShapeElement,
} from "../shared/contracts.js";
import {
  getConnectorLabelLayout,
  getShapeTextLayout,
  getShapeContentBounds,
  getShapeIconSize,
  getSystemTextLayout,
  minimumTextHeight,
  minimumTextWidth,
  measureTextWidth,
  preferredTextWidth,
  wrapTextLines,
} from "../src/editor/text-layout.js";

const style: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#2563eb",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#17212b",
};

const system: CanvasSystemElement = {
  id: "cache-client",
  type: "system",
  x: 0,
  y: 0,
  width: 220,
  height: 80,
  rotation: 0,
  style,
  iconId: "data-router",
  title: "Cache client and integrated key routing",
  subtitle: "code inside the application service",
  body: "Builds the key, hashes it, and chooses the owning shard.",
  variant: "routing",
};

describe("deterministic canvas text layout", () => {
  it("preserves indentation across wrapping and keeps paragraph gaps", () => {
    const lines = wrapTextLines("  Started and finished messages\n\nPeak traffic", 100, 14);
    const paragraphEnd = lines.indexOf("");
    expect(paragraphEnd).toBeGreaterThan(1);
    expect(lines.slice(0, paragraphEnd).every(line => line.startsWith("  "))).toBe(true);
    expect(lines.slice(0, paragraphEnd).map(line => line.trim()).join(" ")).toBe("Started and finished messages");
    expect(lines.every(line => measureTextWidth(line, 14) <= 100.001)).toBe(true);
    const narrow = wrapTextLines("                    status", 25, 14);
    expect(narrow.every(line => measureTextWidth(line, 14) <= 25.001)).toBe(true);
    expect(narrow.map(line => line.trim()).join("")).toBe("status");
  });

  it("includes indentation in a card's natural width", () => {
    const base = { ...system, title: "CPU", subtitle: "", body: "Receive and process messages" };
    const indented = { ...base, body: "    " + base.body };
    expect(preferredTextWidth(indented) - preferredTextWidth(base))
      .toBeCloseTo(measureTextWidth("    ", 11));
  });

  it("wraps text to the requested width while preserving explicit paragraphs", () => {
    const lines = wrapTextLines(
      "database result returns through the API\nthen the cache is refilled",
      130,
      12,
    );

    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join(" ")).toContain("database result returns through the API");
    expect(lines.join(" ")).toContain("then the cache is refilled");
  });

  it("wraps wide capitals and non-Latin glyphs without relying on character counts", () => {
    for (const value of ["WWWW MMMM", "缓存节点返回数据", "cache→Cassandra→refill"]) {
      const lines = wrapTextLines(value, 85, 18);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every((line) => measureTextWidth(line, 18) <= 85)).toBe(true);
    }
  });

  it("shrink-wraps short route labels with real padding and no banner-width floor", () => {
    // Subtracting plate padding can introduce a subpixel rounding difference.
    expect(getConnectorLabelLayout("request", 14).lines).toEqual(["request"]);
    const label = getConnectorLabelLayout("HIT", 14);
    expect(label.width).toBeLessThan(50);
    expect(label.width).toBeCloseTo(measureTextWidth("HIT", 14, "mono") + 16);
    expect(label.plateHeight).toBeCloseTo(label.height + 16);
  });

  it.each(["rectangle", "ellipse", "diamond"] as const)(
    "fits the entire text and icon stack inside a %s outline", (shape) => {
      const element: CanvasShapeElement = {
        ...system, type: "shape", shape, iconId: "partition", label: "Shard B", fontSize: 18,
      };
      element.width = preferredTextWidth(element);
      element.height = minimumTextHeight(element);
      const inner = getShapeContentBounds(element);
      const block = getShapeTextLayout(element)!;
      expect(block.lines.every((line) => measureTextWidth(line, 18) <= inner.width + 0.001)).toBe(true);
      const stackHeight = getShapeIconSize(element) + 8 + block.height;
      const cornerX = (inner.x + inner.width - element.width / 2) / (element.width / 2);
      const cornerY = (stackHeight / 2) / (element.height / 2);
      if (shape === "ellipse") expect(cornerX ** 2 + cornerY ** 2).toBeLessThan(1);
      if (shape === "diamond") expect(Math.abs(cornerX) + Math.abs(cornerY)).toBeLessThan(1);
      expect(element.height - stackHeight).toBeGreaterThanOrEqual(32);
    },
  );

  it("allows an unusually large glyph to exceed the usual prose width cap", () => {
    const element: CanvasShapeElement = {
      ...system, type: "shape", shape: "diamond", label: "缓存", fontSize: 512,
    };
    element.width = preferredTextWidth(element);
    const block = getShapeTextLayout(element)!;
    expect(element.width).toBeGreaterThan(720);
    expect(block.lines.every((line) => measureTextWidth(line, 512) <=
      getShapeContentBounds(element).width + 0.001)).toBe(true);
  });

  it("keeps a virtual-node token at its existing 64-unit circle", () => {
    const token: CanvasShapeElement = {
      ...system, type: "shape", shape: "ellipse", iconId: "virtual-node",
      label: "vB2", fontSize: 14, width: 64, height: 64,
    };
    expect(preferredTextWidth(token)).toBe(64);
    expect(minimumTextHeight(token)).toBe(64);
    expect(getShapeTextLayout(token)?.lines).toEqual(["vB2"]);
  });

  it("raises a system card's minimum height when width forces more lines", () => {
    const wide = getSystemTextLayout({ ...system, width: 420 });
    const narrow = getSystemTextLayout({ ...system, width: 190 });

    expect(narrow.title.lines.length).toBeGreaterThan(wide.title.lines.length);
    expect(narrow.minimumHeight).toBeGreaterThan(wide.minimumHeight);
    expect(minimumTextHeight({ ...system, width: 190 })).toBe(narrow.minimumHeight);
  });

  it("preserves legacy card sizes and lays out configured readable typography", () => {
    const legacy = getSystemTextLayout(system);
    const readable = getSystemTextLayout({
      ...system,
      titleFontSize: 18,
      bodyFontSize: 14,
    });

    expect(legacy.title.fontSize).toBe(15);
    expect(legacy.subtitle?.fontSize).toBe(10);
    expect(legacy.body?.fontSize).toBe(11);
    expect(readable.title.fontSize).toBe(18);
    expect(readable.title.lineHeight).toBe(22);
    expect(readable.subtitle?.fontSize).toBe(13);
    expect(readable.subtitle?.lineHeight).toBe(19);
    expect(readable.body).toMatchObject({ fontSize: 14, lineHeight: 20 });
    expect(readable.minimumHeight).toBeGreaterThan(legacy.minimumHeight);
  });

  it("uses editable shape and connector label sizes in wrapping", () => {
    const shape = getShapeTextLayout({
      width: 180,
      label: "Readable mechanism label",
      fontSize: 18,
    });
    const smallConnector = getConnectorLabelLayout("cache hit returned", 10);
    const readableConnector = getConnectorLabelLayout("cache hit returned", 14);

    expect(shape).toMatchObject({ fontSize: 18, lineHeight: 22.5 });
    expect(readableConnector.fontSize).toBe(14);
    expect(readableConnector.lineHeight).toBeCloseTo(18.2);
    expect(readableConnector.width).toBeGreaterThan(smallConnector.width);
    expect(readableConnector.height).toBeGreaterThanOrEqual(
      smallConnector.height,
    );
  });

  it("derives bounded natural widths and unbreakable-content floors", () => {
    const short = { ...system, title: "Cache", subtitle: "RAM copy", body: "" };
    const long = {
      ...system,
      title: "Cache client and integrated consistent-hash routing coordinator",
    };

    expect(preferredTextWidth(long)).toBeGreaterThan(preferredTextWidth(short));
    expect(preferredTextWidth(long)).toBeLessThanOrEqual(640);
    expect(minimumTextWidth(long)).toBeLessThanOrEqual(
      preferredTextWidth(long),
    );
    expect(minimumTextWidth({
      ...system,
      type: "shape",
      shape: "ellipse",
      label: "vB2",
      iconId: "virtual-node",
      fontSize: 20,
    })).toBeGreaterThanOrEqual(52);
  });
});
