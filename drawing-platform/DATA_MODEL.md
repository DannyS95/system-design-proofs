# Data model

## Board document

Owns one editable scene.

- stable identifier
- display name
- schema version
- monotonically increasing revision
- created and updated timestamps
- Excalidraw elements, serializable app state, and embedded-file map

## Board summary

A lightweight projection used by the navigator. It contains identity, name,
revision, timestamps, and element count, but not the scene.

## Local snapshot

A browser-owned recovery copy of a board document plus the timestamp at which
the canvas produced it. It may be newer than the server document.

## Template

An immutable seed document with an identifier, name, description, and scene.
Creating from a template produces a new board identity and revision zero.

## Stencil

A reusable generic visual definition: identifier, category, name, short role,
accent color, and glyph. It creates grouped editor elements but has no runtime
identity after insertion.

## Relationships

```text
Template ──copies into──▶ Board document
Board document ──projects to──▶ Board summary
Board document ──mirrors as──▶ Local snapshot
Stencil ──creates──▶ Excalidraw elements inside Board document
```
