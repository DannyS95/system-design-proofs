import type {
  CanvasConnectorElement,
  CanvasElement,
  CanvasShapeElement,
  CanvasSystemElement,
  CanvasTextElement,
} from "../../shared/contracts.js";
import { LAYOUT_STANDARD, SPACING } from "../../shared/layout-standard.js";

export const DEFAULT_SYSTEM_TITLE_FONT_SIZE = 15;
export const DEFAULT_SYSTEM_SUBTITLE_FONT_SIZE = 10;
export const DEFAULT_SYSTEM_BODY_FONT_SIZE = 11;
export const DEFAULT_SHAPE_LABEL_FONT_SIZE = 14;
export const DEFAULT_CONNECTOR_LABEL_FONT_SIZE = 10;
export const MAX_SYSTEM_CONTENT_WIDTH = LAYOUT_STANDARD.maxSystemWidth;
export const MAX_SHAPE_CONTENT_WIDTH = LAYOUT_STANDARD.maxShapeWidth;
export const MAX_TEXT_CONTENT_WIDTH = LAYOUT_STANDARD.maxTextWidth;
export const MAX_CONNECTOR_LABEL_WIDTH = LAYOUT_STANDARD.maxLabelWidth;

export interface TextBlockLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  height: number;
}

const glyphWidth = (character: string, family: "sans" | "mono"): number => {
  // Account for wide glyphs rather than assuming every letter is average-width.
  // CJK and pictographic symbols occupy at least an em in the fallback fonts.
  if ((character.codePointAt(0) ?? 0) >= 0x2e80) return 1.05;
  if (family === "mono") return 0.64;
  if (/\s/u.test(character)) return 0.34;
  if (/[ilIjtfr.,:;'!|]/u.test(character)) return 0.4;
  if (/[MW@%&#]/u.test(character)) return 1;
  if (/[A-Z]/u.test(character)) return 0.76;
  if (/[^\p{L}\p{N}]/u.test(character)) return 0.76;
  return 0.64;
};

const normalizedLines = (value: string): string[] =>
  value.replaceAll("\r\n", "\n").split("\n");

export const measureTextWidth = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Array.from(value).reduce(
  (width, character) => width + glyphWidth(character, family) * fontSize,
  0,
);

const widestExplicitLine = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Math.max(
  0,
  ...normalizedLines(value).map((line) =>
    measureTextWidth(line.trimEnd(), fontSize, family),
  ),
);

const widestWord = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Math.max(
  0,
  ...value.split(/\s+/u).map((word) =>
    measureTextWidth(word, fontSize, family),
  ),
);

const widestGlyph = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Math.max(fontSize, ...Array.from(value).map((character) =>
  measureTextWidth(character, fontSize, family)));

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const splitLongWord = (
  word: string,
  maxWidth: number,
  fontSize: number,
  family: "sans" | "mono",
): string[] => {
  const parts: string[] = [];
  let part = "";
  for (const character of word) {
    if (part && measureTextWidth(part + character, fontSize, family) > maxWidth + 0.001) {
      parts.push(part);
      part = "";
    }
    part += character;
  }
  if (part) parts.push(part);
  return parts;
};

/**
 * Deterministic SVG wrapping without browser-only text measurement.
 * Conservative glyph classes give the browser and server the same wrapping
 * while protecting wide capitals and non-Latin text from clipped bounds.
 */
export const wrapTextLines = (
  value: string,
  maxWidth: number,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): string[] => {
  const width = Math.max(1, maxWidth);
  const wrapped: string[] = [];

  for (const paragraph of normalizedLines(value)) {
    const content = paragraph.trim();
    if (!content) {
      wrapped.push("");
      continue;
    }
    // Indent every continuation line too; narrow cards reduce indentation before
    // allowing it to consume the width needed by an actual glyph.
    let indent = (paragraph.match(/^[ \t]*/u)?.[0] ?? "").replaceAll("\t", "  ");
    const indentLimit = Math.max(0, width - widestGlyph(content, fontSize, family));
    while (measureTextWidth(indent, fontSize, family) > indentLimit) indent = indent.slice(0, -1);
    const contentWidth = Math.max(1, width - measureTextWidth(indent, fontSize, family));
    const words = content.split(/\s+/u);
    let line = "";
    for (const word of words) {
      const pieces =
        measureTextWidth(word, fontSize, family) > contentWidth + 0.001
          ? splitLongWord(word, contentWidth, fontSize, family)
          : [word];
      for (const piece of pieces) {
        const candidate = line ? `${line} ${piece}` : piece;
        if (measureTextWidth(candidate, fontSize, family) <= contentWidth + 0.001) {
          line = candidate;
        } else {
          if (line) wrapped.push(indent + line);
          line = piece;
        }
      }
    }
    wrapped.push(indent + line);
  }

  return wrapped.length > 0 ? wrapped : [""];
};

export const textBlockLayout = (
  value: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  family: "sans" | "mono" = "sans",
): TextBlockLayout => {
  const lines = wrapTextLines(value, maxWidth, fontSize, family);
  return {
    lines,
    fontSize,
    lineHeight,
    height: lines.length * lineHeight,
  };
};

export interface SystemTextLayout {
  x: number;
  width: number;
  top: number;
  naturalHeight: number;
  minimumHeight: number;
  title: TextBlockLayout;
  subtitle?: TextBlockLayout;
  body?: TextBlockLayout;
  capacity?: TextBlockLayout;
}

export const getSystemTextLayout = (
  element: Pick<
    CanvasSystemElement,
    | "width"
    | "height"
    | "title"
    | "subtitle"
    | "body"
    | "capacity"
    | "titleFontSize"
    | "bodyFontSize"
  >,
): SystemTextLayout => {
  const x = LAYOUT_STANDARD.cardPadding + LAYOUT_STANDARD.iconPlateSize +
    LAYOUT_STANDARD.iconGap;
  const width = Math.max(1, element.width - x - LAYOUT_STANDARD.cardPadding);
  const titleFontSize =
    element.titleFontSize ?? DEFAULT_SYSTEM_TITLE_FONT_SIZE;
  const bodyFontSize = element.bodyFontSize ?? DEFAULT_SYSTEM_BODY_FONT_SIZE;
  const subtitleFontSize = element.bodyFontSize === undefined
    ? DEFAULT_SYSTEM_SUBTITLE_FONT_SIZE
    : Math.max(1, element.bodyFontSize - 1);
  const title = textBlockLayout(
    element.title,
    width,
    titleFontSize,
    Math.ceil(titleFontSize * 1.2),
    "sans",
  );
  const subtitle = element.subtitle
    ? textBlockLayout(
        element.subtitle,
        width,
        subtitleFontSize,
        Math.ceil(subtitleFontSize * 1.4),
        "mono",
      )
    : undefined;
  const body = element.body
    ? textBlockLayout(
        element.body,
        width,
        bodyFontSize,
        element.bodyFontSize === undefined
          ? 15
          : Math.ceil(bodyFontSize * 1.36),
        "sans",
      )
    : undefined;
  const capacity = element.capacity
    ? textBlockLayout(element.capacity, width, LAYOUT_STANDARD.capacityFontSize, 16, "sans")
    : undefined;
  const gapCount = Number(Boolean(subtitle)) + Number(Boolean(body)) + Number(Boolean(capacity));
  const naturalHeight =
    title.height + (subtitle?.height ?? 0) + (body?.height ?? 0) + (capacity?.height ?? 0) +
    gapCount * LAYOUT_STANDARD.textGap;
  const minimumHeight = Math.max(LAYOUT_STANDARD.iconPlateSize, naturalHeight) +
    LAYOUT_STANDARD.cardPadding * 2;
  return {
    x,
    width,
    top: Math.max(LAYOUT_STANDARD.cardPadding, (element.height - naturalHeight) / 2),
    naturalHeight,
    minimumHeight,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(body ? { body } : {}),
    ...(capacity ? { capacity } : {}),
  };
};

/** A centered rectangle that is fully inside the actual shape outline. */
export const shapeContentRatio = (shape?: CanvasShapeElement["shape"]): number =>
  shape === "diamond" ? 0.5 : shape === "ellipse" ? Math.SQRT1_2 : 1;

export const getShapeIconSize = (
  element: Pick<CanvasShapeElement, "width" | "iconId">,
): number => element.iconId === "virtual-node" ? SPACING.compact :
  element.iconId ? (element.width <= 100 ? SPACING.padding : SPACING.connector) : 0;

export const shapePadding = (element: Pick<CanvasShapeElement, "iconId">): number =>
  element.iconId === "virtual-node" ? SPACING.label : LAYOUT_STANDARD.cardPadding;

export const shapeIconGap = (element: Pick<CanvasShapeElement, "iconId">): number =>
  element.iconId === "virtual-node" ? SPACING.label / 2 : LAYOUT_STANDARD.textGap;

export const getShapeContentBounds = (
  element: Pick<CanvasShapeElement, "width"> & Partial<Pick<CanvasShapeElement, "shape" | "iconId">>,
): { x: number; width: number } => {
  const innerWidth = element.width * shapeContentRatio(element.shape);
  return {
    x: (element.width - innerWidth) / 2 + shapePadding(element),
    width: Math.max(1, innerWidth - shapePadding(element) * 2),
  };
};

export const getShapeTextLayout = (
  element: Pick<CanvasShapeElement, "width" | "label" | "fontSize"> &
    Partial<Pick<CanvasShapeElement, "shape" | "iconId">>,
): TextBlockLayout | undefined => {
  if (!element.label) return undefined;
  const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
  return textBlockLayout(
    element.label,
    getShapeContentBounds(element).width,
    fontSize,
    fontSize * 1.25,
  );
};

export const getTextElementLayout = (
  element: Pick<CanvasTextElement, "width" | "text" | "fontSize" | "fontFamily"> &
    Partial<Pick<CanvasTextElement, "fontWeight">>,
): TextBlockLayout =>
  textBlockLayout(
    element.text,
    Math.max(1, element.width - SPACING.label * 2) / textMeasurementScale(element.fontWeight),
    element.fontSize,
    element.fontSize * 1.28,
    element.fontFamily,
  );

/** Bold headings need extra fallback-font room verified against browser glyph bounds. */
export const textMeasurementScale = (fontWeight?: CanvasTextElement["fontWeight"]): number =>
  (fontWeight ?? 400) >= 600 ? 1.12 : 1.06;

export const getConnectorLabelLayout = (
  label: string,
  fontSize = DEFAULT_CONNECTOR_LABEL_FONT_SIZE,
): TextBlockLayout & {
  width: number;
  plateHeight: number;
} => {
  const width = clamp(
    widestExplicitLine(label, fontSize, "mono") + LAYOUT_STANDARD.labelPaddingX * 2,
    LAYOUT_STANDARD.labelPaddingX * 2 + 1,
    Math.max(MAX_CONNECTOR_LABEL_WIDTH,
      widestGlyph(label, fontSize, "mono") + LAYOUT_STANDARD.labelPaddingX * 2),
  );
  const block = textBlockLayout(
    label, width - LAYOUT_STANDARD.labelPaddingX * 2, fontSize, fontSize * 1.3, "mono",
  );
  return {
    ...block,
    width,
    plateHeight: block.height + LAYOUT_STANDARD.labelPaddingY * 2,
  };
};

/** Persisted positions are local plate centers; legacy labels stay above their route. */
export const getConnectorLabelCenter = (
  element: CanvasConnectorElement,
): { x: number; y: number } => {
  if (element.labelPosition) {
    return { x: element.labelPosition[0], y: element.labelPosition[1] };
  }
  const segments = element.points.slice(1).map((end, index) => {
    const start = element.points[index];
    return { start, end, length: Math.hypot(end[0] - start[0], end[1] - start[1]) };
  });
  let remaining = segments.reduce((sum, segment) => sum + segment.length, 0) / 2;
  const layout = getConnectorLabelLayout(element.label ?? "", element.fontSize);
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length ? remaining / segment.length : 0;
      return {
        x: segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
        y: segment.start[1] + (segment.end[1] - segment.start[1]) * ratio -
          layout.plateHeight / 2 - LAYOUT_STANDARD.labelLineGap - element.style.strokeWidth / 2,
      };
    }
    remaining -= segment.length;
  }
  return { x: 0, y: -layout.plateHeight / 2 - LAYOUT_STANDARD.labelLineGap };
};

export const getConnectorLabelBounds = (
  element: CanvasConnectorElement,
): { x: number; y: number; width: number; height: number } | undefined => {
  if (!element.label) return undefined;
  const layout = getConnectorLabelLayout(element.label, element.fontSize);
  const center = getConnectorLabelCenter(element);
  return {
    x: element.x + center.x - layout.width / 2,
    y: element.y + center.y - layout.plateHeight / 2,
    width: layout.width,
    height: layout.plateHeight,
  };
};

/**
 * Smallest width that can contain content after wrapping. Long indivisible
 * tokens are capped at the same sensible maximum used by automatic sizing.
 */
export const minimumTextWidth = (element: CanvasElement): number => {
  if (element.type === "system") {
    const titleFontSize =
      element.titleFontSize ?? DEFAULT_SYSTEM_TITLE_FONT_SIZE;
    const bodyFontSize = element.bodyFontSize ?? DEFAULT_SYSTEM_BODY_FONT_SIZE;
    const subtitleFontSize = element.bodyFontSize === undefined
      ? DEFAULT_SYSTEM_SUBTITLE_FONT_SIZE
      : Math.max(1, element.bodyFontSize - 1);
    const widest = Math.max(
      widestWord(element.title, titleFontSize),
      widestWord(element.subtitle ?? "", subtitleFontSize, "mono"),
      widestWord(element.body ?? "", bodyFontSize),
      widestWord(element.capacity ?? "", LAYOUT_STANDARD.capacityFontSize),
    );
    const inset = LAYOUT_STANDARD.cardPadding * 2 + LAYOUT_STANDARD.iconPlateSize +
      LAYOUT_STANDARD.iconGap;
    return Math.max(
      clamp(inset + widest, inset + titleFontSize, MAX_SYSTEM_CONTENT_WIDTH),
      inset + Math.max(widestGlyph(element.title, titleFontSize),
        widestGlyph(element.subtitle ?? "", subtitleFontSize, "mono"),
        widestGlyph(element.body ?? "", bodyFontSize),
        widestGlyph(element.capacity ?? "", LAYOUT_STANDARD.capacityFontSize)),
    );
  }
  if (element.type === "shape") {
    const padding = shapePadding(element);
    if (!element.label) return element.iconId
      ? (getShapeIconSize(element) + padding * 2) / shapeContentRatio(element.shape)
      : SPACING.connector;
    const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
    return Math.max(clamp(
      (Math.max(widestWord(element.label, fontSize), getShapeIconSize(element)) +
        padding * 2) / shapeContentRatio(element.shape),
      element.iconId === "virtual-node" ? SPACING.section : SPACING.connector,
      MAX_SHAPE_CONTENT_WIDTH,
    ), (widestGlyph(element.label, fontSize) + padding * 2) /
      shapeContentRatio(element.shape));
  }
  if (element.type === "text") {
    return Math.max(clamp(
      widestWord(element.text, element.fontSize, element.fontFamily) *
        textMeasurementScale(element.fontWeight) + SPACING.label * 2,
      SPACING.connector,
      MAX_TEXT_CONTENT_WIDTH,
    ), widestGlyph(element.text, element.fontSize, element.fontFamily) *
      textMeasurementScale(element.fontWeight) + SPACING.label * 2);
  }
  return 0;
};

/** Natural one-line width, capped so long prose wraps instead of widening forever. */
export const preferredTextWidth = (element: CanvasElement): number => {
  if (element.type === "system") {
    const titleFontSize =
      element.titleFontSize ?? DEFAULT_SYSTEM_TITLE_FONT_SIZE;
    const bodyFontSize = element.bodyFontSize ?? DEFAULT_SYSTEM_BODY_FONT_SIZE;
    const subtitleFontSize = element.bodyFontSize === undefined
      ? DEFAULT_SYSTEM_SUBTITLE_FONT_SIZE
      : Math.max(1, element.bodyFontSize - 1);
    const widest = Math.max(
      widestExplicitLine(element.title, titleFontSize),
      widestExplicitLine(element.subtitle ?? "", subtitleFontSize, "mono"),
      widestExplicitLine(element.body ?? "", bodyFontSize),
    );
    const inset = LAYOUT_STANDARD.cardPadding * 2 + LAYOUT_STANDARD.iconPlateSize +
      LAYOUT_STANDARD.iconGap;
    return clamp(inset + widest, minimumTextWidth(element),
      Math.max(MAX_SYSTEM_CONTENT_WIDTH, minimumTextWidth(element)));
  }
  if (element.type === "shape") {
    if (!element.label) return minimumTextWidth(element);
    const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
    return clamp(
      (Math.max(widestExplicitLine(element.label, fontSize), getShapeIconSize(element)) +
        shapePadding(element) * 2) / shapeContentRatio(element.shape),
      minimumTextWidth(element),
      Math.max(MAX_SHAPE_CONTENT_WIDTH, minimumTextWidth(element)),
    );
  }
  if (element.type === "text") {
    return clamp(
      widestExplicitLine(element.text, element.fontSize, element.fontFamily) *
        textMeasurementScale(element.fontWeight) + SPACING.label * 2,
      minimumTextWidth(element),
      Math.max(MAX_TEXT_CONTENT_WIDTH, minimumTextWidth(element)),
    );
  }
  return element.width;
};

export const minimumTextHeight = (element: CanvasElement): number => {
  if (element.type === "system") return getSystemTextLayout(element).minimumHeight;
  if (element.type === "shape") {
    const layout = getShapeTextLayout(element);
    if (!layout && !element.iconId) return SPACING.connector;
    const iconStackHeight = getShapeIconSize(element) +
      (element.iconId && layout ? shapeIconGap(element) : 0);
    if (element.iconId === "virtual-node" && element.shape === "ellipse") {
      // A token is a compact circle, with its narrow icon above its label.
      // Use the actual label corner instead of reserving a full-width stack.
      const widthRatio = Math.min(0.99, getShapeContentBounds(element).width / element.width);
      return Math.max(SPACING.section, ((layout?.height ?? 0) + iconStackHeight +
        shapePadding(element) * 2) / Math.sqrt(1 - widthRatio ** 2));
    }
    return Math.max(SPACING.connector,
      ((layout?.height ?? 0) + iconStackHeight + shapePadding(element) * 2) /
      shapeContentRatio(element.shape));
  }
  if (element.type === "text") {
    return Math.max(SPACING.connector, getTextElementLayout(element).height + SPACING.label * 2);
  }
  return 24;
};
