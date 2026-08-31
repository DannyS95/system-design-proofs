# Functional specification

## Phase-one invariant

The latest local snapshot must represent the board currently visible to the
user. Remote persistence may lag briefly, but it must never silently replace a
newer local scene.

## What must exist

- A React workspace around one Excalidraw canvas.
- A board navigator with create, open, rename, and delete actions.
- A searchable IT stencil shelf grouped into Routing, Services, Distributed
  Data, Systems, and Hardware.
- Versioned board documents containing metadata and an Excalidraw scene.
- Immediate local persistence and debounced API persistence.
- Visible `Saving`, `Saved locally`, `Synced`, `Offline`, and `Conflict` states.
- JSON import/export and SVG/PNG export.
- A template mechanism that creates an independent board copy.
- A health endpoint and an atomic file-backed snapshot store for local use.

## What must happen

- Opening a board loads the newest local snapshot when it is newer than the API
  copy.
- Every canvas change is written to browser storage before remote sync begins.
- Remote writes include the revision the client edited.
- A stale revision receives a conflict response; it is never overwritten.
- Adding a stencil places an editable, grouped element near the viewport center.
- Deleting a board requires confirmation and cannot delete the final board.
- Imported JSON is validated before it replaces the scene.
- Exported JSON includes the System Canvas schema version.

## What must never happen

- A network failure must not discard a valid local edit.
- The API must not accept path-like board identifiers.
- A board template must not be mutated when its copy is edited.
- Vendor-specific cloud logos must be required to explain a generic mechanism.
- Authentication, live collaboration, comments, backlinks, arbitrary embeds,
  or deployment orchestration must leak into phase one.

## Explicit non-goals

- Multi-user presence or CRDT synchronization
- Accounts and authorization
- Logseq graph, page, or block integration
- Video, PDF, iframe, or arbitrary web embeds
- Multi-region or Kubernetes deployment
- Automatic diagram generation
