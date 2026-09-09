# Acceptance criteria

## Behavior

- A user can create, rename, open, and delete boards.
- The repo-owned React/TypeScript SVG editor supports click selection,
  Shift-toggle, empty-canvas marquee selection, group movement, resizing,
  shapes, connectors, direct text selection/editing, delete, undo/redo, pan,
  zoom, and fit-to-design.
- A selected element exposes explicit Title/Subtitle/Body or label fields as
  applicable, real Width and Height controls, optional architecture metadata,
  and verified icon/primitive provenance without editing JSON.
- Inspector changes commit only through `Apply changes`; close, Escape, and
  outside click dismiss it, and its own scroll stays independent of the canvas.
- Long text wraps, cards grow to their minimum content height, and numeric or
  handle resizing preserves text and bound connector endpoints across save/reload.
- Users can lock or unlock one element and lock or unlock the complete board;
  locked elements cannot move, resize, edit, or delete.
- The two distributed-cache teaching templates start unlocked and editable;
  templates that start locked become editable through an explicit unlock.
- Customized system nodes, shapes, and text can be saved to and removed from a
  browser-backed component library.
- The camera has no page boundary; connected routes can extend in every
  direction.
- A normal wheel over the canvas pans; Ctrl/Cmd + wheel zooms; Space-drag pans;
  the page does not scroll while the pointer is over the canvas.
- Drawing shortcuts fire only while the canvas root is focused. Fit-all includes
  route labels and arrow extents; fit-selection is separately available.
- Thirty-six searchable geometric system stencils insert valid semantic nodes.
- Canvas color and plain, dotted, or grid background persist per board.
- PNG, JPEG, WebP, and GIF files up to 2 MB can be added by browse, drop, or
  paste and remain visible after save/reload.
- Every scene edit produces an immediate local snapshot before its debounced API
  save.
- Selecting a template row loads a temporary preview without creating a board,
  local snapshot, or autosave job; only the separate `+` control creates the
  persistent copy.
- The header explains `Template preview`, `Saved locally`, `Saving`, `Synced`,
  `Offline`, and `Conflict` without developer tools.
- Current content exports as schema-v2 JSON, SVG, and PNG.
- Supported v1/Excalidraw imports migrate without dropping elements; unsupported
  types are rejected without changing the current scene.
- Blank, KV-store, CDN, Social Feed — Distributed Cache, financial Distributed
  Cache, and editable application-architecture choices create independent copies
  only through their `+` controls.
- A renderer exception shows a canvas fallback while board navigation and JSON
  recovery remain available.

## Tests

- Contract validators cover typed elements, finite geometry, unique IDs,
  background/camera state, embedded files, bindings, and unsafe inputs.
- Migration tests cover supported legacy primitives, metadata preservation, and
  explicit unsupported-type failures.
- Camera tests cover screen/world transforms, anchored zoom, pan, and fitting.
- Canvas-model tests cover visual bounds, hit testing, bound connector movement
  and resize, safe binding detachment, cloning, and stroke rendering.
- Editor-canvas tests cover reverse-direction area selection and exclusion of a
  surrounding layer frame.
- Layout/provenance tests cover deterministic wrapping, adaptive content height,
  wheel delta normalization, and actual SystemIcon source attribution.
- Snapshot writes increment revisions and reject stale writers.
- Template copies change identity without sharing mutable scene values.
- Autosave serializes writes and retains the newest pending scene.
- Every stencil category is populated and produces valid semantic elements.
- Every checked-in template validates as v2 and contains its required teaching
  paths.

## Edge cases

- API unavailable at startup with a recoverable local board.
- Network failure between local and remote save.
- Rapid edits while a save is in flight.
- Invalid, oversized, unsupported, or dangling-file import.
- Stale expected revision.
- Empty stencil search.
- Image decode failure, unsupported MIME, or file larger than 2 MB.
- Renderer failure isolated to the canvas.

## Performance budgets

- Shell production JavaScript is measured in `BENCHMARKS.md`.
- Initial API health and board-list responses remain below 100 ms locally.
- Canvas changes never wait for the network.
- Camera movement remains a transform of the scene root, not a rewrite of every
  element coordinate.

## Documentation

- README explains start, verification, features, and the five architecture
  templates.
- STACK and DESIGN match the repo-owned SVG editor and persistence implementation.
- CHANGELOG and CONTEXT record the completed mechanism and trade-offs.
