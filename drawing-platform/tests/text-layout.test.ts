import { describe, expect, it } from "vitest";

import type {
  CanvasElementStyle,
  CanvasSystemElement,
} from "../shared/contracts.js";
import {
  getConnectorLabelLayout,
  getShapeTextLayout,
  getSystemTextLayout,
  minimumTextHeight,
  minimumTextWidth,
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
