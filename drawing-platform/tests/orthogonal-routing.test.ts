import { describe, expect, it } from "vitest";
import type { CanvasPoint } from "../shared/contracts.js";
import { routeOrthogonal, routeOrthogonalWithPorts } from "../shared/orthogonal-routing.js";

const isOrthogonal = (points: CanvasPoint[]) => points.slice(1).every((point, index) =>
  point[0] === points[index][0] || point[1] === points[index][1]);

describe("orthogonal obstacle routing", () => {
  it("finds a deterministic route out of an enclosure requiring several turns", () => {
    const obstacles = [
      { x: -40, y: -60, width: 180, height: 30 },
      { x: -40, y: 30, width: 180, height: 30 },
      { x: 120, y: -40, width: 20, height: 80 },
    ];
    const route = routeOrthogonal([0, 0], [200, 0], obstacles, [], 24)!;
    expect(route).toBeDefined();
    expect(route.length).toBeGreaterThanOrEqual(5);
    expect(route[0]).toEqual([0, 0]);
    expect(route.at(-1)).toEqual([200, 0]);
    expect(isOrthogonal(route)).toBe(true);
    expect(route.some(([x]) => x <= -40)).toBe(true);
    expect(routeOrthogonal([0, 0], [200, 0], obstacles, [], 24)).toEqual(route);
  });

  it("uses the larger neighboring clearance for parallel lanes", () => {
    const route = routeOrthogonal([0, 30], [200, 30], [], [{
      points: [[0, 0], [200, 0]], clearance: 48,
    }], 24)!;
    expect(route).toBeDefined();
    expect(isOrthogonal(route)).toBe(true);
    const horizontal = route.slice(1).map((end, index) => [route[index], end])
      .filter(([start, end]) => start[1] === end[1]);
    expect(horizontal.every(([start]) => Math.abs(start[1]) >= 48)).toBe(true);
  });

  it("detours around an existing route instead of crossing it", () => {
    const route = routeOrthogonal([0, 0], [200, 0], [], [{
      points: [[100, -50], [100, 50]], clearance: 24,
    }], 24)!;
    expect(route.some(([, y]) => Math.abs(y) >= 74)).toBe(true);
    expect(isOrthogonal(route)).toBe(true);
  });

  it("checks existing diagonal mechanism segments as crossing obstacles", () => {
    const route = routeOrthogonal([0, 0], [200, 0], [], [{
      points: [[80, -50], [120, 50]], clearance: 24,
    }], 24)!;
    expect(route.length).toBeGreaterThan(2);
    expect(route.some(([, y]) => Math.abs(y) >= 74)).toBe(true);
  });

  it("only permits a nonplanar crossing through an explicit fallback", () => {
    const ring = [{ points: [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]] as CanvasPoint[],
      clearance: 16 }];
    expect(routeOrthogonal([0, 0], [100, 0], [], ring, 16)).toBeUndefined();
    const fallback = routeOrthogonal([0, 0], [100, 0], [], ring, 16, { allowCrossings: true });
    expect(fallback).toBeDefined();
    expect(isOrthogonal(fallback!)).toBe(true);
  });

  it("returns no route when an endpoint is inside a forbidden card or work is exhausted", () => {
    expect(routeOrthogonal([0, 0], [200, 0], [
      { x: -10, y: -10, width: 20, height: 20 },
    ], [], 24)).toBeUndefined();
    expect(routeOrthogonal([0, 0], [200, 100], [], [], 24, { maxVisited: 0 })).toBeUndefined();
  });

  it("finds an untrapped alternative port in one planar search", () => {
    const ring = [{ points: [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]] as CanvasPoint[],
      clearance: 16 }];
    expect(routeOrthogonal([0, 0], [140, 0], [], ring, 16)).toBeUndefined();
    const route = routeOrthogonalWithPorts([[0, 0], [80, 0]], [[140, 0]], [], ring, 16)!;
    expect(route[0]).toEqual([80, 0]);
    expect(route.at(-1)).toEqual([140, 0]);
    expect(isOrthogonal(route)).toBe(true);
  });

  it("discards blocked port alternatives while retaining valid alternatives", () => {
    const obstacle = { x: -10, y: -10, width: 20, height: 20 };
    const route = routeOrthogonalWithPorts([[0, 0], [40, 0]], [[100, 0]], [obstacle], [], 24)!;
    expect(route).toEqual([[40, 0], [100, 0]]);
    expect(routeOrthogonalWithPorts([], [[100, 0]], [], [], 24)).toBeUndefined();
  });
});
