import type { CanvasPoint } from "./contracts.js";

export interface RoutingBounds { x: number; y: number; width: number; height: number }
export interface OccupiedRoute { points: CanvasPoint[]; clearance: number }
export interface OrthogonalRoutingOptions {
  /** Explicit fallback for a topology that has no available planar route. */
  allowCrossings?: boolean;
  /** A deterministic work bound; exhaustion returns undefined, never an unsafe line. */
  maxVisited?: number;
}

type Segment = { a: CanvasPoint; b: CanvasPoint; clearance: number };
const EPSILON = 1e-7;
const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;
const between = (v: number, a: number, b: number) =>
  v >= Math.min(a, b) - EPSILON && v <= Math.max(a, b) + EPSILON;
const cross = (a: CanvasPoint, b: CanvasPoint, c: CanvasPoint) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const intersects = (a: CanvasPoint, b: CanvasPoint, c: CanvasPoint, d: CanvasPoint): boolean => {
  const abC = cross(a, b, c), abD = cross(a, b, d);
  const cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return true;
  const on = (p: CanvasPoint, from: CanvasPoint, to: CanvasPoint) =>
    between(p[0], from[0], to[0]) && between(p[1], from[1], to[1]);
  return (Math.abs(abC) < EPSILON && on(c, a, b)) ||
    (Math.abs(abD) < EPSILON && on(d, a, b)) ||
    (Math.abs(cdA) < EPSILON && on(a, c, d)) ||
    (Math.abs(cdB) < EPSILON && on(b, c, d));
};

const positiveOverlap = (a: number, b: number, c: number, d: number): boolean =>
  Math.max(Math.min(a, b), Math.min(c, d)) <
  Math.min(Math.max(a, b), Math.max(c, d)) - EPSILON;

const crowdedParallel = (a: CanvasPoint, b: CanvasPoint, segment: Segment): boolean => {
  const { a: c, b: d, clearance } = segment;
  if (near(a[1], b[1]) && near(c[1], d[1])) {
    return Math.abs(a[1] - c[1]) < clearance - EPSILON &&
      positiveOverlap(a[0], b[0], c[0], d[0]);
  }
  if (near(a[0], b[0]) && near(c[0], d[0])) {
    return Math.abs(a[0] - c[0]) < clearance - EPSILON &&
      positiveOverlap(a[1], b[1], c[1], d[1]);
  }
  return false;
};

/** Boundary contact with an expanded obstacle preserves exactly the requested gap. */
const hitsInterior = (a: CanvasPoint, b: CanvasPoint, box: RoutingBounds): boolean => {
  if (near(a[1], b[1])) {
    return a[1] > box.y + EPSILON && a[1] < box.y + box.height - EPSILON &&
      positiveOverlap(a[0], b[0], box.x, box.x + box.width);
  }
  return a[0] > box.x + EPSILON && a[0] < box.x + box.width - EPSILON &&
    positiveOverlap(a[1], b[1], box.y, box.y + box.height);
};

interface QueueEntry { state: number; cost: number; estimate: number; order: number }
class MinQueue {
  private entries: QueueEntry[] = [];
  private before(a: QueueEntry, b: QueueEntry): boolean {
    return a.estimate < b.estimate || (near(a.estimate, b.estimate) &&
      (a.cost > b.cost || (near(a.cost, b.cost) && a.order < b.order)));
  }
  push(entry: QueueEntry): void {
    let index = this.entries.length;
    this.entries.push(entry);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!this.before(entry, this.entries[parent])) break;
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = entry;
  }
  pop(): QueueEntry | undefined {
    const first = this.entries[0], last = this.entries.pop();
    if (!first || !last || this.entries.length === 0) return first;
    let index = 0;
    while (index * 2 + 1 < this.entries.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.entries.length && this.before(this.entries[child + 1], this.entries[child])) child++;
      if (!this.before(this.entries[child], last)) break;
      this.entries[index] = this.entries[child];
      index = child;
    }
    this.entries[index] = last;
    return first;
  }
}

const simplify = (points: CanvasPoint[]): CanvasPoint[] => {
  const result: CanvasPoint[] = [];
  for (const point of points) {
    const before = result.at(-2), last = result.at(-1);
    if (last && near(last[0], point[0]) && near(last[1], point[1])) continue;
    if (before && last && ((near(before[0], last[0]) && near(last[0], point[0])) ||
      (near(before[1], last[1]) && near(last[1], point[1])))) result.pop();
    result.push(point);
  }
  return result;
};

/**
 * A* over a lazily explored, coordinate-compressed orthogonal grid. Rectangles
 * and existing lane envelopes contribute candidate turning coordinates; cached
 * undirected edge checks make the three incoming-direction states share work.
 * Obstacles already include the desired node clearance; the clearance argument
 * controls neighboring route spacing and turning-lane candidates. Call with
 * outward component stubs, then attach the short boundary segments.
 */
export function routeOrthogonalWithPorts(
  starts: CanvasPoint[],
  ends: CanvasPoint[],
  obstacles: RoutingBounds[],
  existing: OccupiedRoute[],
  clearance: number,
  options: OrthogonalRoutingOptions = {},
): CanvasPoint[] | undefined {
  if (!starts.length || !ends.length) return undefined;
  const gap = Math.max(0, clearance);
  const boxes = obstacles;
  const blockedPoint = ([x, y]: CanvasPoint) => boxes.some((box) =>
    x > box.x + EPSILON && x < box.x + box.width - EPSILON &&
    y > box.y + EPSILON && y < box.y + box.height - EPSILON);
  starts=starts.filter(point=>!blockedPoint(point));
  ends=ends.filter(point=>!blockedPoint(point));
  if (!starts.length || !ends.length) return undefined;
  const shared=starts.find(start=>ends.some(end=>near(start[0],end[0])&&near(start[1],end[1])));
  if(shared)return [[...shared]];
  const occupied: Segment[] = existing.flatMap((route) => route.points.slice(1).map((b, index) => ({
    a: route.points[index], b, clearance: Math.max(gap, route.clearance),
  }))).filter(({ a, b }) => !near(a[0], b[0]) || !near(a[1], b[1]));
  const xValues = new Set([...starts,...ends].map(point=>point[0]));
  const yValues = new Set([...starts,...ends].map(point=>point[1]));
  for (const box of boxes) {
    xValues.add(box.x); xValues.add(box.x + box.width);
    yValues.add(box.y); yValues.add(box.y + box.height);
  }
  for (const segment of occupied) for (const [x, y] of [segment.a, segment.b]) {
    xValues.add(x - segment.clearance); xValues.add(x + segment.clearance);
    yValues.add(y - segment.clearance); yValues.add(y + segment.clearance);
  }
  const margin = Math.max(24, gap, ...occupied.map((segment) => segment.clearance)) * 2;
  xValues.add(Math.min(...xValues) - margin); xValues.add(Math.max(...xValues) + margin);
  yValues.add(Math.min(...yValues) - margin); yValues.add(Math.max(...yValues) + margin);
  const xs = [...xValues].sort((a, b) => a - b), ys = [...yValues].sort((a, b) => a - b);
  const yCount = ys.length, vertexCount = xs.length * yCount;
  const toVertex = (x: number, y: number) => x * yCount + y;
  const toPoint = (vertex: number): CanvasPoint => [xs[Math.floor(vertex / yCount)], ys[vertex % yCount]];
  const endVertices = new Set(ends.map(end=>toVertex(xs.indexOf(end[0]),ys.indexOf(end[1]))));
  const estimate = (point:CanvasPoint)=>Math.min(...ends.map(end=>
    Math.abs(point[0]-end[0])+Math.abs(point[1]-end[1])));
  const crossingPenalty = (xs.at(-1)! - xs[0] + ys.at(-1)! - ys[0]) * 10;
  const edgeCache = new Map<number, number>();
  const edgeCost = (from: number, to: number): number => {
    const key = Math.min(from, to) * vertexCount + Math.max(from, to);
    const cached = edgeCache.get(key);
    if (cached !== undefined) return cached;
    const a = toPoint(from), b = toPoint(to);
    let cost = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (boxes.some((box) => hitsInterior(a, b, box))) cost = Infinity;
    if (Number.isFinite(cost)) for (const segment of occupied) {
      if (crowdedParallel(a, b, segment)) { cost = Infinity; break; }
      if (intersects(a, b, segment.a, segment.b)) {
        if (!options.allowCrossings) { cost = Infinity; break; }
        cost += crossingPenalty;
      }
    }
    edgeCache.set(key, cost);
    return cost;
  };
  const queue = new MinQueue(), costs = new Map<number, number>(), previous = new Map<number, number>();
  let order = 0;
  for(const start of starts){
    const initial=toVertex(xs.indexOf(start[0]),ys.indexOf(start[1]))*3;
    costs.set(initial,0);
    queue.push({state:initial,cost:0,estimate:estimate(start),order:order++});
  }
  let visited = 0;
  const limit = options.maxVisited ?? 80_000;
  while (visited < limit) {
    const current = queue.pop();
    if (!current) return undefined;
    if (current.cost > (costs.get(current.state) ?? Infinity) + EPSILON) continue;
    visited++;
    const vertex = Math.floor(current.state / 3), direction = current.state % 3;
    if (endVertices.has(vertex)) {
      const path: CanvasPoint[] = [];
      let state: number | undefined = current.state;
      while (state !== undefined) { path.push(toPoint(Math.floor(state / 3))); state = previous.get(state); }
      return simplify(path.reverse());
    }
    const xi = Math.floor(vertex / yCount), yi = vertex % yCount;
    const neighbors = [
      ...(xi + 1 < xs.length ? [[toVertex(xi + 1, yi), 1]] : []),
      ...(yi + 1 < ys.length ? [[toVertex(xi, yi + 1), 2]] : []),
      ...(xi > 0 ? [[toVertex(xi - 1, yi), 1]] : []),
      ...(yi > 0 ? [[toVertex(xi, yi - 1), 2]] : []),
    ];
    for (const [nextVertex, nextDirection] of neighbors) {
      const movement = edgeCost(vertex, nextVertex);
      if (!Number.isFinite(movement)) continue;
      const nextState = nextVertex * 3 + nextDirection;
      const cost = current.cost + movement + (direction && direction !== nextDirection ? Math.max(8, gap) : 0);
      if (cost >= (costs.get(nextState) ?? Infinity) - EPSILON) continue;
      costs.set(nextState, cost); previous.set(nextState, current.state);
      const point = toPoint(nextVertex);
      queue.push({ state: nextState, cost,
        estimate: cost + estimate(point), order: order++ });
    }
  }
  return undefined;
}

/** Single-port compatibility entry point for the usual generated route. */
export function routeOrthogonal(
  start: CanvasPoint,
  end: CanvasPoint,
  obstacles: RoutingBounds[],
  existing: OccupiedRoute[],
  clearance: number,
  options: OrthogonalRoutingOptions = {},
): CanvasPoint[] | undefined {
  return routeOrthogonalWithPorts([start],[end],obstacles,existing,clearance,options);
}
