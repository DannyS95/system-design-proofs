export const BOARD_SCHEMA_VERSION = 2 as const;
export const LEGACY_BOARD_SCHEMA_VERSION = 1 as const;

export const CANVAS_BACKGROUND_PATTERNS = ["solid", "dots", "grid"] as const;
export type CanvasBackgroundPattern =
  (typeof CANVAS_BACKGROUND_PATTERNS)[number];

export interface CanvasCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasBackground {
  color: string;
  pattern: CanvasBackgroundPattern;
  spacing: number;
}

export interface CanvasAppState {
  camera: CanvasCamera;
  background: CanvasBackground;
}

export type CanvasStrokeStyle = "solid" | "dashed" | "dotted";

export interface CanvasElementStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle: CanvasStrokeStyle;
  /** CSS opacity expressed from 0 (transparent) to 1 (opaque). */
  opacity: number;
  textColor: string;
}

export type CanvasElementType =
  | "system"
  | "shape"
  | "text"
  | "connector"
  | "image";

/** Optional learning and implementation details shown in the element inspector. */
export interface CanvasElementMetadata {
  /** Process, machine, or browser location where this object exists. */
  runtimeLocation?: string;
  layer?: string;
  sourcePath?: string;
  packageName?: string;
  objectType?: string;
  inputs?: string;
  outputs?: string;
  ownership?: string;
  explanation?: string;
}

export interface CanvasBaseElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise rotation in radians around the element centre. */
  rotation: number;
  style: CanvasElementStyle;
  locked?: boolean;
  /** Retains legacy tombstones so migration never drops an element silently. */
  deleted?: boolean;
  /** Optional visual container that must expand when this element grows. */
  parentId?: string;
  /** Editable detail that would make the overview card too noisy. */
  metadata?: CanvasElementMetadata;
}

export const SYSTEM_NODE_VARIANTS = [
  "neutral",
  "client",
  "routing",
  "service",
  "cache",
  "database",
  "storage",
  "observability",
  "warning",
  "success",
] as const;
export type SystemNodeVariant = (typeof SYSTEM_NODE_VARIANTS)[number];

export interface CanvasSystemElement extends Omit<CanvasBaseElement, "type"> {
  type: "system";
  /** Vendor-neutral identifier resolved by the local geometric icon registry. */
  iconId: string;
  title: string;
  subtitle?: string;
  body?: string;
  /** Optional so existing schema-v2 boards retain the original 15 px title. */
  titleFontSize?: number;
  /** Controls both secondary card copy and body copy when present. */
  bodyFontSize?: number;
  /** Optional so existing cards retain their original left alignment. */
  align?: CanvasTextAlign;
  variant: SystemNodeVariant;
}

export type CanvasShapeKind = "rectangle" | "ellipse" | "diamond";

export interface CanvasShapeElement extends Omit<CanvasBaseElement, "type"> {
  type: "shape";
  shape: CanvasShapeKind;
  label?: string;
  /** Optional semantic mark drawn inside the editable shape. */
  iconId?: string;
  fontSize?: number;
  /** Optional so existing shape labels remain centered. */
  align?: CanvasTextAlign;
}

export type CanvasTextAlign = "left" | "center" | "right";
export type CanvasFontFamily = "sans" | "mono";
export type CanvasFontWeight = 400 | 500 | 600 | 700;

export interface CanvasTextElement extends Omit<CanvasBaseElement, "type"> {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: CanvasFontFamily;
  fontWeight: CanvasFontWeight;
  align: CanvasTextAlign;
}

/** A point local to a connector's x/y origin. */
export type CanvasPoint = [number, number];
export type CanvasArrowhead = "none" | "arrow";

export interface CanvasConnectorElement extends Omit<CanvasBaseElement, "type"> {
  type: "connector";
  /** At least two local points; the first point is normally [0, 0]. */
  points: CanvasPoint[];
  startArrow: CanvasArrowhead;
  endArrow: CanvasArrowhead;
  label?: string;
  fontSize?: number;
  /** Alignment within the connector's label plate; centered by default. */
  align?: CanvasTextAlign;
  startBinding?: string;
  endBinding?: string;
}

export interface CanvasImageElement extends Omit<CanvasBaseElement, "type"> {
  type: "image";
  fileId: string;
  alt?: string;
}

export type CanvasElement =
  | CanvasSystemElement
  | CanvasShapeElement
  | CanvasTextElement
  | CanvasConnectorElement
  | CanvasImageElement;

export const CANVAS_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export type CanvasImageMimeType = (typeof CANVAS_IMAGE_MIME_TYPES)[number];

export interface CanvasFile {
  id: string;
  mimeType: CanvasImageMimeType;
  /** Embedded data URL so a board remains portable and local-first. */
  dataURL: string;
  name?: string;
  width?: number;
  height?: number;
  createdAt?: string;
}

export interface BoardScene {
  elements: CanvasElement[];
  appState: CanvasAppState;
  files: Record<string, CanvasFile>;
}

export interface BoardDocument {
  schemaVersion: typeof BOARD_SCHEMA_VERSION;
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  scene: BoardScene;
}

export interface BoardSummary {
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  elementCount: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  scene: BoardScene;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  elementCount: number;
}

export interface CreateBoardInput {
  name: string;
  templateId?: string;
}

export interface SaveBoardInput {
  name: string;
  expectedRevision: number;
  scene: BoardScene;
}

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_BOARD_ID"
  | "BOARD_NOT_FOUND"
  | "TEMPLATE_NOT_FOUND"
  | "REVISION_CONFLICT"
  | "FINAL_BOARD"
  | "BODY_TOO_LARGE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface BoardListResponse {
  boards: BoardSummary[];
}

export interface TemplateListResponse {
  templates: TemplateSummary[];
}

export interface HealthResponse {
  status: "ok";
}

export function createEmptyScene(): BoardScene {
  return {
    elements: [],
    appState: {
      camera: { x: 0, y: 0, zoom: 1 },
      background: {
        color: "#f8fafc",
        pattern: "dots",
        spacing: 24,
      },
    },
    files: {},
  };
}
