import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../server/app.js";
import { FileBoardStore } from "../server/board-store.js";
import {
  createEmptyScene,
  type BoardDocument,
  type CanvasShapeElement,
} from "../shared/contracts.js";

describe("board API", () => {
  let app: FastifyInstance;
  let directory: string;
  let sequence: number;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "system-canvas-api-"));
    sequence = 0;
    const store = new FileBoardStore({
      dataDirectory: directory,
      idFactory: () => `created-board-${++sequence}`,
    });
    app = await buildApp({ store, bodyLimit: 512 });
  });

  afterEach(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });

  it("reports health and exposes the first-run empty state", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });

    const list = await app.inject({ method: "GET", url: "/api/boards" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual({ boards: [] });

    const preview = await app.inject({
      method: "GET",
      url: "/api/templates/blank",
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({
      id: "blank",
      name: "Blank board",
      scene: { elements: [] },
    });

    const afterPreview = await app.inject({ method: "GET", url: "/api/boards" });
    expect(afterPreview.json()).toEqual({ boards: [] });
  });

  it("creates, reads, and saves a board with optimistic revisions", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "  KV walkthrough  ", templateId: "blank" },
    });
    expect(create.statusCode).toBe(201);
    const board = create.json<BoardDocument>();
    expect(board).toMatchObject({ name: "KV walkthrough", revision: 0 });

    const get = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}`,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toEqual(board);

    const client: CanvasShapeElement = {
      id: "client",
      type: "shape",
      shape: "rectangle",
      x: 40,
      y: 40,
      width: 180,
      height: 88,
      rotation: 0,
      style: {
        fill: "#ffffff",
        stroke: "#334155",
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 1,
        textColor: "#0f172a",
      },
      label: "Client",
      fontSize: 16,
    };
    const savePayload = {
      name: "KV walkthrough",
      expectedRevision: 0,
      scene: {
        ...createEmptyScene(),
        elements: [client],
      },
    };
    const save = await app.inject({
      method: "PUT",
      url: `/api/boards/${board.id}`,
      payload: savePayload,
    });
    expect(save.statusCode).toBe(200);
    expect(save.json()).toMatchObject({ revision: 1 });

    const staleSave = await app.inject({
      method: "PUT",
      url: `/api/boards/${board.id}`,
      payload: savePayload,
    });
    expect(staleSave.statusCode).toBe(409);
    expect(staleSave.json()).toMatchObject({
      error: {
        code: "REVISION_CONFLICT",
        details: { expectedRevision: 0, actualRevision: 1 },
      },
    });
  });

  it("maps validation, missing templates, final deletion, and size errors", async () => {
    const invalidId = await app.inject({
      method: "GET",
      url: "/api/boards/Uppercase",
    });
    expect(invalidId.statusCode).toBe(400);
    expect(invalidId.json()).toMatchObject({
      error: { code: "INVALID_BOARD_ID" },
    });

    const missingTemplate = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "Board", templateId: "missing-template" },
    });
    expect(missingTemplate.statusCode).toBe(404);
    expect(missingTemplate.json()).toMatchObject({
      error: { code: "TEMPLATE_NOT_FOUND" },
    });

    const missingTemplatePreview = await app.inject({
      method: "GET",
      url: "/api/templates/missing-template",
    });
    expect(missingTemplatePreview.statusCode).toBe(404);
    expect(missingTemplatePreview.json()).toMatchObject({
      error: { code: "TEMPLATE_NOT_FOUND" },
    });

    const create = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "Only board" },
    });
    const onlyBoard = create.json<BoardDocument>();
    const finalDelete = await app.inject({
      method: "DELETE",
      url: `/api/boards/${onlyBoard.id}`,
    });
    expect(finalDelete.statusCode).toBe(409);
    expect(finalDelete.json()).toMatchObject({ error: { code: "FINAL_BOARD" } });

    const tooLarge = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "x".repeat(1_000) },
    });
    expect(tooLarge.statusCode).toBe(413);
    expect(tooLarge.json()).toMatchObject({
      error: { code: "BODY_TOO_LARGE" },
    });
  });
});
