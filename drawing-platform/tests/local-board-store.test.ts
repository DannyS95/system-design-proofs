import { describe, expect, it } from "vitest";
import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
} from "../shared/contracts.js";
import {
  chooseNewestDocument,
  createLocalBoardStore,
} from "../src/data/local-board-store.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const board = (updatedAt: string): BoardDocument => ({
  schemaVersion: BOARD_SCHEMA_VERSION,
  id: "board-one",
  name: "Board one",
  revision: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
  scene: createEmptyScene(),
});

describe("local board store", () => {
  it("round-trips a valid board document", () => {
    const store = createLocalBoardStore(new MemoryStorage());
    const document = board("2026-01-02T00:00:00.000Z");

    store.write(document);

    expect(store.read(document.id)).toEqual(document);
  });

  it("returns null for malformed local data", () => {
    const storage = new MemoryStorage();
    storage.setItem("system-canvas:board:board-one", "{not-json");

    expect(createLocalBoardStore(storage).read("board-one")).toBeNull();
  });

  it("prefers the local document only when it is newer", () => {
    const remote = board("2026-01-02T00:00:00.000Z");
    const local = board("2026-01-03T00:00:00.000Z");

    expect(chooseNewestDocument(remote, local)).toBe(local);
    expect(chooseNewestDocument(local, remote)).toBe(local);
  });
});
