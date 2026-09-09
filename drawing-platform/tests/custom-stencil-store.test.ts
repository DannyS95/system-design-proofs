import { describe, expect, it } from "vitest";
import type { CanvasSystemElement } from "../shared/contracts.js";
import {
  createCustomStencilStore,
  instantiateCustomStencil,
} from "../src/data/custom-stencil-store.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const node: CanvasSystemElement = {
  id: "cache-node",
  type: "system",
  x: 40,
  y: 50,
  width: 220,
  height: 110,
  rotation: 0,
  locked: true,
  style: {
    fill: "#ffffff",
    stroke: "#0b7285",
    strokeWidth: 2,
    strokeStyle: "solid",
    opacity: 1,
    textColor: "#1f2937",
  },
  iconId: "cache",
  title: "Feed cache",
  subtitle: "Hot posts in RAM",
  variant: "cache",
};

describe("custom component library", () => {
  it("persists the customized content and style", () => {
    const store = createCustomStencilStore(new MemoryStorage());

    const saved = store.save(node);

    expect(store.list()).toEqual([saved]);
    expect(saved).toMatchObject({
      name: "Feed cache",
      role: "Hot posts in RAM",
      iconId: "cache",
      accent: "#0b7285",
      element: node,
    });
  });

  it("places an independent unlocked copy at the requested point", () => {
    const store = createCustomStencilStore(new MemoryStorage());
    const saved = store.save(node);

    const copy = instantiateCustomStencil(saved, { x: 500, y: 300 });

    expect(copy.id).not.toBe(node.id);
    expect(copy).toMatchObject({
      x: 390,
      y: 245,
      locked: false,
      title: "Feed cache",
      subtitle: "Hot posts in RAM",
    });
  });

  it("ignores malformed stored entries", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "system-canvas:custom-stencils:v1",
      JSON.stringify([{ id: "broken" }]),
    );

    expect(createCustomStencilStore(storage).list()).toEqual([]);
  });

  it("rejects an invalid component before writing it to storage", () => {
    const storage = new MemoryStorage();
    const store = createCustomStencilStore(storage);

    expect(() => store.save({ ...node, title: "" })).toThrow(
      "customStencil.scene.elements[0].title: must not be empty",
    );
    expect(store.list()).toEqual([]);
  });
});
