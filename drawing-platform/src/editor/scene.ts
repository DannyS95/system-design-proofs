import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  BoardDocument,
  BoardScene,
} from "../../shared/contracts.js";
import {
  parseBoardDocument,
  parseImportedScene,
} from "../../shared/validation.js";

const APP_STATE_KEYS = [
  "gridSize",
  "gridStep",
  "gridModeEnabled",
  "objectsSnapModeEnabled",
  "scrollX",
  "scrollY",
  "theme",
  "viewBackgroundColor",
  "zoom",
] as const satisfies readonly (keyof AppState)[];

export const serializeScene = (
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): BoardScene => {
  const serializedAppState: Record<string, unknown> = {};
  for (const key of APP_STATE_KEYS) {
    serializedAppState[key] = appState[key];
  }

  return {
    elements: structuredClone(elements) as unknown[],
    appState: structuredClone(serializedAppState),
    files: structuredClone(files) as Record<string, unknown>,
  };
};

export const sceneFromApi = (api: ExcalidrawImperativeAPI): BoardScene =>
  serializeScene(api.getSceneElementsIncludingDeleted(), api.getAppState(), api.getFiles());

export type ImportedBoardData = {
  name?: string;
  scene: BoardScene;
};

export const parseBoardImport = (value: unknown): ImportedBoardData => {
  try {
    const document = parseBoardDocument(value);
    return { name: document.name, scene: document.scene };
  } catch {
    // Fall through to the open Excalidraw file shape.
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Record<string, unknown>;
    if (candidate.type === "excalidraw" && Array.isArray(candidate.elements)) {
      return {
        scene: parseImportedScene({
          elements: candidate.elements,
          appState:
            typeof candidate.appState === "object" && candidate.appState !== null
              ? candidate.appState
              : {},
          files:
            typeof candidate.files === "object" && candidate.files !== null
              ? candidate.files
              : {},
        }),
      };
    }
  }

  return { scene: parseImportedScene(value) };
};

export const toExportDocument = (
  document: BoardDocument,
  scene: BoardScene,
): BoardDocument => ({
  ...document,
  updatedAt: new Date().toISOString(),
  scene,
});
