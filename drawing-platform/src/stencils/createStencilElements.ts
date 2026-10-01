import type {
  CanvasSystemElement,
  SystemNodeVariant,
} from "../../shared/contracts";
import { CANVAS_PALETTE, LAYOUT_STANDARD } from "../../shared/layout-standard";
import {
  minimumTextHeight,
  preferredTextWidth,
} from "../editor/text-layout";
import { getStencilById } from "./catalog";
import type { StencilDefinition, StencilPlacement } from "./types";

/** Icon and padding only; each inserted card adds its measured text dimensions. */
export const STENCIL_WIDTH = LAYOUT_STANDARD.cardPadding * 2 +
  LAYOUT_STANDARD.iconPlateSize + LAYOUT_STANDARD.iconGap;
export const STENCIL_HEIGHT = LAYOUT_STANDARD.cardPadding * 2 + LAYOUT_STANDARD.iconPlateSize;

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
  const provisional: SystemStencilElement = {
    id: nextElementId(stencil.id),
    type: "system",
    x: 0,
    y: 0,
    width: STENCIL_WIDTH,
    height: STENCIL_HEIGHT,
    rotation: 0,
    style: {
      fill: CANVAS_PALETTE.white,
      stroke: stencil.accent,
      strokeWidth: 2,
      strokeStyle: "solid",
      opacity: 1,
      textColor: CANVAS_PALETTE.ink,
    },
    iconId: stencil.iconId,
    title: stencil.name,
    subtitle: stencil.role,
    titleFontSize: LAYOUT_STANDARD.titleFontSize,
    bodyFontSize: LAYOUT_STANDARD.bodyFontSize,
    variant: variantForStencil(stencil),
  };
  const width = Math.ceil(preferredTextWidth(provisional));
  const sized = { ...provisional, width };
  const height = Math.ceil(minimumTextHeight(sized));

  return [{
    ...sized,
    x: center.x - width / 2,
    y: center.y - height / 2,
    height,
  }];
};
