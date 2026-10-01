# System Design Proofs

A collection of editable system-design boards and the **System Canvas** app used
to explore them. The boards explain how requests move through a system, where
data lives, and what happens during scaling and failures.

Included designs cover a key-value store, a CDN, a financial distributed cache,
a social-feed cache, and the System Canvas application itself. Each has editable
JSON and SVG/PNG previews.

System Canvas is a single-user React and SVG whiteboard with component details,
connectors, layout controls, undo/redo, and import/export. Edits are recovered
locally in the browser; an explicit Save stores snapshots through a Node.js API.

## Run locally

Requires Node.js 20 or newer.

```bash
cd drawing-platform
npm ci
npm run dev
```

Open <http://localhost:5173>. See the [application guide](md/drawing-platform/README.md)
for features, verification, and Docker instructions.

## Explore the designs

- [Key-value store](md/kv-store/readme.md)
- [CDN](md/cdn/README.md)
- [Financial distributed cache](md/distributed-cache/README.md)
- [Social-feed distributed cache](md/social-feed-distributed-cache/README.md)
- [System Canvas architecture](md/drawing-platform/README.md#application-architecture)

Project documentation lives in [`md/`](md/), grouped by project. The
[agent instructions](md/AGENTS.md) and [design standard](md/DESIGN_STANDARD.md)
mainly guide AI-assisted work on this repository.
