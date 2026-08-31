import { describe, expect, it, vi } from "vitest";

let convertedId = 0;

// Excalidraw 0.18.1's browser bundle imports roughjs without a file extension,
// which Node cannot load directly. The production build exercises the real
// package; this narrow adapter mock keeps the unit test focused on the
// skeleton-to-editor contract and generated insertion identity.
vi.mock("@excalidraw/excalidraw", () => ({
  convertToExcalidrawElements: (
    skeleton: readonly Record<string, unknown>[] | null,
  ): Record<string, unknown>[] =>
    (skeleton ?? []).map((element) => ({
      angle: 0,
      backgroundColor: "transparent",
      boundElements: null,
      fillStyle: "solid",
      frameId: null,
      height: 0,
      index: "a0",
      isDeleted: false,
      link: null,
      locked: false,
      opacity: 100,
      roughness: 0,
      seed: 1,
      strokeColor: "#000000",
      strokeStyle: "solid",
      strokeWidth: 1,
      updated: 1,
      version: 1,
      versionNonce: 1,
      width: 0,
      ...element,
      id: `converted-${++convertedId}`,
    })),
}));

import {
  STENCIL_CATALOG,
  STENCIL_CATEGORIES,
  STENCIL_HEIGHT,
  STENCIL_WIDTH,
  createStencilElements,
  createStencilSkeleton,
  getStencilById,
  getStencilsByCategory,
  searchStencils,
} from "../src/stencils";

describe("stencil catalog", () => {
  it("populates every required category with unique vendor-neutral entries", () => {
    const ids = new Set(STENCIL_CATALOG.map((stencil) => stencil.id));

    expect(ids.size).toBe(STENCIL_CATALOG.length);
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

    expect(getStencilById("load-balancer")?.category).toBe("Routing");
    expect(getStencilById("message-queue")?.category).toBe("Distributed Data");
    expect(getStencilById("cpu")?.category).toBe("Hardware");
    expect(getStencilById("disk")?.category).toBe("Hardware");
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
    expect(searchStencils("not-a-real-component")).toEqual([]);
    expect(searchStencils(" ")).toBe(STENCIL_CATALOG);
  });
});

describe("stencil conversion", () => {
  it("centers a native, editable skeleton at the requested scene point", () => {
    const center = { x: 640, y: 360 };
    const skeleton = createStencilSkeleton(
      "key-value-store",
      center,
      "test-group",
    );
    const card = skeleton[0];

    expect(card).toMatchObject({
      type: "rectangle",
      x: center.x - STENCIL_WIDTH / 2,
      y: center.y - STENCIL_HEIGHT / 2,
      width: STENCIL_WIDTH,
      height: STENCIL_HEIGHT,
      groupIds: ["test-group"],
    });
    expect(skeleton.every((element) => element.groupIds?.[0] === "test-group")).toBe(
      true,
    );
    expect(skeleton.map((element) => element.type)).toEqual([
      "rectangle",
      "ellipse",
      "text",
      "text",
    ]);
  });

  it("produces valid grouped Excalidraw elements for every category", () => {
    for (const category of STENCIL_CATEGORIES) {
      const stencil = getStencilsByCategory(category)[0];
      const elements = createStencilElements(stencil, { x: 120, y: 80 });
      const groups = new Set(elements.flatMap((element) => element.groupIds));

      expect(elements.length).toBeGreaterThanOrEqual(4);
      expect(groups.size).toBe(1);
      expect(elements.every((element) => element.id.length > 0)).toBe(true);
      expect(elements.every((element) => element.isDeleted === false)).toBe(true);
      expect(elements.some((element) => element.type === "text")).toBe(true);
    }
  });

  it("creates independent identifiers on repeated insertion", () => {
    const first = createStencilElements("cpu", { x: 0, y: 0 });
    const second = createStencilElements("cpu", { x: 0, y: 0 });

    expect(first.map(({ id }) => id)).not.toEqual(second.map(({ id }) => id));
    expect(first[0].groupIds).not.toEqual(second[0].groupIds);
  });

  it("rejects unknown catalog identifiers", () => {
    expect(() => createStencilElements("unknown", { x: 0, y: 0 })).toThrow(
      "Unknown stencil: unknown",
    );
  });
});
