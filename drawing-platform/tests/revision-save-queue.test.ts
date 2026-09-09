import { describe, expect, it, vi } from "vitest";
import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
  type BoardScene,
  type CanvasTextElement,
} from "../shared/contracts.js";
import {
  RevisionSaveQueue,
  type PendingBoardSave,
  type SaveStatus,
} from "../src/data/revision-save-queue.js";

const textElement = (label: string): CanvasTextElement => ({
  id: `text-${label.toLocaleLowerCase()}`,
  type: "text",
  x: 0,
  y: 0,
  width: 180,
  height: 42,
  rotation: 0,
  style: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    strokeStyle: "solid",
    opacity: 1,
    textColor: "#1d2939",
  },
  text: label,
  fontSize: 18,
  fontFamily: "sans",
  fontWeight: 600,
  align: "left",
});

const scene = (label: string): BoardScene => ({
  ...createEmptyScene(),
  elements: [textElement(label)],
});

const savedDocument = (
  payload: PendingBoardSave,
  revision: number,
): BoardDocument => ({
  schemaVersion: BOARD_SCHEMA_VERSION,
  id: "board-one",
  name: payload.name,
  revision,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: `2026-01-01T00:00:0${revision}.000Z`,
  scene: payload.scene,
});

describe("RevisionSaveQueue", () => {
  it("serializes writes and sends only the newest pending scene", async () => {
    let finishFirst: ((value: BoardDocument) => void) | undefined;
    const calls: Array<{ payload: PendingBoardSave; revision: number }> = [];
    const statuses: SaveStatus[] = [];

    const queue = new RevisionSaveQueue({
      initialRevision: 4,
      delayMs: 60_000,
      save: (payload, revision) => {
        calls.push({ payload, revision });
        if (calls.length === 1) {
          return new Promise((resolve) => {
            finishFirst = resolve;
          });
        }
        return Promise.resolve(savedDocument(payload, revision + 1));
      },
      onStatus: (status) => statuses.push(status),
      onSaved: () => undefined,
    });

    queue.enqueue({ name: "A", scene: scene("A") });
    const firstFlush = queue.flush();
    queue.enqueue({ name: "B", scene: scene("B") });
    queue.enqueue({ name: "C", scene: scene("C") });

    expect(calls).toHaveLength(1);
    finishFirst?.(savedDocument(calls[0].payload, 5));
    await firstFlush;
    await vi.waitFor(() => expect(calls).toHaveLength(2));

    expect(calls[1].payload.name).toBe("C");
    expect(calls[1].revision).toBe(5);
    expect(statuses).toContain("saving");
    expect(statuses.at(-1)).toBe("synced");
    queue.dispose();
  });

  it("keeps a failed payload and reports a conflict without retrying", async () => {
    const statuses: SaveStatus[] = [];
    const save = vi.fn().mockRejectedValue(
      Object.assign(new Error("Revision changed."), { status: 409 }),
    );
    const queue = new RevisionSaveQueue({
      initialRevision: 1,
      delayMs: 60_000,
      save,
      onStatus: (status) => statuses.push(status),
      onSaved: () => undefined,
    });

    queue.enqueue({ name: "Conflicted", scene: scene("local") });
    await queue.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("conflict");
    queue.dispose();
  });
});
