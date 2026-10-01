import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CanvasSystemElement } from "../shared/contracts.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { CAPACITY_BOILERPLATE, CAPACITY_SOURCE } from "../shared/capacity-reference.js";
import { componentBrief, capacityMetric } from "../src/editor/component-brief.js";
import { ComponentDetails } from "../src/editor/ComponentDetails.js";
import { CapacityBrief } from "../src/editor/CapacityBrief.js";
import { getSystemTextLayout, minimumTextHeight, preferredTextWidth } from "../src/editor/text-layout.js";

const node = (board: string,id: string) => structuredClone(DEFAULT_TEMPLATES.find(t=>t.id===board)!.scene.elements.find(e=>e.id===id)!) as CanvasSystemElement;

describe("compact component briefs", () => {
  it("keeps the old generated essay out of existing saved-board summaries without mutating data", () => {
    const b1=node('distributed-cache','cache-server-b1');
    b1.metadata!.explanation=`B1\nphysical cache server\nReplica 1 stores a temporary RAM copy of Cache Shard B.\n\n${CAPACITY_BOILERPLATE} Per-host budget. See ${CAPACITY_SOURCE}.\n\n${'Entire design calculation. '.repeat(70)}`;
    const before=structuredClone(b1);
    expect(componentBrief(b1).summary).toBe('Replica 1 stores a temporary RAM copy of Cache Shard B.');
    expect(componentBrief(b1).hasCapacityNotes).toBe(true);
    expect(componentBrief(b1).notes ?? "").not.toContain('Entire design calculation');
    expect(b1).toEqual(before);
  });
  it("hidden metadata never changes a canvas element's text layout or minimum size", () => {
    const source=node('distributed-cache','cache-server-b1');
    const long={...source,metadata:{...source.metadata,explanation:'Long background context. '.repeat(160)}};
    expect(getSystemTextLayout(long)).toEqual(getSystemTextLayout(source));
    expect(minimumTextHeight(long)).toBe(minimumTextHeight(source));
    expect(preferredTextWidth(long)).toBe(preferredTextWidth(source));
  });
  it("keeps workload cards small and full notes collapsed", () => {
    const workload=node('distributed-cache','database-workload');
    expect(workload.height).toBeLessThan(320);
    expect(workload.body!.length).toBeLessThan(160);
    expect(workload.metadata!.explanation!.length).toBeLessThan(600);
    const html=renderToStaticMarkup(createElement(ComponentDetails,{element:workload,elements:[workload],onEdit:vi.fn(),onNavigate:vi.fn()}));
    expect(html).toContain('<summary>More context</summary>');
    expect(html).not.toContain(' open=""');
    expect(html).toContain('<h4>Peak work</h4>');
    expect(html).toContain('Assumed · not measured');
  });
  it("does not discard or expand a long authored explanation by default", () => {
    const source=node('cdn','pop-lisbon-cache');
    source.metadata={explanation:'A short purpose. '+ 'More user notes. '.repeat(80)};
    const brief=componentBrief(source);
    expect(brief.summary.length).toBeLessThanOrEqual(200);
    expect(brief.notes).toBe(source.metadata.explanation!.trim());
  });
});

describe("capacity visuals", () => {
  it("distinguishes cache hit rate from physical storage utilization", () => {
    const caption=node('cdn','pop-lisbon-cache').capacity!;
    expect(capacityMetric(caption)).toMatchObject({label:'Storage used',used:'20',budget:'64',unit:'GB',percent:31,memory:true});
    const html=renderToStaticMarkup(createElement(CapacityBrief,{caption,assumed:true}));
    expect(html).toContain('31%'); expect(html).toContain('90% cache hits');
    expect(html).not.toContain('Target: ≥50% free');
  });
  it("derives utilization from explicit demand and budget, including approximate formatted numbers", () => {
    expect(capacityMetric(node('distributed-cache','cache-server-b1').capacity!)).toMatchObject({percent:7,unit:'operations/s'});
    expect(capacityMetric('Peak ~4.3k / safe 50k ops/s · 9%')).toMatchObject({percent:9});
    expect(capacityMetric('90% hits')).toBeUndefined();
    expect(capacityMetric('Peak 0 / 0 QPS')).toBeUndefined();
    const html=renderToStaticMarkup(createElement(CapacityBrief,{caption:'Peak 150 / 100 QPS',assumed:true}));
    expect(html).toContain('Over budget'); expect(html).toContain('150%');
  });
});
