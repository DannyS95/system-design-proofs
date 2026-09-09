# Stack

## Chosen stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Editor module | Our TypeScript/React code using browser SVG APIs | `EditorCanvas.tsx` renders and edits a `BoardScene`; it is not a server or an installed canvas library |
| Browser application | React 18 + TypeScript; bundled by Vite | Owns navigation, tool panels, board state, and calls the editor module |
| Application server | Node.js 20 + TypeScript + Fastify 5 | Runs as a backend process, validates HTTP JSON, serves templates, and coordinates persistence |
| Immediate persistence | Browser `localStorage` | Keeps a recovery copy on the user's device before a network save finishes |
| Durable persistence | Atomic JSON files in `.data/` | Zero-setup server snapshots; a filesystem adapter, not a database server |
| Document format | Typed schema-v2 JSON | Explicit element unions, portable embedded images, stable icon identifiers, and safe v1 migration |
| Production data | PostgreSQL JSONB + object storage | A later path for durable revisions and assets larger than the embedded-image budget |
| Production runtime | One container behind a managed load balancer | One deployable unit matches the current single-user workload |
| System stencil artwork | Project-owned `SystemIcon.tsx` SVG geometry | Stable semantic `iconId` values without vendor or icon-package coupling |
| Interface icons | `lucide-react` 0.468.0 | Third-party controls for toolbar/navigation only; not the system stencil vocabulary |

## Why a native SVG editor

The product needs system-design semantics rather than a generic whiteboard skin.
A local SVG renderer gives each routing layer, server, cache, database,
partition, replica group, and observability component a stable geometric icon.
It also makes camera behavior, plain/dotted/grid backgrounds, image handling,
selection, and export part of one explicit scene model.

Removing the previous editor runtime also removes its child-identity update
loop and asset-copy path. Supported Excalidraw JSON remains an import migration
format, not an editor dependency. The trade-off is intentional: this release
owns a smaller interaction set and does not claim freehand or every mature
whiteboard feature.

“Native” means the editor creates normal browser `<svg>`, `<rect>`, `<text>`,
`<image>`, and `<polyline>` nodes through React. The browser performs the
rendering. Our camera math converts between screen and unbounded world
coordinates; our event handlers implement selection, drawing, label editing,
locking, and history. Vite is only the development server and build tool—it is
not part of the runtime architecture after the frontend bundle is built.

The icon pipeline is concept → project-owned `SystemIcon` SVG registry → stencil
definition → `CanvasSystemElement` in `BoardScene`. The inspector derives source
and semantic provenance from that actual registry. Lucide icons are a separate
UI dependency. In both cases an icon is only a visual representation; it is
never the process, server, cache, or database itself.

The insertion path is equally concrete: `catalog.ts` supplies built-in
definitions → `StencilShelf.tsx` renders the searchable component palette →
`insertStencil` in `App.tsx` calls `createStencilElements` → the placed
`CanvasSystemElement` enters `BoardScene` JSON.

## Why Node over Python or Java

Node keeps the scene contract, validation, frontend, and backend in one
TypeScript toolchain. Its event-driven I/O fits frequent small autosave requests
and a future WebSocket collaboration tier.

Python would be a natural boundary for a later ML-assisted service. Java would
fit an existing JVM platform, but adds a second toolchain without improving this
phase.

## Infrastructure path

The checked-in application uses a mounted directory and atomic JSON replacement
so it starts with one command. At production scale, the storage adapter can
become PostgreSQL, images can move to S3-compatible object storage, and stateless
API replicas can sit behind a load balancer. Redis or NATS is introduced only
when live collaboration requires cross-instance fan-out.

No Kubernetes, cache, or message broker is justified in phase one.
