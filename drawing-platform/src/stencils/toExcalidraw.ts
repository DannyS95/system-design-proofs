import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import { getStencilById } from "./catalog";
import type { StencilDefinition, StencilPlacement } from "./types";

export const STENCIL_WIDTH = 224;
export const STENCIL_HEIGHT = 112;

const CARD_BACKGROUND = "#ffffff";
const TEXT_COLOR = "#1f2937";
const MUTED_TEXT_COLOR = "#667085";
const ICON_SIZE = 48;

let groupSequence = 0;

const nextGroupId = (stencilId: string): string => {
  groupSequence += 1;
  return `system-canvas-${stencilId}-${Date.now().toString(36)}-${groupSequence.toString(36)}`;
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

const glyphFontSize = (glyph: string): number => {
  if (glyph.length >= 3) {
    return 13;
  }
  if (glyph.length === 2) {
    return 17;
  }
  return 22;
};

/**
 * Creates the small set of native editor primitives used by a stencil. This
 * helper is exported so templates and tests can inspect the editable source
 * before Excalidraw supplies runtime fields and bindings.
 */
export const createStencilSkeleton = (
  stencilOrId: StencilDefinition | string,
  center: StencilPlacement,
  groupId = nextGroupId(resolveStencil(stencilOrId).id),
): ExcalidrawElementSkeleton[] => {
  const stencil = resolveStencil(stencilOrId);
  const x = center.x - STENCIL_WIDTH / 2;
  const y = center.y - STENCIL_HEIGHT / 2;
  const groupIds = [groupId];

  return [
    {
      type: "rectangle",
      x,
      y,
      width: STENCIL_WIDTH,
      height: STENCIL_HEIGHT,
      strokeColor: stencil.accent,
      backgroundColor: CARD_BACKGROUND,
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      roundness: { type: 3 },
      groupIds,
    },
    {
      type: "ellipse",
      x: x + 16,
      y: y + 24,
      width: ICON_SIZE,
      height: ICON_SIZE,
      strokeColor: stencil.accent,
      backgroundColor: stencil.accent,
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      groupIds,
      label: {
        text: stencil.glyph,
        fontSize: glyphFontSize(stencil.glyph),
        strokeColor: CARD_BACKGROUND,
        fontFamily: 2,
        groupIds,
      },
    },
    {
      type: "text",
      x: x + 80,
      y: y + 24,
      width: 128,
      height: 24,
      text: stencil.name,
      originalText: stencil.name,
      fontFamily: 2,
      fontSize: 18,
      textAlign: "left",
      verticalAlign: "top",
      autoResize: false,
      strokeColor: TEXT_COLOR,
      backgroundColor: "transparent",
      fillStyle: "solid",
      roughness: 0,
      groupIds,
    },
    {
      type: "text",
      x: x + 80,
      y: y + 55,
      width: 128,
      height: 34,
      text: stencil.role,
      originalText: stencil.role,
      fontFamily: 2,
      fontSize: 12,
      textAlign: "left",
      verticalAlign: "top",
      autoResize: false,
      strokeColor: MUTED_TEXT_COLOR,
      backgroundColor: "transparent",
      fillStyle: "solid",
      roughness: 0,
      groupIds,
    },
  ];
};

/**
 * Converts a catalog entry into a fresh editable Excalidraw group centered at
 * the requested scene coordinate. Conversion regenerates element identifiers,
 * so inserting the same stencil twice never aliases editor state.
 */
export const createStencilElements = (
  stencilOrId: StencilDefinition | string,
  center: StencilPlacement = { x: 0, y: 0 },
): OrderedExcalidrawElement[] =>
  convertToExcalidrawElements(
    createStencilSkeleton(stencilOrId, center),
    { regenerateIds: true },
  );
