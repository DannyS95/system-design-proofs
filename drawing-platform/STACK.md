# Stack

## Chosen stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Editor | Excalidraw | MIT-licensed, open JSON, mature infinite-canvas interactions, connectors, freehand drawing, history, and export |
| Frontend | React + TypeScript + Vite | Familiar React model, shared contracts, fast local feedback, and a small production bundle shell |
| Backend | Node.js + TypeScript + Fastify | One language across the boundary, schema-friendly HTTP routes, and a natural path to WebSockets later |
| Local persistence | Browser storage + atomic JSON snapshots | Local edits survive API outages; the server remains zero-setup for this educational scaffold |
| Production data | PostgreSQL JSONB + object storage | Durable metadata/revisions in PostgreSQL; large embedded files and exports outside database rows |
| Production runtime | One container behind a managed load balancer | The current workload needs one deployable unit, not an orchestrator |

## Why Node over Python or Java

Node keeps the board contract, validation vocabulary, frontend, and backend in
one TypeScript toolchain. Its event-driven I/O also fits frequent small autosave
requests and a future WebSocket collaboration tier.

Python would be the better boundary for a later ML-assisted diagram service.
Java would be a sound choice inside an existing JVM platform, but adds a second
toolchain without improving this phase.

## Infrastructure path

The checked-in application uses a mounted directory and atomic JSON replacement
so it starts with one command. At production scale, the storage adapter becomes
PostgreSQL, images move to S3-compatible object storage, and stateless API
replicas sit behind a load balancer. Redis or NATS is introduced only when live
collaboration requires cross-instance fan-out.

No Kubernetes, cache, or message broker is justified in phase one.
