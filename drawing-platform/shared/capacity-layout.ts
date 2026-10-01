import type { BoardScene, CanvasConnectorElement, CanvasPoint } from './contracts.js';
import { LAYOUT_STANDARD, SPACING, arrowheadSize } from './layout-standard.js';
import { getConnectorLabelBounds, minimumTextHeight, preferredTextWidth } from '../src/editor/text-layout.js';

const absolute = (c: CanvasConnectorElement): CanvasPoint[] => c.points.map(([x, y]) => [c.x + x, c.y + y]);
function setPoints(c: CanvasConnectorElement, points: CanvasPoint[]) {
  const label = c.labelPosition ? [c.x + c.labelPosition[0], c.y + c.labelPosition[1]] : undefined;
  c.x = Math.min(...points.map(([x]) => x));
  c.y = Math.min(...points.map(([, y]) => y));
  c.width = Math.max(...points.map(([x]) => x)) - c.x;
  c.height = Math.max(...points.map(([, y]) => y)) - c.y;
  c.points = points.map(([x, y]) => [x - c.x, y - c.y]);
  if (label) c.labelPosition = [label[0] - c.x, label[1] - c.y];
}

/** Add secondary captions to an already-routed orthogonal board. A monotonic
 * vertical expansion preserves the route topology and every existing corridor.
 * This intentionally excludes rigid mechanism geometry such as hash rings. */
export function expandSceneForCaptions(input: BoardScene, annotated: BoardScene): BoardScene {
  if (input.elements.some(e => e.type === 'shape' && e.layoutRole === 'mechanism' && !e.iconId)) {
    throw new Error('Rigid mechanism boards must use their normal layout constructor.');
  }
  const scene = structuredClone(input);
  const original = new Map(input.elements.map(e => [e.id, e]));
  const annotations = new Map(annotated.elements.map(e => [e.id, e]));
  for (const e of scene.elements) {
    const note = annotations.get(e.id);
    if (e.type === 'system' && note?.type === 'system' && note.capacity) {
      e.capacity = note.capacity;
      e.metadata = structuredClone(note.metadata);
    }
    if (e.type === 'text' && note?.type === 'text') e.text = note.text;
  }
  const nodes = scene.elements.filter(e => e.type !== 'connector' && !(e.type === 'shape' && e.layoutRole === 'container'));
  const coordinates = [...new Set(nodes.flatMap(e => [e.y, e.y + e.height]))].sort((a, b) => a - b);
  if (!coordinates.length) return scene;
  const mapped = new Map<number, number>();
  // Longest-path constraints add only the height required by captioned content.
  for (const [index, y] of coordinates.entries()) {
    const previous = coordinates[index - 1];
    let target = index === 0 ? y : mapped.get(previous)! + y - previous;
    for (const e of nodes) {
      if (e.y + e.height === y) target = Math.max(target, mapped.get(e.y)! + Math.max(e.height, minimumTextHeight(e)));
    }
    mapped.set(y, target);
  }
  const mapY = (y: number): number => {
    if (y <= coordinates[0]) return y;
    const index = coordinates.findIndex(v => v >= y);
    if (index < 0) return y + mapped.get(coordinates.at(-1)!)! - coordinates.at(-1)!;
    if (coordinates[index] === y) return mapped.get(y)!;
    const a = coordinates[index - 1], b = coordinates[index];
    return mapped.get(a)! + (mapped.get(b)! - mapped.get(a)!) * (y - a) / (b - a);
  };
  for (const e of scene.elements) {
    const before = original.get(e.id)!;
    if (e.type === 'connector' && before.type === 'connector') {
      const label = before.labelPosition ? [before.x + before.labelPosition[0], mapY(before.y + before.labelPosition[1])] : undefined;
      setPoints(e, absolute(before).map(([x, y]) => [x, mapY(y)]));
      if (label) e.labelPosition = [label[0] - e.x, label[1] - e.y];
    } else {
      e.y = mapY(before.y);
      e.height = mapY(before.y + before.height) - e.y;
      if (e.type === 'text') { e.width = preferredTextWidth(e); e.height = minimumTextHeight(e); }
    }
  }
  // Other cards can straddle an expanded band. Remove their unused top and bottom space,
  // leaving actual side ports and extending boundary stubs through the vacated strips.
  const routes = scene.elements.filter((e): e is CanvasConnectorElement => e.type === 'connector');
  for (const e of nodes) {
    if (e.type !== 'system') continue;
    const bottom = e.y + e.height;
    const attached = routes.filter(c => c.startBinding === e.id || c.endBinding === e.id);
    const occupied = attached.flatMap(c => (['start', 'end'] as const).flatMap(end => {
      if ((end === 'start' ? c.startBinding : c.endBinding) !== e.id) return [];
      const p = end === 'start' ? absolute(c)[0] : absolute(c).at(-1)!;
      const margin = SPACING.padding + arrowheadSize(c.style.strokeWidth) / 2;
      return Math.abs(p[1] - bottom) > .5 && Math.abs(p[1] - e.y) > .5
        ? [{ low: p[1] - margin, high: p[1] + margin }] : [];
    }));
    const low = occupied.length ? Math.min(...occupied.map(p => p.low)) : e.y;
    const high = occupied.length ? Math.max(...occupied.map(p => p.high)) : e.y;
    const height = Math.min(e.height, Math.max(minimumTextHeight(e), high - low));
    const top = occupied.length
      ? Math.max(e.y, Math.min(low, bottom - height, Math.max(high - height, e.y + (e.height - height) / 2)))
      : e.y;
    for (const c of attached) {
      const points = absolute(c);
      for (const end of ['start', 'end'] as const) {
        if ((end === 'start' ? c.startBinding : c.endBinding) !== e.id) continue;
        const p = points[end === 'start' ? 0 : points.length - 1];
        if (Math.abs(p[1] - bottom) < .5) p[1] = top + height;
        else if (Math.abs(p[1] - e.y) < .5) p[1] = top;
      }
      setPoints(c, points);
    }
    e.y = top;
    e.height = height;
  }
  const byId = new Map(scene.elements.map(e => [e.id, e]));
  // Include internal label plates when fitting frames, just like the main layout.
  const fit = (id: string) => {
    const e = byId.get(id);
    if (e?.type !== 'shape' || e.layoutRole !== 'container') return;
    const children = scene.elements.filter(child => child.parentId === id && child.type !== 'connector');
    children.forEach(child => fit(child.id));
    if (!children.length) return;
    const descendant = (childId?: string): boolean => {
      let child = childId ? byId.get(childId) : undefined;
      while (child) { if (child.parentId === id) return true; child = child.parentId ? byId.get(child.parentId) : undefined; }
      return false;
    };
    const labels = routes.filter(c => c.label && descendant(c.startBinding) && descendant(c.endBinding))
      .flatMap(c => { const b = getConnectorLabelBounds(c); return b ? [b] : []; });
    const content = [...children, ...labels];
    const padding = e.containerPadding ?? LAYOUT_STANDARD.sectionPadding;
    e.x = Math.min(...content.map(c => c.x)) - padding;
    e.y = Math.min(...content.map(c => c.y)) - padding;
    e.width = Math.max(...content.map(c => c.x + c.width)) + padding - e.x;
    e.height = Math.max(...content.map(c => c.y + c.height)) + padding - e.y;
  };
  scene.elements.filter(e => !e.parentId).forEach(e => fit(e.id));
  return scene;
}
