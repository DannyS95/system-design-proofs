import type {
  BoardScene,
  CanvasConnectorElement,
  CanvasElement,
  CanvasElementStyle,
  CanvasPoint,
} from "../../shared/contracts.js";
import { arrowheadSize, LAYOUT_STANDARD } from "../../shared/layout-standard.js";
import type { Bounds, Point } from "./camera.js";
import {
  getConnectorLabelBounds,
  minimumTextHeight,
  minimumTextWidth,
  preferredTextWidth,
} from "./text-layout.js";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_SCENE_BYTES = 4 * 1024 * 1024;
export const DEFAULT_NODE_WIDTH = 216;
export const DEFAULT_NODE_HEIGHT = 104;
export const MIN_ELEMENT_SIZE = 24;

export const DEFAULT_STYLE: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#344054",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#1d2939",
};

export const CONNECTOR_STYLE: CanvasElementStyle = {
  fill: "transparent",
  stroke: "#3972d6",
  strokeWidth: 2.25,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#244f99",
};

export const cloneScene = (scene: BoardScene): BoardScene => structuredClone(scene);

export const createCanvasId = (prefix: string): string => {
  const suffix = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

export const dashArray = (
  style: CanvasElementStyle["strokeStyle"],
): string | undefined => {
  if (style === "dashed") return "8 6";
  if (style === "dotted") return "2 6";
  return undefined;
};

/** Returns the visual midpoint along an elbow connector, not its bounding box. */
export const polylineMidpoint = (points: readonly CanvasPoint[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0][0], y: points[0][1] };

  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return {
      from: previous,
      to: point,
      length: Math.hypot(point[0] - previous[0], point[1] - previous[1]),
    };
  });
  const target = segments.reduce((sum, segment) => sum + segment.length, 0) / 2;
  let travelled = 0;
  for (const segment of segments) {
    if (travelled + segment.length >= target) {
      const ratio = segment.length === 0 ? 0 : (target - travelled) / segment.length;
      return {
        x: segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
        y: segment.from[1] + (segment.to[1] - segment.from[1]) * ratio,
      };
    }
    travelled += segment.length;
  }
  const last = points.at(-1) ?? [0, 0];
  return { x: last[0], y: last[1] };
};

export const getElementBounds = (element: CanvasElement): Bounds => {
  if (element.type !== "connector") {
    const width = Math.max(element.width, minimumTextWidth(element));
    const height = Math.max(element.height, minimumTextHeight({ ...element, width }));
    if (!element.rotation) return { x: element.x, y: element.y, width, height };
    const cosine = Math.abs(Math.cos(element.rotation));
    const sine = Math.abs(Math.sin(element.rotation));
    const rotatedWidth = width * cosine + height * sine;
    const rotatedHeight = width * sine + height * cosine;
    return {
      x: element.x + (width - rotatedWidth) / 2,
      y: element.y + (height - rotatedHeight) / 2,
      width: rotatedWidth,
      height: rotatedHeight,
    };
  }

  const xs = element.points.map(([x]) => element.x + x);
  const ys = element.points.map(([, y]) => element.y + y);
  const markerPadding =
    element.startArrow === "arrow" || element.endArrow === "arrow"
      ? arrowheadSize(element.style.strokeWidth) / 2 : 0;
  const linePadding = markerPadding + element.style.strokeWidth / 2;
  let x = Math.min(...xs) - linePadding;
  let y = Math.min(...ys) - linePadding;
  let right = Math.max(...xs) + linePadding;
  let bottom = Math.max(...ys) + linePadding;

  const label = getConnectorLabelBounds(element);
  if (label) {
    x = Math.min(x, label.x);
    y = Math.min(y, label.y);
    right = Math.max(right, label.x + label.width);
    bottom = Math.max(bottom, label.y + label.height);
  }
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
};

export const getSceneBounds = (elements: readonly CanvasElement[]): Bounds => {
  const visible = elements.filter((element) => !element.deleted);
  if (visible.length === 0) return { x: -240, y: -160, width: 480, height: 320 };
  const bounds = visible.map(getElementBounds);
  const left = Math.min(...bounds.map(({ x }) => x));
  const top = Math.min(...bounds.map(({ y }) => y));
  const right = Math.max(...bounds.map(({ x, width }) => x + width));
  const bottom = Math.max(...bounds.map(({ y, height }) => y + height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

export const pointInsideElement = (point: Point, element: CanvasElement): boolean => {
  if (element.type === "connector" || element.deleted) return false;
  return (
    point.x >= element.x &&
    point.x <= element.x + element.width &&
    point.y >= element.y &&
    point.y <= element.y + element.height
  );
};

export const findElementAt = (
  elements: readonly CanvasElement[],
  point: Point,
  exceptId?: string,
): CanvasElement | undefined =>
  [...elements]
    .reverse()
    .find((element) => element.id !== exceptId && pointInsideElement(point, element));

export const updateElement = (
  scene: BoardScene,
  elementId: string,
  update: (element: CanvasElement) => CanvasElement,
): BoardScene => ({
  ...scene,
  elements: scene.elements.map((element) =>
    element.id === elementId ? update(element) : element,
  ),
});

/**
 * Keep connector geometry canonical: x/y are the visual top-left and
 * width/height are the actual point extents. This makes inspector dimensions
 * trustworthy even after a bound endpoint moves into negative local space.
 */
export const normalizeConnectorGeometry = (
  connector: CanvasConnectorElement,
): CanvasConnectorElement => {
  if (connector.points.length === 0) return connector;
  const absolute = connector.points.map(([x, y]) => [
    connector.x + x,
    connector.y + y,
  ] as CanvasPoint);
  const xs = absolute.map(([x]) => x);
  const ys = absolute.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return {
    ...connector,
    x,
    y,
    width: right - x,
    height: bottom - y,
    points: absolute.map(([pointX, pointY]) => [pointX - x, pointY - y]),
    ...(connector.labelPosition ? {
      labelPosition: [connector.x + connector.labelPosition[0] - x,
        connector.y + connector.labelPosition[1] - y] as CanvasPoint,
    } : {}),
  };
};

type RouteAxis = "horizontal" | "vertical";

const routeAxis = (from: CanvasPoint, to: CanvasPoint): RouteAxis =>
  Math.abs(to[0] - from[0]) >= Math.abs(to[1] - from[1])
    ? "horizontal"
    : "vertical";

const routeTwoEndpoints = (
  start: CanvasPoint,
  end: CanvasPoint,
  preferredAxis: RouteAxis,
): CanvasPoint[] => {
  if (start[0] === end[0] || start[1] === end[1]) return [start, end];
  if (preferredAxis === "horizontal") {
    const middleX = start[0] + (end[0] - start[0]) / 2;
    return [start, [middleX, start[1]], [middleX, end[1]], end];
  }
  const middleY = start[1] + (end[1] - start[1]) / 2;
  return [start, [start[0], middleY], [end[0], middleY], end];
};

/** Move one route endpoint while preserving the adjacent orthogonal segment. */
const moveRouteEndpoint = (
  source: readonly CanvasPoint[],
  endpoint: "start" | "end",
  nextPoint: CanvasPoint,
): CanvasPoint[] => {
  const points = source.map(([x, y]) => [x, y] as CanvasPoint);
  const endpointIndex = endpoint === "start" ? 0 : points.length - 1;
  const neighborIndex = endpoint === "start" ? 1 : points.length - 2;
  const oldPoint = points[endpointIndex];
  const neighbor = points[neighborIndex];
  const axis = routeAxis(oldPoint, neighbor);

  if (points.length === 2) {
    return endpoint === "start"
      ? routeTwoEndpoints(nextPoint, points[1], axis)
      : routeTwoEndpoints(points[0], nextPoint, axis);
  }

  points[endpointIndex] = nextPoint;
  if (axis === "horizontal") points[neighborIndex][1] = nextPoint[1];
  else points[neighborIndex][0] = nextPoint[0];
  return points;
};

/** Keep a persisted label beside its owning straight segment after rerouting. */
const withConnectorPoints = (
  connector: CanvasConnectorElement,
  points: CanvasPoint[],
): CanvasConnectorElement => {
  if (!connector.labelPosition) return { ...connector, points };
  const center = connector.labelPosition;
  const candidates = connector.points.slice(1).map((end, index) => {
    const start = connector.points[index];
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((center[0] - start[0]) * dx + (center[1] - start[1]) * dy) / lengthSquared));
    const anchor: CanvasPoint = [start[0] + dx * ratio, start[1] + dy * ratio];
    return { index, ratio, anchor, axis: routeAxis(start, end),
      distance: Math.hypot(center[0] - anchor[0], center[1] - anchor[1]) };
  }).sort((a, b) => a.distance - b.distance);
  const owner = candidates[0];
  if (!owner) return { ...connector, points };
  const index = points.length === connector.points.length ? owner.index :
    points.slice(1).map((end, candidateIndex) => {
      const start = points[candidateIndex];
      return { index: candidateIndex, axis: routeAxis(start, end),
        length: Math.hypot(end[0] - start[0], end[1] - start[1]) };
    }).sort((a, b) => Number(b.axis === owner.axis) - Number(a.axis === owner.axis) ||
      b.length - a.length)[0]?.index ?? 0;
  const start = points[index], end = points[index + 1];
  if (!start || !end) return { ...connector, points };
  return { ...connector, points, labelPosition: [
    start[0] + (end[0] - start[0]) * owner.ratio + center[0] - owner.anchor[0],
    start[1] + (end[1] - start[1]) * owner.ratio + center[1] - owner.anchor[1],
  ] };
};

export const moveBoundConnectors = (
  scene: BoardScene,
  elementId: string,
  delta: Point,
): BoardScene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.type !== "connector") return element;
    if (element.startBinding !== elementId && element.endBinding !== elementId) {
      return element;
    }
    if (
      element.startBinding === elementId &&
      element.endBinding === elementId
    ) {
      return normalizeConnectorGeometry(withConnectorPoints(element,
        element.points.map(([x, y]) => [
          x + delta.x,
          y + delta.y,
        ]),
      ));
    }

    let points = element.points.map(([x, y]) => [x, y] as CanvasPoint);
    if (element.startBinding === elementId) {
      points = moveRouteEndpoint(points, "start", [
        points[0][0] + delta.x,
        points[0][1] + delta.y,
      ]);
    }
    if (element.endBinding === elementId) {
      const last = points.length - 1;
      points = moveRouteEndpoint(points, "end", [
        points[last][0] + delta.x,
        points[last][1] + delta.y,
      ]);
    }
    return normalizeConnectorGeometry(withConnectorPoints(element, points));
  }),
});

const scaleBoundPoint = (
  point: CanvasPoint,
  connector: Extract<CanvasElement, { type: "connector" }>,
  oldElement: CanvasElement,
  nextElement: CanvasElement,
): CanvasPoint => {
  const absolute = {
    x: connector.x + point[0],
    y: connector.y + point[1],
  };
  const xRatio = oldElement.width === 0
    ? 0.5
    : (absolute.x - oldElement.x) / oldElement.width;
  const yRatio = oldElement.height === 0
    ? 0.5
    : (absolute.y - oldElement.y) / oldElement.height;
  return [
    nextElement.x + xRatio * nextElement.width - connector.x,
    nextElement.y + yRatio * nextElement.height - connector.y,
  ];
};

/** Resize one element and keep every bound connector endpoint attached. */
const resizeElementAndBoundConnectorsOnce = (
  scene: BoardScene,
  elementId: string,
  requestedWidth: number,
  requestedHeight: number,
): BoardScene => {
  const oldElement = scene.elements.find((element) => element.id === elementId);
  if (!oldElement) return scene;
  if (oldElement.type === "connector") {
    const normalized = normalizeConnectorGeometry(oldElement);
    // Inspector drafts are displayed to two decimals. Treat that rounding as
    // unchanged so a label-only Apply never detaches an otherwise valid route.
    const widthChanged = Math.abs(requestedWidth - oldElement.width) >= 0.005;
    const heightChanged = Math.abs(requestedHeight - oldElement.height) >= 0.005;
    const width = widthChanged
      ? Math.max(0, requestedWidth)
      : normalized.width;
    const height = heightChanged
      ? Math.max(0, requestedHeight)
      : normalized.height;
    const scaleAxis = (
      value: number,
      oldExtent: number,
      nextExtent: number,
      index: number,
      count: number,
    ) => oldExtent === 0
      ? (count <= 1 ? 0 : (index / (count - 1)) * nextExtent)
      : value * (nextExtent / oldExtent);
    return updateElement(scene, elementId, (element) => {
      if (element.type !== "connector") return element;
      const resized = normalizeConnectorGeometry(withConnectorPoints(normalized,
        normalized.points.map(([x, y], index) => [
          scaleAxis(x, normalized.width, width, index, normalized.points.length),
          scaleAxis(y, normalized.height, height, index, normalized.points.length),
        ] as CanvasPoint),
      ));
      if (widthChanged || heightChanged) {
        delete resized.startBinding;
        delete resized.endBinding;
      }
      return resized;
    });
  }

  const width = Math.max(
    MIN_ELEMENT_SIZE,
    requestedWidth,
    minimumTextWidth(oldElement),
  );
  const provisional = { ...oldElement, width, height: requestedHeight };
  const height = Math.max(
    MIN_ELEMENT_SIZE,
    requestedHeight,
    minimumTextHeight(provisional),
  );
  const nextElement = { ...oldElement, width, height };

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (element.id === elementId) return nextElement;
      if (element.type !== "connector") return element;
      if (
        element.startBinding !== elementId &&
        element.endBinding !== elementId
      ) {
        return element;
      }
      let points = element.points.map(([x, y]) => [x, y] as CanvasPoint);
      const nextStart = element.startBinding === elementId
        ? scaleBoundPoint(points[0], element, oldElement, nextElement)
        : undefined;
      const last = points.length - 1;
      const nextEnd = element.endBinding === elementId
        ? scaleBoundPoint(points[last], element, oldElement, nextElement)
        : undefined;
      if (element.startBinding === elementId) {
        points = moveRouteEndpoint(points, "start", nextStart!);
      }
      if (element.endBinding === elementId) {
        points = moveRouteEndpoint(points, "end", nextEnd!);
      }
      return normalizeConnectorGeometry(withConnectorPoints(element, points));
    }),
  };
};

const expandParentContainers = (
  scene: BoardScene,
  childId: string,
  padding = LAYOUT_STANDARD.sectionPadding,
): BoardScene => {
  let next = scene;
  let currentId: string | undefined = childId;
  const visited = new Set<string>();

  while (currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const child = next.elements.find(({ id }) => id === currentId);
    const parentId = child?.parentId;
    if (!child || parentId === undefined) break;
    const parent = next.elements.find(({ id }) => id === parentId);
    if (!parent || parent.type !== "shape") break;
    const internalPadding = parent.containerPadding ?? padding;
    const childBounds = getElementBounds(child);
    const requiredWidth = Math.max(
      parent.width,
      childBounds.x + childBounds.width + internalPadding - parent.x,
    );
    const requiredHeight = Math.max(
      parent.height,
      childBounds.y + childBounds.height + internalPadding - parent.y,
    );
    next = resizeElementAndBoundConnectorsOnce(
      next,
      parent.id,
      requiredWidth,
      requiredHeight,
    );
    currentId = parent.id;
  }
  return next;
};

/**
 * Resize one element, enforce its wrapped-content floor, reroute bound
 * connectors, and enlarge any declared visual container that now needs space.
 */
export const resizeElementAndBoundConnectors = (
  scene: BoardScene,
  elementId: string,
  requestedWidth: number,
  requestedHeight: number,
): BoardScene => {
  const resized = resizeElementAndBoundConnectorsOnce(
    scene,
    elementId,
    requestedWidth,
    requestedHeight,
  );
  const element = resized.elements.find(({ id }) => id === elementId);
  return !element || element.type === "connector"
    ? resized
    : expandParentContainers(resized, elementId);
};

export interface FitElementToContentOptions {
  /** Grow toward the natural line width until the per-element maximum. */
  growWidth?: boolean;
}

/** Enforce content-aware width/height and keep routes and containers current. */
export const fitElementToContent = (
  scene: BoardScene,
  elementId: string,
  options: FitElementToContentOptions = {},
): BoardScene => {
  const element = scene.elements.find((candidate) => candidate.id === elementId);
  if (!element || element.type === "connector" || element.type === "image") {
    return scene;
  }
  const width = Math.max(
    element.width,
    options.growWidth ? preferredTextWidth(element) : minimumTextWidth(element),
  );
  const provisional = { ...element, width };
  const height = Math.max(element.height, minimumTextHeight(provisional));
  return width > element.width || height > element.height
    ? resizeElementAndBoundConnectors(scene, elementId, width, height)
    : expandParentContainers(scene, elementId);
};

/** Increase height only when wrapped text would otherwise leave its object. */
export const fitElementHeightToText = (
  scene: BoardScene,
  elementId: string,
): BoardScene => fitElementToContent(scene, elementId);

/** Repair imported or legacy scenes before their first interactive render. */
export const fitSceneToContent = (scene: BoardScene): BoardScene =>
  scene.elements.reduce(
    (current, element) => fitElementToContent(current, element.id),
    scene,
  );

/** Remove an element while retaining detached routes, children and local annotations. */
export const deleteElementAndDetachBindings = (
  scene: BoardScene,
  elementId: string,
): BoardScene => {
  const elements = scene.elements
    .filter((element) => element.id !== elementId)
    .map((element) => {
      const detached = { ...element };
      if (detached.parentId === elementId) delete detached.parentId;
      // A removed destination leaves a plain editable annotation, just as a
      // removed parent leaves its children and a removed node leaves its route.
      if (detached.referenceId === elementId) delete detached.referenceId;
      if (detached.type === "connector") {
        if (detached.startBinding === elementId) delete detached.startBinding;
        if (detached.endBinding === elementId) delete detached.endBinding;
      }
      return detached;
    });
  const referencedFiles = new Set(
    elements.flatMap((element) =>
      element.type === "image" ? [element.fileId] : [],
    ),
  );
  return {
    ...scene,
    elements,
    files: Object.fromEntries(
      Object.entries(scene.files).filter(([fileId]) => referencedFiles.has(fileId)),
    ),
  };
};
