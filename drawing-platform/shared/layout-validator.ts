import type {
  BoardScene,
  CanvasConnectorElement,
  CanvasElement,
} from "./contracts.js";
import { arrowheadSize, connectorClearance, LAYOUT_STANDARD, SPACING } from "./layout-standard.js";
import {
  getConnectorLabelBounds,
  getConnectorLabelLayout,
  measureTextWidth,
  minimumTextHeight,
  minimumTextWidth,
  preferredTextWidth,
} from "../src/editor/text-layout.js";

export type LayoutIssueCode =
  | "text-overflow"
  | "element-overlap"
  | "label-element-overlap"
  | "label-overflow"
  | "label-overlap"
  | "coincident-routes"
  | "parallel-route-clearance"
  | "route-crossing"
  | "connector-element-crossing"
  | "label-route-crossing"
  | "arrowhead-interior"
  | "arrowhead-label-overlap"
  | "child-outside-parent"
  | "oversized-element"
  | "oversized-container"
  | "excessive-content-bounds";

export interface LayoutIssue {
  code: LayoutIssueCode;
  elementIds: string[];
  message: string;
}

interface Point { x: number; y: number }
interface Rect extends Point { width: number; height: number }
interface Segment { from: Point; to: Point }

// Ignore numerical drift at a legitimate boundary attachment, not visible gaps.
const EPSILON = 0.5;
const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
const right = (rect: Rect): number => rect.x + rect.width;
const bottom = (rect: Rect): number => rect.y + rect.height;
const overlaps = (a: Rect, b: Rect, gap = 0): boolean =>
  a.x < right(b) + gap - EPSILON && right(a) > b.x - gap + EPSILON &&
  a.y < bottom(b) + gap - EPSILON && bottom(a) > b.y - gap + EPSILON;
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - EPSILON && inner.y >= outer.y - EPSILON &&
  right(inner) <= right(outer) + EPSILON && bottom(inner) <= bottom(outer) + EPSILON;

const cornersFor = (element: CanvasElement): Point[] => {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const cosine = Math.cos(element.rotation);
  const sine = Math.sin(element.rotation);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({
    x: cx + sx * element.width / 2 * cosine - sy * element.height / 2 * sine,
    y: cy + sx * element.width / 2 * sine + sy * element.height / 2 * cosine,
  }));
};

const nodeOverlap = (first: CanvasElement, second: CanvasElement): boolean => {
  if (!first.rotation && !second.rotation) return overlaps(first, second);
  const a = cornersFor(first);
  const b = cornersFor(second);
  for (const corners of [a, b]) for (let index = 0; index < 2; index += 1) {
    const edge = subtract(corners[index + 1], corners[index]);
    const length = Math.hypot(edge.x, edge.y);
    const normal = { x: -edge.y / length, y: edge.x / length };
    const pa = a.map((point) => dot(point, normal));
    const pb = b.map((point) => dot(point, normal));
    if (Math.min(...pa) >= Math.max(...pb) - EPSILON ||
        Math.min(...pb) >= Math.max(...pa) - EPSILON) return false;
  }
  return true;
};

const pointsFor = (connector: CanvasConnectorElement): Point[] =>
  connector.points.map(([x, y]) => ({ x: connector.x + x, y: connector.y + y }));
const segmentsFor = (connector: CanvasConnectorElement): Segment[] => {
  const points = pointsFor(connector);
  return points.slice(1).map((to, index) => ({ from: points[index], to }))
    .filter(({ from, to }) => Math.hypot(to.x - from.x, to.y - from.y) > EPSILON);
};

const localPoint = (point: Point, element: CanvasElement): Point => {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const cosine = Math.cos(-element.rotation);
  const sine = Math.sin(-element.rotation);
  return {
    x: (point.x - cx) * cosine - (point.y - cy) * sine + element.width / 2,
    y: (point.x - cx) * sine + (point.y - cy) * cosine + element.height / 2,
  };
};

const insideElement = (point: Point, element: CanvasElement): boolean => {
  const local = localPoint(point, element);
  const rx = element.width / 2;
  const ry = element.height / 2;
  if (rx <= EPSILON || ry <= EPSILON) return false;
  if (element.type === "shape" && element.shape === "ellipse") {
    return ((local.x - rx) / (rx - EPSILON)) ** 2 +
      ((local.y - ry) / (ry - EPSILON)) ** 2 < 1;
  }
  if (element.type === "shape" && element.shape === "diamond") {
    return Math.abs((local.x - rx) / (rx - EPSILON)) +
      Math.abs((local.y - ry) / (ry - EPSILON)) < 1;
  }
  return local.x > EPSILON && local.x < element.width - EPSILON &&
    local.y > EPSILON && local.y < element.height - EPSILON;
};

/** Liang–Barsky clipping detects crossings even when both ends are outside. */
const crossesRect = (segment: Segment, rect: Rect): boolean => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  let low = 0;
  let high = 1;
  const pairs = [
    [-dx, segment.from.x - rect.x - EPSILON],
    [dx, right(rect) - segment.from.x - EPSILON],
    [-dy, segment.from.y - rect.y - EPSILON],
    [dy, bottom(rect) - segment.from.y - EPSILON],
  ];
  for (const [p, q] of pairs) {
    if (Math.abs(p) < 1e-8) {
      if (q < 0) return false;
    } else if (p < 0) low = Math.max(low, q / p);
    else high = Math.min(high, q / p);
    if (low > high) return false;
  }
  return high - low > 1e-8;
};

const crossesElement = (segment: Segment, element: CanvasElement): boolean => {
  const local = { from: localPoint(segment.from, element), to: localPoint(segment.to, element) };
  if (!crossesRect(local, { x: 0, y: 0, width: element.width, height: element.height })) return false;
  if (element.type !== "shape" || element.shape === "rectangle") return true;
  // Minimize the ellipse/diamond's normalized distance along the segment.
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  let low = 0;
  let high = 1;
  const distance = (t: number): number => {
    const point = localPoint({ x: segment.from.x + dx * t, y: segment.from.y + dy * t }, element);
    const x = Math.abs((point.x - element.width / 2) / (element.width / 2 - EPSILON));
    const y = Math.abs((point.y - element.height / 2) / (element.height / 2 - EPSILON));
    return element.shape === "ellipse" ? x * x + y * y : x + y;
  };
  for (let index = 0; index < 36; index += 1) {
    const a = low + (high - low) / 3;
    const b = high - (high - low) / 3;
    if (distance(a) < distance(b)) high = b;
    else low = a;
  }
  return distance((low + high) / 2) < 1;
};

const properIntersection = (a: Segment, b: Segment): boolean => {
  const r = subtract(a.to, a.from);
  const s = subtract(b.to, b.from);
  const denominator = cross(r, s);
  if (Math.abs(denominator) < 1e-8) return false;
  const difference = subtract(b.from, a.from);
  const t = cross(difference, s) / denominator;
  const u = cross(difference, r) / denominator;
  const ta = EPSILON / Math.hypot(r.x, r.y);
  const tb = EPSILON / Math.hypot(s.x, s.y);
  return t > ta && t < 1 - ta && u > tb && u < 1 - tb;
};

const parallelDistance = (a: Segment, b: Segment): number | undefined => {
  const direction = subtract(a.to, a.from);
  const other = subtract(b.to, b.from);
  const length = Math.hypot(direction.x, direction.y);
  const otherLength = Math.hypot(other.x, other.y);
  if (length < EPSILON || otherLength < EPSILON ||
      Math.abs(cross(direction, other)) / (length * otherLength) > 1e-6) return undefined;
  const unit = { x: direction.x / length, y: direction.y / length };
  const from = dot(subtract(b.from, a.from), unit);
  const to = dot(subtract(b.to, a.from), unit);
  if (Math.min(length, Math.max(from, to)) - Math.max(0, Math.min(from, to)) <= EPSILON) return undefined;
  return Math.abs(cross(subtract(b.from, a.from), unit));
};

const isContainer = (element: CanvasElement, children: Map<string, CanvasElement[]>): boolean =>
  element.type === "shape" && (element.layoutRole === "container" || children.has(element.id));
const isMechanism = (element: CanvasElement): boolean =>
  element.type === "shape" && element.layoutRole === "mechanism";
const groupContains = (outer: CanvasElement, inner: CanvasElement): boolean =>
  isMechanism(outer) && Boolean(outer.layoutGroup) && outer.layoutGroup === inner.layoutGroup &&
  outer.width > inner.width && outer.height > inner.height;

/**
 * Read-only checks for generated scenes. No board IDs or positional exceptions:
 * nesting is declared with parentId, or with a mechanism base and layoutGroup.
 * Diagnostics retain element IDs so a generator can fix the owning geometry.
 */
export function validateBoardLayout(scene: BoardScene): LayoutIssue[] {
  const elements = scene.elements.filter((element) => !element.deleted && element.style.opacity > 0);
  const nodes = elements.filter((element) => element.type !== "connector");
  const connectors = elements.filter((element): element is CanvasConnectorElement => element.type === "connector");
  const byId = new Map(elements.map((element) => [element.id, element]));
  const children = new Map<string, CanvasElement[]>();
  for (const element of elements) {
    if (element.parentId) children.set(element.parentId, [...(children.get(element.parentId) ?? []), element]);
  }
  const issues: LayoutIssue[] = [];
  const seen = new Set<string>();
  const add = (code: LayoutIssueCode, elementIds: string[], message: string): void => {
    const key = `${code}:${[...elementIds].sort().join(":")}`;
    if (!seen.has(key)) { seen.add(key); issues.push({ code, elementIds, message }); }
  };
  const ancestorOf = (ancestor: CanvasElement, descendant: CanvasElement): boolean => {
    const visited = new Set<string>();
    let current = descendant;
    while (current.parentId && !visited.has(current.parentId)) {
      if (current.parentId === ancestor.id) return true;
      visited.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) return false;
      current = parent;
    }
    return false;
  };
  const nested = (a: CanvasElement, b: CanvasElement): boolean =>
    ancestorOf(a, b) || ancestorOf(b, a) || groupContains(a, b) || groupContains(b, a);
  const relatedContainer = (node: CanvasElement, connector: CanvasConnectorElement): boolean => {
    if (!isContainer(node, children) && !isMechanism(node)) return false;
    return [connector.startBinding, connector.endBinding].some((id) => {
      const endpoint = id ? byId.get(id) : undefined;
      return endpoint && (ancestorOf(node, endpoint) || groupContains(node, endpoint));
    }) || groupContains(node, connector);
  };
  const occupiedPortBounds = (node: CanvasElement): { width: number; height: number } => {
    const sides: { position: number; envelope: number }[][] = [[], [], [], []];
    for (const connector of connectors) {
      const points = pointsFor(connector);
      for (const endpoint of [
        { binding: connector.startBinding, point: points[0], arrow: connector.startArrow },
        { binding: connector.endBinding, point: points.at(-1), arrow: connector.endArrow },
      ]) {
        if (endpoint.binding !== node.id || !endpoint.point) continue;
        const point = localPoint(endpoint.point, node);
        if (point.x < -EPSILON || point.x > node.width + EPSILON ||
            point.y < -EPSILON || point.y > node.height + EPSILON) continue;
        const distances = [Math.abs(point.x), Math.abs(point.x - node.width),
          Math.abs(point.y), Math.abs(point.y - node.height)];
        const side = distances.indexOf(Math.min(...distances));
        if (distances[side] > EPSILON) continue;
        const envelope = Math.max(connector.style.strokeWidth,
          endpoint.arrow === "arrow" ? arrowheadSize(connector.style.strokeWidth) : 0);
        sides[side].push({ position: side < 2 ? point.y : point.x, envelope });
      }
    }
    const spans = sides.map((ports) => {
      if (ports.length === 0) return 0;
      const first = Math.min(...ports.map((port) => port.position - port.envelope / 2));
      const last = Math.max(...ports.map((port) => port.position + port.envelope / 2));
      return last - first + LAYOUT_STANDARD.cardPadding * 2;
    });
    return { width: Math.max(spans[2], spans[3]), height: Math.max(spans[0], spans[1]) };
  };

  for (const element of nodes) {
    const hasText = element.type === "system" || element.type === "text" ||
      (element.type === "shape" && Boolean(element.label || element.iconId));
    if (hasText && (element.width + EPSILON < minimumTextWidth(element) ||
        element.height + EPSILON < minimumTextHeight(element))) {
      add("text-overflow", [element.id], "Element bounds do not contain its wrapped text, icon, and standard padding.");
    }
    if (element.parentId) {
      const parent = byId.get(element.parentId);
      if (!parent || !contains(parent, element)) {
        add("child-outside-parent", [element.id, element.parentId], "Declared child extends beyond its parent container.");
      }
    }
    if (isContainer(element, children)) {
      const members = children.get(element.id) ?? [];
      if (members.length > 0) {
        const internalLabels = connectors.filter(connector => connector.label &&
          [connector.startBinding, connector.endBinding].every(id => {
            const endpoint = id ? byId.get(id) : undefined;
            return endpoint && ancestorOf(element, endpoint);
          })).map(getConnectorLabelBounds).filter((bounds) => bounds !== undefined);
        const content = [...members, ...internalLabels];
        const minX = Math.min(...content.map((member) => member.x));
        const minY = Math.min(...content.map((member) => member.y));
        const maxX = Math.max(...content.map(right));
        const maxY = Math.max(...content.map(bottom));
        const margin = (element.type === "shape" ? element.containerPadding ?? LAYOUT_STANDARD.sectionPadding : LAYOUT_STANDARD.sectionPadding) + EPSILON;
        if (minX - element.x > margin || minY - element.y > margin ||
            right(element) - maxX > margin || bottom(element) - maxY > margin) {
          add("oversized-container", [element.id], "Container extends beyond child bounds plus standard internal margins.");
        }
      } else add("oversized-container", [element.id], "An empty declared container has no child content to frame.");
    } else if (hasText && !isMechanism(element)) {
      const ports = occupiedPortBounds(element);
      if (element.width > Math.max(preferredTextWidth(element), ports.width) + SPACING.padding + EPSILON ||
          element.height > Math.max(minimumTextHeight(element), ports.height) + SPACING.padding + EPSILON) {
        add("oversized-element", [element.id], "Element has unused width or height beyond content, icon, occupied boundary ports, and standard padding.");
      }
    }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    for (const other of nodes.slice(index + 1)) {
      const node = nodes[index];
      if (!nested(node, other) && nodeOverlap(node, other)) {
        add("element-overlap", [node.id, other.id], "Unrelated element bounds overlap; intended nesting must be declared.");
      }
    }
  }

  const labels = connectors.flatMap((connector) => {
    const bounds = getConnectorLabelBounds(connector);
    return bounds ? [{ connector, bounds }] : [];
  });
  const segments = new Map(connectors.map((connector) => [connector.id, segmentsFor(connector)]));
  for (const { connector, bounds } of labels) {
    const layout = getConnectorLabelLayout(connector.label!, connector.fontSize);
    if (layout.lines.some((line) => measureTextWidth(line, layout.fontSize, "mono") >
        bounds.width - LAYOUT_STANDARD.labelPaddingX * 2 + EPSILON) ||
        layout.height > bounds.height - LAYOUT_STANDARD.labelPaddingY * 2 + EPSILON) {
      add("label-overflow", [connector.id], "Rendered connector text extends beyond its label plate and internal padding.");
    }
    for (const node of nodes) {
      if (relatedContainer(node, connector) && contains(node, bounds)) continue;
      if (overlaps(bounds, node, SPACING.label)) {
        add("label-element-overlap", [connector.id, node.id], "Connector label overlaps or crowds a component boundary.");
      }
    }
    for (const route of connectors) {
      if (segments.get(route.id)!.some((segment) => crossesRect(segment, bounds))) {
        add("label-route-crossing", [connector.id, route.id], "A connector line crosses a label plate, including its own label.");
      }
    }
  }
  for (let index = 0; index < labels.length; index += 1) {
    for (const other of labels.slice(index + 1)) {
      if (overlaps(labels[index].bounds, other.bounds, SPACING.label)) {
        add("label-overlap", [labels[index].connector.id, other.connector.id], "Route labels overlap or lack the minimum label separation.");
      }
    }
  }

  for (const connector of connectors) {
    const route = segments.get(connector.id)!;
    for (const node of nodes) {
      if (relatedContainer(node, connector)) continue;
      if (node.id !== connector.startBinding && node.id !== connector.endBinding &&
          route.some((segment) => crossesElement(segment, node))) {
        add("connector-element-crossing", [connector.id, node.id], "Connector crosses an unrelated element's visible interior.");
      }
    }
    const points = pointsFor(connector);
    const arrowEnds = [
      { enabled: connector.startArrow === "arrow", tip: points[0], neighbor: points[1] },
      { enabled: connector.endArrow === "arrow", tip: points.at(-1), neighbor: points.at(-2) },
    ];
    for (const { enabled, tip, neighbor } of arrowEnds) {
      if (!enabled || !tip || !neighbor) continue;
      const size = arrowheadSize(connector.style.strokeWidth);
      const length = Math.hypot(neighbor.x - tip.x, neighbor.y - tip.y);
      if (length < EPSILON) continue;
      const ux = (neighbor.x - tip.x) / length;
      const uy = (neighbor.y - tip.y) / length;
      const corners = [tip,
        { x: tip.x + ux * size - uy * size / 2, y: tip.y + uy * size + ux * size / 2 },
        { x: tip.x + ux * size + uy * size / 2, y: tip.y + uy * size - ux * size / 2 },
      ];
      for (const node of nodes) {
        if (relatedContainer(node, connector)) continue;
        if (corners.some((point) => insideElement(point, node)) ||
            corners.some((from, index) => crossesElement({ from, to: corners[(index + 1) % 3] }, node))) {
          add("arrowhead-interior", [connector.id, node.id], "Arrowhead enters an element instead of ending at its boundary.");
        }
      }
      for (const label of labels) {
        if (corners.some((from, index) => crossesRect({ from, to: corners[(index + 1) % 3] }, label.bounds))) {
          add("arrowhead-label-overlap", [connector.id, label.connector.id], "Arrowhead overlaps a label plate even though its centerline may be clear.");
        }
      }
    }
  }

  for (let index = 0; index < connectors.length; index += 1) {
    const first = connectors[index];
    for (const second of connectors.slice(index + 1)) {
      for (const a of segments.get(first.id)!) for (const b of segments.get(second.id)!) {
        const distance = parallelDistance(a, b);
        if (distance !== undefined && distance < EPSILON) {
          add("coincident-routes", [first.id, second.id], "Independent routes share a nonzero segment; use separate lanes or an explicit junction.");
        } else if (distance !== undefined && distance + EPSILON < connectorClearance(first, second)) {
          add("parallel-route-clearance", [first.id, second.id], `Parallel route separation ${distance.toFixed(1)} is below the neighboring-arrow clearance ${connectorClearance(first, second)}.`);
        }
        if (properIntersection(a, b)) {
          add("route-crossing", [first.id, second.id], "Independent route interiors cross without a visible junction.");
        }
      }
    }
  }

  // A wide empty strip separating every content object cannot be card padding.
  // Labels count as occupied routing space; a long bare line does not justify it.
  const content = [...nodes.filter((node) => !isContainer(node, children)), ...labels.map(({ bounds }) => bounds)];
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "width" : "height";
    const intervals = content.map((rect) => [rect[axis], rect[axis] + rect[size]])
      .sort((a, b) => a[0] - b[0]);
    let end = intervals[0]?.[1] ?? 0;
    for (const [start, nextEnd] of intervals.slice(1)) {
      if (start - end > SPACING.section * 6) {
        add("excessive-content-bounds", [], `An empty ${axis === "x" ? "horizontal" : "vertical"} span of ${(start - end).toFixed(1)} units unnecessarily expands the board bounds.`);
      }
      end = Math.max(end, nextEnd);
    }
  }
  if (content.length > 0) {
    const minX = Math.min(...content.map((rect) => rect.x));
    const minY = Math.min(...content.map((rect) => rect.y));
    const maxX = Math.max(...content.map(right));
    const maxY = Math.max(...content.map(bottom));
    // Each independent route may need one outer lane; additional empty loops
    // beyond every content object and this lane budget are accidental bounds.
    const allowance = SPACING.section + connectors.reduce((sum, connector) =>
      sum + connectorClearance(connector, connector), 0);
    for (const connector of connectors) {
      if (pointsFor(connector).some((point) => point.x < minX - allowance ||
          point.x > maxX + allowance || point.y < minY - allowance || point.y > maxY + allowance)) {
        add("excessive-content-bounds", [connector.id], "Connector detour extends beyond content and the available outer routing lanes.");
      }
    }
  }
  return issues;
}
