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

For every dependency, show:

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

## Required breathing room

Spacing is part of correctness, not decoration. Every component, block, figure,
shape, layer statement, and route label must have visible space on its left,
right, top, and bottom. Expand the infinite canvas whenever that space is not
available; never compress the mechanism to preserve a preferred board width.

For generated teaching boards:

* leave at least 80 world-space units between a layer statement and the first
  detail beneath it;
* make the open gap between connected components wider than the connector label,
  with at least 24 units of clear space remaining around that label;
* keep route labels clear of every component and every other route label;
* terminate arrows at the visible boundary or explicit target marker—never
  behind or inside an unrelated figure;
* move a detail to another row when its natural width would otherwise be
  squeezed merely to complete a symmetrical row;
* do not use a large frame when a compact layer statement or policy block carries
  the same information.
