import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createEmptyScene,
  type BoardScene,
  type CanvasShapeElement,
  type TemplateDefinition,
} from "../shared/contracts.js";
import { FileBoardStore } from "../server/board-store.js";
import {
  FinalBoardDeletionError,
  RevisionConflictError,
} from "../server/errors.js";

const testDirectories: string[] = [];

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "system-canvas-store-"));
  testDirectories.push(directory);
  return directory;
}

function idSequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? `fallback-${index}`;
}

const shape = (id: string, label: string): CanvasShapeElement => ({
  id,
  type: "shape",
  shape: "rectangle",
  x: 40,
  y: 60,
  width: 180,
  height: 96,
  rotation: 0,
  style: {
    fill: "#ffffff",
    stroke: "#344054",
    strokeWidth: 2,
    strokeStyle: "solid",
    opacity: 1,
    textColor: "#1d2939",
  },
  label,
  fontSize: 16,
});

const sceneWithShape = (id: string, label: string): BoardScene => ({
  ...createEmptyScene(),
  elements: [shape(id, label)],
});

afterEach(async () => {
  await Promise.all(
    testDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("FileBoardStore", () => {
  it("copies a template into an independent revision-zero board", async () => {
    const template: TemplateDefinition = {
      id: "teaching-template",
      name: "Teaching template",
      description: "A small non-empty scene used by the test.",
      scene: sceneWithShape("element-1", "Original label"),
    };
    const store = new FileBoardStore({
      dataDirectory: await makeDirectory(),
      templates: [template],
      createInitialBoard: false,
      idFactory: idSequence("board-one", "board-two"),
      clock: () => new Date("2026-08-31T12:00:00.000Z"),
    });

    const preview = await store.getTemplate(template.id);
    expect(await store.listBoards()).toEqual([]);
    expect(preview).not.toBe(template);
    expect(preview.scene).not.toBe(template.scene);
    const previewShape = preview.scene.elements[0];
    if (previewShape.type !== "shape") throw new Error("Expected a shape fixture.");
    previewShape.label = "Changed preview";
    await expect(store.getTemplate(template.id)).resolves.toMatchObject({
      scene: { elements: [expect.objectContaining({ label: "Original label" })] },
    });

    const first = await store.createBoard({
      name: "First copy",
      templateId: template.id,
    });
    const firstShape = first.scene.elements[0];
    if (firstShape.type !== "shape") throw new Error("Expected a shape fixture.");
    firstShape.label = "Changed copy";
    const second = await store.createBoard({
      name: "Second copy",
      templateId: template.id,
    });

    expect(first.id).not.toBe(second.id);
    expect(second.revision).toBe(0);
    expect(second.scene).not.toBe(template.scene);
    expect(second.scene.elements).toEqual(template.scene.elements);
    expect(second.scene.elements[0]).toMatchObject({
      type: "shape",
      label: "Original label",
    });
  });

  it("atomically replaces snapshots and rejects concurrent stale writers", async () => {
    const directory = await makeDirectory();
    const store = new FileBoardStore({
      dataDirectory: directory,
      createInitialBoard: false,
      idFactory: () => "concurrency-board",
      clock: () => new Date("2026-08-31T12:00:00.000Z"),
    });
    const created = await store.createBoard({ name: "Concurrency" });
    const sceneA = sceneWithShape("shape-a", "A");
    const sceneB = sceneWithShape("shape-b", "B");

    const outcomes = await Promise.allSettled([
      store.saveBoard(created.id, {
        name: created.name,
        expectedRevision: 0,
        scene: sceneA,
      }),
      store.saveBoard(created.id, {
        name: created.name,
        expectedRevision: 0,
        scene: sceneB,
      }),
    ]);

    expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find(({ status }) => status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: expect.any(RevisionConflictError),
    });
    expect((await store.getBoard(created.id)).revision).toBe(1);
    expect(await readdir(directory)).toEqual([`${created.id}.json`]);
    expect(JSON.parse(await readFile(join(directory, `${created.id}.json`), "utf8"))).toMatchObject({
      id: created.id,
      revision: 1,
    });
  });

  it("refuses to delete the final board", async () => {
    const store = new FileBoardStore({
      dataDirectory: await makeDirectory(),
      createInitialBoard: false,
      idFactory: idSequence("first-board", "second-board"),
    });
    const first = await store.createBoard({ name: "First" });
    const second = await store.createBoard({ name: "Second" });

    await store.deleteBoard(first.id);
    await expect(store.deleteBoard(second.id)).rejects.toBeInstanceOf(
      FinalBoardDeletionError,
    );
    await expect(store.getBoard(second.id)).resolves.toMatchObject({
      id: second.id,
    });
  });
});
