# Global standard for every design

Apply this standard to every current and future board unless that board has a clearly different learning goal.

The canvas is not merely a collection of attractive diagrams. Each board must let me reconstruct the subject mentally.

## Two-speed comprehension

Every board must work at two speeds:

* a class of 12-year-olds can trace the main request journey and explain the result within a few minutes;
* an experienced systems engineer can recognize the topology, policies, and consistency or failure model within seconds.

Achieve this with explicit layers, named components, and visible paths—not repeated prose. For distributed-system boards, make the applicable routing or load-balancing policy, placement policy, cluster and replication logic, HIT/MISS behavior, write policy, eviction policy, persistence boundary, failure rule, and monitoring signals visually explicit. State each fact once, in the place that owns it.

## System-design boards

For systems such as a distributed cache, key-value store, CDN, queue, database, or load balancer, the board must show every structurally relevant part required to understand the design:

* clients and entry points;
* components involved in the normal path;
* routing and placement decisions;
* storage and data destinations;
* coordination mechanisms;
* dependencies between components;
* source of truth;
* read and write paths;
* scaling mechanism;
* failure and recovery path;
* observability signals;
* the layer responsible for each action.

Every component must answer:

```text
What is it?

Why is it required?

Which layer owns it?

What does it depend on?

What input does it receive?

What decision or work does it perform?

Where does its output go?

Does it store data?

Is that data temporary or authoritative?

What happens if it fails?
```

The board must distinguish layers explicitly. Depending on the system, these may include:

```text
Client layer
Application/API layer
Request-routing layer
Key-placement layer
Coordination or membership layer
Storage/memory layer
Persistence layer
Failure-recovery layer
Observability layer
```

Do not collapse different layers merely to reduce the number of objects.

For example, in a distributed cache:

```text
User → API
```

is request routing.

```text
cache client → hash(key) → shard
```

is key placement.

```text
shard → healthy replica
```

is replica selection.

```text
miss → API → database
```

is database fallback.

These are different decisions made by different layers and must remain visibly distinct.

## Dependencies must be visible

A system-design board must identify the mechanisms and services upon which the system depends.

For a distributed cache, this includes concepts such as:

```text
API service
cache client
key-routing function
membership or health information
consistent hashing
shards
replicas
machine RAM
TTL and eviction policy
database source of truth
invalidation
metrics
```

For a key-value store, it may include:

```text
request interface
key routing
partition ownership
storage engine
memory structures
persistent files
replication
recovery
compaction
checksums
operating-system file operations
```

Only include mechanisms that belong to the design being taught, but do not omit a required mechanism simply to produce a cleaner-looking board.

If a concept would overload the main path, place it in:

* the right-hand information rail;
* a nested detail area;
* the element inspector;
* a connected secondary section.

Do not silently delete it.

## Standard right-hand information rail

Unless the board’s goal genuinely makes it irrelevant, system-design boards should contain a consistent right-hand reference rail containing:

```text
LAYERS
Which layer performs each operation?

DEPENDENCIES
What does this system require to work?

DATA DESTINATIONS
Where does data exist or terminate?

SOURCE OF TRUTH
Which component owns correctness?

FAILURE DESTINATIONS
Where does the request go when the normal path fails?

OBSERVABILITY
Which signals prove that the design works?
```

This rail is part of the learning design. It does not need a connector from every sentence, but it must correspond clearly to the main architecture through numbered stages, matching colours, or short local connectors.

## Project-architecture boards

A project-architecture board has a different goal.

Its purpose is to explain:

```text
What does this codebase depend on?

Where is each dependency used?

What part of the project owns each responsibility?

Where does each piece run?

How do those pieces combine into the working application?
```

Inspect the actual repository. Do not produce a generic web-stack diagram.

### Elements identify; details reveal

The reader should recognize each element from its technology, role, icon, and
place in the architecture before reading its body. Name a concrete technology
with its responsibility, such as `React · editor` or `Fastify · board storage
server`. An abstract process heading is a boundary, not a substitute for an
identifiable component.

Visible details reveal what that component contributes and how it connects to
its neighbors. Use brief statements and labeled paths instead of instructions
the reader must memorize. The main board teaches the stable technology and data
relationships; it is not an API reference or a walkthrough of application rules.
HTTP methods and status codes, revision comparisons, timing constants, helper
method names, and worked coordinate changes belong in inspector details or
linked documentation unless they are the board's explicit subject. Apply this
rule to project-architecture boards without removing the policies, invariants,
or failure mechanisms that a distributed-system or algorithm board is meant to
teach.

Show how stored data becomes the application's visible result. For an editable
graphics application, make the actual chain recognizable: stored object
properties → scene data → renderer → browser graphics. Show which technology
performs each step and how saving those properties allows the same objects to
be reopened and edited. Do not imply that storage draws graphics or that a
browser drawing API is used without checking the implementation.

Keep a short hierarchy within cards: recognizable title, concise role, then only
the details needed to reveal the relationship. Use consistent typography,
alignment, indentation, and section spacing. Adding headings to a long technical
inventory does not make it suitable for a visible card.

### Required dependency evidence

Identify the real:

* package dependencies;
* browser APIs;
* server libraries;
* build tools;
* icon libraries or SVG assets;
* source modules;
* generated artifacts;
* persistence mechanisms;
* network boundaries;
* runtime processes.

For every dependency, keep the following evidence accessible through the board's
inspector or linked project documentation. Put its name, role, runtime ownership,
and relevant connections on the canvas; do not repeat the full inventory inside
every element:

```text
Dependency name

Dependency type:
third-party package / browser API / runtime /
build tool / project-owned module / generated artifact

Layer:
build time / browser / server / filesystem / network

Imported or used by:
actual project module or source path

Purpose:
the exact capability the project obtains from it

Runtime relationship:
how the application calls or uses it
```

The architecture should expose relationships such as:

```text
external package
→ imported project module
→ feature implemented
→ runtime where it executes
```

For example, after verifying the real code:

```text
icon package or SVG file
→ project icon registry
→ stencil definition
→ component palette
→ placed canvas object
```

And:

```text
frontend source
→ build tool
→ generated static files
→ server static-file handling
→ browser application
```

And:

```text
editor control
→ scene state
→ browser persistence
→ save queue
→ HTTP API
→ server store
→ filesystem snapshot
```

Explicitly distinguish:

* external dependencies;
* project-owned code;
* browser/platform primitives;
* runtime processes;
* stored data;
* generated build output.

## Adapt the content, preserve the standard

Do not mechanically force identical sections onto every kind of board.

The board’s specific learning goal may change:

* a distributed-system board explains components, paths, placement, storage, and failure;
* a project-architecture board explains dependencies, ownership, runtime, and code usage;
* an algorithm board explains state, invariants, transitions, and execution.

However, every board must preserve the same general standard:

```text
complete enough to reconstruct mentally
clear layer ownership
visible dependencies
explicit data or state movement
readable typography
editable elements
no unexplained collapsing of distinct concepts
```

Visual simplification may reorganize information, but it must never erase information required to understand the system.

## Mechanism-first composition

Lay out each board according to the mechanism and the request journey, not a
symmetry target. A compact routing decision may sit beside a larger server or
storage section. Frames must fit their content and must not create large unused
areas merely to align with neighboring sections.

An action label belongs to the connector that performs that action. Keep labels
such as `MISS · READ DATABASE`, `FILL CACHE`, and `WRITE-THROUGH` attached to
their routes instead of using detached text, decorative arrow glyphs, or a
second explanation elsewhere. Important routes need a continuous, legible line
and a clearly sized arrowhead.

Abbreviations may remain in a title or subtitle for fast expert recognition,
but the owning component must decode them once in plain language. For example,
`RF=3` states that three copies are stored and `CL=QUORUM` states how many
replicas must respond. The visible mechanism should carry the rest.

Every visible label, component, connector, and explanatory object must remain a
real selectable and editable canvas element. Large background or layer frames
must not intercept selection of objects inside them, and dragging an empty area
with the Select tool must support area selection.

## Mandatory content-aware dimensions

Every text-bearing element must derive its minimum bounds from its rendered
title, body, icon, and padding. This applies to cards, notes, headings, labels,
panels, groups, and connector labels on every current and future board.

```text
rendered title + body + icon + padding
→ required width and height
→ element bounds
```

The default width grows with content up to a sensible per-element maximum.
Text wraps at that maximum and height then grows to contain every wrapped line.
A manual width change must recalculate the required height. Manual dimensions
may enlarge an object, but they must never make it smaller than its wrapped
content. Bound connectors and declared parent containers must recalculate after
auto-sizing. Fixed heights that clip text are invalid.

## Logical and physical visual identity

Use semantic icons to keep logical placement objects visually distinct from
physical machines. A shard or key range uses a partition icon; a cache-server
replica uses a server or rack-machine icon; and a consistent-hash virtual node
uses a small token/ring-position icon. Similar names do not make these objects
interchangeable. The inspector must report the icon's verified package or
project-owned source and stable icon identifier.

## Intentional whitespace and compact choices

Whitespace has exactly three purposes: content padding, visual grouping, or
connector routing. Remove space that serves none of these. Cards shrink-wrap
rendered text and icons plus standard padding; containers shrink-wrap their
children plus internal margins. A short section heading is sufficient when a
frame adds no useful grouping. Keep related policy and observability content
beside the component it configures or measures.

Policy cards inherit the colour of the layer that owns and enforces them.
For example, cache-server LFU/TTL memory policy uses the cache-server green;
its database-fallback connector may use amber. A consequence does not change
the policy's owning layer.

Internal padding is intentional whitespace. A major plane may explicitly use
64 units of padding instead of the default 32; persist this as
`containerPadding` so generation, compaction, resizing, and validation agree.
Do not compact this declared breathing room away.

On the canvas prefer a title, selected configuration, and consequence. The
visible mechanism shows the operation and destination; put background and
first-principles explanations in Markdown or inspector details. Preserve roles,
correctness boundaries, failure destinations, and hot-key fallback choices.

The executable standard is `drawing-platform/shared/layout-standard.ts`.
Spacing uses 8 / 12 / 16 / 24 / 32 / 48 / 64 world units. Independent arrows
reserve a gap from both neighboring stroke and arrowhead envelopes, with a
24-unit minimum. Arrowheads are capped at 14 world units. Connector labels have
opaque padded plates and remain clear of cards, routes, and other labels.

Generated designs measure content, place sections and children, route arrows,
place labels, resolve collisions, compact unused space, calculate visual bounds,
and choose a readable initial viewport. Ring geometry moves as a rigid group.
Rendering and generated SVG/PNG previews use the same primitives and text layout.

Explicit **Layout spacing → Tidy layout** lets the user configure node distance
and arrow clearance. It is undoable and respects locks. Loading a user-authored
board must never silently reposition its elements. Manual resizing may enlarge
an object; it may not clip its content.

Validate generated layouts programmatically and inspect real template previews
at initial zoom, 100%, fit-to-content, and a mechanism detail view. Do not claim
layout completion while any generated-layout check or visual check fails.

## Execution-aware capacity annotations

For workload diagrams, use small secondary captions to connect traffic to physical
machines, work, limiting resources, and bottleneck candidates. Logical shards,
rings, stored objects and libraries do not own independent machine capacity.
Choose explicit, round safe-capacity assumptions for physical hosts, together with
average, peak/flash traffic and desired spare capacity. Show peak demand / safe
capacity and mark a bottleneck or headroom failure when the assumed load does not
fit. Do not substitute vague workload caveats for a sizing choice in a design
exercise. Use the vault BOTEC sources and state any additional design assumption. Distinguish
**BOTEC ASSUMPTION** from **MEASURED/BENCHMARKED CAPACITY**, with workload, unit,
and per-core/per-node scope. Count replication, quorum, retries and repair work;
an aggregate node-operation budget is not client QPS. Exact throughput requires
measurement. Keep detailed derivations in a linked reference, preserve the main
architecture, and skip diagrams where runtime capacity is irrelevant.


## Quick component inspection

This is a visualization tool for grasping concepts quickly. Opening a component
shows a short role, a compact capacity comparison when relevant, and its connected
components. Background notes, implementation inventories, and calculations stay
collapsed or in linked references. Hidden context must never increase the canvas
component's dimensions. Do not duplicate a board-wide sizing essay on each node.
Workload cards show the chosen budget, peak demand and consequence; derivations
belong in the reference document. Expanded notes use short titled sections and
lists, and reset to collapsed when selecting another component.
