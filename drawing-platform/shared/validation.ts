import {
  BOARD_SCHEMA_VERSION,
  type BoardDocument,
  type BoardScene,
  type CreateBoardInput,
  type SaveBoardInput,
  type TemplateDefinition,
} from "./contracts.js";

export const BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_BOARD_NAME_LENGTH = 80;
export const MAX_TEMPLATE_DESCRIPTION_LENGTH = 240;

const MAX_JSON_DEPTH = 100;
const MAX_JSON_VALUES = 100_000;

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
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    fail(path, `contains unexpected field '${unexpected[0]}'`);
  }
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
    return fail(
      path,
      "must match ^[a-z0-9][a-z0-9-]{0,63}$",
    );
  }
  return value as BoardId;
}

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === "string" && BOARD_ID_PATTERN.test(value);
}

export function parseBoardScene(value: unknown, path = "scene"): BoardScene {
  const scene = parseRecord(value, path);
  rejectUnknownKeys(scene, ["elements", "appState", "files"], path);

  if (!Array.isArray(scene.elements)) {
    return fail(`${path}.elements`, "must be an array");
  }
  scene.elements.forEach((element, index) => {
    if (!isRecord(element)) {
      fail(`${path}.elements[${index}]`, "must be an object");
    }
  });

  const appState = parseRecord(scene.appState, `${path}.appState`);
  const files = parseRecord(scene.files, `${path}.files`);
  assertJsonValue(scene.elements, `${path}.elements`);
  assertJsonValue(appState, `${path}.appState`);
  assertJsonValue(files, `${path}.files`);

  return {
    elements: scene.elements,
    appState,
    files,
  };
}

export const parseImportedScene = parseBoardScene;

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

  if (document.schemaVersion !== BOARD_SCHEMA_VERSION) {
    fail(
      "document.schemaVersion",
      `must equal ${BOARD_SCHEMA_VERSION}`,
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
    scene: parseBoardScene(document.scene, "document.scene"),
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
