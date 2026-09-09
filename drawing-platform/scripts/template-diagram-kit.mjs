import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectDirectory = resolve(scriptDirectory, "..");
export const repositoryDirectory = resolve(projectDirectory, "..");

const fontCacheDirectory = resolve(tmpdir(), "system-canvas-font-cache");
process.env.XDG_CACHE_HOME ||= fontCacheDirectory;

export const GENERATED_AT = "2026-09-02T00:00:00.000Z";

export const palette = {
  ink: "#17212b",
  muted: "#66717d",
  paper: "#f7f4ec",
  white: "#ffffff",
  line: "#c9c6bc",
  blue: "#2563eb",
  blueSoft: "#e8efff",
  green: "#15803d",
  greenSoft: "#e9f7ed",
  purple: "#7c3aed",
  purpleSoft: "#f1ebff",
  amber: "#bd6212",
  amberSoft: "#fff1da",
  coral: "#d84b43",
  coralSoft: "#ffe9e6",
  cyan: "#087e8b",
  cyanSoft: "#e4f6f7",
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const style = (overrides = {}) => ({
  fill: "transparent",
  stroke: palette.ink,
  strokeWidth: 1.5,
  strokeStyle: "solid",
  opacity: 1,
  textColor: palette.ink,
  ...overrides,
});

const dashArray = (strokeStyle) => {
  if (strokeStyle === "dashed") return ' stroke-dasharray="9 7"';
  if (strokeStyle === "dotted") return ' stroke-dasharray="2 7" stroke-linecap="round"';
  return "";
};

const markerId = (color) =>
  `arrow-${color.replace("#", "").replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;

const wrapTextLines = (value, maxWidth, fontSize, factor = 0.56) => {
  const maxCharacters = Math.max(1, Math.floor(Math.max(1, maxWidth) / (fontSize * factor)));
  const wrapped = [];
  for (const paragraph of String(value).replaceAll("\r\n", "\n").split("\n")) {
    if (!paragraph) {
      wrapped.push("");
      continue;
    }
    let line = "";
    for (const originalWord of paragraph.trim().split(/\s+/u)) {
      const words = [];
      for (let index = 0; index < originalWord.length; index += maxCharacters) {
        words.push(originalWord.slice(index, index + maxCharacters));
      }
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= maxCharacters) line = candidate;
        else {
          if (line) wrapped.push(line);
          line = word;
        }
      }
    }
    wrapped.push(line);
  }
  return wrapped.length ? wrapped : [""];
};

const widestExplicitLine = (value, fontSize, factor = 0.56) =>
  Math.max(
    0,
    ...String(value).replaceAll("\r\n", "\n").split("\n")
      .map((line) => line.trim().length * fontSize * factor),
  );

const widestWord = (value, fontSize, factor = 0.56) =>
  Math.max(
    0,
    ...String(value).split(/\s+/u)
      .map((word) => word.length * fontSize * factor),
  );

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const pathMidpoint = (points) => {
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return {
      from: previous,
      to: point,
      length: Math.hypot(point.x - previous.x, point.y - previous.y),
    };
  });
  const halfway = segments.reduce((sum, segment) => sum + segment.length, 0) / 2;
  let travelled = 0;
  for (const segment of segments) {
    if (travelled + segment.length >= halfway) {
      const ratio = segment.length === 0 ? 0 : (halfway - travelled) / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
        y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
      };
    }
    travelled += segment.length;
  }
  return points.at(-1);
};

const svgText = ({
  x,
  y,
  width,
  text,
  fontSize,
  color,
  align = "left",
  weight = 600,
  lineHeight = 1.2,
}) => {
  const lines = wrapTextLines(text, width, fontSize);
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const textX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
  const spans = lines
    .map(
      (line, index) =>
        `<tspan x="${textX}" dy="${index === 0 ? 0 : fontSize * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<text x="${textX}" y="${y + fontSize}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${spans}</text>`;
};

const renderIcon = (iconId, x, y, size, color) => {
  const s = size / 48;
  const transform = `translate(${x} ${y}) scale(${s})`;
  const common = `fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  const dot = (cx, cy, r = 2.5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="none"/>`;
  let body;

  switch (iconId) {
    case "internet":
    case "global-routing":
      body = `<circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c7 7 7 27 0 34M24 7c-7 7-7 27 0 34M11 15h26M11 33h26"/>`;
      break;
    case "edge-routing":
    case "edge-pop":
      body = `<path d="M9 36V13l15-7 15 7v23l-15 7z"/><path d="M9 13l15 8 15-8M24 21v22"/>${dot(9, 13)}${dot(39, 13)}${dot(24, 43)}`;
      break;
    case "cluster-routing":
    case "load-balancer":
      body = `${dot(8, 24, 3)}<path d="M11 24h10M21 24v-12h8M21 24h8M21 24v12h8"/>${dot(34, 12, 4)}${dot(34, 24, 4)}${dot(34, 36, 4)}`;
      break;
    case "service-routing":
    case "gateway":
      body = `<path d="M7 13h13l8 11-8 11H7M41 13H28l-8 11 8 11h13"/><path d="M16 24h16"/>`;
      break;
    case "application-routing":
    case "application-router":
    case "api":
      body = `<path d="M17 11L7 24l10 13M31 11l10 13-10 13M28 7l-8 34"/>`;
      break;
    case "data-routing":
    case "data-router":
    case "key-value-store":
    case "hash-ring":
      body = `<circle cx="24" cy="24" r="15"/><path d="M13 13l22 22"/>${dot(24, 9, 3)}${dot(39, 24, 3)}${dot(24, 39, 3)}${dot(9, 24, 3)}`;
      break;
    case "client":
    case "viewer":
      body = `<rect x="7" y="9" width="34" height="25" rx="3"/><path d="M17 41h14M24 34v7"/>`;
      break;
    case "server":
    case "coordinator":
    case "application-server":
    case "replica":
    case "replica-group":
      body = `<rect x="8" y="7" width="32" height="12" rx="3"/><rect x="8" y="29" width="32" height="12" rx="3"/>${dot(14, 13, 2)}${dot(14, 35, 2)}<path d="M21 13h12M21 35h12"/>`;
      break;
    case "fallback":
      body = `<rect x="7" y="8" width="27" height="13" rx="3"/><rect x="7" y="28" width="27" height="13" rx="3"/><circle cx="36" cy="34" r="8"/><path d="M36 30v5l3 2"/>`;
      break;
    case "writer":
      body = `<path d="M10 38l3-11L32 8l8 8-19 19zM28 12l8 8M13 27l8 8M9 41h31"/>`;
      break;
    case "version":
      body = `<path d="M9 24h10M19 24c8 0 8-12 16-12M19 24c8 0 8 12 16 12"/>${dot(9, 24, 3)}${dot(38, 12, 3)}${dot(38, 36, 3)}`;
      break;
    case "merge":
      body = `${dot(10, 12, 3)}${dot(10, 36, 3)}${dot(38, 24, 3)}<path d="M13 12c10 0 10 12 21 12M13 36c10 0 10-12 21-12"/>`;
      break;
    case "policy":
    case "policy-gate":
      body = `<path d="M24 6l15 6v10c0 10-6 17-15 21-9-4-15-11-15-21V12z"/><path d="M17 24l5 5 10-11"/>`;
      break;
    case "cache":
      body = `<rect x="7" y="8" width="34" height="12" rx="3"/><rect x="7" y="28" width="34" height="12" rx="3"/><path d="M26 11l-6 9h6l-5 10 11-13h-7z"/>`;
      break;
    case "partition":
      body = `<rect x="6" y="10" width="36" height="28" rx="3"/><path d="M18 10v28m12-28v28M11 18h2M23 24h2M35 18h2M35 31h2"/>`;
      break;
    case "virtual-node":
      body = `<circle cx="24" cy="24" r="16"/><path d="M24 8a16 16 0 0116 16"/>${dot(40, 24, 5)}<path d="m33 11 4 .5-.5 4"/>`;
      break;
    case "database":
    case "distributed-database":
      body = `<ellipse cx="24" cy="11" rx="16" ry="6"/><path d="M8 11v25c0 4 7 7 16 7s16-3 16-7V11M8 24c0 4 7 7 16 7s16-3 16-7"/>`;
      break;
    case "observability":
    case "telemetry":
      body = `<path d="M6 34h36M9 30l8-9 7 5 8-14 7 8"/>${dot(17, 21, 2.5)}${dot(24, 26, 2.5)}${dot(32, 12, 2.5)}`;
      break;
    case "pop":
      body = `<path d="M24 43s14-13 14-25a14 14 0 10-28 0c0 12 14 25 14 25z"/><circle cx="24" cy="18" r="5"/>`;
      break;
    case "origin-shield":
    case "leader":
      body = `<path d="M24 6l15 6v10c0 10-6 17-15 21-9-4-15-11-15-21V12z"/><path d="M16 19h16M16 27h16"/>`;
      break;
    case "origin":
      body = `<path d="M14 37h24a8 8 0 001-16 14 14 0 00-27-3A10 10 0 0014 37z"/><path d="M18 24h12M18 30h16"/>`;
      break;
    case "control-plane":
      body = `<path d="M9 12h30M9 24h30M9 36h30"/>${dot(18, 12, 4)}${dot(31, 24, 4)}${dot(22, 36, 4)}`;
      break;
    case "browser":
      body = `<rect x="6" y="8" width="36" height="32" rx="4"/><path d="M6 17h36"/>${dot(12, 13, 1.6)}${dot(17, 13, 1.6)}${dot(22, 13, 1.6)}`;
      break;
    case "workspace":
      body = `<rect x="6" y="7" width="36" height="34" rx="3"/><path d="M17 7v34M17 16h25M10 13h3M10 20h3M10 27h3"/>`;
      break;
    case "canvas":
    case "whiteboard":
      body = `${dot(10, 31, 4)}${dot(25, 11, 4)}${dot(38, 29, 4)}<path d="M13 29l9-15M28 13l8 13M14 32l20-2"/><path d="M8 42h32"/>`;
      break;
    case "local-storage":
      body = `<path d="M8 9h28l5 5v25H8zM13 9v12h20V9M15 39V28h18v11"/>`;
      break;
    case "queue":
    case "message-queue":
    case "request-coalescer":
      body = `<path d="M8 12h25M8 24h25M8 36h25M36 8l5 4-5 4M36 20l5 4-5 4M36 32l5 4-5 4"/>`;
      break;
    case "snapshot":
    case "file-snapshot":
      body = `<path d="M12 6h19l7 7v29H12zM31 6v8h7M18 22h14M18 29h14M18 36h10"/>`;
      break;
    case "templates":
    case "template-grid":
      body = `<rect x="7" y="7" width="14" height="14" rx="2"/><rect x="27" y="7" width="14" height="14" rx="2"/><rect x="7" y="27" width="14" height="14" rx="2"/><rect x="27" y="27" width="14" height="14" rx="2"/>`;
      break;
    case "import-export":
      body = `<path d="M9 14h26M29 8l6 6-6 6M39 34H13M19 28l-6 6 6 6"/>`;
      break;
    case "worker":
      body = `<circle cx="24" cy="24" r="8"/><path d="M24 6v7M24 35v7M6 24h7M35 24h7M11 11l5 5M32 32l5 5M37 11l-5 5M16 32l-5 5"/>`;
      break;
    case "image":
      body = `<rect x="7" y="8" width="34" height="32" rx="3"/><circle cx="17" cy="18" r="4"/><path d="M10 36l10-11 7 7 5-5 7 9"/>`;
      break;
    default:
      body = `<rect x="8" y="8" width="32" height="32" rx="8"/><path d="M16 24h16M24 16v16"/>`;
  }

  return `<g transform="${transform}" ${common}>${body}</g>`;
};

export class Diagram {
  constructor({ title, description, width = 2400, height = 1450, background = palette.paper }) {
    this.title = title;
    this.description = description;
    this.width = width;
    this.height = height;
    this.background = background;
    this.backdropElements = [];
    this.connectorElements = [];
    this.nodeElements = [];
    this.labelElements = [];
  }

  shape({ id, x, y, width, height, shape = "rectangle", label, iconId, fontSize, align, metadata, parentId, fill = palette.white, stroke = palette.line, strokeWidth = 1.5, strokeStyle = "solid", textColor = palette.ink, opacity = 1 }) {
    const usesHeaderLabel = Boolean(label) && height > 120;
    const resolvedFontSize = fontSize ?? 14;
    const minimumWidth = label && !usesHeaderLabel
      ? clamp(widestWord(label, resolvedFontSize) + 24, iconId ? 52 : 24, 720)
      : iconId ? 52 : 24;
    const fittedWidth = Math.max(width, minimumWidth);
    const labelHeight = label && !usesHeaderLabel
      ? wrapTextLines(label, Math.max(20, fittedWidth - 24), resolvedFontSize).length * resolvedFontSize * 1.25
      : 0;
    const fittedHeight = Math.max(
      height,
      labelHeight + (iconId ? 22 : 0) + (labelHeight ? 24 : 0),
    );
    this.backdropElements.push({
      id,
      type: "shape",
      x,
      y,
      width: fittedWidth,
      height: fittedHeight,
      rotation: 0,
      style: style({ fill, stroke, strokeWidth, strokeStyle, opacity, textColor }),
      shape,
      ...(iconId ? { iconId } : {}),
      ...(label && !usesHeaderLabel ? { label } : {}),
      ...(label && !usesHeaderLabel && fontSize !== undefined ? { fontSize } : {}),
      ...(label && !usesHeaderLabel && align !== undefined ? { align } : {}),
      ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
      ...(parentId ? { parentId } : {}),
    });
    if (label && usesHeaderLabel) {
      this.text({
        id: `${id}-label`,
        x: x + 18,
        y: y + 12,
        width: fittedWidth - 36,
        text: label,
        fontSize: fontSize ?? 15,
        align: align ?? "left",
        color: textColor,
        weight: 700,
        parentId: id,
      });
    }
    return id;
  }

  text({ id, x, y, width, text, fontSize = 18, align = "left", color = palette.ink, weight = 600, parentId }) {
    const minimumWidth = clamp(widestWord(text, fontSize) + 4, 24, 760);
    const preferredWidth = clamp(widestExplicitLine(text, fontSize) + 4, minimumWidth, 760);
    const fittedWidth = Math.max(width ?? preferredWidth, minimumWidth);
    const height = Math.max(
      24,
      Math.ceil(wrapTextLines(text, fittedWidth, fontSize).length * fontSize * 1.28 + 4),
    );
    this.labelElements.push({
      id,
      type: "text",
      x,
      y,
      width: fittedWidth,
      height,
      rotation: 0,
      style: style({ stroke: "transparent", strokeWidth: 0, textColor: color }),
      text,
      fontSize,
      fontFamily: "sans",
      fontWeight: weight,
      align,
      ...(parentId ? { parentId } : {}),
    });
    return id;
  }

  system({ id, x, y, width, height = 94, iconId, title, subtitle, body, titleFontSize, bodyFontSize, align, metadata, parentId, accent = palette.blue, fill = palette.white, variant = "neutral" }) {
    const resolvedTitleFontSize = titleFontSize ?? 15;
    const resolvedBodyFontSize = bodyFontSize ?? 11;
    const subtitleFontSize = bodyFontSize === undefined
      ? 10
      : Math.max(1, bodyFontSize - 1);
    const titleLineHeight = Math.ceil(resolvedTitleFontSize * 1.2);
    const subtitleLineHeight = Math.ceil(subtitleFontSize * 1.4);
    const bodyLineHeight = Math.ceil(resolvedBodyFontSize * 1.36);
    const minimumTextWidth = Math.max(
      widestWord(title, resolvedTitleFontSize),
      widestWord(subtitle ?? "", subtitleFontSize, 0.62),
      widestWord(body ?? "", resolvedBodyFontSize),
    );
    const preferredTextWidth = Math.max(
      widestExplicitLine(title, resolvedTitleFontSize),
      widestExplicitLine(subtitle ?? "", subtitleFontSize, 0.62),
      widestExplicitLine(body ?? "", resolvedBodyFontSize),
    );
    const minimumWidth = clamp(94 + minimumTextWidth, 122, 640);
    const preferredWidth = clamp(94 + preferredTextWidth, minimumWidth, 640);
    const fittedWidth = Math.max(width ?? preferredWidth, minimumWidth);
    const textWidth = Math.max(28, fittedWidth - 94);
    const titleHeight = wrapTextLines(title, textWidth, resolvedTitleFontSize).length * titleLineHeight;
    const subtitleHeight = subtitle
      ? wrapTextLines(subtitle, textWidth, subtitleFontSize, 0.62).length * subtitleLineHeight
      : 0;
    const bodyHeight = body
      ? wrapTextLines(body, textWidth, resolvedBodyFontSize).length * bodyLineHeight
      : 0;
    const gaps = Number(Boolean(subtitle)) + Number(Boolean(body));
    const fittedHeight = Math.max(80, height, titleHeight + subtitleHeight + bodyHeight + gaps * 4 + 24);
    this.nodeElements.push({
      id,
      type: "system",
      x,
      y,
      width: fittedWidth,
      height: fittedHeight,
      rotation: 0,
      style: style({ fill, stroke: accent, strokeWidth: 2, textColor: palette.ink }),
      iconId,
      title,
      ...(subtitle ? { subtitle } : {}),
      ...(body ? { body } : {}),
      ...(titleFontSize !== undefined ? { titleFontSize } : {}),
      ...(bodyFontSize !== undefined ? { bodyFontSize } : {}),
      ...(align !== undefined ? { align } : {}),
      ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
      ...(parentId ? { parentId } : {}),
      variant,
    });
    return id;
  }

  connector({ id, points, label, labelFontSize, align, parentId, color = palette.blue, strokeWidth = 2.5, strokeStyle = "solid", startBinding, endBinding, startArrow = "none", endArrow = "arrow" }) {
    if (points.length < 2) throw new Error(`Connector ${id} needs at least two points`);
    const xs = points.map(({ x }) => x);
    const ys = points.map(({ y }) => y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    this.connectorElements.push({
      id,
      type: "connector",
      x,
      y,
      width,
      height,
      rotation: 0,
      style: style({ fill: "transparent", stroke: color, strokeWidth, strokeStyle, textColor: color }),
      points: points.map((point) => [point.x - x, point.y - y]),
      ...(label ? { label } : {}),
      ...(label && labelFontSize !== undefined ? { fontSize: labelFontSize } : {}),
      ...(label && align !== undefined ? { align } : {}),
      ...(startBinding ? { startBinding } : {}),
      ...(endBinding ? { endBinding } : {}),
      ...(parentId ? { parentId } : {}),
      startArrow,
      endArrow,
    });
    return id;
  }

  fitParentContainers() {
    const elements = [
      ...this.backdropElements,
      ...this.connectorElements,
      ...this.nodeElements,
      ...this.labelElements,
    ];
    for (let pass = 0; pass < elements.length; pass += 1) {
      let changed = false;
      for (const child of elements) {
        if (!child.parentId) continue;
        const parent = this.backdropElements.find(({ id }) => id === child.parentId);
        if (!parent) continue;
        const width = Math.max(
          parent.width,
          child.x + child.width + 24 - parent.x,
        );
        const height = Math.max(
          parent.height,
          child.y + child.height + 24 - parent.y,
        );
        if (width !== parent.width || height !== parent.height) changed = true;
        parent.width = width;
        parent.height = height;
      }
      if (!changed) break;
    }
  }

  scene({ camera = { x: 20, y: 20, zoom: 0.72 }, pattern = "dots", spacing = 24 } = {}) {
    this.fitParentContainers();
    return {
      elements: [
        ...this.backdropElements,
        ...this.connectorElements,
        ...this.nodeElements,
        ...this.labelElements,
      ],
      appState: {
        camera,
        background: {
          color: this.background,
          pattern,
          spacing,
        },
      },
      files: {},
    };
  }

  renderSvg() {
    this.fitParentContainers();
    const elements = [
      ...this.backdropElements,
      ...this.connectorElements,
      ...this.nodeElements,
      ...this.labelElements,
    ];
    const connectorColors = [...new Set(this.connectorElements.map(({ style: value }) => value.stroke))];
    const defs = connectorColors
      .map(
        (color) =>
          `<marker id="${markerId(color)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`,
      )
      .join("");
    const rendered = elements.map((element) => this.renderElement(element)).join("\n  ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(this.title)}</title>
  <desc id="description">${escapeXml(this.description)}</desc>
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#d8d3c8"/></pattern>
    ${defs}
  </defs>
  <rect width="100%" height="100%" fill="${this.background}"/>
  <rect width="100%" height="100%" fill="url(#dots)"/>
  ${rendered}
</svg>\n`;
  }

  renderElement(element) {
    if (element.type === "shape") {
      const { style: value } = element;
      const shape = element.shape === "ellipse"
        ? `<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${value.fill}" stroke="${value.stroke}" stroke-width="${value.strokeWidth}"${dashArray(value.strokeStyle)} opacity="${value.opacity}"/>`
        : element.shape === "diamond"
          ? `<path d="M ${element.x + element.width / 2} ${element.y} L ${element.x + element.width} ${element.y + element.height / 2} L ${element.x + element.width / 2} ${element.y + element.height} L ${element.x} ${element.y + element.height / 2} Z" fill="${value.fill}" stroke="${value.stroke}" stroke-width="${value.strokeWidth}"${dashArray(value.strokeStyle)} opacity="${value.opacity}"/>`
          : `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="18" fill="${value.fill}" stroke="${value.stroke}" stroke-width="${value.strokeWidth}"${dashArray(value.strokeStyle)} opacity="${value.opacity}"/>`;
      if (!element.label && !element.iconId) return shape;
      const fontSize = element.fontSize ?? 14;
      const labelLines = element.label
        ? wrapTextLines(element.label, Math.max(20, element.width - 24), fontSize)
        : [];
      const labelHeight = labelLines.length * fontSize * 1.25;
      const iconSize = element.iconId
        ? Math.max(12, Math.min(element.width <= 100 ? 16 : 28, element.width - 16))
        : 0;
      const stackHeight = iconSize + (iconSize ? 4 : 0) + labelHeight;
      const stackTop = element.y + Math.max(8, (element.height - stackHeight) / 2);
      const icon = element.iconId
        ? renderIcon(
            element.iconId,
            element.x + (element.width - iconSize) / 2,
            stackTop,
            iconSize,
            value.stroke,
          )
        : "";
      const label = element.label
        ? svgText({
            x: element.x + 12,
            y: stackTop + iconSize + (iconSize ? 4 : 0),
            width: element.width - 24,
            text: element.label,
            fontSize,
            color: value.textColor,
            align: element.align ?? "center",
            weight: 760,
            lineHeight: 1.25,
          })
        : "";
      return `${shape}${icon}${label}`;
    }

    if (element.type === "connector") {
      const absolute = element.points.map(([pointX, pointY]) => ({ x: element.x + pointX, y: element.y + pointY }));
      const path = absolute.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
      const middle = pathMidpoint(absolute);
      const labelX = middle.x;
      const labelY = middle.y - 15;
      const line = `<path d="${path}" fill="none" stroke="${element.style.stroke}" stroke-width="${element.style.strokeWidth}"${dashArray(element.style.strokeStyle)}${element.startArrow === "arrow" ? ` marker-start="url(#${markerId(element.style.stroke)})"` : ""}${element.endArrow === "arrow" ? ` marker-end="url(#${markerId(element.style.stroke)})"` : ""}/>`;
      if (!element.label) return line;
      const fontSize = element.fontSize ?? 12;
      const labelWidth = clamp(
        widestExplicitLine(element.label, fontSize, 0.62) + 20,
        90,
        320,
      );
      const labelLines = wrapTextLines(element.label, labelWidth - 16, fontSize, 0.62);
      const labelHeight = labelLines.length * fontSize * 1.25 + 8;
      return `${line}<rect x="${labelX - labelWidth / 2}" y="${labelY - 5}" width="${labelWidth}" height="${labelHeight}" rx="10" fill="${this.background}" opacity="0.96"/>${svgText({ x: labelX - labelWidth / 2 + 8, y: labelY - 2, width: labelWidth - 16, text: element.label, fontSize, color: element.style.textColor, align: element.align ?? "center", weight: 720, lineHeight: 1.25 })}`;
    }

    if (element.type === "system") {
      const { style: value } = element;
      const iconSize = Math.min(48, element.height - 32);
      const iconX = element.x + 18;
      const iconY = element.y + (element.height - iconSize) / 2;
      const titleX = iconX + iconSize + 16;
      const textWidth = element.width - (titleX - element.x) - 14;
      const titleFontSize = element.titleFontSize ?? 15;
      const bodyFontSize = element.bodyFontSize ?? 11;
      const subtitleFontSize = element.bodyFontSize === undefined ? 10 : Math.max(1, bodyFontSize - 1);
      const titleLineHeight = Math.ceil(titleFontSize * 1.2);
      const subtitleLineHeight = Math.ceil(subtitleFontSize * 1.4);
      const bodyLineHeight = element.bodyFontSize === undefined
        ? 15
        : Math.ceil(bodyFontSize * 1.36);
      const titleLines = wrapTextLines(element.title, textWidth, titleFontSize);
      const subtitleLines = element.subtitle ? wrapTextLines(element.subtitle, textWidth, subtitleFontSize, 0.62) : [];
      const bodyLines = element.body ? wrapTextLines(element.body, textWidth, bodyFontSize) : [];
      const naturalHeight = titleLines.length * titleLineHeight + subtitleLines.length * subtitleLineHeight + bodyLines.length * bodyLineHeight + Number(Boolean(element.subtitle)) * 4 + Number(Boolean(element.body)) * 4;
      let textY = element.y + Math.max(12, (element.height - naturalHeight) / 2);
      const titleMarkup = svgText({ x: titleX, y: textY, width: textWidth, text: element.title, fontSize: titleFontSize, color: value.textColor, align: element.align ?? "left", weight: 760, lineHeight: titleLineHeight / titleFontSize });
      textY += titleLines.length * titleLineHeight + 4;
      const subtitleMarkup = element.subtitle ? svgText({ x: titleX, y: textY, width: textWidth, text: element.subtitle, fontSize: subtitleFontSize, color: palette.muted, align: element.align ?? "left", weight: 560, lineHeight: subtitleLineHeight / subtitleFontSize }) : "";
      if (element.subtitle) textY += subtitleLines.length * subtitleLineHeight + 4;
      const bodyMarkup = element.body ? svgText({ x: titleX, y: textY, width: textWidth, text: element.body, fontSize: bodyFontSize, color: value.textColor, align: element.align ?? "left", weight: 520, lineHeight: element.bodyFontSize === undefined ? 1.36 : bodyLineHeight / bodyFontSize }) : "";
      return `<g><title>${escapeXml(element.title)}</title><rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="16" fill="${value.fill}" stroke="${value.stroke}" stroke-width="${value.strokeWidth}"/><rect x="${element.x}" y="${element.y}" width="7" height="${element.height}" rx="3.5" fill="${value.stroke}"/>${renderIcon(element.iconId, iconX, iconY, iconSize, value.stroke)}${titleMarkup}${subtitleMarkup}${bodyMarkup}</g>`;
    }

    if (element.type === "text") {
      return svgText({ x: element.x, y: element.y, width: element.width, text: element.text, fontSize: element.fontSize, color: element.style.textColor, align: element.align, weight: element.fontWeight });
    }

    return "";
  }
}

const constantName = (templateId) =>
  `${templateId.replaceAll(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_TEMPLATE`;

export async function writeTemplateArtifacts({
  diagram,
  templateId,
  templateName,
  templateDescription,
  boardId,
  boardName,
  exampleFilename,
  moduleFilename,
  svgPath,
  pngPath,
  camera,
  lockElements = true,
}) {
  const unlockedScene = diagram.scene({ camera });
  const scene = {
    ...unlockedScene,
    // Finished reference diagrams stay locked by default. A teaching board can
    // opt into immediate editing when selection and rewriting are part of its
    // learning goal.
    elements: unlockedScene.elements.map((element) => ({
      ...element,
      locked: lockElements,
    })),
  };
  const template = {
    id: templateId,
    name: templateName,
    description: templateDescription,
    scene,
  };
  const document = {
    schemaVersion: 2,
    id: boardId,
    name: boardName,
    revision: 0,
    createdAt: GENERATED_AT,
    updatedAt: GENERATED_AT,
    scene,
  };
  const generatedDirectory = resolve(projectDirectory, "server", "generated");
  const examplesDirectory = resolve(projectDirectory, "examples");
  const svg = diagram.renderSvg();
  await Promise.all([
    mkdir(generatedDirectory, { recursive: true }),
    mkdir(examplesDirectory, { recursive: true }),
    mkdir(dirname(svgPath), { recursive: true }),
    mkdir(dirname(pngPath), { recursive: true }),
    mkdir(fontCacheDirectory, { recursive: true }),
  ]);
  const module = `// Generated by scripts. Do not edit by hand.\nimport type { TemplateDefinition } from "../../shared/contracts.js";\n\nexport const ${constantName(templateId)}: TemplateDefinition = ${JSON.stringify(template, null, 2)};\n`;
  await Promise.all([
    writeFile(resolve(generatedDirectory, moduleFilename), module, "utf8"),
    writeFile(resolve(examplesDirectory, exampleFilename), `${JSON.stringify(document, null, 2)}\n`, "utf8"),
    writeFile(svgPath, svg, "utf8"),
    sharp(Buffer.from(svg))
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(pngPath),
  ]);
  return { template, document };
}
