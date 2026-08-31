import { resolve } from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyServerOptions,
} from "fastify";

import type {
  ApiErrorBody,
  BoardListResponse,
  HealthResponse,
  TemplateListResponse,
} from "../shared/contracts.js";
import {
  ContractValidationError,
  parseBoardId,
  parseCreateBoardInput,
  parseSaveBoardInput,
} from "../shared/validation.js";
import { FileBoardStore, type BoardStore } from "./board-store.js";
import {
  BoardNotFoundError,
  FinalBoardDeletionError,
  RevisionConflictError,
  TemplateNotFoundError,
} from "./errors.js";

export const DEFAULT_BODY_LIMIT = 5 * 1024 * 1024;

export interface BuildAppOptions {
  store?: BoardStore;
  dataDirectory?: string;
  staticDirectory?: string;
  bodyLimit?: number;
  logger?: FastifyServerOptions["logger"];
}

function sendError(
  reply: FastifyReply,
  statusCode: number,
  error: ApiErrorBody["error"],
): void {
  reply.code(statusCode).send({ error } satisfies ApiErrorBody);
}

function isFastifyError(error: unknown): error is FastifyError {
  return error instanceof Error && "code" in error;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const store =
    options.store ??
    new FileBoardStore({
      dataDirectory: options.dataDirectory ?? resolve(process.cwd(), ".data"),
    });
  await store.initialize();

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: options.bodyLimit ?? DEFAULT_BODY_LIMIT,
  });

  app.get<{ Reply: HealthResponse }>("/api/health", async () => ({
    status: "ok",
  }));

  app.get<{ Reply: BoardListResponse }>("/api/boards", async () => ({
    boards: await store.listBoards(),
  }));

  app.post("/api/boards", async (request, reply) => {
    const document = await store.createBoard(parseCreateBoardInput(request.body));
    return reply.code(201).send(document);
  });

  app.get<{ Params: { boardId: string } }>(
    "/api/boards/:boardId",
    async (request) => {
      const boardId = parseBoardId(request.params.boardId);
      return store.getBoard(boardId);
    },
  );

  app.put<{ Params: { boardId: string } }>(
    "/api/boards/:boardId",
    async (request) => {
      const boardId = parseBoardId(request.params.boardId);
      return store.saveBoard(boardId, parseSaveBoardInput(request.body));
    },
  );

  app.delete<{ Params: { boardId: string } }>(
    "/api/boards/:boardId",
    async (request, reply) => {
      const boardId = parseBoardId(request.params.boardId);
      await store.deleteBoard(boardId);
      return reply.code(204).send();
    },
  );

  app.get<{ Reply: TemplateListResponse }>("/api/templates", async () => ({
    templates: await store.listTemplates(),
  }));

  if (options.staticDirectory) {
    await app.register(fastifyStatic, {
      root: resolve(options.staticDirectory),
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (
      options.staticDirectory &&
      !request.url.startsWith("/api/") &&
      request.headers.accept?.includes("text/html")
    ) {
      return reply.sendFile("index.html");
    }

    return reply.code(404).send({
      error: {
        code: "BOARD_NOT_FOUND",
        message: "The requested resource was not found",
      },
    } satisfies ApiErrorBody);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ContractValidationError) {
      const invalidBoardId = error.issues.some(
        ({ path }) => path === "boardId",
      );
      sendError(reply, 400, {
        code: invalidBoardId ? "INVALID_BOARD_ID" : "INVALID_REQUEST",
        message: "The request is invalid",
        details: error.issues,
      });
      return;
    }
    if (error instanceof BoardNotFoundError) {
      sendError(reply, 404, {
        code: "BOARD_NOT_FOUND",
        message: error.message,
      });
      return;
    }
    if (error instanceof TemplateNotFoundError) {
      sendError(reply, 404, {
        code: "TEMPLATE_NOT_FOUND",
        message: error.message,
      });
      return;
    }
    if (error instanceof RevisionConflictError) {
      sendError(reply, 409, {
        code: "REVISION_CONFLICT",
        message: error.message,
        details: {
          expectedRevision: error.expectedRevision,
          actualRevision: error.actualRevision,
        },
      });
      return;
    }
    if (error instanceof FinalBoardDeletionError) {
      sendError(reply, 409, {
        code: "FINAL_BOARD",
        message: error.message,
      });
      return;
    }
    if (isFastifyError(error) && error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
      sendError(reply, 413, {
        code: "BODY_TOO_LARGE",
        message: "The request body exceeds the server limit",
      });
      return;
    }
    if (isFastifyError(error) && error.statusCode === 400) {
      sendError(reply, 400, {
        code: "INVALID_REQUEST",
        message: "The request body is not valid JSON",
      });
      return;
    }

    requestLogError(app, error);
    sendError(reply, 500, {
      code: "INTERNAL_ERROR",
      message: "The board could not be persisted",
    });
  });

  return app;
}

function requestLogError(app: FastifyInstance, error: unknown): void {
  app.log.error(error);
}

export const buildServer = buildApp;
