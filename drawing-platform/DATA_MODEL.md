# Data model

Shape containers may declare `containerPadding` (16–128 world units). Omission
uses the shared 32-unit default; major planes can use 64 units of deliberate
internal margin. This is preserved on import and enforced during generation,
compaction, and child-driven parent growth.

## Board document

A board document owns one editable schema-v2 scene plus:

- a validated stable identifier and display name
- a monotonically increasing revision
- created and updated UTC timestamps

The scene is independent of React, SVG, Fastify, browser storage, and the
filesystem.

## Canvas scene

`BoardScene` contains three parts:

- `elements`: a typed union of semantic system nodes, shapes, text,
  connectors, and images
- `appState`: camera `x`, `y`, and `zoom`, plus background color,
  pattern (`solid`, `dots`, or `grid`), background spacing, and optional applied
  `layoutSpacing`
- `files`: embedded raster assets addressed by stable file identifier

Every element has an ID, world-space geometry, rotation, visual style, and
optional editable architecture metadata (`runtimeLocation`, `layer`,
`sourcePath`, `packageName`, `objectType`, `inputs`, `outputs`, `ownership`, and
`explanation`, and `referenceLinks`).
Connectors store local point sequences and optional bindings to element IDs.
System nodes store a stable `iconId`, title, optional subtitle and body, and
semantic variant. Shapes may also store an `iconId` when their geometry is the
editable object but a semantic mark distinguishes its role. Any child may name
a shape `parentId`; validation rejects missing, non-shape, self, and cyclic
parents, and the editor expands that container when the child's content grows.
The optional `locked` flag prevents accidental mutation while leaving the
element selectable for inspection and explicit unlocking.

Stored dimensions are content floors as well as geometry. Deterministic
measurement derives the minimum unbreakable width, capped natural width, and
wrapped height for each text-bearing element. Connector-label plates derive
their own capped dimensions from label content.

The following optional fields extend schema v2 without changing its version or
adding defaults to older documents:

| Field | Owner | Meaning |
| --- | --- | --- |
| `layoutGroup` | Any element | Named members placed together; mechanism geometry keeps its internal relationships. |
| `layoutRole` | Shape | `container` follows child bounds; `mechanism` identifies preserved diagram geometry. |
| `labelPosition` | Connector | Finite `[x, y]` label-plate center relative to the connector origin, chosen after routing. |
| `layoutSpacing` | `appState` | Applied `nodeGap` (24–160) and `edgeClearance` (24–96), in world units. |
| `referenceId` | Any element | Existing canonical component represented by a local named endpoint. |

A reference is the same logical component drawn near a related destination;
the canonical service and primary components retain their identity. Validation
rejects a missing reference target, self-reference, a connector target, and
references to another reference. Thus a connector bound to a local reference
resolves directly to one canonical component.

Deleting that canonical component detaches `referenceId` from surviving local
annotations, preserving their text, geometry, and lock state. Deleting a local
reference leaves the canonical component and other references intact.

Import and load preserve authored coordinates. Generated constructors and an
explicit, undoable `Tidy layout` action use the layout fields; moving a slider
applies the chosen profile when the slider is released. The applied profile persists with the geometry
in browser recovery, API snapshots, and JSON export. Locked elements require
unlocking before a tidy.

## Embedded image

A `CanvasFile` stores a PNG, JPEG, WebP, or GIF data URL, MIME type, and
optional source name, dimensions, and creation timestamp. The editor admits
files up to 2 MB. An image element references its asset by `fileId`; validation
rejects missing references and mismatched file-map keys.

Embedding makes browser recovery and JSON export self-contained. Larger assets
belong in the deferred object-storage adapter.

## Versioning and migration

New and saved documents use schema version 2. Document loading accepts version 1
and migrates supported Excalidraw rectangle, ellipse, diamond, text, arrow,
line, freehand, and raster-image elements. Legacy embeds become locked visual
placeholders. Migration preserves board identity, revision, and timestamps.
Unknown legacy element types fail with their type and ID rather than disappearing.

## Board summary

A navigator projection contains identity, name, revision, timestamps, and
element count, but not the scene or embedded files.

## Local snapshot

Browser storage holds a recovery copy of the complete board document. It may be
newer than the server document; load selection compares `updatedAt` and never
replaces a newer local scene silently.

## Template

An immutable seed has an identifier, name, description, and schema-v2 scene.
Creating from a template deep-copies the scene into a new board at revision zero.
The registered choices are blank, KV store, CDN, Social Feed — Distributed
Cache, generic Distributed Cache, and System Canvas application architecture.
Generated teaching scenes choose their initial lock state by learning goal; the
two cache boards start unlocked, while locked boards can unlock one element or
all elements.

## Stencil

A stencil defines a vendor-neutral system concept: identifier, category, name,
short role, accent color, semantic `iconId`, and search keywords. Insertion
creates an editable system-node element; the catalog definition has no runtime
identity afterward.

`My library` stores user-created stencil definitions in browser storage. Each
entry contains a copied system node, shape, or text block plus shelf metadata.
Insertion assigns a new element ID, centers an unlocked copy in the current
viewport, and preserves customized text, icon, geometry, and style.

## Relationships

```text
Template ──deep-copies into──▶ Board document
Board document ──projects to──▶ Board summary
Board document ──mirrors as──▶ Local snapshot
Stencil ──creates──▶ semantic system element
Custom component ──copies──▶ system node | shape | text
Canvas image ──references──▶ embedded CanvasFile
Child element ──expands──▶ shape parentId
Local reference ──referenceId──▶ canonical component
```


## Component reference links

`CanvasElementMetadata.referenceLinks?: string` is an optional, additive schema-v2
field (maximum 4,000 characters). Each nonempty line is `Label | https://…` or a
bare HTTP(S) URL. The contract rejects invalid, relative, executable, and
credential-bearing destinations. Older boards need no migration or default.
Links persist with metadata in local/server snapshots, JSON, and reusable
components. The component reference reader is transient UI; it does not add
canvas elements or change board geometry. Connected-component navigation is
derived from connector bindings, arrowheads, and `referenceId` rather than
unstructured metadata text.
