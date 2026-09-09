import type {
  CanvasElement,
  CanvasShapeElement,
  CanvasSystemElement,
  CanvasTextElement,
} from "../../shared/contracts.js";

export const DEFAULT_SYSTEM_TITLE_FONT_SIZE = 15;
export const DEFAULT_SYSTEM_SUBTITLE_FONT_SIZE = 10;
export const DEFAULT_SYSTEM_BODY_FONT_SIZE = 11;
export const DEFAULT_SHAPE_LABEL_FONT_SIZE = 14;
export const DEFAULT_CONNECTOR_LABEL_FONT_SIZE = 10;
export const MAX_SYSTEM_CONTENT_WIDTH = 640;
export const MAX_SHAPE_CONTENT_WIDTH = 720;
export const MAX_TEXT_CONTENT_WIDTH = 760;
export const MAX_CONNECTOR_LABEL_WIDTH = 320;

export interface TextBlockLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  height: number;
}

const widthFactor = (family: "sans" | "mono") =>
  family === "mono" ? 0.62 : 0.56;

const normalizedLines = (value: string): string[] =>
  value.replaceAll("\r\n", "\n").split("\n");

const estimatedLineWidth = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => value.length * fontSize * widthFactor(family);

const widestExplicitLine = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Math.max(
  0,
  ...normalizedLines(value).map((line) =>
    estimatedLineWidth(line.trim(), fontSize, family),
  ),
);

const widestWord = (
  value: string,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): number => Math.max(
  0,
  ...value.split(/\s+/u).map((word) =>
    estimatedLineWidth(word, fontSize, family),
  ),
);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const splitLongWord = (word: string, maxCharacters: number): string[] => {
  const parts: string[] = [];
  for (let index = 0; index < word.length; index += maxCharacters) {
    parts.push(word.slice(index, index + maxCharacters));
  }
  return parts;
};

/**
 * Deterministic SVG wrapping without browser-only text measurement.
 * It intentionally uses a conservative average glyph width so saved scenes,
 * server-rendered SVGs, and the interactive canvas agree closely.
 */
export const wrapTextLines = (
  value: string,
  maxWidth: number,
  fontSize: number,
  family: "sans" | "mono" = "sans",
): string[] => {
  const maxCharacters = Math.max(
    1,
    Math.floor(Math.max(1, maxWidth) / (fontSize * widthFactor(family))),
  );
  const wrapped: string[] = [];

  for (const paragraph of value.replaceAll("\r\n", "\n").split("\n")) {
    if (paragraph.length === 0) {
      wrapped.push("");
      continue;
    }
    const words = paragraph.trim().split(/\s+/u);
    let line = "";
    for (const word of words) {
      const pieces =
        word.length > maxCharacters
          ? splitLongWord(word, maxCharacters)
          : [word];
      for (const piece of pieces) {
        const candidate = line ? `${line} ${piece}` : piece;
        if (candidate.length <= maxCharacters) {
          line = candidate;
        } else {
          if (line) wrapped.push(line);
          line = piece;
        }
      }
    }
    wrapped.push(line);
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
}

export const getSystemTextLayout = (
  element: Pick<
    CanvasSystemElement,
    | "width"
    | "height"
    | "title"
    | "subtitle"
    | "body"
    | "titleFontSize"
    | "bodyFontSize"
  >,
): SystemTextLayout => {
  const x = 80;
  const width = Math.max(28, element.width - x - 14);
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
  const gapCount = Number(Boolean(subtitle)) + Number(Boolean(body));
  const naturalHeight =
    title.height + (subtitle?.height ?? 0) + (body?.height ?? 0) + gapCount * 4;
  const minimumHeight = Math.max(80, naturalHeight + 24);
  return {
    x,
    width,
    top: Math.max(12, (element.height - naturalHeight) / 2),
    naturalHeight,
    minimumHeight,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(body ? { body } : {}),
  };
};

export const getShapeTextLayout = (
  element: Pick<CanvasShapeElement, "width" | "label" | "fontSize">,
): TextBlockLayout | undefined => {
  if (!element.label) return undefined;
  const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
  return textBlockLayout(
    element.label,
    Math.max(20, element.width - 24),
    fontSize,
    fontSize * 1.25,
  );
};

export const getTextElementLayout = (
  element: Pick<CanvasTextElement, "width" | "text" | "fontSize" | "fontFamily">,
): TextBlockLayout =>
  textBlockLayout(
    element.text,
    Math.max(20, element.width),
    element.fontSize,
    element.fontSize * 1.28,
    element.fontFamily,
  );

export const getConnectorLabelLayout = (
  label: string,
  fontSize = DEFAULT_CONNECTOR_LABEL_FONT_SIZE,
): TextBlockLayout & {
  width: number;
} => {
  const width = clamp(
    widestExplicitLine(label, fontSize, "mono") + 20,
    90,
    MAX_CONNECTOR_LABEL_WIDTH,
  );
  return {
    ...textBlockLayout(label, width - 16, fontSize, fontSize * 1.3, "mono"),
    width,
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
    );
    return clamp(94 + widest, 122, MAX_SYSTEM_CONTENT_WIDTH);
  }
  if (element.type === "shape") {
    if (!element.label) return element.iconId ? 52 : 24;
    const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
    return clamp(
      widestWord(element.label, fontSize) + 24,
      element.iconId ? 52 : 24,
      MAX_SHAPE_CONTENT_WIDTH,
    );
  }
  if (element.type === "text") {
    return clamp(
      widestWord(element.text, element.fontSize, element.fontFamily) + 4,
      24,
      MAX_TEXT_CONTENT_WIDTH,
    );
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
    return clamp(94 + widest, minimumTextWidth(element), MAX_SYSTEM_CONTENT_WIDTH);
  }
  if (element.type === "shape") {
    if (!element.label) return Math.max(element.iconId ? 52 : 24, element.width);
    const fontSize = element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE;
    return clamp(
      widestExplicitLine(element.label, fontSize) + 24,
      minimumTextWidth(element),
      MAX_SHAPE_CONTENT_WIDTH,
    );
  }
  if (element.type === "text") {
    return clamp(
      widestExplicitLine(element.text, element.fontSize, element.fontFamily) + 4,
      minimumTextWidth(element),
      MAX_TEXT_CONTENT_WIDTH,
    );
  }
  return element.width;
};

export const minimumTextHeight = (element: CanvasElement): number => {
  if (element.type === "system") return getSystemTextLayout(element).minimumHeight;
  if (element.type === "shape") {
    const layout = getShapeTextLayout(element);
    const iconStackHeight = element.iconId ? 22 : 0;
    return Math.max(24, (layout?.height ?? 0) + iconStackHeight + 24);
  }
  if (element.type === "text") {
    return Math.max(24, getTextElementLayout(element).height + 4);
  }
  return 24;
};
