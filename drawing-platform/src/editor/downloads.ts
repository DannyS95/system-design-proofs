import type { BoardDocument } from "../../shared/contracts.js";
import type { CanvasEditorApi } from "./EditorCanvas.js";
import { toExportDocument } from "./scene.js";

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
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const exportBoardJson = (
  board: BoardDocument,
  api: CanvasEditorApi,
): void => {
  const payload = toExportDocument(board, api.getScene());
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `${safeFilename(board.name)}.system-canvas.json`,
  );
};

export const exportBoardSvg = async (
  board: BoardDocument,
  api: CanvasEditorApi,
): Promise<void> => {
  download(
    new Blob([api.exportSvg()], { type: "image/svg+xml;charset=utf-8" }),
    `${safeFilename(board.name)}.svg`,
  );
};

const rasterizeSvg = (svg: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      try {
        const width = Math.max(1, Math.min(8192, image.naturalWidth));
        const height = Math.max(1, Math.min(8192, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PNG export is unavailable in this browser.");
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("PNG export could not be encoded."));
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PNG export could not render the SVG scene."));
    };
    image.src = url;
  });

export const exportBoardPng = async (
  board: BoardDocument,
  api: CanvasEditorApi,
): Promise<void> => {
  download(
    await rasterizeSvg(api.exportSvg()),
    `${safeFilename(board.name)}.png`,
  );
};
