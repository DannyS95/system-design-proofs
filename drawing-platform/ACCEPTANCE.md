# Acceptance criteria

## Behavior

- A user can create, rename, open, and delete boards.
- Excalidraw drawing, shape, connector, text, history, pan, and zoom tools work.
- Every scene edit produces an immediate local snapshot and a debounced API save.
- The header makes persistence state understandable without opening developer tools.
- At least five generic IT stencil categories are searchable and insertable.
- Current content exports as versioned JSON, SVG, and PNG.
- Templates create independent board copies.

## Tests

- Contract validators accept valid documents and reject unsafe inputs.
- Snapshot writes increment revisions and reject stale writers.
- Board deletion refuses to remove the final board.
- Template copying changes identity without sharing mutable scene values.
- Autosave serializes writes and retains the newest pending scene.
- Every required stencil category is populated and produces valid elements.

## Edge cases

- API unavailable at startup with a recoverable local board.
- Network fails between local and remote save.
- Rapid changes while a save is in flight.
- Invalid or oversized import.
- Stale expected revision.
- Empty stencil search.

## Performance budgets

- Shell production JavaScript is recorded, not guessed, in BENCHMARKS.
- Initial API health and board-list responses remain below 100 ms locally.
- Canvas changes never wait for the network.

## Documentation

- README explains start and verification commands.
- STACK and DESIGN record the decisions implemented by the code.
- CHANGELOG and CONTEXT are updated when the phase completes.
