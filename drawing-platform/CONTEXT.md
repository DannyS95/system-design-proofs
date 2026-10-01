# Context

## What became visible

- Verification: 256 tests pass, with lint and production build passing. Chromium
  checks cover financial cache, CDN and app component details; collapsed defaults,
  selection resets, badge/Close/Escape controls, unchanged canvas bounds, reference
  links, manual saves and board controls pass. Expanded notes were visually checked.

- Component inspection now starts with a short concept summary, a capacity graphic
  and connected components. Context/references stay collapsed and reset between
  selections. Details badges toggle open/closed; Close and Escape also dismiss.
- Removed duplicated design-wide sizing essays from generated node metadata;
  legacy notes are condensed in the reader without rewriting saved boards.
  Capacity assumptions are available as a bundled Markdown download.
- Cassandra/monitoring workload cards now contain compact visible summaries.
  Context uses short titled sections and remains independent of canvas dimensions.
- Removed background blur from the reference panel after browser screenshots
  exposed blank content when expanded notes became scrollable.


- Component references now open as readable notes, with visible Details badges,
  explicit Edit details, safe named links, and navigation through actual bound
  connections. Empty fields are hidden; locked components remain consultable.
- Optional `metadata.referenceLinks` extends schema v2, preserving local-first
  Apply/Undo, manual server saves, JSON portability, and reusable components.
  The app template includes source and Markdown links through its generator;
  reference-only refreshes leave authored geometry and preview artwork intact.


- Layout spacing applies to the whole board without selection; sliders apply on
  release and locked boards offer an explicit undoable Unlock all and tidy action.
  Coincident nodes separate correctly, and tidying fits the result into view.
- Clear board empties the canvas with Undo and preserves server snapshots.
  Save explicitly writes to the server; edits and failed saves never auto-sync.


- Architecture storage labels should reveal use and lifetime, not promise to
  “restore work after reload.” Show working memory, edit/open paths, retention,
  and removal. Name Lucide as the UI icon library and identify its button icons.

- The app architecture is an orientation map for the team developing this
  website. React creates/updates SVG elements; the browser SVG renderer draws
  them. Persistence stores the same editable properties. Vite and Fastify/Node.js
  need only brief component mentions, without dedicated Build/Backend areas.
  Browser recovery and server files share a persistence flow while component
  labels preserve their runtime ownership.

- The application architecture follows “Elements identify; details reveal.”
  Cards identify concrete technology and its contribution. Object properties
  feed React/SVG rendering and remain editable through JSON persistence. API
  methods, response codes, save rules, timing constants and worked coordinate
  examples belong in development documentation or inspector details. LocalStorage
  holds browser recovery and My library; Fastify/Node.js stores board JSON on disk.

- Financial-cache text uses the monitoring workload hierarchy throughout.
  `scripts/distributed-cache-typography.mjs` formats text before layout; workload
  cards use the same pass before sizing. Other templates retain their styling.

- Capacity captions now choose safe physical budgets rather than leaving unknown
  limits: financial LB 50k, app 10k, cache 50k/node, Cassandra 5k/node. Workloads
  explicitly include average, peak and 2× flash; target ≥50% spare at peak.
  These are exercise assumptions, not benchmarks or per-core CPU ceilings.
- Financial peak 4k client QPS costs 10.6k cache node ops/s and 6.4k Cassandra
  node ops/s. Three Cassandra hosts are an explicit count separate from RF=3;
  their 15k budget is 43% used at peak and 85% at flash. Read-only quorum cache
  capacity is 75k client QPS from 150k raw node ops/s, not 150k client QPS.
- Adding captions must preserve routing topology. KV/CDN use monotonic vertical
  expansion of their validated baseline, followed by content/port compaction;
  rigid hash-ring mechanisms retain the normal layout path.
- The requested Obsidian vault received 16 native text annotations in its existing
  financial-cache drawing, one compact callout in each of 11 related design notes,
  and `BOTEC/BOTEC — Execution Capacity Assumptions.md`. Original drawing elements
  were retained; staged edits were hash-checked before writing and after readback.

- Policy-card colour denotes the enforcing layer. LFU eviction and TTL expiry
  belong to physical cache-server memory; an amber database-fallback consequence
  does not make the memory policy a database-layer component.
- Container padding and content density are separate choices: the CDN data plane
  deliberately uses 64-unit margins while its alternate PoPs share a compact row.
  `containerPadding` is scene data respected by generation, validation, and resize.
- Final card compaction must reattach bottom/right connector stubs into the space
  just vacated by the card. Occupied ports do not justify keeping unused capacity.
- Label placement must consider frame growth immediately and include internal
  label plates in the frame's content bounds; otherwise a later label can move
  a border over a previously valid label.
- Reset is an explicit undoable replacement with the latest template, preserving
  board identity and the local-first save path. Stable element IDs recognize
  renamed template copies; unknown custom scenes are never guessed from a name.
- Visible cards should state the component, selected configuration and consequence.
  Background belongs in inspector metadata; the hash ring already communicates
  the successor mechanism with a marked position, short arc and selected token.
- Layout controls are an explicit editing transaction. Slider drafts do not move
  a saved scene; `Tidy layout` commits the spacing profile and resulting geometry
  together through undo and local-first persistence. Import preserves authored
  coordinates, and locked elements retain their existing edit protection.
- A mechanism group preserves internal geometry while allowing common translation;
  a container role and child `parentId` instead express bounds that follow their
  children. Plain layer headings do not need decorative enclosing rectangles.
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
