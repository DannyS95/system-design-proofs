import {
  Excalidraw,
  MainMenu,
  THEME,
} from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { BoardDocument } from "../../shared/contracts.js";
import { serializeScene } from "./scene.js";

type EditorCanvasProps = {
  board: BoardDocument;
  onApiReady: (api: ExcalidrawImperativeAPI) => void;
  onSceneChange: (scene: BoardDocument["scene"]) => void;
};

const asInitialData = (board: BoardDocument): ExcalidrawInitialDataState => ({
  elements: board.scene.elements as ExcalidrawInitialDataState["elements"],
  appState: {
    ...board.scene.appState,
    theme: THEME.LIGHT,
    viewBackgroundColor:
      (board.scene.appState.viewBackgroundColor as string | undefined) ??
      "#f7f3e8",
  },
  files: board.scene.files as BinaryFiles,
  scrollToContent: board.scene.elements.length > 0,
});

export function EditorCanvas({
  board,
  onApiReady,
  onSceneChange,
}: EditorCanvasProps) {
  const handleChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    onSceneChange(serializeScene(elements, appState, files));
  };

  return (
    <div className="editor-canvas" aria-label={`Drawing canvas for ${board.name}`}>
      <Excalidraw
        key={board.id}
        name={board.name}
        initialData={asInitialData(board)}
        excalidrawAPI={onApiReady}
        onChange={handleChange}
        autoFocus
        handleKeyboardGlobally
        objectsSnapModeEnabled
        theme={THEME.LIGHT}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
