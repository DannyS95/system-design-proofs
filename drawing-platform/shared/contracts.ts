export const BOARD_SCHEMA_VERSION = 1 as const;

export interface BoardScene {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
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
    appState: {},
    files: {},
  };
}
