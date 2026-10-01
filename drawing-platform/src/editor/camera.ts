import { LAYOUT_STANDARD, SPACING } from "../../shared/layout-standard.js";

export interface Point {
  x: number;
  y: number;
}

export interface Camera {
  /** Screen-space translation, in CSS pixels. */
  x: number;
  /** Screen-space translation, in CSS pixels. */
  y: number;
  zoom: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 4;

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const worldToScreen = (point: Point, camera: Camera): Point => ({
  x: point.x * camera.zoom + camera.x,
  y: point.y * camera.zoom + camera.y,
});

export const screenToWorld = (point: Point, camera: Camera): Point => ({
  x: (point.x - camera.x) / camera.zoom,
  y: (point.y - camera.y) / camera.zoom,
});

export const panCamera = (camera: Camera, delta: Point): Camera => ({
  ...camera,
  x: camera.x + delta.x,
  y: camera.y + delta.y,
});

/** Keeps the same world coordinate under the pointer while zooming. */
export const zoomCameraAt = (
  camera: Camera,
  screenPoint: Point,
  requestedZoom: number,
): Camera => {
  const zoom = clampZoom(requestedZoom);
  const worldPoint = screenToWorld(screenPoint, camera);
  return {
    x: screenPoint.x - worldPoint.x * zoom,
    y: screenPoint.y - worldPoint.y * zoom,
    zoom,
  };
};

export const viewportCenterInWorld = (
  camera: Camera,
  viewport: { width: number; height: number },
): Point =>
  screenToWorld(
    { x: viewport.width / 2, y: viewport.height / 2 },
    camera,
  );

export const fitCameraToBounds = (
  bounds: Bounds,
  viewport: { width: number; height: number },
  padding: number = SPACING.sibling,
): Camera => {
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const zoom = clampZoom(
    Math.min(
      availableWidth / Math.max(1, bounds.width),
      availableHeight / Math.max(1, bounds.height),
      1.25,
    ),
  );
  return {
    x: viewport.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: viewport.height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  };
};

/** Generated scenes open at a readable scale; explicit Fit still fits all. */
export const initialCameraForBounds = (
  bounds: Bounds,
  viewport: { width: number; height: number },
  focus?: Point,
  padding: number = SPACING.sibling,
): Camera => {
  const fitted = fitCameraToBounds(bounds, viewport, padding);
  const zoom = Math.min(LAYOUT_STANDARD.maxInitialZoom,
    Math.max(LAYOUT_STANDARD.minInitialZoom, fitted.zoom));
  if (focus) {
    return { x: viewport.width / 2 - focus.x * zoom, y: viewport.height / 2 - focus.y * zoom, zoom };
  }
  return {
    x: bounds.width * zoom + padding * 2 > viewport.width
      ? padding - bounds.x * zoom
      : viewport.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: bounds.height * zoom + padding * 2 > viewport.height
      ? padding - bounds.y * zoom
      : viewport.height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  };
};

/** Convert DOM wheel units (pixels, lines, or pages) into stable CSS pixels. */
export const wheelDeltaInPixels = (
  delta: Point,
  deltaMode: number,
  viewportHeight: number,
): Point => {
  const factor = deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1;
  return { x: delta.x * factor, y: delta.y * factor };
};
