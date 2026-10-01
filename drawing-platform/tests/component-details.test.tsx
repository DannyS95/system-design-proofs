import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createEmptyScene, type CanvasElement, type CanvasConnectorElement } from "../shared/contracts.js";
import { parseBoardScene } from "../shared/validation.js";
import { parseReferenceLinks, safeReferenceUrl } from "../shared/reference-links.js";
import { SYSTEM_CANVAS_APP_TEMPLATE } from "../server/generated/system-canvas-app-template.js";
import { ComponentDetails, DetailText } from "../src/editor/ComponentDetails.js";
import { hasArchitectureDetails, relatedComponents } from "../src/editor/component-details-model.js";
import { createCustomStencilStore, instantiateCustomStencil } from "../src/data/custom-stencil-store.js";

const editor = () => {
  const element = structuredClone(SYSTEM_CANVAS_APP_TEMPLATE.scene.elements.find(e=>e.id==='custom-editor')!);
  delete element.parentId;
  return element;
};
const render = (element: CanvasElement, elements = [element]) => renderToStaticMarkup(createElement(ComponentDetails, {
  element, elements, onEdit: vi.fn(), onNavigate: vi.fn(),
}));

describe("component reference links", () => {
  it("accepts named links and bare URLs, with empty lines and CRLF", () => {
    expect(parseReferenceLinks(" Source | https://example.com/src#L4\r\n\nhttps://example.com/docs ")).toEqual([
      { label: "Source", url: "https://example.com/src#L4" },
      { label: "https://example.com/docs", url: "https://example.com/docs" },
    ]);
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "file:///tmp/notes.md", "/api/boards", "//example.com", "https://user:password@example.com", "https://exa mple.com"])("rejects unsafe or ambiguous references: %s", url => {
    expect(safeReferenceUrl(url)).toBeUndefined();
    expect(()=>parseReferenceLinks(`Guide | ${url}`)).toThrow(/line 1/);
    const element = editor(); element.metadata = { referenceLinks: `Guide | ${url}` };
    expect(()=>parseBoardScene({ ...createEmptyScene(), elements: [element] })).toThrow(/referenceLinks/);
  });
  it("round-trips optional references without a migration and keeps them in reusable components", () => {
    const element = editor();
    const input = { ...createEmptyScene(), elements: [element] };
    expect(parseBoardScene(JSON.parse(JSON.stringify(input)))).toEqual(input);
    const legacy = editor(); delete legacy.metadata!.referenceLinks;
    expect(parseBoardScene({ ...createEmptyScene(), elements: [legacy] }).elements[0].metadata).not.toHaveProperty('referenceLinks');
    const storage = new Map<string,string>();
    const store = createCustomStencilStore({ getItem: key=>storage.get(key)??null, setItem:(key,value)=>{storage.set(key,value);}, removeItem:key=>{storage.delete(key);} });
    store.save(element);
    expect(instantiateCustomStencil(store.list()[0], {x:0,y:0}).metadata?.referenceLinks).toBe(element.metadata?.referenceLinks);
  });
});

describe("readable component reference panel", () => {
  it("shows saved notes and named clickable references without edit inputs", () => {
    const html = render(editor());
    expect(html).toContain('Component reference');
    expect(html).toContain('Architecture and responsibilities');
    expect(html).toContain('href="https://github.com/DannyS95/system-design-proofs/blob/main/md/drawing-platform/DESIGN.md"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).not.toMatch(/<(input|textarea|select)\b/);
  });
  it("hides empty fields and keeps reading available on locked components", () => {
    const element = editor(); element.metadata = { explanation: "Why this component exists" }; element.locked = true;
    const html = render(element);
    expect(html).toContain('Why this component exists');
    expect(html).toContain('View properties');
    expect(html).not.toContain('<dt>Ownership</dt>');
    expect(html).not.toContain('<h3>References</h3>');
    expect(hasArchitectureDetails(element)).toBe(true);
    expect(hasArchitectureDetails({...element,metadata:{explanation:'  '}})).toBe(false);
  });
  it("renders text safely and linkifies only explicit web URLs", () => {
    const html = renderToStaticMarkup(createElement(DetailText, {text:'<img onerror="bad"> javascript:alert(1) https://example.com/docs.'}));
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com/docs"');
  });
});

describe("navigation through architecture connections", () => {
  it("derives direction and labels from actual bindings", () => {
    const a = editor(), b = { ...editor(), id: "peer" };
    const route: CanvasConnectorElement = { id:"route",type:"connector",x:0,y:0,width:100,height:0,rotation:0,style:a.style,
      points:[[0,0],[100,0]],startArrow:"none",endArrow:"arrow",startBinding:a.id,endBinding:b.id,label:"Read objects" };
    expect(relatedComponents(a,[a,b,route])).toEqual([{id:b.id,name:('title' in b?b.title:''),relationship:"Sends to",label:"Read objects"}]);
    expect(relatedComponents(b,[a,b,route])[0].relationship).toBe('Receives from');
    expect(relatedComponents(a,[a,{...b,deleted:true},route])).toEqual([]);
    expect(relatedComponents(route,[a,b,route]).map(item=>item.relationship)).toEqual(['Start','End']);
  });
  it("resolves a local reference to its canonical component and ignores free-text guesses", () => {
    const canonical=editor(), reference={...editor(),id:'reference',referenceId:canonical.id};
    expect(relatedComponents(reference,[canonical,reference])[0].id).toBe(canonical.id);
    canonical.metadata={inputs:'reference'};
    expect(relatedComponents(canonical,[canonical,reference])).toEqual([]);
  });
});
