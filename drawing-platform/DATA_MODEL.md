# Data model

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
  pattern (`solid`, `dots`, or `grid`), and spacing
- `files`: embedded raster assets addressed by stable file identifier

Every element has an ID, world-space geometry, rotation, visual style, and
optional editable architecture metadata (`runtimeLocation`, `layer`,
`sourcePath`, `packageName`, `objectType`, `inputs`, `outputs`, `ownership`, and
`explanation`).
Connectors store local point sequences and optional bindings to element IDs.
System nodes store a stable `iconId`, title, optional subtitle and body, and semantic
variant. The optional `locked` flag prevents accidental mutation while leaving
the element selectable for inspection and explicit unlocking.

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
Generated teaching scenes start with every
element locked; the copied board can unlock one element or all elements.

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
```
