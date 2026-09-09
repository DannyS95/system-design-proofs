# Design

## Major modules

```text
BUILD / DEVELOPMENT — tooling, not application-data runtime

Frontend .tsx/.ts/CSS ──▶ Vite build/dev tool ──▶ dist/ HTML + JS + CSS
                                  │                         │
                                  ├─ dev serves bundle ─────┤
                                  └─ prod: Fastify serves ──┘
                                                            ▼
BROWSER RUNTIME

User ──▶ React/TypeScript workspace ──owns──▶ BoardScene in memory
                    │                              ▲  │
                    │ calls                        │  ├─▶ browser localStorage
                    ▼                              │  │    board + My library JSON
       repo-owned React/TypeScript SVG editor ─────┘  │
                    ↕ render / pointer events          ▼
             browser SVG + DOM APIs             serialized save queue
                                                        │ fetch HTTP JSON
                                                        ▼
APPLICATION SERVER RUNTIME — one Node.js process

Fastify TypeScript application
  ├─ @fastify/static reads dist/ ──▶ sends HTML/JS/CSS to the browser
  └─ /api routes ──────────────────▶ FileBoardStore TypeScript module
                                               ▲              ↕ read / write
                                               │              ▼
                                   TypeScript template   filesystem JSON snapshots
                                   scene modules         .data/{boardId}.json
                                                         persistence, not a database
```

## Boundaries and ownership

- **Vite** is development and build tooling. It serves the browser bundle during
  development and emits `dist/` for production; it is not an editor,
  application server, or persistence layer.
- **React/TypeScript SVG editor module** owns world/screen transforms, gestures,
  canvas-focused wheel/keyboard control, selection, connector-aware resizing,
  wrapped content editing, locking, history, image
  ingestion, and scene rendering. It uses browser SVG and DOM APIs, emits
  complete typed scenes, and does not own board identity, HTTP, or persistence.
- **Geometric icon registry** maps stable semantic `iconId` values to local SVG
  geometry in `src/editor/SystemIcon.tsx`. Saved boards do not depend on
  component names or vendor assets. `lucide-react` supplies separate interface
  controls; it is not the system-artwork source.
- **Component palette** is the project-owned React `StencilShelf`. It receives
  built-in and user-saved choices, emits the selected stencil ID, and lets
  `insertStencil` in `App.tsx` call `createStencilElements` before the new
  `CanvasSystemElement` enters `BoardScene`.
- **Board controller** owns the active document, dirty state, revision, and
  serialized save queue.
- **Browser localStorage adapter** owns the immediate board recovery copy on the
  user's device. It is not server storage or a database server.
- **Custom component store** keeps user-saved system nodes, shapes, and text in
  browser storage and creates unlocked copies without changing the originals.
- **HTTP client** owns transport and maps status codes to domain failures.
- **Node/Fastify process** is the TypeScript application server. Fastify owns
  input validation and HTTP semantics and serves the Vite `dist/` files in
  production. It never renders or edits canvas elements.
- **TypeScript template modules** are server-code constants imported at process
  start. A read-only API route returns a deep copy for an in-memory preview;
  only the separate `+` action asks the API to create a board and persist an
  independent copy. Templates are not a database or a user-editable shared
  instance.
- **FileBoardStore server module** owns identifiers, revision comparison,
  template copying, and atomic replacement. It does not inspect canvas
  rendering.
- **Filesystem JSON snapshots** under `.data/` are the server persistence
  adapter. They are files written through a temporary file and atomic rename,
  not a database server.
- **Canvas error boundary** is a last-resort rendering fallback that keeps board
  navigation and JSON recovery available; it is not normal control flow.

## Scene and camera

Schema v2 stores world-space elements separately from presentation state:

```text
BoardScene
  ├─ elements: system | shape | text | connector | image
  ├─ appState
  │    ├─ camera: x, y, zoom
  │    └─ background: color, solid | dots | grid, spacing
  └─ files: embedded raster assets
```

The SVG scene root applies `translate(camera.x, camera.y) scale(camera.zoom)`.
Coordinates are not clipped to a page, so users can place connected flows in
any direction. Background patterns track the camera and remain visually stable.
Every element may carry a persisted `locked` flag; the editor still permits
selection and explicit unlocking while blocking accidental mutation.
Elements may also carry optional runtime/source/ownership metadata. System nodes
add an optional body below title and subtitle; shapes may carry an optional
semantic `iconId`; and a child may declare a shape `parentId`. Deterministic text
measurement supplies both a minimum width and a capped natural width. Defaults
grow toward the natural width, narrower manual widths rewrap, and stored height
then grows to contain every line. Resizing moves bound connector endpoints and
expands declared parent containers. Connector labels independently size their
plates to capped, wrapped content. Visual bounds include those labels and arrow
room for fit and export.

The visual vocabulary flow is:

```text
system concept
→ project-owned SystemIcon SVG geometry
→ StencilDefinition with iconId
→ StencilShelf component palette
→ createStencilElements
→ CanvasSystemElement in BoardScene JSON
→ native browser SVG DOM
```

The inspector reports this provenance from actual imports and source paths. The
icon is a representation of the concept, not the runtime object.

## Input ownership

- Click on the canvas focuses its root; drawing shortcuts only apply there.
- Normal wheel pans and prevents page scrolling while over the SVG surface.
- Ctrl/Cmd + wheel zooms around the pointer; Space-drag also pans.
- Inspector inputs and scrolling remain local to the panel.
- Apply is the only inspector commit. Close, Escape, and outside click discard
  drafts.

## State flow

```text
Canvas change
  → clone serializable schema-v2 scene
  → write local snapshot synchronously
  → mark Saved locally
  → replace pending remote snapshot
  → send one PUT with expected revision
  → update revision and mark Synced
```

Only one remote write per board is in flight. A newer edit replaces the pending
payload and is sent after the current request completes.

## Load and migration flow

```text
Select board
  → fetch API document + read local snapshot
  → validate and migrate schema v1 when required
  → choose newer updatedAt
  → mount the React/TypeScript SVG editor module with the schema-v2 scene
```

Supported legacy rectangles, ellipses, diamonds, text, arrows, lines, freehand
paths, and raster images migrate without silently dropping elements. Legacy
embeds become locked placeholders rather than executing foreign content.
Unknown legacy types fail explicitly. A remote `409` leaves the local scene
intact for export or an explicit server reload.

## Image flow

```text
Browse | drop | paste
  → validate raster MIME and 2 MB limit
  → read dimensions + data URL
  → add CanvasFile and linked image element
  → normal local-first save flow
```

Embedding keeps JSON portable. Object storage remains the future seam for larger
assets.

## Dependency rules

- Domain contracts import no React, browser, Fastify, or filesystem code.
- UI code may depend on contracts, camera math, the editor, and HTTP client.
- Server code may depend on contracts and the snapshot store.
- The snapshot store never imports UI or renderer code.

## Data flow invariant

For one board and client, persistence is monotonic: an older remote response
cannot replace a scene captured after that request began.

## Security and deployment boundaries

Board identifiers match `^[a-z0-9][a-z0-9-]{0,63}$`. Request bodies, scene
depth, element references, and embedded files are validated before persistence.
Snapshot filenames are derived only after ID validation, and labels render as
SVG text rather than HTML.

Fastify serves the built SPA and `/api/*` from one process. The atomic file
store is a zero-setup local adapter, not a horizontally scalable database. The
`BoardStore` interface is the seam for PostgreSQL without changing browser
contracts.
