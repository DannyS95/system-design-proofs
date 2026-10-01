import { styleDistributedCacheText } from "./distributed-cache-typography.mjs";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CANVAS_PALETTE as palette, LAYOUT_STANDARD } from "../shared/layout-standard.ts";
import { layoutGeneratedScene } from "../shared/generated-layout.ts";
import { expandSceneForCaptions } from "../shared/capacity-layout.ts";
import { applyCapacityAnnotations, appendCapacityWorkloads } from "./capacity-annotations.mjs";
import { validateBoardLayout } from "../shared/layout-validator.ts";
import { minimumTextHeight, preferredTextWidth } from "../src/editor/text-layout.ts";
import { renderSceneSvg } from "./render-scene.tsx";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectDirectory = resolve(scriptDirectory, "..");
export const repositoryDirectory = resolve(projectDirectory, "..");

const fontCacheDirectory = resolve(tmpdir(), "system-canvas-font-cache");
process.env.XDG_CACHE_HOME ||= fontCacheDirectory;

export const GENERATED_AT = "2026-09-02T00:00:00.000Z";

export { CANVAS_PALETTE as palette } from "../shared/layout-standard.ts";

const style = (overrides = {}) => ({
  fill: "transparent",
  stroke: palette.ink,
  strokeWidth: 1.5,
  strokeStyle: "solid",
  opacity: 1,
  textColor: palette.ink,
  ...overrides,
});

// Authored dimensions express topology, including exact mechanism geometry.
// Missing dimensions use the same measurements as the editor; scene() performs
// the final content sizing, container compaction, and connector routing.
const withLayoutHints = (element, { width, height }) => {
  const result = {
    ...element,
    width: width ?? LAYOUT_STANDARD.spacing.connector,
    height: height ?? LAYOUT_STANDARD.spacing.connector,
  };
  if (width === undefined) result.width = Math.ceil(preferredTextWidth(result));
  if (height === undefined) result.height = Math.ceil(minimumTextHeight(result));
  return result;
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

  shape({ id, x, y, width, height, layoutRole, containerPadding, layoutGroup, referenceId, shape = "rectangle", label, iconId, fontSize, align, metadata, parentId, fill = palette.white, stroke = palette.line, strokeWidth = 1.5, strokeStyle = "solid", textColor = palette.ink, opacity = 1 }) {
    const usesHeaderLabel = Boolean(label) && layoutRole === "container";
    const element = withLayoutHints({
      id,
      type: "shape",
      x,
      y,
      rotation: 0,
      ...(layoutGroup ? { layoutGroup } : {}),
      style: style({ fill, stroke, strokeWidth, strokeStyle, opacity, textColor }),
      shape,
      ...(layoutRole ? { layoutRole } : {}),
      ...(containerPadding !== undefined ? { containerPadding } : {}),
      ...(referenceId ? { referenceId } : {}),
      ...(iconId ? { iconId } : {}),
      ...(label && !usesHeaderLabel ? { label } : {}),
      ...(label && !usesHeaderLabel ? { fontSize: fontSize ?? LAYOUT_STANDARD.labelFontSize } : {}),
      ...(label && !usesHeaderLabel && align !== undefined ? { align } : {}),
      ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
      ...(parentId ? { parentId } : {}),
    }, { width, height });
    this.backdropElements.push(element);
    if (label && usesHeaderLabel) {
      this.text({
        id: `${id}-label`,
        x: x + LAYOUT_STANDARD.cardPadding,
        y: y + LAYOUT_STANDARD.spacing.compact,
        width: element.width - LAYOUT_STANDARD.cardPadding * 2,
        text: label,
        fontSize: fontSize ?? LAYOUT_STANDARD.titleFontSize,
        align: align ?? "left",
        color: textColor,
        weight: 700,
        parentId: id,
      });
    }
    return id;
  }

  text({ id, x, y, width, height, layoutGroup, text, fontSize = LAYOUT_STANDARD.titleFontSize, align = "left", color = palette.ink, weight = 600, parentId }) {
    this.labelElements.push(withLayoutHints({
      id,
      type: "text",
      x,
      y,
      rotation: 0,
      ...(layoutGroup ? { layoutGroup } : {}),
      style: style({ stroke: "transparent", strokeWidth: 0, textColor: color }),
      text,
      fontSize,
      fontFamily: "sans",
      fontWeight: weight,
      align,
      ...(parentId ? { parentId } : {}),
    }, { width, height }));
    return id;
  }

  system({ id, x, y, width, height, layoutGroup, iconId, title, subtitle, body, titleFontSize = LAYOUT_STANDARD.titleFontSize, bodyFontSize = LAYOUT_STANDARD.bodyFontSize, align, metadata, parentId, accent = palette.blue, fill = palette.white, variant = "neutral" }) {
    this.nodeElements.push(withLayoutHints({
      id,
      type: "system",
      x,
      y,
      rotation: 0,
      ...(layoutGroup ? { layoutGroup } : {}),
      style: style({ fill, stroke: accent, strokeWidth: 2, textColor: palette.ink }),
      iconId,
      title,
      ...(subtitle ? { subtitle } : {}),
      ...(body ? { body } : {}),
      titleFontSize,
      bodyFontSize,
      ...(align !== undefined ? { align } : {}),
      ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
      ...(parentId ? { parentId } : {}),
      variant,
    }, { width, height }));
    return id;
  }

  connector({ id, points, layoutGroup, label, labelFontSize = LAYOUT_STANDARD.labelFontSize, align, parentId, color = palette.blue, strokeWidth = 2.5, strokeStyle = "solid", startBinding, endBinding, startArrow = "none", endArrow = "arrow" }) {
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
      ...(layoutGroup ? { layoutGroup } : {}),
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

  /** Unresolved authoring hints for helpers that still need to add topology. */
  rawScene({ camera = { x: 20, y: 20, zoom: 0.72 }, pattern = "dots", spacing = LAYOUT_STANDARD.spacing.connector } = {}) {
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

  scene(options = {}) {
    return layoutGeneratedScene(this.rawScene(options), options.layoutSpacing);
  }

  renderSvg(scene = this.scene()) {
    return renderSceneSvg(scene, this.title, this.description);
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
  const preserveRoutes = ["kv-store", "cdn"].includes(templateId);
  const baseline = preserveRoutes ? diagram.scene({ camera }) : undefined;
  applyCapacityAnnotations(diagram, templateId);
  if (templateId === "distributed-cache") {
    styleDistributedCacheText([...diagram.nodeElements, ...diagram.labelElements,
      ...diagram.backdropElements, ...diagram.connectorElements]);
  }
  const unlockedScene = baseline
    ? expandSceneForCaptions(baseline, diagram.rawScene({ camera }))
    : diagram.scene({ camera });
  appendCapacityWorkloads(unlockedScene, templateId);
  const issues = validateBoardLayout(unlockedScene);
  if (issues.length) throw new Error(`Invalid ${templateId} layout: ${JSON.stringify(issues)}`);
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
  const svg = diagram.renderSvg(scene);
  await Promise.all([
    mkdir(generatedDirectory, { recursive: true }),
    mkdir(examplesDirectory, { recursive: true }),
    mkdir(dirname(svgPath), { recursive: true }),
    mkdir(dirname(pngPath), { recursive: true }),
    mkdir(fontCacheDirectory, { recursive: true }),
  ]);
  const module = `// Generated by scripts. Do not edit by hand.\nimport type { TemplateDefinition } from "../../shared/contracts.js";\n\nexport const ${constantName(templateId)}: TemplateDefinition = ${JSON.stringify(template, null, 2)};\n`;
  // Produce every artifact before publishing any of them. Same-directory
  // renames keep readers from observing truncated JSON, SVG, or PNG files.
  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const artifacts = [
    [resolve(generatedDirectory, moduleFilename), module],
    [resolve(examplesDirectory, exampleFilename), `${JSON.stringify(document, null, 2)}\n`],
    [svgPath, svg],
    [pngPath, png],
  ].map(([path, content]) => ({ path, content, stagedPath: `${path}.${randomUUID()}.tmp` }));
  try {
    // All staging operations must settle before cleanup, even if one fails.
    const staged = await Promise.allSettled(artifacts.map(({ stagedPath, content }) =>
      writeFile(stagedPath, content)));
    const failure = staged.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    for (const { path, stagedPath } of artifacts) await rename(stagedPath, path);
  } finally {
    await Promise.allSettled(artifacts.map(({ stagedPath }) => rm(stagedPath, { force: true })));
  }
  return { template, document };
}
