import {
  BOARD_SCHEMA_VERSION,
  CANVAS_BACKGROUND_PATTERNS,
  CANVAS_IMAGE_MIME_TYPES,
  LEGACY_BOARD_SCHEMA_VERSION,
  SYSTEM_NODE_VARIANTS,
  type BoardDocument,
  type BoardScene,
  type CanvasAppState,
  type CanvasArrowhead,
  type CanvasBaseElement,
  type CanvasConnectorElement,
  type CanvasElement,
  type CanvasElementStyle,
  type CanvasElementMetadata,
  type CanvasFile,
  type CanvasFontFamily,
  type CanvasFontWeight,
  type CanvasImageElement,
  type CanvasImageMimeType,
  type CanvasPoint,
  type CanvasShapeElement,
  type CanvasStrokeStyle,
  type CanvasSystemElement,
  type CanvasTextAlign,
  type CanvasTextElement,
  type CreateBoardInput,
  type SaveBoardInput,
  type SystemNodeVariant,
  type TemplateDefinition,
} from "./contracts.js";

export const BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_BOARD_NAME_LENGTH = 80;
export const MAX_TEMPLATE_DESCRIPTION_LENGTH = 240;
export const MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024;

const MAX_JSON_DEPTH = 100;
const MAX_JSON_VALUES = 100_000;
const MAX_ELEMENT_ID_LENGTH = 128;
const MAX_ELEMENT_TEXT_LENGTH = 20_000;
const MAX_FILE_NAME_LENGTH = 240;
const MAX_DATA_URL_LENGTH = Math.ceil((MAX_EMBEDDED_IMAGE_BYTES * 4) / 3) + 128;
const COLOR_PATTERN = /^(?:transparent|#[\da-fA-F]{3}|#[\da-fA-F]{4}|#[\da-fA-F]{6}|#[\da-fA-F]{8})$/;
const ICON_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type BoardId = string & { readonly __boardId: unique symbol };

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ContractValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join("; "));
    this.name = "ContractValidationError";
    this.issues = issues;
  }
}

function fail(path: string, message: string): never {
  throw new ContractValidationError([{ path, message }]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    return fail(path, "must be an object");
  }
  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
): void {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    fail(path, `contains unexpected field '${unexpected}'`);
  }
}

function parseString(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string {
  if (typeof value !== "string") {
    return fail(path, "must be a string");
  }
  if (!options.allowEmpty && value.length === 0) {
    return fail(path, "must not be empty");
  }
  if (value.length > (options.maxLength ?? MAX_ELEMENT_TEXT_LENGTH)) {
    return fail(path, `must be at most ${options.maxLength ?? MAX_ELEMENT_TEXT_LENGTH} characters`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string | undefined {
  return value === undefined ? undefined : parseString(value, path, options);
}

function parseFiniteNumber(
  value: unknown,
  path: string,
  options: { min?: number; max?: number } = {},
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "must be a finite number");
  }
  if (options.min !== undefined && value < options.min) {
    return fail(path, `must be at least ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    return fail(path, `must be at most ${options.max}`);
  }
  return value;
}

function parseOptionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    return fail(path, "must be a boolean");
  }
  return value;
}

function parseEnum<T extends string | number>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !values.includes(value as T)
  ) {
    return fail(path, `must be one of ${values.join(", ")}`);
  }
  return value as T;
}

function parseColor(
  value: unknown,
  path: string,
  options: { allowTransparent?: boolean } = {},
): string {
  if (
    typeof value !== "string" ||
    !COLOR_PATTERN.test(value) ||
    (!options.allowTransparent && value === "transparent")
  ) {
    return fail(
      path,
      options.allowTransparent
        ? "must be a hexadecimal color or transparent"
        : "must be a hexadecimal color",
    );
  }
  return value.toLowerCase();
}

function parseName(value: unknown, path = "name"): string {
  if (typeof value !== "string") {
    return fail(path, "must be a string");
  }

  const name = value.trim();
  if (name.length === 0) {
    return fail(path, "must not be empty");
  }
  if (name.length > MAX_BOARD_NAME_LENGTH) {
    return fail(path, `must be at most ${MAX_BOARD_NAME_LENGTH} characters`);
  }
  return name;
}

function parseDescription(value: unknown, path: string): string {
  if (typeof value !== "string") {
    return fail(path, "must be a string");
  }

  const description = value.trim();
  if (description.length === 0) {
    return fail(path, "must not be empty");
  }
  if (description.length > MAX_TEMPLATE_DESCRIPTION_LENGTH) {
    return fail(
      path,
      `must be at most ${MAX_TEMPLATE_DESCRIPTION_LENGTH} characters`,
    );
  }
  return description;
}

function parseRevision(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    return fail(path, "must be a non-negative integer");
  }
  return value as number;
}

function parseTimestamp(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return fail(path, "must be an ISO-8601 UTC timestamp");
  }

  const canonical = new Date(value).toISOString();
  const normalizedInput = value.includes(".")
    ? value
    : value.replace("Z", ".000Z");
  if (canonical !== normalizedInput) {
    return fail(path, "must be a real calendar timestamp");
  }
  return canonical;
}

function assertJsonValue(value: unknown, path: string): void {
  let valueCount = 0;
  const ancestors = new WeakSet<object>();

  const visit = (candidate: unknown, candidatePath: string, depth: number): void => {
    valueCount += 1;
    if (valueCount > MAX_JSON_VALUES) {
      fail(path, `must contain at most ${MAX_JSON_VALUES} JSON values`);
    }
    if (depth > MAX_JSON_DEPTH) {
      fail(candidatePath, `must not exceed ${MAX_JSON_DEPTH} levels`);
    }

    if (
      candidate === null ||
      typeof candidate === "string" ||
      typeof candidate === "boolean"
    ) {
      return;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) {
        fail(candidatePath, "must be a finite JSON number");
      }
      return;
    }
    if (typeof candidate !== "object") {
      fail(candidatePath, "must contain JSON-compatible values only");
    }
    if (ancestors.has(candidate)) {
      fail(candidatePath, "must not contain circular references");
    }

    ancestors.add(candidate);
    if (Array.isArray(candidate)) {
      candidate.forEach((entry, index) =>
        visit(entry, `${candidatePath}[${index}]`, depth + 1),
      );
    } else if (isRecord(candidate)) {
      for (const [key, entry] of Object.entries(candidate)) {
        visit(entry, `${candidatePath}.${key}`, depth + 1);
      }
    } else {
      fail(candidatePath, "must contain plain objects and arrays only");
    }
    ancestors.delete(candidate);
  };

  visit(value, path, 0);
}

export function parseBoardId(value: unknown, path = "boardId"): BoardId {
  if (typeof value !== "string" || !BOARD_ID_PATTERN.test(value)) {
    return fail(path, "must match ^[a-z0-9][a-z0-9-]{0,63}$");
  }
  return value as BoardId;
}

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === "string" && BOARD_ID_PATTERN.test(value);
}

function parseElementId(value: unknown, path: string): string {
  const id = parseString(value, path, { maxLength: MAX_ELEMENT_ID_LENGTH });
  if (/\p{Cc}/u.test(id)) {
    return fail(path, "must not contain control characters");
  }
  return id;
}

function parseElementStyle(value: unknown, path: string): CanvasElementStyle {
  const style = parseRecord(value, path);
  rejectUnknownKeys(
    style,
    ["fill", "stroke", "strokeWidth", "strokeStyle", "opacity", "textColor"],
    path,
  );
  return {
    fill: parseColor(style.fill, `${path}.fill`, { allowTransparent: true }),
    stroke: parseColor(style.stroke, `${path}.stroke`, { allowTransparent: true }),
    strokeWidth: parseFiniteNumber(style.strokeWidth, `${path}.strokeWidth`, {
      min: 0,
      max: 64,
    }),
    strokeStyle: parseEnum(
      style.strokeStyle,
      ["solid", "dashed", "dotted"] as const,
      `${path}.strokeStyle`,
    ),
    opacity: parseFiniteNumber(style.opacity, `${path}.opacity`, { min: 0, max: 1 }),
    textColor: parseColor(style.textColor, `${path}.textColor`, {
      allowTransparent: true,
    }),
  };
}

type ParsedBaseElement = Omit<CanvasBaseElement, "type">;

const ELEMENT_METADATA_KEYS = [
  "runtimeLocation",
  "layer",
  "sourcePath",
  "packageName",
  "objectType",
  "inputs",
  "outputs",
  "ownership",
  "explanation",
] as const;

function parseElementMetadata(
  value: unknown,
  path: string,
): CanvasElementMetadata | undefined {
  if (value === undefined) return undefined;
  const metadata = parseRecord(value, path);
  rejectUnknownKeys(metadata, ELEMENT_METADATA_KEYS, path);
  const result: CanvasElementMetadata = {};
  for (const key of ELEMENT_METADATA_KEYS) {
    const parsed = parseOptionalString(metadata[key], `${path}.${key}`, {
      allowEmpty: true,
      maxLength: 4_000,
    });
    if (parsed !== undefined) result[key] = parsed;
  }
  return result;
}

const BASE_ELEMENT_KEYS = [
  "id",
  "type",
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "style",
  "locked",
  "deleted",
  "metadata",
] as const;

function parseBaseElement(
  element: Record<string, unknown>,
  path: string,
): ParsedBaseElement {
  const base: ParsedBaseElement = {
    id: parseElementId(element.id, `${path}.id`),
    x: parseFiniteNumber(element.x, `${path}.x`),
    y: parseFiniteNumber(element.y, `${path}.y`),
    width: parseFiniteNumber(element.width, `${path}.width`, { min: 0 }),
    height: parseFiniteNumber(element.height, `${path}.height`, { min: 0 }),
    rotation: parseFiniteNumber(element.rotation, `${path}.rotation`),
    style: parseElementStyle(element.style, `${path}.style`),
  };
  const locked = parseOptionalBoolean(element.locked, `${path}.locked`);
  const deleted = parseOptionalBoolean(element.deleted, `${path}.deleted`);
  if (locked !== undefined) {
    base.locked = locked;
  }
  if (deleted !== undefined) {
    base.deleted = deleted;
  }
  const metadata = parseElementMetadata(element.metadata, `${path}.metadata`);
  if (metadata !== undefined) {
    base.metadata = metadata;
  }
  return base;
}

function parseCanvasElement(value: unknown, path: string): CanvasElement {
  const element = parseRecord(value, path);
  const type = element.type;
  if (typeof type !== "string") {
    return fail(`${path}.type`, "must be a string");
  }
  const base = parseBaseElement(element, path);

  if (type === "system") {
    rejectUnknownKeys(
      element,
      [
        ...BASE_ELEMENT_KEYS,
        "iconId",
        "title",
        "subtitle",
        "body",
        "titleFontSize",
        "bodyFontSize",
        "align",
        "variant",
      ],
      path,
    );
    const iconId = parseString(element.iconId, `${path}.iconId`, { maxLength: 64 });
    if (!ICON_ID_PATTERN.test(iconId)) {
      fail(`${path}.iconId`, "must use lowercase letters, digits, and hyphens");
    }
    const result: CanvasSystemElement = {
      ...base,
      type,
      iconId,
      title: parseString(element.title, `${path}.title`),
      variant: parseEnum(
        element.variant,
        SYSTEM_NODE_VARIANTS,
        `${path}.variant`,
      ) as SystemNodeVariant,
    };
    const subtitle = parseOptionalString(element.subtitle, `${path}.subtitle`, {
      allowEmpty: true,
    });
    if (subtitle !== undefined) {
      result.subtitle = subtitle;
    }
    const body = parseOptionalString(element.body, `${path}.body`, {
      allowEmpty: true,
    });
    if (body !== undefined) {
      result.body = body;
    }
    for (const key of ["titleFontSize", "bodyFontSize"] as const) {
      if (element[key] !== undefined) {
        result[key] = parseFiniteNumber(element[key], `${path}.${key}`, {
          min: 1,
          max: 512,
        });
      }
    }
    if (element.align !== undefined) {
      result.align = parseEnum(
        element.align,
        ["left", "center", "right"] as const,
        `${path}.align`,
      ) as CanvasTextAlign;
    }
    return result;
  }

  if (type === "shape") {
    rejectUnknownKeys(
      element,
      [...BASE_ELEMENT_KEYS, "shape", "label", "fontSize", "align"],
      path,
    );
    const result: CanvasShapeElement = {
      ...base,
      type,
      shape: parseEnum(
        element.shape,
        ["rectangle", "ellipse", "diamond"] as const,
        `${path}.shape`,
      ),
    };
    const label = parseOptionalString(element.label, `${path}.label`, {
      allowEmpty: true,
    });
    const fontSize =
      element.fontSize === undefined
        ? undefined
        : parseFiniteNumber(element.fontSize, `${path}.fontSize`, { min: 1, max: 512 });
    if (label !== undefined) {
      result.label = label;
    }
    if (fontSize !== undefined) {
      result.fontSize = fontSize;
    }
    if (element.align !== undefined) {
      result.align = parseEnum(
        element.align,
        ["left", "center", "right"] as const,
        `${path}.align`,
      ) as CanvasTextAlign;
    }
    return result;
  }

  if (type === "text") {
    rejectUnknownKeys(
      element,
      [...BASE_ELEMENT_KEYS, "text", "fontSize", "fontFamily", "fontWeight", "align"],
      path,
    );
    return {
      ...base,
      type,
      text: parseString(element.text, `${path}.text`, { allowEmpty: true }),
      fontSize: parseFiniteNumber(element.fontSize, `${path}.fontSize`, {
        min: 1,
        max: 512,
      }),
      fontFamily: parseEnum(
        element.fontFamily,
        ["sans", "mono"] as const,
        `${path}.fontFamily`,
      ) as CanvasFontFamily,
      fontWeight: parseEnum(
        element.fontWeight,
        [400, 500, 600, 700] as const,
        `${path}.fontWeight`,
      ) as CanvasFontWeight,
      align: parseEnum(
        element.align,
        ["left", "center", "right"] as const,
        `${path}.align`,
      ) as CanvasTextAlign,
    } satisfies CanvasTextElement;
  }

  if (type === "connector") {
    rejectUnknownKeys(
      element,
      [
        ...BASE_ELEMENT_KEYS,
        "points",
        "startArrow",
        "endArrow",
        "label",
        "fontSize",
        "align",
        "startBinding",
        "endBinding",
      ],
      path,
    );
    if (!Array.isArray(element.points) || element.points.length < 2) {
      return fail(`${path}.points`, "must contain at least two points");
    }
    const points = element.points.map((value, index): CanvasPoint => {
      if (!Array.isArray(value) || value.length !== 2) {
        return fail(`${path}.points[${index}]`, "must be a [x, y] pair");
      }
      return [
        parseFiniteNumber(value[0], `${path}.points[${index}][0]`),
        parseFiniteNumber(value[1], `${path}.points[${index}][1]`),
      ];
    });
    const result: CanvasConnectorElement = {
      ...base,
      type,
      points,
      startArrow: parseEnum(
        element.startArrow,
        ["none", "arrow"] as const,
        `${path}.startArrow`,
      ) as CanvasArrowhead,
      endArrow: parseEnum(
        element.endArrow,
        ["none", "arrow"] as const,
        `${path}.endArrow`,
      ) as CanvasArrowhead,
    };
    for (const key of ["label", "startBinding", "endBinding"] as const) {
      const parsed = parseOptionalString(element[key], `${path}.${key}`, {
        allowEmpty: key === "label",
        maxLength: key === "label" ? MAX_ELEMENT_TEXT_LENGTH : MAX_ELEMENT_ID_LENGTH,
      });
      if (parsed !== undefined) {
        result[key] = parsed;
      }
    }
    if (element.fontSize !== undefined) {
      result.fontSize = parseFiniteNumber(
        element.fontSize,
        `${path}.fontSize`,
        { min: 1, max: 512 },
      );
    }
    if (element.align !== undefined) {
      result.align = parseEnum(
        element.align,
        ["left", "center", "right"] as const,
        `${path}.align`,
      ) as CanvasTextAlign;
    }
    return result;
  }

  if (type === "image") {
    rejectUnknownKeys(element, [...BASE_ELEMENT_KEYS, "fileId", "alt"], path);
    const result: CanvasImageElement = {
      ...base,
      type,
      fileId: parseElementId(element.fileId, `${path}.fileId`),
    };
    const alt = parseOptionalString(element.alt, `${path}.alt`, { allowEmpty: true });
    if (alt !== undefined) {
      result.alt = alt;
    }
    return result;
  }

  return fail(`${path}.type`, `unsupported canvas element type '${type}'`);
}

function parseCanvasAppState(value: unknown, path: string): CanvasAppState {
  const appState = parseRecord(value, path);
  rejectUnknownKeys(appState, ["camera", "background"], path);

  const camera = parseRecord(appState.camera, `${path}.camera`);
  rejectUnknownKeys(camera, ["x", "y", "zoom"], `${path}.camera`);

  const background = parseRecord(appState.background, `${path}.background`);
  rejectUnknownKeys(
    background,
    ["color", "pattern", "spacing"],
    `${path}.background`,
  );

  return {
    camera: {
      x: parseFiniteNumber(camera.x, `${path}.camera.x`),
      y: parseFiniteNumber(camera.y, `${path}.camera.y`),
      zoom: parseFiniteNumber(camera.zoom, `${path}.camera.zoom`, {
        min: 0.02,
        max: 32,
      }),
    },
    background: {
      color: parseColor(background.color, `${path}.background.color`, {
        allowTransparent: false,
      }),
      pattern: parseEnum(
        background.pattern,
        CANVAS_BACKGROUND_PATTERNS,
        `${path}.background.pattern`,
      ),
      spacing: parseFiniteNumber(background.spacing, `${path}.background.spacing`, {
        min: 4,
        max: 512,
      }),
    },
  };
}

function decodedBase64Size(payload: string): number {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function parseCanvasFile(
  value: unknown,
  key: string,
  path: string,
): CanvasFile {
  const file = parseRecord(value, path);
  rejectUnknownKeys(
    file,
    ["id", "mimeType", "dataURL", "name", "width", "height", "createdAt"],
    path,
  );
  const id = parseElementId(file.id, `${path}.id`);
  if (id !== key) {
    fail(`${path}.id`, `must match file map key '${key}'`);
  }
  const mimeType = parseEnum(
    file.mimeType,
    CANVAS_IMAGE_MIME_TYPES,
    `${path}.mimeType`,
  ) as CanvasImageMimeType;
  const dataURL = parseString(file.dataURL, `${path}.dataURL`, {
    maxLength: MAX_DATA_URL_LENGTH,
  });
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataURL);
  if (!match || match[1] !== mimeType || match[2].length % 4 !== 0) {
    fail(`${path}.dataURL`, `must be a base64 ${mimeType} data URL`);
  }
  if (decodedBase64Size(match[2]) > MAX_EMBEDDED_IMAGE_BYTES) {
    fail(
      `${path}.dataURL`,
      `must encode at most ${MAX_EMBEDDED_IMAGE_BYTES} bytes`,
    );
  }

  const result: CanvasFile = { id, mimeType, dataURL };
  const name = parseOptionalString(file.name, `${path}.name`, {
    allowEmpty: false,
    maxLength: MAX_FILE_NAME_LENGTH,
  });
  if (name !== undefined) {
    result.name = name;
  }
  for (const dimension of ["width", "height"] as const) {
    if (file[dimension] !== undefined) {
      result[dimension] = parseFiniteNumber(
        file[dimension],
        `${path}.${dimension}`,
        { min: 1 },
      );
    }
  }
  if (file.createdAt !== undefined) {
    result.createdAt = parseTimestamp(file.createdAt, `${path}.createdAt`);
  }
  return result;
}

export function parseBoardScene(value: unknown, path = "scene"): BoardScene {
  const scene = parseRecord(value, path);
  rejectUnknownKeys(scene, ["elements", "appState", "files"], path);
  assertJsonValue(scene, path);

  if (!Array.isArray(scene.elements)) {
    return fail(`${path}.elements`, "must be an array");
  }
  const elements = scene.elements.map((element, index) =>
    parseCanvasElement(element, `${path}.elements[${index}]`),
  );
  const elementIds = new Set<string>();
  elements.forEach((element, index) => {
    if (elementIds.has(element.id)) {
      fail(`${path}.elements[${index}].id`, `duplicates element id '${element.id}'`);
    }
    elementIds.add(element.id);
  });

  const rawFiles = parseRecord(scene.files, `${path}.files`);
  const files: Record<string, CanvasFile> = {};
  for (const [key, file] of Object.entries(rawFiles)) {
    files[key] = parseCanvasFile(file, key, `${path}.files.${key}`);
  }

  elements.forEach((element, index) => {
    if (element.type === "image" && files[element.fileId] === undefined) {
      fail(
        `${path}.elements[${index}].fileId`,
        `references missing file '${element.fileId}'`,
      );
    }
    if (element.type === "connector") {
      for (const binding of ["startBinding", "endBinding"] as const) {
        const target = element[binding];
        if (target !== undefined && !elementIds.has(target)) {
          fail(
            `${path}.elements[${index}].${binding}`,
            `references missing element '${target}'`,
          );
        }
      }
    }
  });

  return {
    elements,
    appState: parseCanvasAppState(scene.appState, `${path}.appState`),
    files,
  };
}

function legacyNumber(value: unknown, fallback: number, path: string): number {
  return value === undefined ? fallback : parseFiniteNumber(value, path);
}

function legacyString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function legacyColor(value: unknown, fallback: string): string {
  return typeof value === "string" && COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : fallback;
}

function migrateLegacyStyle(
  element: Record<string, unknown>,
  type: string,
  path: string,
): CanvasElementStyle {
  const strokeStyle = ["solid", "dashed", "dotted"].includes(
    legacyString(element.strokeStyle, "solid"),
  )
    ? (legacyString(element.strokeStyle, "solid") as CanvasStrokeStyle)
    : "solid";
  const legacyOpacity = legacyNumber(element.opacity, 100, `${path}.opacity`);
  return {
    fill: legacyColor(element.backgroundColor, "transparent"),
    stroke: legacyColor(element.strokeColor, "#334155"),
    strokeWidth: Math.max(
      0,
      Math.min(64, legacyNumber(element.strokeWidth, 1.5, `${path}.strokeWidth`)),
    ),
    strokeStyle,
    opacity: Math.max(0, Math.min(1, legacyOpacity / 100)),
    textColor:
      type === "text"
        ? legacyColor(element.strokeColor, "#0f172a")
        : "#0f172a",
  };
}

function migrateLegacyBase(
  element: Record<string, unknown>,
  type: string,
  path: string,
  defaultWidth: number,
  defaultHeight: number,
): ParsedBaseElement {
  const base: ParsedBaseElement = {
    id: parseElementId(element.id, `${path}.id`),
    x: legacyNumber(element.x, 0, `${path}.x`),
    y: legacyNumber(element.y, 0, `${path}.y`),
    width: Math.abs(legacyNumber(element.width, defaultWidth, `${path}.width`)),
    height: Math.abs(legacyNumber(element.height, defaultHeight, `${path}.height`)),
    rotation: legacyNumber(element.angle, 0, `${path}.angle`),
    style: migrateLegacyStyle(element, type, path),
  };
  if (typeof element.locked === "boolean") {
    base.locked = element.locked;
  }
  if (typeof element.isDeleted === "boolean") {
    base.deleted = element.isDeleted;
  }
  return base;
}

function legacyBinding(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.elementId !== "string") {
    return undefined;
  }
  return value.elementId;
}

function migrateLegacyPoints(
  value: unknown,
  width: number,
  height: number,
  path: string,
): CanvasPoint[] {
  if (value === undefined) {
    return [[0, 0], [width, height]];
  }
  if (!Array.isArray(value) || value.length < 2) {
    return fail(path, "must contain at least two legacy points");
  }
  return value.map((point, index): CanvasPoint => {
    if (!Array.isArray(point) || point.length !== 2) {
      return fail(`${path}[${index}]`, "must be a [x, y] pair");
    }
    return [
      parseFiniteNumber(point[0], `${path}[${index}][0]`),
      parseFiniteNumber(point[1], `${path}[${index}][1]`),
    ];
  });
}

function migrateLegacyElement(value: unknown, path: string): CanvasElement {
  const element = parseRecord(value, path);
  const type = element.type;
  const id = typeof element.id === "string" ? element.id : "<missing>";
  if (typeof type !== "string") {
    return fail(`${path}.type`, `unsupported legacy element type '<missing>' (id '${id}')`);
  }

  if (type === "rectangle" || type === "ellipse" || type === "diamond") {
    return {
      ...migrateLegacyBase(element, type, path, 160, 80),
      type: "shape",
      shape: type,
    };
  }

  if (type === "text") {
    const text =
      typeof element.text === "string"
        ? element.text
        : typeof element.originalText === "string"
          ? element.originalText
          : fail(`${path}.text`, "must be a string");
    const fontFamily: CanvasFontFamily = element.fontFamily === 3 ? "mono" : "sans";
    const align: CanvasTextAlign = ["left", "center", "right"].includes(
      legacyString(element.textAlign, "left"),
    )
      ? (legacyString(element.textAlign, "left") as CanvasTextAlign)
      : "left";
    return {
      ...migrateLegacyBase(element, type, path, Math.max(40, text.length * 9), 24),
      type: "text",
      text,
      fontSize: Math.max(
        1,
        Math.min(512, legacyNumber(element.fontSize, 16, `${path}.fontSize`)),
      ),
      fontFamily,
      fontWeight: 400,
      align,
    };
  }

  if (type === "arrow" || type === "line" || type === "freedraw") {
    const base = migrateLegacyBase(element, type, path, 120, 0);
    const result: CanvasConnectorElement = {
      ...base,
      type: "connector",
      points: migrateLegacyPoints(
        element.points,
        base.width,
        base.height,
        `${path}.points`,
      ),
      startArrow:
        element.startArrowhead === "arrow" || element.startArrowhead === "triangle"
          ? "arrow"
          : "none",
      endArrow:
        type === "arrow" ||
        element.endArrowhead === "arrow" ||
        element.endArrowhead === "triangle"
          ? "arrow"
          : "none",
    };
    const startBinding = legacyBinding(element.startBinding);
    const endBinding = legacyBinding(element.endBinding);
    if (startBinding !== undefined) {
      result.startBinding = startBinding;
    }
    if (endBinding !== undefined) {
      result.endBinding = endBinding;
    }
    return result;
  }

  if (type === "embeddable") {
    const base = migrateLegacyBase(element, type, path, 320, 220);
    return {
      ...base,
      type: "shape",
      shape: "rectangle",
      label: "Legacy embed",
      fontSize: 14,
      locked: true,
      style: {
        ...base.style,
        fill: base.style.fill === "transparent" ? "#f8fafc" : base.style.fill,
        strokeStyle: "dashed",
      },
    };
  }

  if (type === "image") {
    const fileId = parseElementId(element.fileId, `${path}.fileId`);
    const result: CanvasImageElement = {
      ...migrateLegacyBase(element, type, path, 320, 240),
      type: "image",
      fileId,
    };
    if (typeof element.alt === "string") {
      result.alt = element.alt;
    }
    return result;
  }

  return fail(
    `${path}.type`,
    `unsupported legacy element type '${type}' (id '${id}')`,
  );
}

function legacyMimeType(value: unknown, dataURL: unknown, path: string): CanvasImageMimeType {
  const fromDataURL =
    typeof dataURL === "string" ? /^data:([^;,]+);/.exec(dataURL)?.[1] : undefined;
  const candidate = typeof value === "string" ? value : fromDataURL;
  if (!CANVAS_IMAGE_MIME_TYPES.includes(candidate as CanvasImageMimeType)) {
    return fail(
      path,
      `must be one of ${CANVAS_IMAGE_MIME_TYPES.join(", ")}; SVG and arbitrary embeds are not supported`,
    );
  }
  return candidate as CanvasImageMimeType;
}

function migrateLegacyFiles(
  value: unknown,
  path: string,
): Record<string, CanvasFile> {
  const legacyFiles = parseRecord(value, path);
  const files: Record<string, CanvasFile> = {};
  for (const [key, candidate] of Object.entries(legacyFiles)) {
    const file = parseRecord(candidate, `${path}.${key}`);
    const mimeType = legacyMimeType(
      file.mimeType,
      file.dataURL,
      `${path}.${key}.mimeType`,
    );
    const migrated: CanvasFile = {
      id: key,
      mimeType,
      dataURL: parseString(file.dataURL, `${path}.${key}.dataURL`, {
        maxLength: MAX_DATA_URL_LENGTH,
      }),
    };
    if (typeof file.name === "string" && file.name.length > 0) {
      migrated.name = file.name.slice(0, MAX_FILE_NAME_LENGTH);
    }
    if (typeof file.createdAt === "string") {
      migrated.createdAt = parseTimestamp(
        file.createdAt,
        `${path}.${key}.createdAt`,
      );
    } else if (typeof file.created === "number" && Number.isFinite(file.created)) {
      const createdAt = new Date(file.created);
      if (!Number.isFinite(createdAt.getTime())) {
        fail(`${path}.${key}.created`, "must be a valid epoch-millisecond timestamp");
      }
      migrated.createdAt = createdAt.toISOString();
    }
    files[key] = migrated;
  }
  return files;
}

function migrateLegacyAppState(value: unknown, path: string): CanvasAppState {
  const appState = parseRecord(value, path);
  const zoomValue = isRecord(appState.zoom) ? appState.zoom.value : appState.zoom;
  const zoom =
    typeof zoomValue === "number" && Number.isFinite(zoomValue)
      ? Math.max(0.02, Math.min(32, zoomValue))
      : 1;
  const spacingCandidate =
    typeof appState.gridStep === "number" ? appState.gridStep : appState.gridSize;
  const spacing =
    typeof spacingCandidate === "number" && Number.isFinite(spacingCandidate)
      ? Math.max(4, Math.min(512, spacingCandidate))
      : 24;

  return {
    camera: {
      x: legacyNumber(appState.scrollX, 0, `${path}.scrollX`),
      y: legacyNumber(appState.scrollY, 0, `${path}.scrollY`),
      zoom,
    },
    background: {
      color: legacyColor(appState.viewBackgroundColor, "#f8fafc").replace(
        "transparent",
        "#f8fafc",
      ),
      pattern: appState.gridModeEnabled === true ? "grid" : "solid",
      spacing,
    },
  };
}

/** Converts a schema-v1/Excalidraw scene into the typed custom-canvas scene. */
export function migrateLegacyBoardScene(
  value: unknown,
  path = "scene",
): BoardScene {
  const scene = parseRecord(value, path);
  rejectUnknownKeys(scene, ["elements", "appState", "files"], path);
  assertJsonValue(scene, path);
  if (!Array.isArray(scene.elements)) {
    return fail(`${path}.elements`, "must be an array");
  }

  return parseBoardScene(
    {
      elements: scene.elements.map((element, index) =>
        migrateLegacyElement(element, `${path}.elements[${index}]`),
      ),
      appState: migrateLegacyAppState(scene.appState, `${path}.appState`),
      files: migrateLegacyFiles(scene.files, `${path}.files`),
    },
    path,
  );
}

function looksLikeCanvasV2(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (isRecord(value.appState)) {
    if ("camera" in value.appState || "background" in value.appState) {
      return true;
    }
  }
  if (Array.isArray(value.elements)) {
    return value.elements.some(
      (element) =>
        isRecord(element) &&
        ["system", "shape", "connector"].includes(String(element.type)),
    );
  }
  return false;
}

export function parseImportedScene(value: unknown, path = "scene"): BoardScene {
  return looksLikeCanvasV2(value)
    ? parseBoardScene(value, path)
    : migrateLegacyBoardScene(value, path);
}

export function isBoardScene(value: unknown): value is BoardScene {
  try {
    parseBoardScene(value);
    return true;
  } catch {
    return false;
  }
}

export function parseCreateBoardInput(value: unknown): CreateBoardInput {
  const input = parseRecord(value, "body");
  rejectUnknownKeys(input, ["name", "templateId"], "body");

  const result: CreateBoardInput = { name: parseName(input.name) };
  if (input.templateId !== undefined) {
    result.templateId = parseBoardId(input.templateId, "templateId");
  }
  return result;
}

export function parseSaveBoardInput(value: unknown): SaveBoardInput {
  const input = parseRecord(value, "body");
  rejectUnknownKeys(input, ["name", "expectedRevision", "scene"], "body");

  return {
    name: parseName(input.name),
    expectedRevision: parseRevision(input.expectedRevision, "expectedRevision"),
    scene: parseBoardScene(input.scene),
  };
}

export function parseBoardDocument(value: unknown): BoardDocument {
  const document = parseRecord(value, "document");
  rejectUnknownKeys(
    document,
    [
      "schemaVersion",
      "id",
      "name",
      "revision",
      "createdAt",
      "updatedAt",
      "scene",
    ],
    "document",
  );

  if (
    document.schemaVersion !== BOARD_SCHEMA_VERSION &&
    document.schemaVersion !== LEGACY_BOARD_SCHEMA_VERSION
  ) {
    fail(
      "document.schemaVersion",
      `must equal ${LEGACY_BOARD_SCHEMA_VERSION} or ${BOARD_SCHEMA_VERSION}`,
    );
  }

  const createdAt = parseTimestamp(document.createdAt, "document.createdAt");
  const updatedAt = parseTimestamp(document.updatedAt, "document.updatedAt");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    fail("document.updatedAt", "must not be earlier than createdAt");
  }

  return {
    schemaVersion: BOARD_SCHEMA_VERSION,
    id: parseBoardId(document.id, "document.id"),
    name: parseName(document.name, "document.name"),
    revision: parseRevision(document.revision, "document.revision"),
    createdAt,
    updatedAt,
    scene:
      document.schemaVersion === LEGACY_BOARD_SCHEMA_VERSION
        ? migrateLegacyBoardScene(document.scene, "document.scene")
        : parseBoardScene(document.scene, "document.scene"),
  };
}

export function isBoardDocument(value: unknown): value is BoardDocument {
  try {
    parseBoardDocument(value);
    return true;
  } catch {
    return false;
  }
}

export function parseTemplateDefinition(value: unknown): TemplateDefinition {
  const template = parseRecord(value, "template");
  rejectUnknownKeys(
    template,
    ["id", "name", "description", "scene"],
    "template",
  );

  return {
    id: parseBoardId(template.id, "template.id"),
    name: parseName(template.name, "template.name"),
    description: parseDescription(template.description, "template.description"),
    scene: parseBoardScene(template.scene, "template.scene"),
  };
}
