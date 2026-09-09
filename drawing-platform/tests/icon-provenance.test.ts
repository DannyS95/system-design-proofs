import { describe, expect, it } from "vitest";

import type { CanvasElementStyle, CanvasSystemElement } from "../shared/contracts.js";
import { getElementVisualProvenance } from "../src/editor/icon-provenance.js";

const style: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#2563eb",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#17212b",
};

describe("canvas icon provenance", () => {
  it("reports the actual project-owned SVG registry instead of inventing a package", () => {
    const element: CanvasSystemElement = {
      id: "cache",
      type: "system",
      x: 0,
      y: 0,
      width: 240,
      height: 100,
      rotation: 0,
      style,
      iconId: "cache",
      title: "Cache",
      variant: "cache",
    };

    expect(getElementVisualProvenance(element)).toMatchObject({
      source: expect.stringMatching(/project-owned SystemIcon registry.*no icon package/i),
      name: "cache",
      sourceFile: "src/editor/SystemIcon.tsx",
      kind: "custom SVG",
      category: "Distributed Data",
      why: expect.stringMatching(/memory-chip.*fast temporary memory.*Cache.*metadata/is),
    });
  });

  it("uses the placed object's architecture layer rather than another stencil's role", () => {
    const element: CanvasSystemElement = {
      id: "vite",
      type: "system",
      x: 0,
      y: 0,
      width: 240,
      height: 100,
      rotation: 0,
      style,
      iconId: "worker",
      title: "Vite build / dev tool",
      variant: "service",
      metadata: { layer: "Build tooling" },
    };

    expect(getElementVisualProvenance(element)).toMatchObject({
      name: "worker",
      category: "Build tooling",
      why: expect.stringMatching(/processing or transformation.*Vite build \/ dev tool.*metadata/is),
    });
  });
});
