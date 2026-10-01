import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEmptyScene } from "../shared/contracts";
import { CANVAS_PALETTE, LAYOUT_STANDARD } from "../shared/layout-standard";
import { validateBoardLayout } from "../shared/layout-validator";

import {
  SYSTEM_ICON_IDS,
  SystemIcon,
  isSystemIconId,
} from "../src/editor/SystemIcon";
import {
  STENCIL_CATALOG,
  STENCIL_CATEGORIES,
  createStencilElements,
  getStencilById,
  getStencilsByCategory,
  searchStencils,
} from "../src/stencils";

describe("stencil catalog", () => {
  it("populates every category with unique vendor-neutral icons", () => {
    const ids = new Set(STENCIL_CATALOG.map((stencil) => stencil.id));
    const iconIds = new Set(
      STENCIL_CATALOG.map((stencil) => stencil.iconId),
    );

    expect(ids.size).toBe(STENCIL_CATALOG.length);
    expect(iconIds.size).toBe(STENCIL_CATALOG.length);
    expect(STENCIL_CATEGORIES).toEqual([
      "Routing",
      "Services",
      "Distributed Data",
      "Systems",
      "Hardware",
    ]);

    for (const category of STENCIL_CATEGORIES) {
      expect(getStencilsByCategory(category).length).toBeGreaterThanOrEqual(5);
    }

    expect(STENCIL_CATALOG.every(({ iconId }) => isSystemIconId(iconId))).toBe(
      true,
    );
    expect(new Set(SYSTEM_ICON_IDS).size).toBe(SYSTEM_ICON_IDS.length);
    expect(SYSTEM_ICON_IDS).toEqual(
      expect.arrayContaining([
        "browser",
        "whiteboard",
        "workspace",
        "local-storage",
        "file-snapshot",
        "template-grid",
        "image",
        "import-export",
        "origin-shield",
        "control-plane",
      ]),
    );
    expect(getStencilById("load-balancer")?.category).toBe("Routing");
    expect(getStencilById("message-queue")?.category).toBe("Distributed Data");
    expect(getStencilById("cpu")?.category).toBe("Hardware");
    expect(getStencilById("disk")?.category).toBe("Hardware");
  });

  it("draws a distinct geometric mark for every routing layer", () => {
    const routingIcons = getStencilsByCategory("Routing").map(
      ({ iconId }) =>
        renderToStaticMarkup(
          createElement(SystemIcon, { iconId }),
        ),
    );

    expect(new Set(routingIcons).size).toBe(routingIcons.length);
    expect(routingIcons.every((markup) => markup.includes("<svg"))).toBe(true);
    expect(routingIcons.every((markup) => !markup.includes("<text"))).toBe(
      true,
    );
  });

  it("uses the shared muted palette and the routing, placement, and monitoring colors", () => {
    const colors = new Set<string>(Object.values(CANVAS_PALETTE));
    expect(STENCIL_CATALOG.every((stencil) => colors.has(stencil.accent))).toBe(true);
    expect(getStencilById("load-balancer")?.accent).toBe(CANVAS_PALETTE.blue);
    expect(getStencilById("data-router")?.accent).toBe(CANVAS_PALETTE.purple);
    expect(getStencilById("partition")?.accent).toBe(CANVAS_PALETTE.purple);
    expect(getStencilById("cache")?.accent).toBe(CANVAS_PALETTE.green);
    expect(getStencilById("telemetry")?.accent).toBe(CANVAS_PALETTE.cyan);
  });

  it("searches names, roles, categories, and keywords case-insensitively", () => {
    expect(searchStencils("  CONSISTENT   HASH ").map(({ id }) => id)).toEqual([
      "data-router",
    ]);
    expect(searchStencils("distributed async").map(({ id }) => id)).toContain(
      "message-queue",
    );
    expect(searchStencils("HaNdLeR").map(({ id }) => id)).toEqual([
      "application-router",
    ]);
    expect(searchStencils("observation").map(({ id }) => id)).toEqual([
      "telemetry",
    ]);
    expect(searchStencils("not-a-real-component")).toEqual([]);
    expect(searchStencils(" ")).toBe(STENCIL_CATALOG);
  });
});

describe("stencil conversion", () => {
  it("centers one semantic system node at the requested scene point", () => {
    const center = { x: 640, y: 360 };
    const elements = createStencilElements("key-value-store", center);

    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      type: "system",
      iconId: "key-value-store",
      title: "Key-Value Store",
      subtitle: "Reads and writes by key",
      variant: "storage",
      rotation: 0,
      titleFontSize: LAYOUT_STANDARD.titleFontSize,
      bodyFontSize: LAYOUT_STANDARD.bodyFontSize,
      style: {
        fill: CANVAS_PALETTE.white,
        stroke: CANVAS_PALETTE.green,
        textColor: CANVAS_PALETTE.ink,
      },
    });
    expect(elements[0].x + elements[0].width / 2).toBe(center.x);
    expect(elements[0].y + elements[0].height / 2).toBe(center.y);
  });

  it("shrink-wraps short cards and wraps long content without a fixed size floor", () => {
    const definition = getStencilById("cpu")!;
    const [short] = createStencilElements({ ...definition, role: "" });
    const [long] = createStencilElements({
      ...definition,
      role: "An application processor executes instructions and coordinates memory access across multiple concurrent workloads. ".repeat(3),
    });
    expect(short.width).toBeLessThan(224);
    expect(short.height).toBeLessThan(112);
    expect(long.width).toBeLessThanOrEqual(LAYOUT_STANDARD.maxSystemWidth);
    expect(long.height).toBeGreaterThan(short.height);
    expect(validateBoardLayout({ ...createEmptyScene(), elements: [short] })).toEqual([]);
    expect(validateBoardLayout({ ...createEmptyScene(), elements: [long] })).toEqual([]);
  });

  it("produces a complete semantic node for every category", () => {
    for (const category of STENCIL_CATEGORIES) {
      const stencil = getStencilsByCategory(category)[0];
      const [element] = createStencilElements(stencil, { x: 120, y: 80 });

      expect(element.id.length).toBeGreaterThan(0);
      expect(element.type).toBe("system");
      expect(element.iconId).toBe(stencil.iconId);
      expect(element.title).toBe(stencil.name);
      expect(element.subtitle).toBe(stencil.role);
      expect(element.style.stroke).toBe(stencil.accent);
    }
  });

  it("fits every built-in stencil without changing catalog definitions", () => {
    const before = structuredClone(STENCIL_CATALOG);
    for (const stencil of STENCIL_CATALOG) {
      const elements = createStencilElements(stencil);
      expect(validateBoardLayout({ ...createEmptyScene(), elements })).toEqual([]);
    }
    expect(STENCIL_CATALOG).toEqual(before);
  });

  it("creates independent identifiers on repeated insertion", () => {
    const [first] = createStencilElements("cpu", { x: 0, y: 0 });
    const [second] = createStencilElements("cpu", { x: 0, y: 0 });

    expect(first.id).not.toBe(second.id);
  });

  it("rejects unknown catalog identifiers", () => {
    expect(() => createStencilElements("unknown", { x: 0, y: 0 })).toThrow(
      "Unknown stencil: unknown",
    );
  });
});
