# Tasks

Each task implements one mechanism.

## Phase 1 — local-first document persistence

- [x] Define a versioned board contract and validation.
- [x] Implement atomic board snapshots with optimistic revisions.
- [x] Implement local recovery and a serialized autosave queue.
- [x] Connect complete canvas scenes to persistence state.
- [x] Add board lifecycle actions and visible sync states.
- [x] Add import/export and the generic system stencil catalog.
- [x] Test contracts, storage, save ordering, API routes, and stencils.
- [x] Update changelog, context, and measured benchmarks.

## Phase 2 — KV-store teaching artifact

- [x] Express KV routing, placement, quorum, divergence, handoff, and repair as
  one editable topology.
- [x] Attach each mechanism to the component where it executes.
- [x] Export a deterministic repository image from the same scene model.
- [x] Keep the matching README concise and test the required content.

## Phase 3 — remaining distributed-system artifacts

- [x] Express CDN edge HIT, upstream MISS, fill, placement, failover, and
  observation routes as one editable non-linear board.
- [x] Express distributed-cache topology as three levels and four scoped
  mechanisms with an explicit authoritative path.
- [x] Export deterministic SVGs from the same diagram models.
- [x] Register and test both templates as independent board starting points.

## Phase 4 — native System Canvas

- [x] Replace the previous editor runtime with a native React/SVG infinite canvas.
- [x] Implement world/screen camera transforms, pan, anchored zoom, and fit.
- [x] Implement semantic system nodes, geometric icon registry, shapes,
  connectors, text editing, selection, movement, resizing, and history.
- [x] Add per-board color and plain, dotted, and grid backgrounds.
- [x] Add embedded images up to 2 MB through browse, drop, and paste.
- [x] Introduce schema v2 with strict validation and safe v1/Excalidraw migration.
- [x] Add a canvas error-boundary recovery fallback.
- [x] Add the editable System Canvas frontend/backend architecture template.
- [x] Test the camera, canvas model, editor shell, migration, icons, and the then-current four
  architecture templates.
- [x] Remove the obsolete editor dependency/assets and update documentation.

## Phase 5 — reconstruction-first boards and inspector

- [x] Split Social Feed — Distributed Cache from generic Distributed Cache into
  separate native scenes, files, templates, documentation, and tests.
- [x] Replace ambiguous cache-router/copy/write-alternative content with explicit
  API, key placement, shard, healthy-replica, hit, miss, refill, invalidation,
  and failure routes.
- [x] Add deterministic wrapping, adaptive card height, label-aware fit bounds,
  fit-selection, and connector-aware resize/deletion.
- [x] Add explicit-Apply Title/Subtitle/Body, Width/Height, and architecture
  metadata fields with close, Escape, and outside-click dismissal.
- [x] Make normal wheel pan, Ctrl/Cmd + wheel zoom, and drawing shortcuts require
  canvas focus.
- [x] Expose verified icon provenance and add the editable concept → SystemIcon
  registry → stencil → `StencilShelf` palette → canvas-object vocabulary to the
  app architecture board.
- [x] Perform overview/detail visual QA and test both cache contracts and the
  source-grounded application architecture independently.

## Phase 6 — content bounds and cache accuracy

- [x] Enforce capped natural width, wrapped minimum height, manual resize floors,
  connector rerouting, and declared parent-container expansion.
- [x] Distinguish virtual-node tokens, logical cache shards, and physical cache
  servers with verified project-owned icon provenance.
- [x] Correct the financial-cache clockwise-successor stop, interval ownership,
  replica selection, application boundary, quorum acknowledgement, and durable
  data destinations without rearranging the board's layer composition.
- [x] Regenerate and verify the editable board plus deterministic SVG/PNG views.

## Later mechanisms

- [ ] Asset upload to object storage.
- [ ] Viewport culling or spatial indexing for very large scenes.
- [ ] PostgreSQL board adapter.
- [ ] Authentication and board ownership.
- [ ] CRDT collaboration and presence.
- [ ] Logseq page/block linking.
