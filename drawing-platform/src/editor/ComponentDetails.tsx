import { ArrowUpRight, BookOpen, Pencil } from "lucide-react";
import { type ReactNode } from "react";
import type { CanvasElement } from "../../shared/contracts.js";
import { parseReferenceLinks, safeReferenceUrl } from "../../shared/reference-links.js";
import { hasArchitectureDetails, relatedComponents } from "./component-details-model.js";
import { componentBrief } from "./component-brief.js";
import { CapacityBrief, CapacityReference } from "./CapacityBrief.js";
import "./component-details.css";

/** Render text as text; only explicit HTTP(S) addresses become external links. */
export function DetailText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const urls = /https?:\/\/[^\s<>]+/gi;
  let cursor = 0;
  for (const match of text.matchAll(urls)) {
    const candidate = match[0].replace(/[.,;!?)\]]+$/, "");
    const url = safeReferenceUrl(candidate);
    if (!url) continue;
    parts.push(text.slice(cursor, match.index));
    parts.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer">{candidate}</a>);
    cursor = match.index + candidate.length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function BackgroundNotes({ text }: { text: string }) {
  return <section className="component-details__notes" aria-label="Background notes"><h3>Background notes</h3>
    {text.split(/\n\s*\n/).map((block, index) => {
      const lines = block.split("\n").map(line=>line.trim()).filter(Boolean);
      const heading = lines.length > 1 && lines[0].length < 72 && !/[.!?]$/.test(lines[0]) ? lines.shift() : undefined;
      const content = lines.join(" ");
      const long = content.length > 220;
      const lead = long ? content.slice(0, 196).replace(/\s+\S*$/, "") + "…" : undefined;
      return <div className="component-details__note" key={index}>
        {heading ? <h4>{heading}</h4> : null}
        {long ? <><p><DetailText text={lead!} /></p><details><summary>Read full note</summary><p><DetailText text={content} /></p></details></> :
          lines.length > 1 ? <ul>{lines.map((line,i)=><li key={i}><DetailText text={line} /></li>)}</ul> : <p><DetailText text={content} /></p>}
      </div>;
    })}
  </section>;
}

export function ComponentDetails({ element, elements, onEdit, onNavigate }: {
  element: CanvasElement;
  elements: readonly CanvasElement[];
  onEdit: () => void;
  onNavigate: (id: string) => void;
}) {
  const metadata = element.metadata ?? {};
  const connected = relatedComponents(element, elements);
  const brief = componentBrief(element);
  const caption = element.type === "system" ? element.capacity : undefined;
  const facts = [
    ["Runtime / location", metadata.runtimeLocation], ["Layer", metadata.layer],
    ["Object type", metadata.objectType], ["Ownership", metadata.ownership],
  ].filter(([, value]) => value?.trim());
  // Imported and saved references are validated at the contract boundary.
  const links = parseReferenceLinks(metadata.referenceLinks);
  const connection = (item: (typeof connected)[number], index: number) => <li key={index}><button type="button" onClick={() => onNavigate(item.id)} aria-label={`Show ${item.name} on board`}>
    <span><small>{item.relationship}</small><strong>{item.name}</strong>{item.label ? <small>{item.label}</small> : null}</span><ArrowUpRight aria-hidden="true" />
  </button></li>;
  return <div className="component-details">
    <div className="component-details__intro">
      <span><BookOpen aria-hidden="true" /> Component reference {metadata.layer ? <b className="component-details__layer">{metadata.layer}</b> : null}</span>
      <button type="button" onClick={onEdit}><Pencil aria-hidden="true" />{element.locked ? "View properties" : "Edit details"}</button>
    </div>
    {brief.summary ? <p className="component-details__summary"><DetailText text={brief.summary} /></p> : null}
    {caption ? <CapacityBrief caption={caption} assumed={brief.hasCapacityNotes && !/\bmeasured\b/i.test(caption)} /> : brief.hasCapacityNotes ? <CapacityReference /> : null}
    {connected.length ? <section aria-label="Connected components"><h3>Connected components</h3>
      <ul className="component-details__connections">{connected.slice(0,3).map(connection)}</ul>
      {connected.length > 3 ? <details className="component-details__disclosure"><summary>{connected.length - 3} more connections</summary>
        <ul className="component-details__connections">{connected.slice(3).map(connection)}</ul></details> : null}
    </section> : null}
    {links.length ? <details className="component-details__disclosure component-details__references">
      <summary>References <span>{links.length}</span></summary><section aria-label="Reference links"><ul className="component-details__links">
      {links.map((link, index) => <li key={index}><a href={link.url} target="_blank" rel="noopener noreferrer">
        <span>{link.label}<small>{new URL(link.url).hostname}</small></span><ArrowUpRight aria-hidden="true" />
      </a></li>)}
    </ul></section></details> : null}
    {facts.length || metadata.inputs || metadata.outputs || metadata.sourcePath || metadata.packageName || brief.notes ?
      <details className="component-details__disclosure component-details__context"><summary>More context</summary>
      <div className="component-details__context-body">
        {facts.length ? <dl className="component-details__facts">{facts.map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd><DetailText text={value!} /></dd></div>)}</dl> : null}
        {([['Inputs', metadata.inputs], ['Outputs', metadata.outputs]] as const).map(([label, value]) => value?.trim() ?
          <section key={label} aria-label={label}><h3>{label}</h3><p><DetailText text={value} /></p></section> : null)}
        {metadata.sourcePath || metadata.packageName ? <section aria-label="Implementation"><h3>Implementation</h3><dl>
          {metadata.sourcePath ? <div><dt>Source path</dt><dd><DetailText text={metadata.sourcePath} /></dd></div> : null}
          {metadata.packageName ? <div><dt>Package</dt><dd><DetailText text={metadata.packageName} /></dd></div> : null}
        </dl></section> : null}
        {brief.notes ? <BackgroundNotes text={brief.notes} /> : null}
      </div></details> : null}
    {!hasArchitectureDetails(element) && !brief.summary ? <p className="component-details__empty">No notes yet. {element.locked ? "Unlock to add details." : "Add a short explanation in Edit details."}</p> : null}
  </div>;
}
