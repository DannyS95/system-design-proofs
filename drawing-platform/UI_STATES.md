# UI states

## Application

- **Loading:** centered brand mark and `Opening your canvas…`.
- **Ready:** board navigator, canvas, and stencil shelf are interactive.
- **Empty:** first-run call to create a blank board or use a template.
- **Fatal error:** concise explanation plus retry; never a blank canvas.

## Persistence

- **Saved locally:** browser snapshot succeeded; remote debounce is pending.
- **Saving:** remote request is in flight.
- **Synced:** server accepted the latest visible revision.
- **Offline:** local editing continues and the latest snapshot stays queued.
- **Conflict:** remote document advanced; local copy remains visible.

## Board navigator

- **Populated:** boards ordered by latest update.
- **Creating:** create action disabled and progress visible.
- **Deleting:** confirmation dialog; final-board deletion explains why it stops.
- **Failure:** action-level message leaves the current board usable.

## Stencil shelf

- **Browse:** grouped categories.
- **Filtered:** matching name, role, or category.
- **No match:** clear search action and guidance.
- **Collapsed:** canvas receives the reclaimed width.

## Responsive

Below tablet width, board navigation and stencils become modal drawers. The
canvas remains the primary visible surface.
