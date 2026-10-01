# Design

## Architecture board presentation

Follow the global rule: **Elements identify; details reveal.** A reader should
recognize React, the SVG editor, browser graphics, Fastify, and stored board data
from each element's title, icon, role, and placement. Details reveal the capability
or connection that makes each part useful; they should not turn cards into API
instructions or application-rule walkthroughs.

This is the architecture of the **System Canvas website itself**, intended to
help a development team recognize its components and responsibilities. Keep
build tooling and server runtime names on their relevant components, with one
or two visible mentions each. Do not dedicate separate Build or Backend areas
to them. A shared persistence flow may group browser recovery and server files;
component labels must still identify where each copy lives.

The main application board should make these relationships visible:

- **Object properties → React → SVG elements → browser SVG renderer:** React
  creates and updates SVG elements from position, size, color, text, and connection
  properties. The browser’s SVG renderer draws those elements; JavaScript event
  handlers update the properties when someone edits the design.
  The interactive drawing surface uses SVG, while Canvas 2D serves PNG export.
- **Board data → editable design:** JSON keeps object properties and connections
  so reopening a saved board reconstructs editable elements, rather than only a
  picture of them.
- **Browser localStorage → local recovery:** the user's device keeps a recoverable
  copy of the board.
- **Fastify on Node.js → JSON files:** the backend loads and saves the board's
  data on the server filesystem. It stores the properties used by the editor;
  rendering belongs to the browser.

Describe the storage lifecycle explicitly: JavaScript objects in memory feed
rendering and editing; closing the tab discards that memory. Edits write a JSON
snapshot to localStorage, and opening a board reads saved properties back into
memory. Local snapshots survive tab closure, are replaced by later saves, and
are removed by board deletion or clearing the site's browser data. Describe
Lucide as a **UI icon library**, supplying ready-made SVG icons for buttons and
toolbar tools such as delete, undo, and zoom.

Use concise, aligned text with consistent type hierarchy, indentation, and
section spacing. Connector labels should reveal the relationship between named
parts. Keep source-file inventories, HTTP methods and status codes, revision
rules, timing constants, helper names, export implementation calls, and worked
coordinate examples in inspector details or development documentation. The
sections below document these implementation contracts; they are not a script
to copy onto the architecture canvas. Preserve the rendering and persistence
boundaries when simplifying the board.

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
- **Shared layout modules** own geometry independently of browser and server
  processes. `shared/layout-standard.ts` supplies spacing and arrow/label
  constants; `src/editor/text-layout.ts` measures content;
  `shared/generated-layout.ts` and `shared/orthogonal-routing.ts` place and route
  generated or explicitly tidied scenes. `shared/layout-validator.ts` checks
  content bounds, collisions, route clearance, nesting, and unused space.
- **Generated preview rendering** in `scripts/render-scene.tsx` uses the same
  `CanvasElementView` primitives and `SystemIcon` artwork as the editor.
  `scripts/template-diagram-kit.mjs` constructs scenes and writes their matching
  template modules, editable JSON, SVG, and PNG artifacts.
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
  │    ├─ background: color, solid | dots | grid, spacing
  │    └─ layoutSpacing?: nodeGap, edgeClearance
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

Generated scenes follow one pipeline: measure content, place sections and
elements, route connectors, place labels, resolve collisions, calculate bounds,
then select a readable initial camera. Compaction removes space that serves
neither padding, grouping, nor routing. Neighboring-arrow clearance accounts for
both strokes and arrowhead envelopes. Rendering orders section backgrounds,
paths, label plates, cards, then interaction controls.

`layoutRole` distinguishes a shape container from preserved mechanism geometry;
`layoutGroup` keeps related mechanism members together during placement.
Connector `labelPosition` records the plate center relative to its route origin.
A local `referenceId` names the canonical component represented by a short
reference near a destination. For example, a PoP's Monitoring reference denotes
the existing monitoring service, preserving its logical destination without
another full-board secondary route or another runtime component.

Loading or importing a user board does not run automatic placement.
`LayoutControls.tsx` keeps node-distance and arrow-clearance sliders as local
drafts until release, a spacing key is released, or `Tidy layout` calls
`tidySceneLayout`. The editor commits resulting
geometry and `appState.layoutSpacing` together through existing undo and
local-first persistence. Tidy preserves authored typography and requires locked
elements to be unlocked.

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
  → wait for explicit Save
  → send one PUT with expected revision
  → update revision and mark Synced
```

Only one remote write per board is in flight. A newer edit replaces the pending
payload and waits for another explicit Save. Failed manual saves do not retry
automatically. Clear board is an undoable local change; server designs remain
untouched unless the user explicitly saves the cleared scene.

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


## Component reference reader

Selection opens a read view over the element's applied metadata. A screen-sized
SVG Details badge opens the same inspector for elements with notes; low-zoom
views hide unselected badges to keep the overview readable. Badges are marked
`data-editor-overlay`, so the existing export boundary removes them. Read/edit
mode, focus, and drafts are transient UI state, not scene data.

`ComponentDetails` owns presentation; `component-details-model` derives names
and connected components from real connector bindings and canonical references.
Free-text inputs/outputs never invent topology. Navigation selects the target
and frames it beside the inspector using the existing camera and local snapshot
flow. No network calls are needed to consult metadata.

The optional schema-v2 `metadata.referenceLinks` string stores one named HTTP(S)
reference per line (`Label | URL`, or a bare URL). The shared reference parser is
used both by scene validation and before inspector Apply. It rejects executable,
relative, and credential-bearing URLs; React renders notes as text and external
anchors use `noopener noreferrer`. The app never executes or embeds linked
content. Full web URLs in existing prose are clickable; ordinary source paths
remain text. Reference edits retain existing Apply/Undo, library, JSON, and
manual server-save semantics.

The app template's reference links are owned by `applyAppReferenceLinks` in
`scripts/app-architecture-details.mjs`. The normal generator applies them;
`node scripts/refresh-app-references.mjs` refreshes only reference metadata in
the existing generated module and example JSON without moving the drawing.


## Compact inspection and context isolation

The default reference panel is a quick concept brief: ≤200-character summary,
explicit demand/budget meter when available, and the first three connected routes.
`More context`, surplus connections, and `References` are native disclosures.
The reader is keyed by selected element ID so open disclosures do not leak into
a different component. The Details badge toggles the panel; Close and Escape
also dismiss it, without committing scene edits.

Capacity meters parse only explicit demand/budget pairs. Resident storage and hit
rate remain distinct: 20/64 GB is 31% occupancy, while 90% hits describes request
outcomes. Arbitrary percentages never become utilization. Generated budgets are
labeled assumed/unmeasured; overload and missed headroom targets are visible.
The known repeated BOTEC appendix is removed in the read projection for legacy
boards without changing persisted content. New generators store local role text
and a source reference instead of copying the design's full arithmetic to every
node. `CAPACITY_ASSUMPTIONS.md` is bundled by Vite and downloadable from both dev
and production; it needs no remote repository availability.

Hidden metadata is excluded from text measurement. The Cassandra and monitoring
workload cards retain only compact visible budgets and consequences. Their short,
structured notes stay in metadata. Tests compare measured size before/after large
metadata additions and browser bounds before/after expanding context. Existing
saved geometry remains authored; Reset design explicitly adopts updated templates.
