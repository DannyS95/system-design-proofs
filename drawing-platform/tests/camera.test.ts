import { describe, expect, it } from "vitest";

import {
  MAX_ZOOM,
  MIN_ZOOM,
  fitCameraToBounds,
  initialCameraForBounds,
  panCamera,
  screenToWorld,
  viewportCenterInWorld,
  wheelDeltaInPixels,
  worldToScreen,
  zoomCameraAt,
} from "../src/editor/camera.js";

describe("infinite canvas camera", () => {
  it("round-trips signed world coordinates without clamping", () => {
    const camera = { x: 415, y: -208, zoom: 0.42 };
    const point = { x: -1_250_000, y: 940_000 };

    expect(screenToWorld(worldToScreen(point, camera), camera)).toEqual(point);
  });

  it("pans in screen pixels", () => {
    expect(panCamera({ x: 10, y: 20, zoom: 2 }, { x: -7, y: 13 })).toEqual({
      x: 3,
      y: 33,
      zoom: 2,
    });
  });

  it("keeps the world point under the pointer fixed while zooming", () => {
    const camera = { x: 80, y: 44, zoom: 0.75 };
    const pointer = { x: 610, y: 330 };
    const before = screenToWorld(pointer, camera);
    const afterCamera = zoomCameraAt(camera, pointer, 2.25);

    expect(screenToWorld(pointer, afterCamera)).toEqual(before);
  });

  it("clamps zoom and computes viewport-centered insertion", () => {
    expect(zoomCameraAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 99).zoom).toBe(
      MAX_ZOOM,
    );
    expect(zoomCameraAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 0.001).zoom).toBe(
      MIN_ZOOM,
    );
    expect(
      viewportCenterInWorld({ x: -200, y: 100, zoom: 2 }, { width: 800, height: 600 }),
    ).toEqual({ x: 300, y: 100 });
  });

  it("fits content without exceeding the editor zoom range", () => {
    const camera = fitCameraToBounds(
      { x: -500, y: 200, width: 1_000, height: 500 },
      { width: 1_200, height: 800 },
    );

    expect(camera.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(camera.zoom).toBeLessThanOrEqual(MAX_ZOOM);
    expect(worldToScreen({ x: 0, y: 450 }, camera)).toEqual({ x: 600, y: 400 });
  });

  it("normalizes pixel, line, and page wheel gestures for canvas panning", () => {
    expect(wheelDeltaInPixels({ x: 4, y: 10 }, 0, 900)).toEqual({ x: 4, y: 10 });
    expect(wheelDeltaInPixels({ x: 2, y: 3 }, 1, 900)).toEqual({ x: 32, y: 48 });
    expect(wheelDeltaInPixels({ x: 0, y: 1 }, 2, 900)).toEqual({ x: 0, y: 900 });
  });

  it("opens a large generated board readably without changing explicit Fit", () => {
    const bounds = { x: -100, y: 80, width: 2800, height: 1800 };
    const viewport = { width: 1200, height: 800 };
    const initial = initialCameraForBounds(bounds, viewport);
    const fitted = fitCameraToBounds(bounds, viewport);
    expect(initial.zoom).toBe(0.7);
    expect(fitted.zoom).toBeLessThan(0.5);
    expect(worldToScreen({ x: bounds.x, y: bounds.y }, initial)).toEqual({ x: 32, y: 32 });
    const focus = { x: 600, y: 900 };
    expect(worldToScreen(focus, initialCameraForBounds(bounds, viewport, focus)))
      .toEqual({ x: 600, y: 400 });
  });
});
