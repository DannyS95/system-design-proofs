import { LAYOUT_STANDARD, SPACING } from "../shared/layout-standard.ts";
import { minimumTextHeight, preferredTextWidth } from "../src/editor/text-layout.ts";

/**
 * Keep secondary dependencies local while retaining one canonical component.
 * referenceId preserves the logical endpoint; the named ↗ shape is editable
 * routing geometry, with the canonical runtime and source available to inspect.
 * Apply once after constructing the application diagram and before layout.
 */
export function applyAppLayoutReferences(diagram) {
  const elements = [...diagram.backdropElements, ...diagram.nodeElements, ...diagram.labelElements];
  const byId = new Map(elements.map((element) => [element.id, element]));
  const edgeById = new Map(diagram.connectorElements.map((element) => [element.id, element]));
  const definitions = [
    {
      id: "reference-local-storage-library", target: "local-storage", anchor: "my-library",
      side: "below", routes: [["local-storage-to-my-library", "startBinding"]],
    },
    {
      id: "reference-scene-workspace", target: "board-scene", anchor: "react-workspace",
      side: "below", routes: [["workspace-to-scene", "endBinding"]],
    },
    {
      id: "reference-scene-files-controls", target: "board-scene", anchor: "browser-files",
      side: "right", routes: [["files-to-scene", "endBinding"], ["scene-to-files", "startBinding"],
        ["controls-to-scene", "endBinding"]],
    },
    {
      id: "reference-scene-persistence", target: "board-scene", anchor: "local-storage",
      side: "left", routes: [["scene-to-local-storage", "startBinding"],
        ["scene-to-save-queue", "startBinding"]],
    },
    {
      id: "reference-api-workspace", target: "fastify-api", anchor: "react-workspace",
      side: "right",
      routes: [["workspace-to-api", "endBinding"], ["fastify-to-browser-app", "startBinding"]],
    },
  ];
  if (definitions.some((definition) => byId.has(definition.id))) {
    throw new Error("Application endpoint references must only be applied once.");
  }
  for (const definition of definitions) {
    const target = byId.get(definition.target);
    const anchor = byId.get(definition.anchor);
    if (!target || !anchor) throw new Error(`Missing canonical application component for ${definition.id}`);
    const firstRoute = edgeById.get(definition.routes[0][0]);
    if (!firstRoute) throw new Error(`Missing dependency route for ${definition.id}`);
    const label = `↗ ${target.title}${definition.runtime ? `\n${definition.runtime}` : ""}`;
    const reference = {
      ...target, type: "shape", shape: "rectangle", label, iconId: undefined,
      fontSize: LAYOUT_STANDARD.labelFontSize, width: 1, height: 1,
    };
    const width = Math.ceil(preferredTextWidth(reference));
    const height = Math.ceil(minimumTextHeight({ ...reference, width }));
    const x = definition.side === "left" ? anchor.x - width - SPACING.section
      : definition.side === "right" ? anchor.x + anchor.width + SPACING.section
      : anchor.x + (definition.offset ?? 0) * (width + SPACING.sibling);
    const y = definition.side === "above" ? anchor.y - height - SPACING.section
      : definition.side === "below" ? anchor.y + anchor.height + SPACING.subsection : anchor.y;
    diagram.shape({
      id: definition.id, referenceId: target.id, parentId: anchor.parentId,
      x, y, width, height, label, fontSize: LAYOUT_STANDARD.labelFontSize,
      fill: target.style.fill, stroke: firstRoute.style.stroke, textColor: firstRoute.style.textColor,
      strokeStyle: "dashed",
      metadata: {
        ...target.metadata,
        objectType: "Reference to an existing component",
        explanation: `Same component as ${target.title} (${target.id}). ${target.metadata?.layer ?? ""} owns its implementation; this local endpoint preserves the dependency without a cross-section routing loop.`,
      },
    });
    const created = diagram.backdropElements.find((element) => element.id === definition.id);
    byId.set(definition.id, created);
    for (const [routeId, binding] of definition.routes) {
      const route = edgeById.get(routeId);
      if (!route || route[binding] !== target.id) throw new Error(`Unexpected canonical endpoint on ${routeId}`);
      route[binding] = definition.id;
      const source = byId.get(route.startBinding);
      const destination = byId.get(route.endBinding);
      if (!source || !destination) throw new Error(`Missing local dependency endpoint on ${routeId}`);
      const horizontal = Math.abs(source.x - destination.x) >= Math.abs(source.y - destination.y);
      const from = horizontal
        ? [source.x < destination.x ? source.x + source.width : source.x, source.y + source.height / 2]
        : [source.x + source.width / 2, source.y < destination.y ? source.y + source.height : source.y];
      const to = horizontal
        ? [source.x < destination.x ? destination.x : destination.x + destination.width, destination.y + destination.height / 2]
        : [destination.x + destination.width / 2, source.y < destination.y ? destination.y : destination.y + destination.height];
      route.x = Math.min(from[0], to[0]);
      route.y = Math.min(from[1], to[1]);
      route.width = Math.abs(to[0] - from[0]);
      route.height = Math.abs(to[1] - from[1]);
      route.points = [from, to].map(([px, py]) => [px - route.x, py - route.y]);
      delete route.labelPosition;
    }
  }
  const legend = byId.get("legend");
  if (legend?.type === "text") legend.text += "\n↗ reference to the same component";
  return diagram;
}
