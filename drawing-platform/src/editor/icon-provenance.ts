import type { CanvasElement } from "../../shared/contracts.js";
import { STENCIL_CATALOG } from "../stencils/catalog.js";

export interface ElementVisualProvenance {
  source: string;
  name: string;
  sourceFile: string;
  kind: "custom SVG" | "native SVG primitive" | "embedded image";
  category: string;
  why: string;
}

/** Geometry-derived mnemonics from the project-owned SystemIcon registry. */
const SYSTEM_ICON_VISUAL_MEANING: Record<string, string> = {
  internet: "a globe-and-links glyph to suggest the public network",
  "global-routing": "a globe with directional routes to suggest region choice",
  "edge-pop": "a small facility and outward links to suggest a network edge site",
  "load-balancer": "one incoming route splitting into outputs to suggest traffic distribution",
  "service-routing": "a gateway with branching paths to suggest request dispatch",
  "application-router": "path branches and an application frame to suggest handler selection",
  "data-router": "connected key positions to suggest mapping data to an owner",
  "hash-ring": "marked positions around a ring to suggest deterministic key placement",
  browser: "a browser window and globe to identify a web-browser runtime",
  canvas: "connected points on a drawing surface to identify editable vector geometry",
  whiteboard: "a board, marks, and stand to identify an interactive whiteboard module",
  workspace: "a framed sidebar and canvas to identify the surrounding application workspace",
  "local-storage": "a browser-style store with an inward arrow to suggest local persistence",
  "file-snapshot": "a document with a saved-state mark to identify a serialized snapshot",
  "template-grid": "repeated tiles plus an add mark to identify reusable templates or stencils",
  image: "a framed landscape to identify an embedded raster image",
  "import-export": "opposing arrows around a document to identify file input and output",
  "origin-shield": "stored content beside a shield to identify protected authoritative content",
  "control-plane": "adjustable control rails to identify configuration and control",
  client: "a user-facing screen to identify the requester or client device",
  "application-server": "a server frame with code marks to identify request-handling application code",
  fallback: "a secondary server plus clock to identify a delayed or alternate path",
  writer: "a pen touching a baseline to identify a write or mutation",
  worker: "a work wheel with a play mark to identify processing or transformation",
  scheduler: "a clock to identify time-triggered work",
  "service-registry": "a service list with search to identify discovery of instances",
  "request-coalescer": "several paths converging on one point to identify shared work",
  "policy-gate": "a shield and check to identify an enforced decision rule",
  telemetry: "a measured trend line to identify observable system signals",
  "key-value-store": "a key beside stored records to identify key-addressed data",
  cache: "a memory-chip outline and lightning mark to identify fast temporary memory",
  database: "stacked storage cylinders to identify durable structured data",
  "distributed-database": "linked storage cylinders to identify data spread across machines",
  "message-queue": "ordered slots and a forward arrow to identify buffered messages",
  partition: "one store divided into ranges to identify a shard or partition",
  "replica-group": "linked peer nodes to identify copies of one logical data set",
  leader: "one emphasized node above peers to identify coordination leadership",
  process: "a bounded execution box to identify an operating-system process",
  thread: "parallel execution lines to identify threads within a process",
  "operating-system": "layered system blocks to identify the host operating system",
  runtime: "an execution frame and play mark to identify a language runtime",
  "network-socket": "paired endpoints and a link to identify a network socket",
  "file-system": "a folder tree to identify filesystem-owned data",
  server: "stacked machine bays to identify a server",
  cpu: "a processor-chip grid to identify compute",
  memory: "a memory-module grid to identify volatile RAM",
  disk: "a platter and read arm to identify disk storage",
  "network-interface": "a port with bidirectional links to identify a network adapter",
  rack: "stacked server bays inside a frame to identify a hardware rack",
};

export const getElementVisualProvenance = (
  element: CanvasElement,
): ElementVisualProvenance => {
  if (element.type === "system") {
    const stencil = STENCIL_CATALOG.find(
      (candidate) => candidate.iconId === element.iconId,
    );
    return {
      source: "Project-owned SystemIcon registry (no icon package)",
      name: element.iconId,
      sourceFile: "src/editor/SystemIcon.tsx",
      kind: "custom SVG",
      category: element.metadata?.layer ?? stencil?.category ?? element.variant,
      why: `The ${element.iconId} icon uses ${SYSTEM_ICON_VISUAL_MEANING[element.iconId] ?? "project-owned SVG geometry as a stable visual mnemonic"}; here it represents “${element.title}”. The editable card metadata—not the glyph—defines its runtime role.`,
    };
  }
  if (element.type === "image") {
    return {
      source: "BoardScene.files data URL",
      name: element.fileId,
      sourceFile: "embedded in the board JSON",
      kind: "embedded image",
      category: "Reference image",
      why: "Shows user-supplied visual material on the board.",
    };
  }
  return {
    source: "Browser-native SVG",
    name:
      element.type === "shape"
        ? element.shape
        : element.type === "connector"
          ? "polyline"
          : "text",
    sourceFile: "src/editor/CanvasElementView.tsx",
    kind: "native SVG primitive",
    category: element.type,
    why: `Represents editable ${element.type} content in the canvas scene.`,
  };
};
