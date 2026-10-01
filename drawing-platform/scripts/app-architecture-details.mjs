/** Technology and purpose on the board; implementation detail stays in metadata. */
export function applyAppArchitectureDetails(diagram) {
  const byId = new Map([...diagram.nodeElements, ...diagram.labelElements,
    ...diagram.backdropElements, ...diagram.connectorElements].map(element => [element.id, element]));
  const update = (id, values) => {
    const element = byId.get(id);
    if (!element) throw new Error(`Missing application architecture element: ${id}`);
    Object.assign(element, values);
  };
  const card = (id, title, subtitle, body) => update(id, {
    title, subtitle, body, titleFontSize: 18, bodyFontSize: 14, align: "left",
  });

  diagram.title = "System Canvas · website architecture";
  diagram.description = "Architecture of the System Canvas website itself: React creates SVG elements from editable object properties, the browser renders them, and JSON persistence preserves those properties between sessions.";
  update("title", { text: diagram.title });
  update("legend", { text: "This website: editing, rendering and persistence\nSaved properties → React → SVG elements → browser graphics", align: "left", fontSize: 14, fontWeight: 400 });
  for (const [id, text] of Object.entries({
    "browser-zone-label": "BROWSER · workspace and graphics",
    "browser-persistence-zone-label": "PERSISTENCE · browser recovery and server files",
    "visual-vocabulary-zone-label": "VISUAL VOCABULARY · artwork → component → editable object",
  })) update(id, { text, fontSize: 18, align: "left" });

  card("browser", "Web browser", "Runs this website's JavaScript, HTML and CSS", "Website files built with Vite");
  card("react-workspace", "React · application interface", "Boards, panels and editing tools", "Connects the editor to saved designs");
  card("custom-editor", "Canvas editor · React", "Creates and updates SVG elements", "Object properties set position, size, color and text");
  card("board-scene", "Design data", "JavaScript object properties in browser memory", "Used for drawing and edits; discarded when the tab closes");
  card("native-svg", "Browser SVG renderer", "Draws SVG shapes, paths and text", "Displays the editable canvas on screen");
  card("canvas-controls", "Editing tools · React", "Toolbar and property inspector", "JavaScript updates the selected object's properties");
  card("browser-files", "Files · import and export", "JSON designs · SVG and PNG pictures", "Open an editable design or download a picture");
  card("stencil-catalog", "Component catalog", "Built-in component definitions", "Provides names, icons and default appearance");
  card("component-palette", "Component palette · React", "Components available to place", "Choose a component to add to the design");
  card("placed-browser-element", "Canvas object", "A placed component with editable properties", "Becomes part of the design data");
  card("my-library", "My library · reusable components", "Saved in this browser", "Reuse a component's appearance and content");
  card("local-storage", "localStorage · browser storage", "Board properties saved as JSON on this device", "Survives tab closure; board deletion or clearing site data removes it");
  card("save-queue", "Autosave · JavaScript", "Connects edits to backend storage", "Sends changed design data in the background");
  card("fastify-api", "Web server", "Fastify on Node.js", "Serves this website and loads/saves board data");
  card("board-store", "File storage · node:fs", "Reads and writes board JSON files", "Persists object properties on the server");
  card("template-modules", "Templates · starter designs", "Ready-made design data", "Provides an editable starting point");
  card("file-snapshots", "Saved designs · JSON files", "Server disk · one file per board", "Restores the same objects and their editable properties");
  card("visual-concept", "System concept", "Server · cache · database · router", "The thing the component represents");
  card("system-icon-registry", "SVG icon library", "Project-owned component artwork", "An icon name selects its drawing");
  card("stencil-definition", "Component definition", "Name · icon · default appearance", "Describes a component available in the palette");
  card("placed-canvas-object", "Editable object", "Saved properties + an icon name", "Saved properties restore each object's appearance");
  card("lucide-ui-icons", "Lucide · UI icon library", "Ready-made SVG icons", "Button and toolbar icons: delete, undo, zoom");

  byId.get("local-storage").metadata.explanation = "Saved boards are serialized to JSON in this browser's localStorage. Each edit replaces the local snapshot before remote saving. Opening a board reads the local snapshot and the server document, choosing the newer copy; the local copy can be used when the server is unavailable. Closing the tab discards its JavaScript memory, not localStorage. Deleting the board removes its local snapshot after server deletion succeeds. Clearing this site's browser data also removes the local copy. Template previews are temporary and do not enter this save flow.";

  // Relationship labels reveal the technology's role without documenting its API.
  for (const [id, label] of Object.entries({
    "workspace-to-editor": "editing surface",
    "workspace-to-scene": "design data",
    "editor-scene-loop": "read and change properties",
    "editor-svg-loop": "SVG elements out · pointer events in",
    "files-to-scene": "open design",
    "scene-to-files": "download",
    "scene-to-local-storage": "Edit: save · Open: read",
    "scene-to-save-queue": "changed design",
    "queue-to-api": "save design · HTTP",
    "workspace-to-api": "load designs · HTTP",
    "fastify-to-browser-app": "web app files",
    "api-to-store": "store designs",
    "templates-to-store": "starter design",
    "store-to-files": "save and reopen JSON",
  })) update(id, { label, fontSize: 14 });

  // Build provenance stays inspectable on the browser-delivery component.
  // The overview does not need a separate toolchain or server-runtime enclosure.
  const buildIds = ["frontend-source", "vite", "vite-dev-server", "static-build"];
  const browser = byId.get("browser");
  browser.metadata = {
    ...browser.metadata,
    sourcePath: "src/; shared/; index.html; vite.config.ts; package.json; dist/ (generated)",
    packageName: "Browser platform; vite + @vitejs/plugin-react (build tooling)",
    explanation: [browser.metadata.explanation, ...buildIds.map(id => byId.get(id).metadata.explanation)].join("\n\n"),
  };
  update("scene-to-local-storage", { startArrow: "arrow" });
  update("queue-to-api", { startArrow: "arrow" });
  update("store-to-files", { startArrow: "arrow" });
  const removed = new Set([
    ...buildIds, "tooling-zone", "tooling-zone-label", "server-zone", "server-zone-label",
    "server-persistence-zone", "server-persistence-zone-label", "api-save-response", "files-to-store",
    "source-to-vite", "vite-to-dev-server", "vite-to-build", "vite-to-browser-app", "static-build-to-server",
    "local-storage-to-scene", "vite-note", "editor-definition", "local-storage-note",
    "save-request-note", "save-response-note", "server-definition",
  ]);
  for (const collection of ["backdropElements", "nodeElements", "connectorElements", "labelElements"]) {
    diagram[collection] = diagram[collection].filter(element => !removed.has(element.id));
    for (const element of diagram[collection]) {
      if (removed.has(element.parentId)) delete element.parentId;
      // Reclaim the former build column without changing the component topology.
      if (element.id !== "title" && element.id !== "legend" && element.id !== "visual-vocabulary-zone"
          && element.parentId !== "visual-vocabulary-zone" && !["concept-to-icon", "icon-to-stencil", "stencil-to-element"].includes(element.id)) {
        element.x -= 450;
      }
    }
  }

  applyAppReferenceLinks([...byId.values()]);

  // One functional save flow spans local browser recovery and server file storage.
  // Runtime ownership remains explicit on each component instead of outer boxes.
  update("browser-zone", { height: 900 });
  update("browser-persistence-zone", { x: 40, y: 1050, width: 2600, height: 520 });
  delete byId.get("browser-persistence-zone").parentId;
  update("browser-persistence-zone-label", { x: 72, y: 1082 });
  const persistencePositions = {
    "local-storage": [330, 1160], "save-queue": [820, 1160],
    "fastify-api": [1350, 1160], "board-store": [1910, 1160],
    "template-modules": [1350, 1380], "file-snapshots": [1910, 1380],
  };
  for (const [id, [x, y]] of Object.entries(persistencePositions)) {
    update(id, { x, y, parentId: "browser-persistence-zone" });
  }
  for (const element of [...diagram.backdropElements, ...diagram.nodeElements, ...diagram.labelElements, ...diagram.connectorElements]) {
    if (element.id === "visual-vocabulary-zone" || element.parentId === "visual-vocabulary-zone"
        || ["concept-to-icon", "icon-to-stencil", "stencil-to-element"].includes(element.id)) element.y += 160;
  }
  for (const id of ["queue-to-api", "api-to-store", "templates-to-store", "store-to-files"]) {
    const edge = byId.get(id);
    const from = byId.get(edge.startBinding);
    const to = byId.get(edge.endBinding);
    const horizontal = Math.abs(from.x - to.x) > Math.abs(from.y - to.y);
    const start = horizontal ? [from.x + from.width, from.y + from.height / 2] : [from.x + from.width / 2, from.y + from.height];
    const end = horizontal ? [to.x, to.y + to.height / 2] : [to.x + to.width / 2, to.y];
    edge.x = Math.min(start[0], end[0]); edge.y = Math.min(start[1], end[1]);
    edge.width = Math.abs(end[0] - start[0]); edge.height = Math.abs(end[1] - start[1]);
    edge.points = [start, end].map(([x, y]) => [x - edge.x, y - edge.y]);
    delete edge.labelPosition;
  }

}

/** Reference-only enrichment; does not alter the authored drawing geometry. */
export function applyAppReferenceLinks(elements) {
  const base = "https://github.com/DannyS95/system-design-proofs/blob/main/drawing-platform/";
  const sources = {
    "react-workspace": "src/App.tsx",
    "custom-editor": "src/editor/EditorCanvas.tsx",
    "canvas-controls": "src/editor/EditorCanvas.tsx",
    "board-scene": "shared/contracts.ts",
    "local-storage": "src/data/local-board-store.ts",
    "save-queue": "src/data/revision-save-queue.ts",
    "fastify-api": "server/app.ts",
    "board-store": "server/board-store.ts",
    "browser-files": "src/editor/downloads.ts",
    "system-icon-registry": "src/editor/SystemIcon.tsx",
    "stencil-catalog": "src/stencils/catalog.ts",
    "component-palette": "src/components/StencilShelf.tsx",
  };
  const docsBase = base.replace("/drawing-platform/", "/md/drawing-platform/");
  for (const element of elements) {
    if (!sources[element.id]) continue;
    element.metadata = { ...element.metadata, referenceLinks: [
      `Implementation · ${sources[element.id]} | ${base}${sources[element.id]}`,
      `Architecture and responsibilities | ${docsBase}DESIGN.md`,
      `Board data model | ${docsBase}DATA_MODEL.md`,
    ].join("\n") };
  }
}
