import { describe, expect, it } from "vitest";

import type {
  CanvasElementStyle,
  CanvasShapeElement,
  CanvasSystemElement,
} from "../shared/contracts.js";
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

  it("preserves registry provenance for an icon-bearing logical shape", () => {
    const token: CanvasShapeElement = {
      id: "vnode-b-selected",
      type: "shape",
      shape: "ellipse",
      x: 0,
      y: 0,
      width: 64,
      height: 72,
      rotation: 0,
      style,
      label: "vB2",
      iconId: "virtual-node",
      metadata: { layer: "Key placement" },
    };

    expect(getElementVisualProvenance(token)).toMatchObject({
      source: expect.stringMatching(/project-owned SystemIcon registry.*no icon package/i),
      name: "virtual-node",
      sourceFile: "src/editor/SystemIcon.tsx",
      kind: "custom SVG",
      category: "Key placement",
      why: expect.stringMatching(/token dot on a ring.*vB2/is),
    });
  });
});
