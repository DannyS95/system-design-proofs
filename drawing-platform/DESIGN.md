# Design

## Major modules

```text
Workspace shell
  ├─ Board navigator ───────────────┐
  ├─ IT stencil shelf              │
  └─ Excalidraw adapter            │
          │ scene changes          │ board actions
          ▼                        ▼
     Local snapshot ◀──── Board controller ──── HTTP client
                                                │
                                                ▼
                                       Fastify board API
                                                │
                                                ▼
                                      Atomic snapshot store
```

## Boundaries and ownership

- **Excalidraw adapter** owns conversion between editor values and a serializable
  scene. It does not own board identity or persistence.
- **Board controller** owns the active document, dirty state, revision, and the
  serialized save queue.
- **Local snapshot store** owns immediate browser recovery data.
- **HTTP client** owns transport and maps status codes to domain failures.
- **Fastify API** owns input validation and HTTP semantics.
- **Snapshot store** owns identifiers, revision comparison, atomic replacement,
  and template copying. It does not inspect Excalidraw elements.
- **Stencil catalog** owns generic educational component definitions and their
  conversion into grouped Excalidraw elements.

## Dependency rules

- Domain contracts import no React, browser, Fastify, or filesystem code.
- UI code may depend on contracts, the editor adapter, and the HTTP client.
- Server code may depend on contracts and the snapshot store.
- The snapshot store never imports UI or Excalidraw runtime code.

## State flow

```text
Canvas change
  → normalize serializable scene
  → write local snapshot synchronously
  → mark Saved locally
  → replace pending remote snapshot
  → send one PUT with expected revision
  → update revision and mark Synced
```

Only one remote write per board is in flight. If another edit arrives, it
replaces the pending payload and is sent after the current request completes.

## Load flow

```text
Select board
  → fetch API document
  → read local snapshot
  → choose newer updatedAt
  → mount editor with chosen scene
```

A remote `409` is a first-class conflict state. The local copy remains intact
and the user may export it or explicitly reload the server copy.

## Data flow invariant

For a given board and client, persistence is monotonic: an older remote response
cannot replace a scene captured after that request began.

## Security boundary

Board identifiers match `^[a-z0-9][a-z0-9-]{0,63}$`. Request bodies have size
limits. Snapshot filenames are derived only after validation. HTML is never
rendered from board labels by the application shell.

## Deployment boundary

Fastify serves the built SPA and `/api/*` from one process. The file store is a
local adapter, not a horizontally scalable production database. The `BoardStore`
interface is the seam for PostgreSQL without changing browser contracts.
