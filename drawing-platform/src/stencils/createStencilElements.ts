import type {
  CanvasSystemElement,
  SystemNodeVariant,
} from "../../shared/contracts";
import { getStencilById } from "./catalog";
import type { StencilDefinition, StencilPlacement } from "./types";

export const STENCIL_WIDTH = 224;
export const STENCIL_HEIGHT = 112;

const CARD_BACKGROUND = "#ffffff";

let elementSequence = 0;

const nextElementId = (stencilId: string): string => {
  elementSequence += 1;
  return `system-${stencilId}-${Date.now().toString(36)}-${elementSequence.toString(36)}`;
};

const resolveStencil = (
  stencilOrId: StencilDefinition | string,
): StencilDefinition => {
  if (typeof stencilOrId !== "string") {
    return stencilOrId;
  }

  const stencil = getStencilById(stencilOrId);
  if (!stencil) {
    throw new Error(`Unknown stencil: ${stencilOrId}`);
  }
  return stencil;
};

export type SystemStencilElement = CanvasSystemElement;

const variantForStencil = (stencil: StencilDefinition): SystemNodeVariant => {
  if (stencil.id === "client") return "client";
  if (stencil.id === "cache") return "cache";
  if (stencil.id === "telemetry") return "observability";
  if (stencil.id === "database" || stencil.id === "distributed-database") {
    return "database";
  }
  if (stencil.category === "Routing") return "routing";
  if (stencil.category === "Services") return "service";
  if (stencil.category === "Distributed Data") return "storage";
  return "neutral";
};

/** Creates one independently editable semantic node centered at `center`. */
export const createStencilElements = (
  stencilOrId: StencilDefinition | string,
  center: StencilPlacement = { x: 0, y: 0 },
): SystemStencilElement[] => {
  const stencil = resolveStencil(stencilOrId);

  return [
    {
      id: nextElementId(stencil.id),
      type: "system",
      x: center.x - STENCIL_WIDTH / 2,
      y: center.y - STENCIL_HEIGHT / 2,
      width: STENCIL_WIDTH,
      height: STENCIL_HEIGHT,
      rotation: 0,
      style: {
        fill: CARD_BACKGROUND,
        stroke: stencil.accent,
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 1,
        textColor: "#1f2937",
      },
      iconId: stencil.iconId,
      title: stencil.name,
      subtitle: stencil.role,
      variant: variantForStencil(stencil),
    },
  ];
};
