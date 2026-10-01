# Changelog

## Unreleased

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


### Added

- Clarified the architecture’s memory and localStorage lifecycle: drawing and
  edits use memory, edits write JSON, opening reads it, and saved data outlives
  the tab until removed. Lucide is named as the UI icon library, with concrete
  button and toolbar examples.

- Final website-architecture presentation identifies System Canvas itself,
  distinguishes React’s SVG element updates from browser SVG rendering, and
  connects editable properties to browser recovery and server JSON files.
  Dedicated Build and Backend areas are removed; Vite and Fastify/Node.js each
  appear once on relevant components. Persistence forms a single compact flow.

- System Canvas architecture identifies technologies by name and role, with
  short details connecting editable object properties, React/SVG, and JSON
  storage. API notes, save rules, and the worked coordinate tutorial are removed
  from the visible board. The design guidance records “Elements identify; details
  reveal.”

- Consistent section labels, indented details, text sizes, and content-aware
  spacing across the financial-cache board, following its monitoring workload.

- Explicit chosen safe per-host budgets, average/peak/flash workloads, demand /
  capacity ratios and a 50% spare-capacity target across relevant diagrams.
  Cassandra, API, cache, KV, CDN and telemetry now have concrete sizing choices;
  flash, cold-cache and failover headroom failures are marked in the diagrams.
- Caption compaction trims both top and bottom slack while retaining side ports
  and connector topology, including short cards beside taller capacity captions.

- Small editable capacity captions for financial cache, social-feed cache, KV,
  and CDN templates; physical node budgets, quorum/replication work, conditional
  bottlenecks, and explicit BOTEC assumptions with source provenance.
- Caption layout preserves established KV/CDN routes by expanding occupied
  content bands, then fits cards and frames to content and real connector ports.
- Browser verification now checks capacity text alongside all architecture text.

- `Reset design` restores the latest matching template in the current board,
  with undo/redo, immediate local saving, and isolated temporary previews.
- Persisted `containerPadding` for deliberate section breathing room; the CDN
  data plane uses 64 units and retains it through compaction and child resizing.
- Browser checks exercise reset, undo, and redo on all five template previews.
- Explicit `Layout spacing` controls with node distance and arrow clearance
  drafts. `Tidy layout` applies and persists the chosen spacing through the
  existing undo and local-first save path; locked elements require unlocking.
- Optional schema-v2 layout groups, container/mechanism roles, connector-label
  positions, and applied spacing profiles, preserving authored geometry on import.
- Content-aware minimum and capped natural widths for system cards, shapes,
  notes, headings, and labels; manual width changes now rewrap and recalculate
  height, bound routes move with resized objects, and declared shape parents
  expand around growing children.
- Icon-bearing editable shapes plus a project-owned virtual-node token glyph, so
  the inspector can preserve verified `SystemIcon` provenance for logical
  partitions and ring tokens as well as system cards.
- Empty-canvas marquee area selection, Shift-toggle multi-selection, group
  movement/lock/delete/fit actions, direct SVG text targeting, and border-only
  hit behavior for large layer frames.
- A repository-wide `DESIGN_STANDARD.md`, linked from project guidance and the
  README, for reconstructable, readable, and editable teaching boards.
- Per-element title/body/label font sizing and text alignment in schema v2,
  both SVG renderers, layout bounds, exports, and the explicit-Apply inspector.
- Separate locked native templates for the read-heavy `Social Feed — Distributed
  Cache` and the balanced-R/W financial `Distributed Cache`, each with its own
  JSON, SVG, docs, assumptions, request paths, and tests.
- Wrapped card/label text, adaptive minimum card height, label-aware visual
  bounds, and fit-selection.
- Inspector fields for body, true width/height, editable architecture metadata,
  and verified visual provenance.

- Native React/SVG infinite canvas with a world-space camera, pointer-anchored
  zoom, pan, fit-to-design, selection, movement, resizing, delete, and history.
- Rectangle, ellipse, diamond, connector, and editable-text tools.
- Selected-element editing for component titles/subtitles, shape and connector
  labels, text content, and image alt text.
- Per-element and whole-board locking, with generated teaching templates locked
  by default.
- A local `My library` for reusable customized system nodes, shapes, and text.
- Thirty-six semantic system stencils with distinct local geometric icons for
  routing, services, distributed data, systems, and hardware.
- Per-board canvas color plus plain, dotted, and grid backgrounds.
- Embedded PNG, JPEG, WebP, and GIF support up to 2 MB through browse, drop, and
  clipboard paste.
- Schema-v2 typed scenes for semantic nodes, shapes, text, connectors, images,
  camera/background state, and embedded raster files.
- Safe migration for supported schema-v1 and raw Excalidraw rectangle, ellipse,
  diamond, text, arrow, line, freehand, embed-placeholder, and raster-image
  elements.
- Local-first snapshots, serialized autosave, optimistic revisions, and explicit
  offline/conflict recovery.
- Board lifecycle actions plus versioned JSON import/export and SVG/PNG export.
- Fastify board/template APIs backed by atomic JSON-file replacement.
- Editable KV-store, CDN, Social Feed cache, financial distributed-cache, and
  System Canvas application architecture templates with deterministic matching
  SVGs and PNG previews referenced by their project READMEs.
- Canvas error-boundary fallback that leaves navigation and JSON recovery
  available after an unexpected render failure.
- Tests for contracts, migration, camera math, canvas models, persistence,
  autosave, API routes, local recovery, stencils, and every template.

### Changed

- Memory-policy cards on both cache boards now use cache-server green and name
  physical cache servers as their owner; database-fallback routes retain amber.
- Compact social-feed shard choices together and place alternate CDN PoPs beside
  each other, reducing unused board height while preserving all destinations.
- Keep application-library persistence references local, scan free connector
  segments for labels, and include label plates in container visual bounds.
- Remove unused card port capacity after routing and reattach boundary stubs.
- Replaced the financial-cache successor tutorial with its exact three-line
  hash-position → `vB2` → Shard B rule, preserving the ring and token topology.
  Cache cards now show selected configuration and consequence; expanded policy
  and application-module background remains in inspector metadata.
- Replaced detached cache section banners with compact editable text headings,
  retained physical-replica and persistence destinations, and documented hot-key
  options without changing the financial cache's selected quorums.
- Corrected the financial-cache ring so the marked hash position advances
  clockwise to `vB2`, states the exact successor stopping rule and owned
  interval, maps that interval to logical Cache Shard B, and then selects the
  physical B1/B2/B3 server replicas.
- Grounded the financial-cache request and consistency claims at their owning
  layers: the load balancer selects an application instance, the embedded cache
  client performs key and replica placement, acknowledged financial writes wait
  for cache `W=2` and Cassandra `CL=QUORUM`, and partial writes invalidate or
  bypass cache state rather than returning a false success.
- Rebuilt both distributed-cache boards as open vertical sandwiches: each useful
  layer statement is followed by its own mechanism details, with substantially
  larger horizontal and vertical gaps. Removed the financial board's stage strip
  and detached logic rail, added an explicit ring key-position marker and
  next-vnode route, and moved Social Feed observability off the squeezed policy
  row.
- Reflowed the financial cache around mechanism-sized, asymmetric routing,
  cache-server, persistence, and logic sections. The compact ring now shows
  virtual-node selection, route explanations are editable connector labels, and
  the Cassandra component decodes replication factor, consistency level, and
  partition key in plain language.
- Enlarged diagram arrowheads and moved the CDN data-plane edge away from its
  control and telemetry routes without changing the CDN topology.
- Template rows now load temporary, clearly labeled previews without creating a
  board, writing local storage, or starting autosave. Only each row's separate
  `+` button creates a persistent independent board.
- Corrected the financial distributed-cache template against its checked-in
  source design: 500k users, balanced reads and writes, consistent-hash shard
  routing, `N=3`/`R=2`/`W=2` cache quorums, synchronous write-through,
  Cassandra `CL=QUORUM`, and monitoring.
- Refined that financial-cache board into explicit request-routing, key-placement,
  physical cache-server/replication, and persistence layers. Its virtual-node
  ring, policy labels, right-hand logic rail, and all other objects now open
  unlocked for immediate selection and editing, with 20 px minimum explanatory
  text.
- Normal canvas wheel gestures pan; Ctrl/Cmd + wheel zooms at the pointer, and
  drawing shortcuts only act while the canvas root is focused.
- Inspector edits use one explicit Apply boundary and can be dismissed with its
  close button, Escape, or outside click without committing drafts.
- Resizing reflows text and moves bound connector endpoints; deletion detaches
  bindings; fit/export bounds include route labels and arrow room.
- Canvas wheel capture now uses a scoped non-passive browser listener; bound
  routes stay orthogonal with canonical dimensions, inline text growth moves
  attached routes, and persisted cameras are honored on reload.
- Saving a reusable component now requires pending inspector drafts to be
  applied and validated first; deleted images release unreferenced embedded
  assets.
- Application architecture names actual source paths, runtimes, packages, object
  types, the real catalog → `StencilShelf` → placed-element path, and the
  distinction between project-owned SystemIcon artwork and third-party Lucide
  interface controls.

- Rebuilt the three distributed-system teaching boards around explicit topology,
  short route labels, geometric components, and scoped failure/control paths.
- Replaced renderer-shaped persistence with the typed, editor-independent schema
  v2 contract.

### Removed

- Previous editor runtime, copied assets, and adapter-specific scene state.

### Fixed

- Deleting a referenced component now detaches surviving local annotations,
  preserving their geometry and lock state while keeping the next snapshot valid.
- Prevented text-bearing elements from accepting stored dimensions below their
  wrapped content and prevented generated connector labels from growing beyond
  the board without wrapping.
- Eliminated the maximum-update-depth crash by removing the dependency path that
  re-entered React updates and by keeping repo-owned SVG editor callbacks and session
  transitions stable. The error boundary remains fallback recovery, not the fix.

## Documentation organization

All project Markdown now lives under the repository’s `md/` directory, preserving
project subfolders. The root README introduces the designs and application.
Documentation links, bundled capacity notes, generated references, preview checks,
and the Docker build context follow the new paths. Run application commands from
`drawing-platform/`.
