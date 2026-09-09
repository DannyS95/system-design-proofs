import {
  BOARD_SCHEMA_VERSION,
  type BoardDocument,
  type BoardScene,
} from "../../shared/contracts.js";
import {
  parseBoardDocument,
  parseBoardScene,
  parseImportedScene,
} from "../../shared/validation.js";

/** Returns an editor-independent snapshot safe to persist or hand to a worker. */
export const serializeScene = (scene: BoardScene): BoardScene =>
  structuredClone(scene);

export const cloneScene = serializeScene;

/** Minimal interface implemented by the custom canvas imperative handle. */
export interface CanvasSceneSource {
  getScene(): BoardScene;
}

export const sceneFromApi = (api: CanvasSceneSource): BoardScene =>
  serializeScene(api.getScene());

export type ImportedBoardData = {
  name?: string;
  scene: BoardScene;
};

function looksLikeBoardDocument(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "schemaVersion" in value
  );
}

export const parseBoardImport = (value: unknown): ImportedBoardData => {
  if (looksLikeBoardDocument(value)) {
    const document = parseBoardDocument(value);
    return { name: document.name, scene: document.scene };
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (candidate.type === "excalidraw") {
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
  schemaVersion: BOARD_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  scene: parseBoardScene(scene),
});
