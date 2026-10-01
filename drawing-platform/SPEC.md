# Functional specification

## Phase-one invariant

The latest local snapshot must represent the board currently visible to the
user. Remote persistence may lag briefly, but it must never silently replace a
newer local scene.

## What must exist

- A React workspace around a native SVG infinite canvas.
- A world-space camera with wheel pan, Ctrl/Cmd + wheel cursor-anchored zoom,
  Space-drag pan, fit-all, and fit-selection.
- Select with click, Shift-toggle, and empty-canvas marquee area selection;
  hand, rectangle, ellipse, diamond, connector, text, undo, redo, resize, and
  delete controls.
- A readable component reference inspector with visible Details badges, named
  web links, and navigation through existing board connections.
- An explicit-Apply inspector with editable title, subtitle, body/explanation,
  labels, image alt text, width, height, and optional architecture metadata.
- Content-aware width and height for every text-bearing object: defaults grow to
  a sensible width cap, narrower manual widths rewrap and increase height, and
  no manual dimension can undercut wrapped content. Bound connector endpoints
  and declared shape containers recalculate when their child resizes.
- Semantic icons on system cards and icon-bearing shapes, including distinct
  partition, physical-server, and virtual-node token marks with verified source
  provenance.
- Verified visual provenance derived from the actual local icon registry or SVG
  primitive source rather than an invented package attribution.
- Per-element and whole-board lock/unlock controls.
- A browser-backed library for reusable customized system nodes, shapes, and
  text blocks.
- A searchable shelf of semantic, vendor-neutral system icons grouped into
  Routing, Services, Distributed Data, Systems, and Hardware.
- Per-board canvas color plus plain, dotted, and grid backgrounds.
- PNG, JPEG, WebP, and GIF insertion by file picker, drop, and clipboard paste.
- Versioned schema-v2 board documents containing typed elements, camera,
  background, and embedded-file state.
- Immediate local persistence and manual, serialized API persistence.
- Visible `Template preview`, `Saving`, `Saved locally`, `Synced`, `Offline`,
  and `Conflict` states.
- JSON import/export, SVG/PNG export, independent template copies, a health
  endpoint, and an atomic file-backed snapshot store.

## What must happen

- Opening a board compares API and browser snapshots and opens the newer copy.
- Selecting a template loads its scene for temporary inspection without creating
  a board, writing browser storage, or starting autosave. Only the template's
  dedicated `+` action creates a persistent independent copy.
- Every canvas change reaches browser storage. Only an explicit Save sends edits to the server.
- Remote writes include the revision the client edited; stale writes return a
  conflict and do not overwrite either copy.
- Panning and zooming change the camera rather than imposing a finite page.
- Canvas shortcuts act only after the canvas itself receives focus; toolbar and
  inspector controls do not trigger drawing shortcuts.
- Visible text is directly selectable. A marquee selects fully enclosed objects
  without capturing a surrounding layer frame, and group movement keeps bound
  connector endpoints attached.
- The inspector discards unapplied drafts when closed by its close button,
  Escape, or an outside click.
- Adding a stencil creates one editable semantic system node near the viewport
  center; its `iconId` survives visual refinements.
- A template may deliberately open locked or unlocked. The two distributed-cache
  teaching boards open unlocked for immediate editing; unlocking elsewhere is
  explicit, persisted, and undoable, and a locked element remains selectable
  but cannot mutate.
- Saving a reusable component copies its customized content and appearance;
  inserting it creates a new unlocked element identity.
- Background choice, color, and camera position persist with the board.
- Images are validated, limited to 2 MB each, embedded as data URLs, and placed
  at the drop point or viewport center.
- Imported JSON is validated before replacement. Supported schema-v1 and raw
  Excalidraw primitives migrate to v2; unsupported legacy types fail with their
  type and element identifier.
- Exported JSON declares schema version 2.
- A canvas render failure leaves the surrounding workspace and recovery actions
  available through an error-boundary fallback.
- The read-heavy social-feed and balanced-R/W financial distributed-cache boards
  remain separate template scenes with separate files and board identities.

## What must never happen

- A network failure must not discard a valid local edit.
- Clicking a template row must not create a board or persist its preview.
- The API must not accept path-like board identifiers.
- A board template must share mutable scene values with its copy.
- Vendor cloud logos must be required to explain a generic mechanism.
- An invalid import or image must replace the visible scene.
- The error boundary must be presented as the primary crash fix; it is recovery
  after an unexpected renderer failure.
- Authentication, live collaboration, comments, backlinks, arbitrary embeds,
  or deployment orchestration must leak into phase one.

## Explicit non-goals

- Multi-user presence or CRDT synchronization
- Accounts and authorization
- Logseq graph, page, or block integration
- Freehand drawing, video, PDF, iframe, or arbitrary web embeds
- Multi-region or Kubernetes deployment
- Automatic diagram generation inside the product
