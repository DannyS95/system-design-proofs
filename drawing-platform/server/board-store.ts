import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";

import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
  type BoardScene,
  type BoardSummary,
  type CreateBoardInput,
  type SaveBoardInput,
  type TemplateDefinition,
  type TemplateSummary,
} from "../shared/contracts.js";
import {
  ContractValidationError,
  parseBoardDocument,
  parseBoardId,
  parseCreateBoardInput,
  parseSaveBoardInput,
  parseTemplateDefinition,
  type BoardId,
} from "../shared/validation.js";
import {
  BoardNotFoundError,
  CorruptSnapshotError,
  FinalBoardDeletionError,
  RevisionConflictError,
  TemplateNotFoundError,
} from "./errors.js";
import { DEFAULT_TEMPLATES } from "./templates.js";

export interface BoardStore {
  initialize(): Promise<void>;
  listBoards(): Promise<BoardSummary[]>;
  createBoard(input: CreateBoardInput): Promise<BoardDocument>;
  getBoard(boardId: string): Promise<BoardDocument>;
  saveBoard(boardId: string, input: SaveBoardInput): Promise<BoardDocument>;
  deleteBoard(boardId: string): Promise<void>;
  listTemplates(): Promise<TemplateSummary[]>;
}

export interface FileBoardStoreOptions {
  dataDirectory: string;
  templates?: readonly TemplateDefinition[];
  createInitialBoard?: boolean;
  initialBoardId?: string;
  initialBoardName?: string;
  clock?: () => Date;
  idFactory?: () => string;
}

function cloneScene(scene: BoardScene): BoardScene {
  return structuredClone(scene);
}

function toSummary(document: BoardDocument): BoardSummary {
  return {
    id: document.id,
    name: document.name,
    revision: document.revision,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    elementCount: document.scene.elements.length,
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export class FileBoardStore implements BoardStore {
  private readonly dataDirectory: string;
  private readonly templates: Map<string, TemplateDefinition>;
  private readonly createInitialBoard: boolean;
  private readonly initialBoardId: BoardId;
  private readonly initialBoardName: string;
  private readonly clock: () => Date;
  private readonly idFactory: () => string;
  private initialization: Promise<void> | undefined;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(options: FileBoardStoreOptions) {
    if (options.dataDirectory.length === 0) {
      throw new Error("A data directory is required");
    }

    this.dataDirectory = options.dataDirectory;
    this.createInitialBoard = options.createInitialBoard ?? false;
    this.initialBoardId = parseBoardId(
      options.initialBoardId ?? "welcome-board",
      "initialBoardId",
    );
    this.initialBoardName = parseCreateBoardInput({
      name: options.initialBoardName ?? "System Canvas",
    }).name;
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => `board-${randomUUID()}`);

    this.templates = new Map();
    for (const candidate of options.templates ?? DEFAULT_TEMPLATES) {
      const template = parseTemplateDefinition(candidate);
      if (this.templates.has(template.id)) {
        throw new Error(`Duplicate template identifier '${template.id}'`);
      }
      this.templates.set(template.id, {
        ...template,
        scene: cloneScene(template.scene),
      });
    }
  }

  initialize(): Promise<void> {
    this.initialization ??= this.initializeStore();
    return this.initialization;
  }

  async listBoards(): Promise<BoardSummary[]> {
    await this.initialize();
    const documents = await this.readAllDocuments();
    return documents
      .map(toSummary)
      .sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
          left.id.localeCompare(right.id),
      );
  }

  async createBoard(input: CreateBoardInput): Promise<BoardDocument> {
    await this.initialize();
    const parsedInput = parseCreateBoardInput(input);
    const template = parsedInput.templateId
      ? this.templates.get(parsedInput.templateId)
      : undefined;
    if (parsedInput.templateId && !template) {
      throw new TemplateNotFoundError(parsedInput.templateId);
    }

    return this.enqueueMutation(async () => {
      const boardId = await this.nextAvailableBoardId();
      const timestamp = this.now().toISOString();
      const document: BoardDocument = {
        schemaVersion: BOARD_SCHEMA_VERSION,
        id: boardId,
        name: parsedInput.name,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        scene: cloneScene(template?.scene ?? createEmptyScene()),
      };
      await this.writeDocument(document);
      return structuredClone(document);
    });
  }

  async getBoard(boardId: string): Promise<BoardDocument> {
    await this.initialize();
    const validBoardId = parseBoardId(boardId);
    return structuredClone(await this.readDocument(validBoardId));
  }

  async saveBoard(
    boardId: string,
    input: SaveBoardInput,
  ): Promise<BoardDocument> {
    await this.initialize();
    const validBoardId = parseBoardId(boardId);
    const parsedInput = parseSaveBoardInput(input);

    return this.enqueueMutation(async () => {
      const current = await this.readDocument(validBoardId);
      if (current.revision !== parsedInput.expectedRevision) {
        throw new RevisionConflictError(
          validBoardId,
          parsedInput.expectedRevision,
          current.revision,
        );
      }

      const currentUpdatedAt = Date.parse(current.updatedAt);
      const nextUpdatedAt = new Date(
        Math.max(this.now().getTime(), currentUpdatedAt + 1),
      ).toISOString();
      const document: BoardDocument = {
        ...current,
        name: parsedInput.name,
        revision: current.revision + 1,
        updatedAt: nextUpdatedAt,
        scene: cloneScene(parsedInput.scene),
      };
      await this.writeDocument(document);
      return structuredClone(document);
    });
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.initialize();
    const validBoardId = parseBoardId(boardId);

    await this.enqueueMutation(async () => {
      await this.readDocument(validBoardId);
      const documents = await this.readAllDocuments();
      if (documents.length <= 1) {
        throw new FinalBoardDeletionError(validBoardId);
      }

      try {
        await unlink(this.pathFor(validBoardId));
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          throw new BoardNotFoundError(validBoardId);
        }
        throw error;
      }
    });
  }

  async listTemplates(): Promise<TemplateSummary[]> {
    await this.initialize();
    return [...this.templates.values()]
      .map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        elementCount: template.scene.elements.length,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private async initializeStore(): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true });
    if (!this.createInitialBoard) {
      return;
    }

    await this.enqueueMutation(async () => {
      const documents = await this.readAllDocuments();
      if (documents.length > 0) {
        return;
      }

      const timestamp = this.now().toISOString();
      await this.writeDocument({
        schemaVersion: BOARD_SCHEMA_VERSION,
        id: this.initialBoardId,
        name: this.initialBoardName,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        scene: createEmptyScene(),
      });
    });
  }

  private enqueueMutation<T>(action: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(action);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private now(): Date {
    const value = this.clock();
    if (!Number.isFinite(value.getTime())) {
      throw new Error("The board store clock returned an invalid date");
    }
    return value;
  }

  private async nextAvailableBoardId(): Promise<BoardId> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = parseBoardId(this.idFactory(), "generatedBoardId");
      try {
        await readFile(this.pathFor(candidate), "utf8");
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return candidate;
        }
        throw error;
      }
    }
    throw new Error("Could not allocate a unique board identifier");
  }

  private async readAllDocuments(): Promise<BoardDocument[]> {
    const entries = await readdir(this.dataDirectory, { withFileTypes: true });
    const documents: BoardDocument[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const id = entry.name.slice(0, -".json".length);
      let boardId: BoardId;
      try {
        boardId = parseBoardId(id);
      } catch (error) {
        if (error instanceof ContractValidationError) {
          continue;
        }
        throw error;
      }
      documents.push(await this.readDocument(boardId));
    }

    return documents;
  }

  private async readDocument(boardId: BoardId): Promise<BoardDocument> {
    const filename = this.pathFor(boardId);
    let source: string;
    try {
      source = await readFile(filename, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        throw new BoardNotFoundError(boardId);
      }
      throw error;
    }

    try {
      const document = parseBoardDocument(JSON.parse(source));
      if (document.id !== boardId) {
        throw new Error("Snapshot identifier does not match its filename");
      }
      return document;
    } catch (error) {
      throw new CorruptSnapshotError(filename, error);
    }
  }

  private async writeDocument(document: BoardDocument): Promise<void> {
    const validated = parseBoardDocument(document);
    const boardId = parseBoardId(validated.id);
    const destination = this.pathFor(boardId);
    const temporary = join(
      this.dataDirectory,
      `.${boardId}.${randomUUID()}.tmp`,
    );
    let handle: Awaited<ReturnType<typeof open>> | undefined;

    try {
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(validated, null, 2)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporary, destination);
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  private pathFor(boardId: BoardId): string {
    return join(this.dataDirectory, `${boardId}.json`);
  }
}

export { FileBoardStore as AtomicFileBoardStore };
