# Context

## What became visible

- The classic Logseq whiteboard is a product interaction reference, not a file
  compatibility target; current Logseq DB graphs removed whiteboards from core.
- A mature editor engine leaves this project free to focus on educational
  stencils, open documents, and trustworthy persistence.
- The repository's existing images do not have one consistent editable-source
  convention. System Canvas JSON plus a deterministic export establishes one.
- A scene change must reach browser storage before it enters the debounced
  network queue. That ordering is what makes the local-first claim concrete.
- Revision conflicts require a user decision. The client preserves and offers
  the local JSON before it can reload the server copy; it never retries stale
  revisions in a loop or silently replaces newer local work.
- Excalidraw loads its fonts and editor assets at runtime, so the production
  image copies and serves those assets instead of depending on a CDN.
- The KV-store explanation became faster to scan when routing context was a
  breadcrumb rather than the main architecture. The KV-owned path remains
  client → coordinator → placement → replicas; failure and convergence share a
  separate amber lane.
- `R` and `W` name response and acknowledgment thresholds. Calling them simply
  “reads” and “writes” obscures the mechanism and was rejected by the template
  content test.
- Generating the API template, importable board document, and SVG from one
  script prevents the editable and repository views from drifting apart.

## Trade-offs

- Excalidraw adds bundle weight but removes the much larger correctness surface
  of selection, transforms, connectors, freehand input, history, and export.
- Excalidraw 0.18.0 currently leaves five moderate npm advisories in its
  optional Mermaid conversion dependency chain. System Canvas does not expose
  Mermaid import, but arbitrary imported board JSON should still be treated as
  untrusted. The production audit is recorded rather than hidden.
- Atomic JSON snapshots are ideal for zero-setup local use but intentionally do
  not claim horizontal scalability.
- Generic primitives communicate mechanisms longer than cloud-vendor logos, at
  the cost of less visual branding.

## Questions deferred

- Which CRDT and asset protocol should power live collaboration?
- Should Logseq block/page references become a stencil or a first-class element?
- When do board counts justify PostgreSQL rather than local snapshots?
