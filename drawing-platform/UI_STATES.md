# UI states

## Application

- **Loading:** centered brand mark and `Opening your canvas…`.
- **Ready:** board navigator, React/TypeScript SVG editor, and stencil shelf are
  interactive in the browser.
- **Empty:** first-run choice to create a blank board or use a template.
- **Fatal shell error:** concise explanation plus retry; never an unexplained
  blank screen.

## Canvas

- **Select:** click an element to move, resize, edit, or delete it; drag from
  empty canvas to area-select fully enclosed objects, and Shift-click to toggle
  one object in the selection. Visible text receives direct pointer selection,
  while large layer frames are selected from their borders.
- **Element inspector:** the selected element exposes title/subtitle/body or
  label content, width/height, expandable architecture metadata, and verified
  visual provenance. Apply is explicit; close, Escape, and outside click discard
  pending drafts.
- **Locked selection:** remains selectable and inspectable but cannot move,
  resize, edit, or delete until explicitly unlocked.
- **Board lock:** Lock all freezes the complete design; Unlock all makes every
  element editable in one action.
- **Hand/pan:** hand tool, normal wheel, or Space-drag moves the world-space camera.
- **Draw:** rectangle, ellipse, diamond, connector, and text tools show the
  active mode.
- **Zoom:** Ctrl/Cmd + wheel or controls zoom around the pointer/viewport;
  fit-all includes visual labels and fit-selection frames the selected object or
  group.
- **Background panel:** color picker plus Plain, Dots, and Grid choices.
- **Image drop:** an overlay marks the drop target; browse and paste use the same
  validated image path.
- **Image error:** an inline alert explains unsupported, oversized, or unreadable
  input without changing the scene.
- **Canvas failure:** the error-boundary fallback keeps the workspace alive and
  offers retry while navigation/export remain available.

## Persistence

- **Template preview:** the scene is loaded in memory without a board record,
  browser snapshot, or autosave queue.
- **Saved locally:** browser snapshot succeeded; remote debounce is pending.
- **Saving:** one remote request is in flight.
- **Synced:** the server accepted the latest visible revision.
- **Offline:** local editing continues and the newest snapshot stays queued.
- **Conflict:** the remote document advanced; the local copy remains visible.

## Board navigator

- **Populated:** boards ordered by latest update.
- **Creating:** the action is disabled and progress is visible.
- **Deleting:** confirmation is required; final-board deletion explains why it
  stops.
- **Failure:** an action-level message leaves the current board usable.
- **Templates:** selecting a row opens a temporary preview; only its separate
  `+` button creates an independent saved board. The read-heavy social-feed and
  balanced-R/W financial cache boards remain separate.

## Stencil shelf

- **Browse:** five grouped categories with distinct geometric icons.
- **My library:** customized system nodes, shapes, and text can be inserted or
  removed independently of the built-in catalog.
- **Filtered:** matching name, role, keyword, or category.
- **No match:** a clear-search action and guidance.
- **Collapsed:** the canvas receives the reclaimed width.

## Responsive

Below tablet width, navigation and stencils become modal drawers. The canvas
remains the primary visible surface and its camera does not change board
coordinates.
