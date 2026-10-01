import { describe, expect, it } from "vitest";
import { arrowheadSize, connectorClearance, portOffsets, requiredPortSpan, SPACING } from "../shared/layout-standard.js";

describe("shared connector geometry", () => {
  it("caps modest arrowheads in world units even for very thick routes", () => {
    expect(arrowheadSize(1)).toBe(10);
    expect(arrowheadSize(4)).toBe(12);
    expect(arrowheadSize(40)).toBe(14);
  });

  it("gives both neighboring arrow sizes a symmetric minimum clearance", () => {
    const thin = { style: { strokeWidth: 2 }, endArrow: "arrow" };
    const thick = { style: { strokeWidth: 10 }, endArrow: "arrow" };
    expect(connectorClearance(thin, thin)).toBe(SPACING.connector);
    expect(connectorClearance(thin, thick)).toBeGreaterThan(connectorClearance(thin, thin));
    expect(connectorClearance(thick, thin)).toBe(connectorClearance(thin, thick));
    expect(connectorClearance(thick, thick)).toBeGreaterThan(connectorClearance(thin, thick));
  });

  it("reserves only the edge span occupied by ports, their gaps, and padding", () => {
    const thin = { style: { strokeWidth: 2 }, endArrow: "arrow" };
    const thick = { style: { strokeWidth: 10 }, endArrow: "arrow" };
    const connectors = [thin, thick, thin];
    const required = requiredPortSpan(connectors);
    const offsets = portOffsets(connectors, required);
    expect(requiredPortSpan([])).toBe(0);
    expect(offsets[0] - arrowheadSize(2) / 2).toBe(16);
    expect(required - offsets[2] - arrowheadSize(2) / 2).toBe(16);
    expect(offsets[1] - offsets[0]).toBe(connectorClearance(thin, thick));
    expect(offsets[2] - offsets[1]).toBe(connectorClearance(thick, thin));
    expect(portOffsets(connectors, required + 40)).toEqual(offsets.map((offset) => offset + 20));
  });
});
