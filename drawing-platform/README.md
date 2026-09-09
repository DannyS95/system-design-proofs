# System Canvas

System Canvas is a local-first whiteboard for explaining software and distributed
systems. Its editor is a native React and SVG canvas with an unbounded world-space
camera, editable routes, and a vendor-neutral geometric icon language.

The first release is deliberately single-user. Browser recovery is immediate;
a small Node API stores durable snapshots without blocking edits.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:8787` and
stores snapshots under `.data/`.

For the production-shaped single-container path:

```bash
docker compose up --build
```

Then open `http://localhost:8787`.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Regenerate the checked-in teaching boards and matching SVG/PNG previews with:

```bash
npm run generate:designs
```

## What is included

- an infinite SVG canvas where a normal wheel pans, Ctrl/Cmd + wheel zooms at
  the cursor, Space-drag pans, and fit-all/fit-selection use visual content bounds
- click, Shift-toggle, and empty-canvas marquee selection; connector-aware group
  movement/resizing; content-aware width and height; parent-container growth;
  directly selectable wrapped text; shapes; and undo/redo
- an explicit-Apply inspector for titles, subtitles, body/explanation, labels,
  font sizes, text alignment, image alt text, width, height, and optional
  architecture metadata; it closes with its button, Escape, or an outside click
- verified visual provenance in the inspector: actual source/package, icon ID,
  source file, asset type, category, and semantic reason, including icon-bearing
  logical partitions and consistent-hash virtual-node tokens
- element and whole-board locking; the two cache teaching templates start
  unlocked for direct editing, while locked boards can be unlocked one element
  at a time or all at once
- a browser-backed `My library` for saving customized system nodes, shapes, and
  text as reusable components
- thirty-six semantic system stencils across Routing, Services, Distributed
  Data, Systems, and Hardware
- custom canvas colors with plain, dotted, and grid backgrounds
- PNG, JPEG, WebP, and GIF insertion by browse, drop, or paste; images are
  embedded in the board and limited to 2 MB each
- immediate browser snapshots, serialized API saves, explicit sync state, and
  optimistic revision conflicts
- schema-v2 JSON import/export, SVG/PNG export, and migration of supported
  schema-v1 and Excalidraw JSON
- independent template copies for the
  [KV store](./examples/kv-store.system-canvas.json),
  [CDN](./examples/cdn.system-canvas.json),
  [Social Feed — Distributed Cache](./examples/social-feed-distributed-cache.system-canvas.json),
  [balanced-R/W financial distributed cache](./examples/distributed-cache.system-canvas.json), and
  [System Canvas application architecture](./examples/system-canvas-app.system-canvas.json)

See [STACK.md](./STACK.md) for the technology choices and
[DESIGN.md](./DESIGN.md) for module boundaries and invariants. Every teaching
board also follows the repository-wide
[design standard](../DESIGN_STANDARD.md).

## Application architecture

![System Canvas frontend, local-first, and backend architecture](./system-canvas.png)

The [editable architecture board](./examples/system-canvas-app.system-canvas.json)
shows browser input, the repo-owned React/TypeScript SVG editor, immediate local snapshots, the
serialized revision-aware save queue, Fastify validation, and atomic files.

The custom SVG editor is not a third-party library, server, or database. It is
the frontend module [`src/editor/EditorCanvas.tsx`](./src/editor/EditorCanvas.tsx),
written in TypeScript and React. Vite compiles it to JavaScript; it runs in the
user's browser, turns scene data into ordinary SVG DOM elements, handles pointer
and keyboard input, and emits a changed `BoardScene` back to the React
application.

System-diagram artwork is hand-authored project SVG in
[`src/editor/SystemIcon.tsx`](./src/editor/SystemIcon.tsx). The stencil catalog
maps a concept to an `iconId`; the React `StencilShelf` renders those definitions
as the component palette; and `createStencilElements` turns a selected definition
into a placed `CanvasSystemElement` in `BoardScene`. The placed element stores the ID.
`lucide-react` is a separate third-party source used for toolbar and interface
controls, not for the system stencil artwork. An icon is a visual representation
of a runtime concept; it is not the runtime process, server, or database.

The backend is a separate Node.js application process written in TypeScript and
built with Fastify. It validates HTTP JSON requests and saves board snapshots as
atomic JSON files under `.data/`. Those files are persistence, not a database
server. Browser `localStorage` is a second, immediate recovery copy on the user's
machine. Neither storage layer draws or edits SVG.
