import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES } from '../server/templates.js';
import { createEmptyScene, type CanvasSystemElement } from '../shared/contracts.js';
import { expandSceneForCaptions } from '../shared/capacity-layout.js';
import { validateBoardLayout } from '../shared/layout-validator.js';
import { parseBoardScene } from '../shared/validation.js';
import { getSystemTextLayout, minimumTextHeight, preferredTextWidth } from '../src/editor/text-layout.js';
import { applyElementTextDraft, getElementTextDraft } from '../src/editor/EditorCanvas.js';

const template = (id: string) => DEFAULT_TEMPLATES.find(t => t.id === id)!;
const node = (templateId: string, id: string): CanvasSystemElement => {
  const element = template(templateId).scene.elements.find(e => e.id === id);
  if (element?.type !== 'system') throw new Error(`Missing ${id}`);
  return element;
};

describe('execution-aware capacity captions', () => {
  it('assigns node budgets to physical B replicas and keeps logical shards free of QPS claims', () => {
    for (const id of ['cache-server-b1', 'cache-server-b2', 'cache-server-b3']) {
      const replica = node('distributed-cache', id);
      expect(replica.body).toContain('Chosen budget: 50,000 operations/s');
      expect(replica.metadata?.sourcePath).toContain('CAPACITY_ASSUMPTIONS.md');
      expect(replica.metadata?.explanation).not.toContain('Chosen workload:');
    }
    const financial = template('distributed-cache').scene;
    const logical = financial.elements.filter(e => e.id.startsWith('cache-shard'));
    expect(logical.length).toBeGreaterThan(0);
    for (const e of logical) if (e.type === 'system') expect(e.capacity).toBeUndefined();
    expect(node('distributed-cache', 'logic-cache').body).toContain('150,000 node operations/s');
    expect(node('distributed-cache', 'logic-cache').body).toContain('write / refill: 3');
    expect(node('distributed-cache', 'database-shards').metadata?.sourcePath).toContain('CAPACITY_ASSUMPTIONS.md');
    expect(node('kv-store', 'replica-d').capacity).toContain('0 available');
    expect(template('system-canvas-app').scene.elements.some(e => e.type === 'system' && e.capacity)).toBe(false);
  });

  it('charges physical replication work before comparing with chosen safe budgets', () => {
    const clients = node('distributed-cache', 'clients').body!;
    const peak = Number(clients.match(/Peak: ([\d,]+)/)![1].replaceAll(',', ''));
    const reads = peak / 2, writes = peak / 2, misses = reads * .1;
    expect(clients).toContain('50% reads · 50% writes');
    expect(clients).toContain('10% of reads miss the cache');
    expect(node('distributed-cache', 'logic-cache').capacity).toContain(`${(2 * reads + 3 * writes + 3 * misses).toLocaleString('en-US')}`);
    const databaseWorkload = node('distributed-cache', 'database-workload');
    const databaseExample = [databaseWorkload.body, databaseWorkload.capacity].join('\n');
    const databaseWork = 3 * writes + 2 * misses;
    expect(databaseExample).toContain(`${(3 * writes).toLocaleString('en-US')} + ${(2 * misses).toLocaleString('en-US')} = ${databaseWork.toLocaleString('en-US')}`);
    expect(databaseExample).toContain('15,000 operations/s');
    expect(databaseExample).toContain(`≈ ${Math.round(databaseWork / 15000 * 100)}%`);
    expect(databaseExample).toContain(`≈ ${Math.round(2 * databaseWork / 15000 * 100)}%`);
    expect(node('cdn', 'origin').capacity).toContain(`${15000 * .1 * .2} / 1k`);
    expect(node('social-feed-distributed-cache', 'authoritative-db').capacity).toContain('10.2k / 3k: OVERLOAD');
    for (const id of ['distributed-cache', 'social-feed-distributed-cache', 'kv-store', 'cdn']) {
      const elements = template(id).scene.elements;
      expect(elements.some(e => e.type === 'text' && /Target(?: ≥50% spare|: keep ≥50% free)/.test(e.text))).toBe(true);
      expect(elements.some(e => e.type === 'system' && /avg|Average/.test([e.body, e.capacity].join(' ')) && /flash|surge/.test([e.body, e.capacity].join(' ')))).toBe(true);
      expect(elements.filter(e => e.type === 'system').map(e => e.capacity ?? '').join(' ')).not.toContain('100k–1M');
    }
  });

  it('round-trips captions, rejects invalid data, and supports editing, clearing and legacy drafts', () => {
    const source = structuredClone(node('distributed-cache', 'cache-server-b1'));
    delete source.parentId;
    const scene = { ...createEmptyScene(), elements: [source] };
    expect(parseBoardScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene);
    for (const capacity of [42, 'x'.repeat(241)]) {
      expect(() => parseBoardScene({ ...scene, elements: [{ ...source, capacity }] })).toThrow();
    }
    const draft = { primary: source.title, secondary: source.subtitle ?? '', body: source.body ?? '' };
    expect(getElementTextDraft(applyElementTextDraft(source, draft)).capacity).toBe(source.capacity);
    expect(getElementTextDraft(applyElementTextDraft(source, { ...draft, capacity: 'MEASURED · 50k ops/s · workload X' })).capacity).toContain('MEASURED');
    expect(getElementTextDraft(applyElementTextDraft(source, { ...draft, capacity: '' })).capacity).toBeUndefined();
  });

  it('adds wrapped secondary text height without widening cards or mutating the baseline', () => {
    const source = structuredClone(node('distributed-cache', 'cache-server-b1'));
    delete source.capacity; delete source.parentId;
    source.x = 32; source.y = 32; source.width = preferredTextWidth(source); source.height = minimumTextHeight(source);
    const baseline = { ...createEmptyScene(), elements: [source] };
    const before = structuredClone(baseline);
    const annotated = structuredClone(baseline);
    annotated.elements[0].capacity = 'BOTEC RAM + network · ~100k–1M operations/s per physical node';
    const result = expandSceneForCaptions(baseline, annotated);
    expect(baseline).toEqual(before);
    expect(result.elements[0].width).toBe(source.width);
    expect(result.elements[0].height).toBeGreaterThan(source.height);
    expect(validateBoardLayout(result)).toEqual([]);
    const layout = getSystemTextLayout(result.elements[0] as CanvasSystemElement);
    expect(layout.capacity!.fontSize).toBeLessThan(layout.title.fontSize);
    expect(layout.capacity!.lines.length).toBeGreaterThan(1);
    expect(layout.top + layout.naturalHeight).toBeLessThanOrEqual(result.elements[0].height - 16);
  });
});
