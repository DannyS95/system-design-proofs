import type { BoardDocument } from "../../shared/contracts.js";
import { parseBoardDocument } from "../../shared/validation.js";

const KEY_PREFIX = "system-canvas:board:";

export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LocalBoardStore = ReturnType<typeof createLocalBoardStore>;

export const createLocalBoardStore = (storage: StoragePort) => ({
  read(boardId: string): BoardDocument | null {
    const raw = storage.getItem(`${KEY_PREFIX}${boardId}`);
    if (!raw) {
      return null;
    }

    try {
      return parseBoardDocument(JSON.parse(raw));
    } catch {
      return null;
    }
  },

  write(document: BoardDocument): void {
    storage.setItem(`${KEY_PREFIX}${document.id}`, JSON.stringify(document));
  },

  remove(boardId: string): void {
    storage.removeItem(`${KEY_PREFIX}${boardId}`);
  },

  getActive(): string | null {
    const boardId = storage.getItem("system-canvas:active-board");
    return boardId && /^[a-z0-9][a-z0-9-]{0,63}$/.test(boardId)
      ? boardId
      : null;
  },

  setActive(boardId: string): void {
    storage.setItem("system-canvas:active-board", boardId);
  },
});

export const chooseNewestDocument = (
  remote: BoardDocument,
  local: BoardDocument | null,
): BoardDocument => {
  if (!local || local.id !== remote.id) {
    return remote;
  }

  const remoteTime = Date.parse(remote.updatedAt);
  const localTime = Date.parse(local.updatedAt);
  if (Number.isNaN(localTime)) {
    return remote;
  }
  if (Number.isNaN(remoteTime) || localTime > remoteTime) {
    return local;
  }
  return remote;
};
