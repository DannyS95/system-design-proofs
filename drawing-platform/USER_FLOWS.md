# User flows

## Start a board

Open application → choose `New board` or a template → board opens → add a
stencil or draw → local snapshot updates → API sync completes.

## Resume after a network failure

Open application → API request fails → local snapshot opens → edit normally →
status shows `Offline` → connection returns → latest queued snapshot syncs.

## Add a system component

Search or browse stencil shelf → select a component → grouped component appears
near viewport center → edit its text or connect it → autosave completes.

## Export

Open board → choose JSON, SVG, or PNG → browser downloads the current scene →
board remains open and unchanged.

## Resolve a revision conflict

Remote save returns conflict → local board remains visible → status explains the
conflict → export local copy or reload server copy → flow terminates explicitly.

## Delete a board

Choose board menu → request delete → confirm → board is removed → next available
board opens. If it is the only board, deletion is refused with an explanation.
