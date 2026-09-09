# Context

## What became visible

- A shared design standard belongs at the repository boundary and must be
  discoverable from both agent guidance and product documentation; otherwise
  visual and explanatory quality drifts board by board.
- Readable typography is scene data, not a renderer tweak. Font size and
  alignment must flow through validation, measurement, selection bounds,
  export, generated SVG, and inspector drafts together.
- The checked-in artifact inside each architecture folder is the design source;
  a correction pass must preserve its workload, invariant, component set, and
  mechanisms instead of substituting a generic tutorial.
- The requested product is a system-design canvas, not a generic editor wrapper.
  Owning a focused SVG editor makes routing layers, data placement, servers,
  databases, replicas, and observability first-class semantic elements.
- Infinite canvas is a camera property: world coordinates remain stable while a
  scene-root translation and scale allow movement in every direction.
- Stable `iconId` values separate saved meaning from SVG appearance. The icon
  registry can improve geometry without rewriting boards or depending on
  vendor-specific packs.
- Canvas appearance belongs in the document. Color, plain/dotted/grid pattern,
  spacing, and camera survive reload and export through schema v2.
- Browse, drop, and paste must converge on one image path. Embedding raster data
  keeps local snapshots and JSON exports portable; the 2 MB admission limit
  protects browser storage and the API body budget.
- Schema v2 is a typed canvas contract rather than a renderer dump. Version-1
  documents and supported raw Excalidraw primitives migrate at the boundary;
  unknown legacy types fail explicitly instead of disappearing.
- Removing the previous editor dependency and its host/child update interaction
  fixes the observed maximum-update-depth crash. Stable callbacks from the
  repo-owned React/TypeScript SVG editor module keep scene updates explicit. The
  canvas error boundary preserves recovery access only if an unrelated renderer
  failure still occurs.
- A scene change must reach browser storage before it enters the debounced
  network queue. That ordering makes the local-first claim concrete.
- Revision conflicts require a user decision. The client keeps and offers the
  local JSON; it never retries stale revisions in a loop or silently replaces
  newer work.
- Deterministic scripts generate each template scene, importable board, SVG, and
  PNG preview together, preventing editable and repository views from drifting.
- Template discovery and template creation are separate actions: row selection
  loads an in-memory preview, while the adjacent `+` is the only action that
  creates a board and enters the local-first persistence flow.
- The architecture designs scan faster when topology and route labels carry the
  explanation. Long prose belongs in the adjacent README/trade-off documents.
- Every teaching board must work at two speeds: a 12-year-old can narrate the
  request journey in minutes, while an experienced engineer can identify the
  topology and policies in seconds. Each fact appears once at the layer that
  owns it.
- The KV-store board now attaches handoff and repair to the replicas where those
  mechanisms execute. `R` and `W` remain response and acknowledgment
  thresholds, not vague counts of “reads” and “writes.”
- The CDN board separates the edge HIT path from parent-cache and direct-origin
  MISS paths, then shows fill, failover, placement, and observation explicitly.
- `Social Feed — Distributed Cache` and `Distributed Cache` are separate
  teaching boards. The former is a read-heavy feed with brief staleness; the
  latter is a balanced-R/W financial cache whose invariant forbids observing a
  value older than the last committed write.
- The financial cache stays at the distributed-cache boundary: clients, load
  balancer, cache client/coordinator, consistent hash ring, cache server shards,
  Cassandra database shards, and monitoring. It uses synchronous write-through
  and intersecting cache/database quorums rather than the feed's cache-aside
  invalidation path.
- Its selected shard expands into three explicitly named physical cache servers;
  the ring, virtual nodes, HIT/MISS paths, write-through path, quorum rule,
  eviction policy, and monitoring signals remain editable first-class objects.
- Diagram composition follows the mechanism rather than a symmetry grid. Frames
  fit their contents, route labels remain attached to the route they explain,
  and abbreviations are decoded once by the component that owns them.
- The infinite canvas is also a spacing budget. Cache boards use a vertical
  sandwich—specific layer statement, open gap, mechanism details—while long
  request lanes and separate detail rows prevent labels, routes, and cards from
  competing for the same space. A narrow card is never retained solely to make
  a row look complete.
- Direct text targeting and empty-canvas marquee selection are complementary:
  text must accept pointer selection, while large layer frames use border-only
  hit behavior so they do not mask the editable objects inside them.
- The editable System Canvas architecture template is deliberately more linear:
  the React browser application, repo-owned TypeScript SVG editor module,
  immediate local snapshot, serialized save queue, Node/Fastify application
  server, and atomic filesystem replacement form one application flow.
- The inspector is a transaction boundary: drafts persist only after Apply;
  close, Escape, and outside click discard them. Reusable-component saving
  consumes only the already-applied element, never an unvalidated draft.
- Deterministic wrapping keeps interactive and generated SVG layouts aligned. A
  card can grow above a requested height to avoid clipping its text.
- Content-aware sizing has two width concepts: a minimum that can contain the
  longest indivisible token and a capped natural width used for new or edited
  content. Manual narrowing is allowed down to the minimum and always derives a
  new wrapped height; manual enlargement is preserved.
- A visual group becomes a real resizing relationship only when a child declares
  its shape `parentId`. Growing that child expands the parent and moves any
  connector bound to the parent; ungrouped nearby objects remain independent.
- Semantic shape icons use the same project-owned `SystemIcon` registry as cards,
  so a ring token can stay a small ellipse while still exposing its stable
  `virtual-node` ID and source provenance in the inspector.
- In the financial-cache example, a virtual node owns an interval on the ring,
  maps that interval to a logical shard, and never denotes a physical replica.
  The shard's replica rule separately selects B1, B2, or B3.
- Strong-cache wording depends on the acknowledgement boundary: success means
  cache `W=2` and Cassandra `CL=QUORUM` completed for the same version. A partial
  outcome is not acknowledged and forces cache invalidation or bypass.
- Browser wheel cancellation requires a native non-passive listener on the SVG;
  React's delegated wheel event alone cannot guarantee that the page or browser
  zoom remains still.
- The real insertion chain is built-in catalog → `StencilShelf` palette →
  `createStencilElements` → placed `CanvasSystemElement` in `BoardScene`.
- System artwork is project-owned SVG geometry in `SystemIcon.tsx`; Lucide is a
  separate verified source for interface controls. An icon represents a concept
  but is never the runtime object itself.

## Trade-offs

- The repo-owned React/TypeScript SVG editor removes a large dependency and gives
  direct semantic control, but this release now owns selection, transforms,
  connectors, history, and export correctness. The tool set stays intentionally
  focused and excludes freehand drawing.
- SVG keeps diagrams inspectable, accessible, and deterministic. Very large
  scenes will eventually need viewport culling.
- Embedded images maximize portability but consume browser and request-body
  space; object storage is the later path for larger assets.
- Atomic JSON snapshots are ideal for zero-setup local use but do not claim
  horizontal scalability.
- Generic geometric icons communicate mechanisms longer than cloud-vendor logos,
  at the cost of less visual branding.

## Questions deferred

- Which CRDT and asset protocol should power live collaboration?
- Should Logseq block/page references become a stencil or a first-class element?
- When do board counts justify PostgreSQL rather than local snapshots?
- At what scene size should renderer culling or spatial indexing become a named
  mechanism?
