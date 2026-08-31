import {
  exportToBlob,
  exportToSvg,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { BoardDocument } from "../../shared/contracts.js";
import { sceneFromApi, toExportDocument } from "./scene.js";

const safeFilename = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled-board";

const download = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportBoardJson = (
  board: BoardDocument,
  api: ExcalidrawImperativeAPI,
): void => {
  const payload = toExportDocument(board, sceneFromApi(api));
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `${safeFilename(board.name)}.system-canvas.json`,
  );
};

export const exportBoardSvg = async (
  board: BoardDocument,
  api: ExcalidrawImperativeAPI,
): Promise<void> => {
  const svg = await exportToSvg({
    elements: api.getSceneElements(),
    appState: {
      ...api.getAppState(),
      exportBackground: true,
      exportWithDarkMode: false,
    },
    files: api.getFiles(),
    exportPadding: 32,
  });
  download(
    new Blob([svg.outerHTML], { type: "image/svg+xml" }),
    `${safeFilename(board.name)}.svg`,
  );
};

export const exportBoardPng = async (
  board: BoardDocument,
  api: ExcalidrawImperativeAPI,
): Promise<void> => {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: {
      ...api.getAppState(),
      exportBackground: true,
      exportWithDarkMode: false,
    },
    files: api.getFiles(),
    mimeType: "image/png",
    exportPadding: 32,
  });
  download(blob, `${safeFilename(board.name)}.png`);
};
