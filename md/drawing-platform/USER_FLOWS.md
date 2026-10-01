# User flows

## Start a board

Open application → select a template row → inspect its temporary preview without
creating or saving a board → click that template's `+` only when an independent
saved board is wanted → edit the infinite canvas → browser snapshot updates
immediately → API sync completes.

## Navigate a large design

Click the canvas → normal wheel pans / Ctrl or Cmd + wheel zooms around the
pointer / Hand or Space-drag moves in any direction → Fit all frames every
visual label or Fit selection frames the selected object or group. With Select,
drag from empty canvas around objects to area-select them; Shift-click adds or
removes one object from that selection. Move, lock, unlock, or delete the group
together. Camera state saves with the board;
no page boundary is introduced.

## Add and connect system components

Search or browse the stencil shelf → choose a semantic component → its geometric
icon node appears near the viewport center → move or resize it → choose
Connector → draw a route between components → autosave completes.

## Draw and label

Choose rectangle, ellipse, or diamond → drag the geometry → choose Text and
place a label → select any system node, shape, connector, text block, or image →
edit its title, subtitle, body, label, dimensions, architecture details, or alt
text in the inspector → Apply changes → wrapped text reflows and attached routes
follow a resize → use undo/redo or Delete as needed. Close, Escape, or outside
click discards unapplied drafts. Text blocks can also be edited in
place.

## Lock a finished design

Open a teaching template → inspect whether its elements begin locked or unlocked
for direct editing → unlock one selected element when necessary, or choose
Unlock all → edit → Lock or Lock all when finished. The two distributed-cache
teaching boards begin unlocked so their routes, labels, and layer statements can
be edited immediately.

## Save a customized component

Customize a system node, geometric shape, or text block → Apply changes → select Save component
→ find the exact text, geometry, style, and icon under `My library` → insert an
independent unlocked copy on this or another board → remove the saved component
from the shelf when it is no longer needed.

## Customize the canvas

Open Canvas background → choose a color → choose Plain, Dots, or Grid → the
background updates immediately and persists through the normal save flow.

## Add an image

Choose Add image, drop a file at a world-space location, or paste from the
clipboard → validate PNG/JPEG/WebP/GIF and 2 MB limit → read dimensions → embed
the data URL and place the image → save it with the board.

## Study an architecture

Preview KV Store, CDN, Social Feed — Distributed Cache, financial Distributed
Cache, or System Canvas Architecture without persistence → follow the labeled
request, failure, control, and observation routes → click `+` to create an
independent saved copy before making persistent changes.

## Import or export

For import: choose JSON → validate a schema-v2 document/scene or migrate
supported schema-v1/Excalidraw primitives → replace the scene only after success.

For export: choose JSON, SVG, or PNG → download the current scene → leave the
open board unchanged.

## Resume after a network failure

Open application → API request fails → recover the newest browser snapshot →
edit normally → status shows `Offline` → connection returns → the latest queued
snapshot syncs.

## Resolve a revision conflict

Remote save returns `409` → local board remains visible → export the local copy
or explicitly reload the server copy → never retry the stale revision silently.

## Recover from a render failure

Canvas renderer throws → workspace shows the canvas fallback → export JSON or
open another board → retry the canvas. The boundary preserves recovery access;
the stable repo-owned SVG editor and removal of the previous runtime are the crash fix.

## Delete a board

Request delete → confirm → board is removed → the next board opens. If it is the
only board, deletion is refused with an explanation.
