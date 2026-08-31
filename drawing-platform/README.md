# System Canvas

System Canvas is a local-first whiteboard for explaining software, distributed
systems, systems programming, networks, and hardware. It combines an
Excalidraw editing surface with a curated IT stencil shelf and a small Node API
for durable board snapshots.

The first release deliberately optimizes for one person turning an idea into a
clear, editable diagram. Accounts and live collaboration are later concerns.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:8787` and
stores local board snapshots under `.data/`.

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

## What is included

- Excalidraw's infinite canvas, shapes, connectors, drawing tools, history,
  pan, and zoom
- local-first autosave with explicit sync status
- board creation, opening, renaming, and deletion
- JSON import/export plus SVG and PNG export
- generic routing, service, distributed-data, systems, and hardware stencils
- a template API for creating independent, reusable board copies

See [STACK.md](./STACK.md) for the technology decision and
[DESIGN.md](./DESIGN.md) for the boundaries and invariants.
