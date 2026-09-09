import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SYSTEM_ICON_IDS,
  SystemIcon,
  isSystemIconId,
} from "../src/editor/SystemIcon";
import {
  STENCIL_CATALOG,
  STENCIL_CATEGORIES,
  STENCIL_HEIGHT,
  STENCIL_WIDTH,
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
      x: center.x - STENCIL_WIDTH / 2,
      y: center.y - STENCIL_HEIGHT / 2,
      width: STENCIL_WIDTH,
      height: STENCIL_HEIGHT,
      iconId: "key-value-store",
      title: "Key-Value Store",
      subtitle: "Reads and writes by key",
      variant: "storage",
      rotation: 0,
      style: {
        fill: "#ffffff",
        stroke: "#0b7285",
      },
    });
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
