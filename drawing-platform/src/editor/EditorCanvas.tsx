import {
  ArrowUpRight,
  BookmarkPlus,
  Circle,
  Diamond,
  Hand,
  ImagePlus,
  Lock,
  LockOpen,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Scan,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  BoardDocument,
  BoardScene,
  CanvasConnectorElement,
  CanvasElement,
  CanvasElementMetadata,
  CanvasFile,
  CanvasImageElement,
  CanvasShapeElement,
  CanvasTextAlign,
} from "../../shared/contracts.js";
import { parseReferenceLinks } from "../../shared/reference-links.js";
import { ComponentDetails } from "./ComponentDetails.js";
import { elementName, hasArchitectureDetails } from "./component-details-model.js";
import { tidySceneLayout } from "../../shared/generated-layout.js";
import { ConnectorView, ElementSelectionView, SceneElementView } from "./CanvasElementView.js";
import { LayoutControls, type LayoutSpacing } from "./LayoutControls.js";
import {
  CONNECTOR_STYLE,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  DEFAULT_STYLE,
  MAX_IMAGE_BYTES,
  MAX_SCENE_BYTES,
  cloneScene,
  createCanvasId,
  deleteElementAndDetachBindings,
  findElementAt,
  fitElementToContent,
  fitElementHeightToText,
  fitSceneToContent,
  getElementBounds,
  getSceneBounds,
  moveBoundConnectors,
  resizeElementAndBoundConnectors,
  updateElement,
} from "./canvas-model.js";
import { getElementVisualProvenance } from "./icon-provenance.js";
import {
  fitCameraToBounds,
  panCamera,
  screenToWorld,
  viewportCenterInWorld,
  wheelDeltaInPixels,
  zoomCameraAt,
  type Point,
} from "./camera.js";
import {
  DEFAULT_CONNECTOR_LABEL_FONT_SIZE,
  DEFAULT_SHAPE_LABEL_FONT_SIZE,
  DEFAULT_SYSTEM_BODY_FONT_SIZE,
  DEFAULT_SYSTEM_TITLE_FONT_SIZE,
  minimumTextWidth,
} from "./text-layout.js";

export type CanvasTool =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "connector"
  | "text";

export interface CanvasEditorApi {
  getScene: () => BoardScene;
  replaceScene: (scene: BoardScene) => void;
  insertElements: (elements: readonly CanvasElement[]) => void;
  getViewportCenter: () => Point;
  addImage: (file: File, at?: Point) => Promise<void>;
  zoomToFit: () => void;
  exportSvg: () => string;
}

export type EditorCanvasProps = {
  board: BoardDocument;
  onApiReady: (api: CanvasEditorApi) => void;
  onSceneChange: (scene: BoardScene) => void;
  onError?: (message: string) => void;
  onSaveSelectionToLibrary?: (element: CanvasElement) => void;
};

export interface ElementTextDraft {
  primary: string;
  secondary: string;
  body?: string;
  capacity?: string;
}

export interface ElementTypographyDraft {
  fontSize: string;
  bodyFontSize: string;
  align: CanvasTextAlign;
}

const fontSizeDraft = (value: number): string =>
  String(Math.round(value * 100) / 100);

export const getElementTypographyDraft = (
  element: CanvasElement,
): ElementTypographyDraft => {
  if (element.type === "system") {
    return {
      fontSize: fontSizeDraft(
        element.titleFontSize ?? DEFAULT_SYSTEM_TITLE_FONT_SIZE,
      ),
      bodyFontSize: fontSizeDraft(
        element.bodyFontSize ?? DEFAULT_SYSTEM_BODY_FONT_SIZE,
      ),
      align: element.align ?? "left",
    };
  }
  if (element.type === "shape") {
    return {
      fontSize: fontSizeDraft(
        element.fontSize ?? DEFAULT_SHAPE_LABEL_FONT_SIZE,
      ),
      bodyFontSize: "",
      align: element.align ?? "center",
    };
  }
  if (element.type === "connector") {
    return {
      fontSize: fontSizeDraft(
        element.fontSize ?? DEFAULT_CONNECTOR_LABEL_FONT_SIZE,
      ),
      bodyFontSize: "",
      align: element.align ?? "center",
    };
  }
  if (element.type === "text") {
    return {
      fontSize: fontSizeDraft(element.fontSize),
      bodyFontSize: "",
      align: element.align,
    };
  }
  return { fontSize: "", bodyFontSize: "", align: "left" };
};

const isFontSizeDraftValid = (value: string): boolean => {
  const parsed = Number(value);
  return (
    value.trim().length > 0 &&
    Number.isFinite(parsed) &&
    parsed >= 1 &&
    parsed <= 512
  );
};

const isTextAlignDraftValid = (value: string): value is CanvasTextAlign =>
  value === "left" || value === "center" || value === "right";

export const isElementTypographyDraftValid = (
  element: CanvasElement,
  draft: ElementTypographyDraft,
): boolean =>
  element.type === "image" ||
  (isTextAlignDraftValid(draft.align) &&
    isFontSizeDraftValid(draft.fontSize) &&
    (element.type !== "system" || isFontSizeDraftValid(draft.bodyFontSize)));

/** Applies valid inspector typography without hydrating unchanged legacy defaults. */
export const applyElementTypographyDraft = (
  element: CanvasElement,
  draft: ElementTypographyDraft,
): CanvasElement => {
  if (element.type === "image") return element;
  if (!isElementTypographyDraftValid(element, draft)) {
    throw new RangeError("Font sizes must be finite numbers from 1 to 512.");
  }

  const current = getElementTypographyDraft(element);
  const nextFontSize = Number(draft.fontSize);
  if (element.type === "system") {
    const customized = { ...element };
    if (nextFontSize !== Number(current.fontSize)) {
      customized.titleFontSize = nextFontSize;
    }
    const nextBodyFontSize = Number(draft.bodyFontSize);
    if (nextBodyFontSize !== Number(current.bodyFontSize)) {
      customized.bodyFontSize = nextBodyFontSize;
    }
    if (draft.align !== current.align) customized.align = draft.align;
    return customized;
  }

  const customized = { ...element };
  if (nextFontSize !== Number(current.fontSize)) {
    customized.fontSize = nextFontSize;
  }
  if (draft.align !== current.align) customized.align = draft.align;
  return customized;
};

export const getElementTextDraft = (element: CanvasElement): ElementTextDraft => {
  if (element.type === "system") {
    return {
      primary: element.title,
      secondary: element.subtitle ?? "",
      body: element.body ?? "",
      ...(element.capacity !== undefined ? { capacity: element.capacity } : {}),
    };
  }
  if (element.type === "shape" || element.type === "connector") {
    return { primary: element.label ?? "", secondary: "" };
  }
  if (element.type === "text") {
    return { primary: element.text, secondary: "" };
  }
  return { primary: element.alt ?? "", secondary: "" };
};

/** Applies inspector text without changing geometry, style, icon, or bindings. */
export const applyElementTextDraft = (
  element: CanvasElement,
  draft: ElementTextDraft,
): CanvasElement => {
  if (element.type === "system") {
    const customized = {
      ...element,
      title: draft.primary,
    };
    if (draft.secondary) customized.subtitle = draft.secondary;
    else delete customized.subtitle;
    if (draft.body) customized.body = draft.body;
    else delete customized.body;
    if (draft.capacity !== undefined) {
      if (draft.capacity) customized.capacity = draft.capacity;
      else delete customized.capacity;
    }
    return customized;
  }
  if (element.type === "shape" || element.type === "connector") {
    const customized = { ...element };
    if (draft.primary) customized.label = draft.primary;
    else delete customized.label;
    return customized;
  }
  if (element.type === "text") return { ...element, text: draft.primary };
  const customized = { ...element };
  if (draft.primary) customized.alt = draft.primary;
  else delete customized.alt;
  return customized;
};

const EMPTY_METADATA: CanvasElementMetadata = {
  runtimeLocation: "",
  layer: "",
  sourcePath: "",
  packageName: "",
  objectType: "",
  inputs: "",
  outputs: "",
  ownership: "",
  explanation: "",
  referenceLinks: "",
};

const METADATA_FIELDS: ReadonlyArray<{
  key: keyof CanvasElementMetadata;
  label: string;
}> = [
  { key: "runtimeLocation", label: "Runtime / location" },
  { key: "layer", label: "Layer" },
  { key: "sourcePath", label: "Source path" },
  { key: "packageName", label: "Package" },
  { key: "objectType", label: "Object type" },
  { key: "inputs", label: "Inputs" },
  { key: "outputs", label: "Outputs" },
  { key: "ownership", label: "Ownership" },
  { key: "explanation", label: "Explanation" },
  { key: "referenceLinks", label: "Reference links" },
];

const dimensionDraft = (value: number): string =>
  String(Math.round(value * 100) / 100);

export interface ElementInspectorDraft
  extends ElementTextDraft,
    ElementTypographyDraft {
  width: string;
  height: string;
  metadata: CanvasElementMetadata;
}

export const hasElementInspectorChanges = (
  element: CanvasElement,
  draft: ElementInspectorDraft,
): boolean => {
  const current = getElementTextDraft(element);
  const currentTypography = getElementTypographyDraft(element);
  return (
    current.primary !== draft.primary ||
    current.secondary !== draft.secondary ||
    (current.body ?? "") !== (draft.body ?? "") ||
    (current.capacity ?? "") !== (draft.capacity ?? current.capacity ?? "") ||
    dimensionDraft(element.width) !== draft.width ||
    dimensionDraft(element.height) !== draft.height ||
    currentTypography.fontSize !== draft.fontSize ||
    currentTypography.bodyFontSize !== draft.bodyFontSize ||
    currentTypography.align !== draft.align ||
    METADATA_FIELDS.some(
      ({ key }) =>
        (element.metadata?.[key] ?? "") !== (draft.metadata[key] ?? ""),
    )
  );
};

const NON_PASSIVE_WHEEL_OPTIONS: AddEventListenerOptions = { passive: false };

export const addCanvasWheelListener = (
  target: EventTarget,
  listener: EventListener,
): (() => void) => {
  target.addEventListener("wheel", listener, NON_PASSIVE_WHEEL_OPTIONS);
  return () =>
    target.removeEventListener("wheel", listener, NON_PASSIVE_WHEEL_OPTIONS);
};

type Interaction =
  | {
      kind: "pan";
      pointerId: number;
      startScreen: Point;
      camera: BoardScene["appState"]["camera"];
    }
  | {
      kind: "move";
      pointerId: number;
      startWorld: Point;
      elementIds: string[];
      before: BoardScene;
      origins: Record<string, Point>;
    }
  | {
      kind: "resize";
      pointerId: number;
      startWorld: Point;
      elementId: string;
      before: BoardScene;
      width: number;
      height: number;
    }
  | {
      kind: "draw";
      pointerId: number;
      startWorld: Point;
      elementId: string;
      before: BoardScene;
      startBinding?: string;
    }
  | {
      kind: "marquee";
      pointerId: number;
      startWorld: Point;
      currentWorld: Point;
    };

const eventPoint = (
  event: { clientX: number; clientY: number },
  element: HTMLElement,
): Point => {
  const bounds = element.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
};

export const findElementsInsideArea = (
  elements: readonly CanvasElement[],
  start: Point,
  end: Point,
): string[] => {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return elements
    .filter((element) => {
      if (element.deleted) return false;
      const bounds = getElementBounds(element);
      return (
        bounds.x >= left &&
        bounds.y >= top &&
        bounds.x + bounds.width <= right &&
        bounds.y + bounds.height <= bottom
      );
    })
    .map(({ id }) => id);
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const readImageDimensions = (dataURL: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected image is not valid."));
    image.src = dataURL;
  });

const TOOL_ITEMS: Array<{
  tool: CanvasTool;
  label: string;
  key: string;
  icon: typeof MousePointer2;
}> = [
  { tool: "select", label: "Select, area-select, and move", key: "V", icon: MousePointer2 },
  { tool: "hand", label: "Pan infinite canvas", key: "H", icon: Hand },
  { tool: "rectangle", label: "Rectangle", key: "R", icon: Square },
  { tool: "ellipse", label: "Ellipse", key: "O", icon: Circle },
  { tool: "diamond", label: "Decision", key: "D", icon: Diamond },
  { tool: "connector", label: "Connector", key: "C", icon: ArrowUpRight },
  { tool: "text", label: "Text", key: "T", icon: Type },
];

function EditorCanvasComponent({
  board,
  onApiReady,
  onSceneChange,
  onError,
  onSaveSelectionToLibrary,
}: EditorCanvasProps) {
  const initialScene = useMemo(
    () => fitSceneToContent(cloneScene(board.scene)),
    [board.scene],
  );
  const [scene, setScene] = useState(initialScene);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : undefined;
  const [interaction, setInteraction] = useState<Interaction>();
  const [spacePressed, setSpacePressed] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [error, setError] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editingText, setEditingText] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [capacityDraft, setCapacityDraft] = useState("");
  const [fontSizeDraftValue, setFontSizeDraftValue] = useState("");
  const [bodyFontSizeDraft, setBodyFontSizeDraft] = useState("");
  const [textAlignDraft, setTextAlignDraft] =
    useState<CanvasTextAlign>("left");
  const [widthDraft, setWidthDraft] = useState("");
  const [heightDraft, setHeightDraft] = useState("");
  const [inspectorMode, setInspectorMode] = useState<"details" | "edit">("details");
  const [metadataDraft, setMetadataDraft] =
    useState<CanvasElementMetadata>(EMPTY_METADATA);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef(scene);
  const undoRef = useRef<BoardScene[]>([]);
  const redoRef = useRef<BoardScene[]>([]);
  const wheelSaveRef = useRef<number>();
  const [, bumpHistory] = useState(0);

  const syncDimensionDrafts = useCallback((element: CanvasElement) => {
    setWidthDraft(dimensionDraft(element.width));
    setHeightDraft(dimensionDraft(element.height));
  }, []);

  const syncInspectorDrafts = useCallback(
    (element: CanvasElement) => {
      const draft = getElementTextDraft(element);
      setLabelDraft(draft.primary);
      setSubtitleDraft(draft.secondary);
      setBodyDraft(draft.body ?? "");
      setCapacityDraft(draft.capacity ?? "");
      const typographyDraft = getElementTypographyDraft(element);
      setFontSizeDraftValue(typographyDraft.fontSize);
      setBodyFontSizeDraft(typographyDraft.bodyFontSize);
      setTextAlignDraft(typographyDraft.align);
      syncDimensionDrafts(element);
      setMetadataDraft({ ...EMPTY_METADATA, ...element.metadata });
    },
    [syncDimensionDrafts],
  );

  const showError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const setSceneLive = useCallback((next: BoardScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);

  const commit = useCallback(
    (next: BoardScene, before = sceneRef.current, withHistory = true) => {
      if (withHistory) {
        undoRef.current.push(cloneScene(before));
        if (undoRef.current.length > 100) undoRef.current.shift();
        redoRef.current = [];
        bumpHistory((version) => version + 1);
      }
      setSceneLive(next);
      onSceneChange(cloneScene(next));
    },
    [onSceneChange, setSceneLive],
  );

  const reportLiveScene = useCallback(() => {
    onSceneChange(cloneScene(sceneRef.current));
  }, [onSceneChange]);

  const viewportSize = useCallback(() => {
    const element = rootRef.current;
    return {
      width: element?.clientWidth ?? 1,
      height: element?.clientHeight ?? 1,
    };
  }, []);

  const tidyLayout = useCallback((spacing: LayoutSpacing, unlock = false) => {
    const before = cloneScene(sceneRef.current);
    if (!unlock && before.elements.some((element) => !element.deleted && element.locked)) {
      showError("This board contains locked elements. Use Unlock all and tidy to apply spacing.");
      return;
    }
    try {
      const input = cloneScene(before);
      if (unlock) input.elements = input.elements.map(element => element.deleted ? element : { ...element, locked: false });
      const next = tidySceneLayout(input, spacing);
      next.appState.camera = fitCameraToBounds(getSceneBounds(next.elements), viewportSize());
      next.appState.layoutSpacing = { ...spacing };
      commit(next, before);
      setSelectedIds([]);
      setEditingId(undefined);
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : "The layout could not be tidied.");
    }
  }, [commit, showError, viewportSize]);

  const undo = useCallback(() => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current.push(cloneScene(sceneRef.current));
    setSceneLive(previous);
    onSceneChange(cloneScene(previous));
    setSelectedIds([]);
    bumpHistory((version) => version + 1);
  }, [onSceneChange, setSceneLive]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(cloneScene(sceneRef.current));
    setSceneLive(next);
    onSceneChange(cloneScene(next));
    setSelectedIds([]);
    bumpHistory((version) => version + 1);
  }, [onSceneChange, setSceneLive]);

  const deleteSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const before = sceneRef.current;
    const deletableIds = selectedIds.filter((id) =>
      before.elements.some(
        (element) => element.id === id && !element.deleted && !element.locked,
      ),
    );
    if (deletableIds.length === 0) return;
    const next = deletableIds.reduce(
      (current, id) => deleteElementAndDetachBindings(current, id),
      before,
    );
    commit(next, before);
    setSelectedIds([]);
  }, [commit, selectedIds]);

  const setSelectedLocked = useCallback(
    (locked: boolean) => {
      if (selectedIds.length === 0) return;
      const before = sceneRef.current;
      const selectedSet = new Set(selectedIds);
      if (!before.elements.some(
        (element) =>
          selectedSet.has(element.id) &&
          !element.deleted &&
          Boolean(element.locked) !== locked,
      )) return;
      if (locked && editingId && selectedSet.has(editingId)) {
        setEditingId(undefined);
        setEditingText("");
      }
      commit(
        {
          ...before,
          elements: before.elements.map((element) =>
            selectedSet.has(element.id) && !element.deleted
              ? { ...element, locked }
              : element,
          ),
        },
        before,
      );
    },
    [commit, editingId, selectedIds],
  );

  const setAllLocked = useCallback(
    (locked: boolean) => {
      const before = sceneRef.current;
      if (
        !before.elements.some(
          (element) => !element.deleted && Boolean(element.locked) !== locked,
        )
      ) {
        return;
      }
      if (locked) {
        setEditingId(undefined);
        setEditingText("");
      }
      commit(
        {
          ...before,
          elements: before.elements.map((element) =>
            element.deleted ? element : { ...element, locked },
          ),
        },
        before,
      );
    },
    [commit],
  );

  const zoomToFit = useCallback(() => {
    const current = sceneRef.current;
    const camera = fitCameraToBounds(getSceneBounds(current.elements), viewportSize());
    commit(
      { ...current, appState: { ...current.appState, camera } },
      current,
      false,
    );
  }, [commit, viewportSize]);

  const zoomToSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const current = sceneRef.current;
    const selected = current.elements.filter(
      (element) => selectedIds.includes(element.id) && !element.deleted,
    );
    if (selected.length === 0) return;
    const camera = fitCameraToBounds(
      getSceneBounds(selected),
      viewportSize(),
      42,
    );
    commit(
      { ...current, appState: { ...current.appState, camera } },
      current,
      false,
    );
  }, [commit, selectedIds, viewportSize]);

  const addImage = useCallback(
    async (file: File, at?: Point) => {
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Images must be 2 MB or smaller so the board stays portable.");
      }
      const dataURL = await readFileAsDataUrl(file);
      const dimensions = await readImageDimensions(dataURL);
      const scale = Math.min(1, 420 / dimensions.width, 300 / dimensions.height);
      const width = Math.max(40, Math.round(dimensions.width * scale));
      const height = Math.max(40, Math.round(dimensions.height * scale));
      const center = at ??
        viewportCenterInWorld(sceneRef.current.appState.camera, viewportSize());
      const fileId = createCanvasId("asset");
      const elementId = createCanvasId("image");
      const asset: CanvasFile = {
        id: fileId,
        mimeType: file.type as CanvasFile["mimeType"],
        dataURL,
        name: file.name,
        width: dimensions.width,
        height: dimensions.height,
        createdAt: new Date().toISOString(),
      };
      const element: CanvasImageElement = {
        id: elementId,
        type: "image",
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
        rotation: 0,
        style: { ...DEFAULT_STYLE, stroke: "#98a2b3", strokeWidth: 1.5 },
        fileId,
        alt: file.name,
      };
      const before = sceneRef.current;
      const next = {
        ...before,
        elements: [...before.elements, element],
        files: { ...before.files, [fileId]: asset },
      };
      if (new TextEncoder().encode(JSON.stringify(next)).byteLength > MAX_SCENE_BYTES) {
        throw new Error(
          "This image would make the board larger than the 4 MB portable-scene limit.",
        );
      }
      commit(next, before);
      setSelectedIds([elementId]);
      setTool("select");
    },
    [commit, viewportSize],
  );

  const serializeSvg = useCallback((): string => {
    const source = svgRef.current;
    if (!source) throw new Error("The canvas is not ready to export.");
    const bounds = getSceneBounds(sceneRef.current.elements);
    const padding = 40;
    const clone = source.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-editor-overlay]").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute(
      "viewBox",
      `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`,
    );
    clone.setAttribute("width", String(Math.ceil(bounds.width + padding * 2)));
    clone.setAttribute("height", String(Math.ceil(bounds.height + padding * 2)));
    const sceneRoot = clone.querySelector<SVGGElement>("[data-scene-root]");
    sceneRoot?.removeAttribute("transform");
    const background = clone.querySelector<SVGRectElement>("[data-canvas-background]");
    if (background) {
      background.setAttribute("x", String(bounds.x - padding));
      background.setAttribute("y", String(bounds.y - padding));
      background.setAttribute("width", String(bounds.width + padding * 2));
      background.setAttribute("height", String(bounds.height + padding * 2));
    }
    const pattern = clone.querySelector<SVGRectElement>("[data-canvas-pattern]");
    if (pattern) {
      pattern.setAttribute("x", String(bounds.x - padding));
      pattern.setAttribute("y", String(bounds.y - padding));
      pattern.setAttribute("width", String(bounds.width + padding * 2));
      pattern.setAttribute("height", String(bounds.height + padding * 2));
    }
    return new XMLSerializer().serializeToString(clone);
  }, []);

  const api = useMemo<CanvasEditorApi>(
    () => ({
      getScene: () => cloneScene(sceneRef.current),
      replaceScene: (nextScene) => {
        undoRef.current.push(cloneScene(sceneRef.current));
        redoRef.current = [];
        setSceneLive(fitSceneToContent(cloneScene(nextScene)));
        setSelectedIds([]);
        bumpHistory((version) => version + 1);
      },
      insertElements: (elements) => {
        if (elements.length === 0) return;
        const before = sceneRef.current;
        const inserted = elements.map((element) => structuredClone(element));
        const withInserted = {
          ...before,
          elements: [...before.elements, ...inserted],
        };
        const next = inserted.reduce(
          (current, element) =>
            fitElementToContent(current, element.id, { growWidth: true }),
          withInserted,
        );
        commit(
          next,
          before,
        );
        setSelectedIds(elements.at(-1) ? [elements.at(-1)!.id] : []);
        setTool("select");
      },
      getViewportCenter: () =>
        viewportCenterInWorld(sceneRef.current.appState.camera, viewportSize()),
      addImage,
      zoomToFit,
      exportSvg: serializeSvg,
    }),
    [addImage, commit, serializeSvg, viewportSize, zoomToFit],
  );

  useEffect(() => {
    onApiReady(api);
  }, [api, onApiReady]);

  useEffect(() => {
    setInspectorMode("details");
    if (!selectedId) {
      setLabelDraft("");
      setSubtitleDraft("");
      setBodyDraft("");
      setCapacityDraft("");
      setFontSizeDraftValue("");
      setBodyFontSizeDraft("");
      setTextAlignDraft("left");
      setWidthDraft("");
      setHeightDraft("");
      setMetadataDraft(EMPTY_METADATA);
      return;
    }
    const selected = sceneRef.current.elements.find(
      (element) => element.id === selectedId && !element.deleted,
    );
    if (!selected) return;
    syncInspectorDrafts(selected);
  }, [board.id, selectedId, syncInspectorDrafts]);

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inspectorRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(
          ".canvas-details-badge, .canvas-node, .canvas-resize-handle, .canvas-toolbar, .canvas-lock-controls, .canvas-zoom-controls, .canvas-background-panel, .canvas-layout-controls",
        )
      ) {
        return;
      }
      setSelectedIds([]);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [selectedIds.length]);

  useEffect(
    () => () => {
      if (wheelSaveRef.current !== undefined) {
        window.clearTimeout(wheelSaveRef.current);
      }
    },
    [],
  );

  const beginPan = useCallback(
    (event: ReactPointerEvent<SVGElement>) => {
      const root = rootRef.current;
      if (!root) return;
      svgRef.current?.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "pan",
        pointerId: event.pointerId,
        startScreen: eventPoint(event, root),
        camera: sceneRef.current.appState.camera,
      });
    },
    [],
  );

  const beginDraw = useCallback(
    (
      event: ReactPointerEvent<SVGElement>,
      world: Point,
      startBinding?: string,
    ) => {
      const before = cloneScene(sceneRef.current);
      const elementId = createCanvasId(tool);
      let element: CanvasElement;
      if (tool === "connector") {
        element = {
          id: elementId,
          type: "connector",
          x: world.x,
          y: world.y,
          width: 1,
          height: 1,
          rotation: 0,
          style: { ...CONNECTOR_STYLE },
          points: [[0, 0], [0, 0]],
          startArrow: "none",
          endArrow: "arrow",
          ...(startBinding ? { startBinding } : {}),
        };
      } else if (tool === "text") {
        element = {
          id: elementId,
          type: "text",
          x: world.x,
          y: world.y,
          width: 220,
          height: 54,
          rotation: 0,
          style: { ...DEFAULT_STYLE, fill: "transparent", stroke: "transparent" },
          text: "Type here",
          fontSize: 20,
          fontFamily: "sans",
          fontWeight: 600,
          align: "left",
        };
      } else {
        element = {
          id: elementId,
          type: "shape",
          shape: tool as CanvasShapeElement["shape"],
          x: world.x,
          y: world.y,
          width: 1,
          height: 1,
          rotation: 0,
          style: { ...DEFAULT_STYLE },
        };
      }
      setSceneLive({ ...before, elements: [...before.elements, element] });
      setSelectedIds([elementId]);
      svgRef.current?.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "draw",
        pointerId: event.pointerId,
        startWorld: world,
        elementId,
        before,
        startBinding,
      });
    },
    [setSceneLive, tool],
  );

  const onCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 && event.button !== 1) return;
      rootRef.current?.focus();
      const root = rootRef.current;
      if (!root) return;
      const screen = eventPoint(event, root);
      const world = screenToWorld(screen, sceneRef.current.appState.camera);
      if (tool === "hand" || spacePressed || event.button === 1) {
        beginPan(event);
        return;
      }
      if (["rectangle", "ellipse", "diamond", "connector", "text"].includes(tool)) {
        beginDraw(event, world);
        return;
      }
      setSelectedIds([]);
      svgRef.current?.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "marquee",
        pointerId: event.pointerId,
        startWorld: world,
        currentWorld: world,
      });
    },
    [beginDraw, beginPan, spacePressed, tool],
  );

  const onElementPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, element: CanvasElement) => {
      event.stopPropagation();
      rootRef.current?.focus();
      const root = rootRef.current;
      if (!root) return;
      const screen = eventPoint(event, root);
      const world = screenToWorld(screen, sceneRef.current.appState.camera);
      if (tool === "hand" || spacePressed || event.button === 1) {
        beginPan(event);
        return;
      }
      if (tool === "select" && event.button === 0) {
        if (event.shiftKey) {
          setSelectedIds((current) =>
            current.includes(element.id)
              ? current.filter((id) => id !== element.id)
              : [...current, element.id],
          );
          return;
        }
        const movingIds = selectedIds.includes(element.id)
          ? selectedIds
          : [element.id];
        setSelectedIds(movingIds);
        const before = cloneScene(sceneRef.current);
        const movableIds = movingIds.filter((id) =>
          before.elements.some(
            (candidate) => candidate.id === id && !candidate.deleted && !candidate.locked,
          ),
        );
        if (movableIds.length === 0) return;
        svgRef.current?.setPointerCapture(event.pointerId);
        setInteraction({
          kind: "move",
          pointerId: event.pointerId,
          startWorld: world,
          elementIds: movableIds,
          before,
          origins: Object.fromEntries(
            before.elements
              .filter((candidate) => movableIds.includes(candidate.id))
              .map((candidate) => [candidate.id, { x: candidate.x, y: candidate.y }]),
          ),
        });
        return;
      }
      if (element.locked) {
        setSelectedIds([element.id]);
        return;
      }
      if (tool === "connector") {
        beginDraw(event, world, element.id);
        return;
      }
    },
    [beginDraw, beginPan, selectedIds, spacePressed, tool],
  );

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, element: CanvasElement) => {
      event.stopPropagation();
      if (element.locked) return;
      const root = rootRef.current;
      if (!root) return;
      svgRef.current?.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "resize",
        pointerId: event.pointerId,
        startWorld: screenToWorld(
          eventPoint(event, root),
          sceneRef.current.appState.camera,
        ),
        elementId: element.id,
        before: cloneScene(sceneRef.current),
        width: element.width,
        height: element.height,
      });
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      const root = rootRef.current;
      if (!root) return;
      const screen = eventPoint(event, root);
      if (interaction.kind === "pan") {
        const camera = panCamera(interaction.camera, {
          x: screen.x - interaction.startScreen.x,
          y: screen.y - interaction.startScreen.y,
        });
        setSceneLive({
          ...sceneRef.current,
          appState: { ...sceneRef.current.appState, camera },
        });
        return;
      }

      const world = screenToWorld(screen, sceneRef.current.appState.camera);
      if (interaction.kind === "marquee") {
        setInteraction({ ...interaction, currentWorld: world });
        return;
      }
      if (interaction.kind === "move") {
        const delta = {
          x: world.x - interaction.startWorld.x,
          y: world.y - interaction.startWorld.y,
        };
        const selectedSet = new Set(interaction.elementIds);
        let next = interaction.elementIds.reduce((current, elementId) => {
          const origin = interaction.origins[elementId];
          if (!origin) return current;
          const candidate = current.elements.find(({ id }) => id === elementId);
          if (
            candidate?.type === "connector" &&
            ((candidate.startBinding && selectedSet.has(candidate.startBinding)) ||
              (candidate.endBinding && selectedSet.has(candidate.endBinding)))
          ) {
            return current;
          }
          return updateElement(current, elementId, (element) => {
            const moved: CanvasElement = {
              ...element,
              x: origin.x + delta.x,
              y: origin.y + delta.y,
            };
            if (moved.type === "connector") {
              delete moved.startBinding;
              delete moved.endBinding;
            }
            return moved;
          });
        }, interaction.before);
        for (const elementId of interaction.elementIds) {
          const candidate = interaction.before.elements.find(({ id }) => id === elementId);
          if (candidate && candidate.type !== "connector") {
            next = moveBoundConnectors(next, elementId, delta);
          }
        }
        setSceneLive(next);
        return;
      }
      if (interaction.kind === "resize") {
        const delta = {
          x: world.x - interaction.startWorld.x,
          y: world.y - interaction.startWorld.y,
        };
        setSceneLive(
          resizeElementAndBoundConnectors(
            interaction.before,
            interaction.elementId,
            interaction.width + delta.x,
            interaction.height + delta.y,
          ),
        );
        return;
      }
      const dx = world.x - interaction.startWorld.x;
      const dy = world.y - interaction.startWorld.y;
      setSceneLive(
        updateElement(sceneRef.current, interaction.elementId, (element) => {
          if (element.type === "connector") {
            return {
              ...element,
              points: [[0, 0], [dx, dy]],
              width: Math.abs(dx),
              height: Math.abs(dy),
            };
          }
          return {
            ...element,
            x: dx < 0 ? interaction.startWorld.x + dx : interaction.startWorld.x,
            y: dy < 0 ? interaction.startWorld.y + dy : interaction.startWorld.y,
            width: Math.max(1, Math.abs(dx)),
            height: Math.max(1, Math.abs(dy)),
          };
        }),
      );
    },
    [interaction, setSceneLive],
  );

  const finishInteraction = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      if (interaction.kind === "marquee") {
        const width = Math.abs(interaction.currentWorld.x - interaction.startWorld.x);
        const height = Math.abs(interaction.currentWorld.y - interaction.startWorld.y);
        setSelectedIds(
          width < 4 && height < 4
            ? []
            : findElementsInsideArea(
                sceneRef.current.elements,
                interaction.startWorld,
                interaction.currentWorld,
              ),
        );
      } else if (interaction.kind === "pan") {
        reportLiveScene();
      } else {
        let next = sceneRef.current;
        if (interaction.kind === "draw") {
          const drawn = next.elements.find(({ id }) => id === interaction.elementId);
          if (drawn?.type === "connector") {
            const last = drawn.points.at(-1) ?? [0, 0];
            const endPoint = { x: drawn.x + last[0], y: drawn.y + last[1] };
            const end = findElementAt(next.elements, endPoint, drawn.id);
            if (end) {
              next = updateElement(next, drawn.id, (element) =>
                element.type === "connector"
                  ? { ...element, endBinding: end.id }
                  : element,
              );
            }
          } else if (drawn?.type === "text") {
            setEditingId(drawn.id);
            setEditingText(drawn.text);
          } else if (drawn && drawn.width < 8 && drawn.height < 8) {
            next = updateElement(next, drawn.id, (element) => ({
              ...element,
              width: DEFAULT_NODE_WIDTH,
              height: DEFAULT_NODE_HEIGHT,
            }));
          }
        }
        commit(next, interaction.before);
        if (interaction.kind === "resize") {
          const resized = next.elements.find(
            (element) => element.id === interaction.elementId,
          );
          if (resized) syncDimensionDrafts(resized);
        }
        if (interaction.kind === "draw") setTool("select");
      }
      setInteraction(undefined);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Focus changes can release pointer capture before this event.
      }
    },
    [commit, interaction, reportLiveScene, syncDimensionDrafts],
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const root = rootRef.current;
      if (!root) return;
      const screen = eventPoint(event, root);
      const current = sceneRef.current;
      const delta = wheelDeltaInPixels(
        { x: event.deltaX, y: event.deltaY },
        event.deltaMode,
        root.clientHeight,
      );
      const camera = event.ctrlKey || event.metaKey
        ? zoomCameraAt(
            current.appState.camera,
            screen,
            current.appState.camera.zoom * Math.exp(-delta.y * 0.0015),
          )
        : panCamera(current.appState.camera, {
            x: -delta.x,
            y: -delta.y,
          });
      setSceneLive({ ...current, appState: { ...current.appState, camera } });
      if (wheelSaveRef.current !== undefined) {
        window.clearTimeout(wheelSaveRef.current);
      }
      wheelSaveRef.current = window.setTimeout(reportLiveScene, 180);
    },
    [reportLiveScene, setSceneLive],
  );

  useEffect(() => {
    const surface = svgRef.current;
    if (!surface) return undefined;
    const listener: EventListener = (event) => onWheel(event as WheelEvent);
    return addCanvasWheelListener(surface, listener);
  }, [onWheel]);

  const zoomBy = useCallback(
    (factor: number) => {
      const current = sceneRef.current;
      const size = viewportSize();
      const camera = zoomCameraAt(
        current.appState.camera,
        { x: size.width / 2, y: size.height / 2 },
        current.appState.camera.zoom * factor,
      );
      commit(
        { ...current, appState: { ...current.appState, camera } },
        current,
        false,
      );
    },
    [commit, viewportSize],
  );

  const setBackground = useCallback(
    (change: Partial<BoardScene["appState"]["background"]>) => {
      const before = sceneRef.current;
      commit(
        {
          ...before,
          appState: {
            ...before.appState,
            background: { ...before.appState.background, ...change },
          },
        },
        before,
      );
    },
    [commit],
  );

  const finishTextEditing = useCallback(
    (shouldCommit: boolean) => {
      if (!editingId) return;
      const current = sceneRef.current.elements.find(
        (element) => element.id === editingId,
      );
      if (shouldCommit && current?.type === "text" && !current.locked) {
        const before = sceneRef.current;
        let next = updateElement(before, editingId, (element) =>
          element.type === "text" ? { ...element, text: editingText } : element,
        );
        next = fitElementToContent(next, editingId, { growWidth: true });
        commit(next, before);
        setLabelDraft(editingText);
        const edited = next.elements.find((element) => element.id === editingId);
        if (edited) syncDimensionDrafts(edited);
      }
      setEditingId(undefined);
      setEditingText("");
    },
    [commit, editingId, editingText, syncDimensionDrafts],
  );

  const applySelectedInspector = useCallback(() => {
    if (!selectedId) return;
    const before = sceneRef.current;
    const selected = before.elements.find(
      (element) => element.id === selectedId && !element.deleted,
    );
    if (!selected || selected.locked) return;
    if (selected.type === "system" && labelDraft.trim().length === 0) {
      showError("A system component needs a title before it can be saved.");
      return;
    }
    try { parseReferenceLinks(metadataDraft.referenceLinks); }
    catch (cause) {
      showError(cause instanceof Error ? cause.message : "Check the reference links.");
      return;
    }
    const typographyDraft: ElementTypographyDraft = {
      fontSize: fontSizeDraftValue,
      bodyFontSize: bodyFontSizeDraft,
      align: textAlignDraft,
    };
    if (!isElementTypographyDraftValid(selected, typographyDraft)) {
      showError("Font sizes must be numbers from 1 to 512.");
      return;
    }
    const parsedWidth = Number(widthDraft);
    const parsedHeight = Number(heightDraft);
    // A perfectly horizontal or vertical connector has a genuine zero-sized
    // axis. Keep that value editable so changing its label never fails
    // validation merely because the line is straight.
    const minimumDimension = selected.type === "connector" ? 0 : 24;
    const minimumWidth = selected.type === "connector" || selected.type === "image"
      ? minimumDimension
      : minimumTextWidth(selected);
    if (
      !Number.isFinite(parsedWidth) ||
      !Number.isFinite(parsedHeight) ||
      parsedWidth < minimumWidth ||
      parsedHeight < minimumDimension
    ) {
      showError(
        `Width must be at least ${Math.ceil(minimumWidth)} and height at least ${minimumDimension} for this content.`,
      );
      return;
    }
    const width = widthDraft === dimensionDraft(selected.width)
      ? selected.width
      : parsedWidth;
    const height = heightDraft === dimensionDraft(selected.height)
      ? selected.height
      : parsedHeight;
    const currentText = getElementTextDraft(selected);
    const currentTypography = getElementTypographyDraft(selected);
    const contentSizingChanged =
      currentText.primary !== labelDraft ||
      currentText.secondary !== subtitleDraft ||
      (currentText.body ?? "") !== bodyDraft ||
      (currentText.capacity ?? "") !== capacityDraft ||
      currentTypography.fontSize !== typographyDraft.fontSize ||
      currentTypography.bodyFontSize !== typographyDraft.bodyFontSize;
    const widthWasEdited = widthDraft !== dimensionDraft(selected.width);
    const compactMetadata = Object.fromEntries(
      Object.entries(metadataDraft).filter(([, value]) => Boolean(value?.trim())),
    ) as CanvasElementMetadata;
    let next = updateElement(before, selected.id, (element) => {
      const withText = applyElementTextDraft(element, {
          primary: labelDraft,
          secondary: subtitleDraft,
          body: bodyDraft,
          capacity: capacityDraft,
      });
      return {
        ...applyElementTypographyDraft(withText, typographyDraft),
        ...(Object.keys(compactMetadata).length > 0
          ? { metadata: compactMetadata }
          : { metadata: undefined }),
      };
    });
    next = resizeElementAndBoundConnectors(
      next,
      selected.id,
      width,
      height,
    );
    next = contentSizingChanged && !widthWasEdited
      ? fitElementToContent(next, selected.id, { growWidth: true })
      : fitElementHeightToText(next, selected.id);
    commit(next, before);
    const applied = next.elements.find((element) => element.id === selected.id);
    if (applied) syncInspectorDrafts(applied);
    setInspectorMode("details");
  }, [
    bodyDraft,
    capacityDraft,
    bodyFontSizeDraft,
    commit,
    fontSizeDraftValue,
    heightDraft,
    labelDraft,
    metadataDraft,
    selectedId,
    showError,
    subtitleDraft,
    syncInspectorDrafts,
    textAlignDraft,
    widthDraft,
  ]);

  const saveSelectionToLibrary = useCallback(() => {
    if (!selectedId || !onSaveSelectionToLibrary) return;
    const before = sceneRef.current;
    const selected = before.elements.find(
      (element) => element.id === selectedId && !element.deleted,
    );
    if (
      !selected ||
      selected.type === "connector" ||
      selected.type === "image"
    ) {
      return;
    }

    if (
      hasElementInspectorChanges(selected, {
        primary: labelDraft,
        secondary: subtitleDraft,
        body: bodyDraft,
          capacity: capacityDraft,
        fontSize: fontSizeDraftValue,
        bodyFontSize: bodyFontSizeDraft,
        align: textAlignDraft,
        width: widthDraft,
        height: heightDraft,
        metadata: metadataDraft,
      })
    ) {
      showError("Apply the pending element changes before saving this component.");
      return;
    }
    onSaveSelectionToLibrary(structuredClone(selected));
  }, [
    bodyDraft,
    capacityDraft,
    bodyFontSizeDraft,
    fontSizeDraftValue,
    heightDraft,
    labelDraft,
    metadataDraft,
    onSaveSelectionToLibrary,
    selectedId,
    showError,
    subtitleDraft,
    textAlignDraft,
    widthDraft,
  ]);

  const handleImageFiles = useCallback(
    async (files: FileList | readonly File[], at?: Point) => {
      for (const file of Array.from(files)) {
        try {
          await addImage(file, at);
        } catch (cause) {
          showError(
            cause instanceof Error ? cause.message : "The image could not be added.",
          );
        }
      }
    },
    [addImage, showError],
  );

  const onDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDraggingImage(false);
      const root = rootRef.current;
      if (!root || event.dataTransfer.files.length === 0) return;
      const world = screenToWorld(
        eventPoint(event, root),
        sceneRef.current.appState.camera,
      );
      void handleImageFiles(event.dataTransfer.files, world);
    },
    [handleImageFiles],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && selectedIds.length > 0) {
        event.preventDefault();
        setSelectedIds([]);
        setEditingId(undefined);
        setEditingText("");
        rootRef.current?.focus();
        return;
      }
      if (event.target !== event.currentTarget) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      }
      const shortcuts: Partial<Record<string, CanvasTool>> = {
        v: "select",
        h: "hand",
        r: "rectangle",
        o: "ellipse",
        d: "diamond",
        c: "connector",
        t: "text",
      };
      const shortcut = shortcuts[event.key.toLocaleLowerCase()];
      if (shortcut && !event.metaKey && !event.ctrlKey) setTool(shortcut);
    },
    [deleteSelection, redo, selectedIds.length, undo],
  );

  const onPaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      const images = Array.from(event.clipboardData.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (images.length > 0) {
        event.preventDefault();
        void handleImageFiles(images);
      }
    },
    [handleImageFiles],
  );

  const openDetails = useCallback((id: string, navigate = false, toggle = false) => {
    if (toggle && selectedId === id && inspectorMode === "details" && !backgroundOpen) {
      setSelectedIds([]);
      rootRef.current?.focus();
      return;
    }
    const current = sceneRef.current;
    const element = current.elements.find(item => item.id === id && !item.deleted);
    if (!element) return;
    setSelectedIds([id]);
    setInspectorMode("details");
    setBackgroundOpen(false);
    setEditingId(undefined);
    if (navigate) {
      const viewport = viewportSize();
      const available = { ...viewport, width: Math.max(240, viewport.width - 402) };
      const camera = fitCameraToBounds(getElementBounds(element), available, 48);
      commit({ ...current, appState: { ...current.appState, camera } }, current, false);
    }
    requestAnimationFrame(() => { inspectorRef.current?.focus(); inspectorRef.current?.scrollTo(0, 0); });
  }, [backgroundOpen, commit, inspectorMode, selectedId, viewportSize]);

  const camera = scene.appState.camera;
  const background = scene.appState.background;
  const patternSize = Math.max(6, background.spacing * camera.zoom);
  const patternX = ((camera.x % patternSize) + patternSize) % patternSize;
  const patternY = ((camera.y % patternSize) + patternSize) % patternSize;
  const patternId = `canvas-pattern-${board.id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
  const visibleElements = scene.elements.filter((element) => !element.deleted);
  const parentIds = new Set(visibleElements.map((element) => element.parentId));
  const backgroundIds = new Set(visibleElements.filter((element) =>
    element.type === "shape" && (parentIds.has(element.id) ||
      (!element.label && !element.iconId && element.width * element.height >= 120_000)),
  ).map((element) => element.id));
  const selectedElements = visibleElements.filter((element) =>
    selectedIds.includes(element.id),
  );
  const selectedElement = visibleElements.find((element) => element.id === selectedId);
  const selectedText = selectedElement
    ? getElementTextDraft(selectedElement)
    : undefined;
  const selectedInspectorChanged = Boolean(
    selectedText &&
      selectedElement &&
      hasElementInspectorChanges(selectedElement, {
        primary: labelDraft,
        secondary: subtitleDraft,
        body: bodyDraft,
          capacity: capacityDraft,
        fontSize: fontSizeDraftValue,
        bodyFontSize: bodyFontSizeDraft,
        align: textAlignDraft,
        width: widthDraft,
        height: heightDraft,
        metadata: metadataDraft,
      }),
  );
  const selectedProvenance = selectedElement
    ? getElementVisualProvenance(selectedElement)
    : undefined;
  const selectedMinimumWidth = selectedElement &&
    selectedElement.type !== "connector" &&
    selectedElement.type !== "image"
    ? Math.ceil(minimumTextWidth(selectedElement))
    : selectedElement?.type === "connector" ? 0 : 24;
  const allElementsLocked =
    visibleElements.length > 0 && visibleElements.every((element) => element.locked);
  const allElementsUnlocked = visibleElements.every((element) => !element.locked);
  const selectedElementsLocked =
    selectedElements.length > 0 && selectedElements.every((element) => element.locked);
  const hasDeletableSelection = selectedElements.some((element) => !element.locked);
  const marqueeBounds = interaction?.kind === "marquee"
    ? {
        x: Math.min(interaction.startWorld.x, interaction.currentWorld.x),
        y: Math.min(interaction.startWorld.y, interaction.currentWorld.y),
        width: Math.abs(interaction.currentWorld.x - interaction.startWorld.x),
        height: Math.abs(interaction.currentWorld.y - interaction.startWorld.y),
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={`editor-canvas${interaction?.kind === "pan" ? " is-panning" : ""}`}
      data-tool={tool}
      aria-label={`Infinite drawing canvas for ${board.name}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => {
        if (event.code === "Space") setSpacePressed(false);
      }}
      onBlur={() => setSpacePressed(false)}
      onPaste={onPaste}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) setDraggingImage(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDraggingImage(false);
        }
      }}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        className="canvas-surface"
        role="img"
        aria-label={`${board.name}, ${visibleElements.length} canvas elements`}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
      >
        <title>{board.name}</title>
        <defs>
          <pattern id={patternId} x={patternX} y={patternY} width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
            {background.pattern === "dots" ? (
              <circle cx={patternSize / 2} cy={patternSize / 2} r={Math.max(0.7, camera.zoom)} fill="#374151" fillOpacity={0.2} />
            ) : null}
            {background.pattern === "grid" ? (
              <path d={`M ${patternSize} 0 L 0 0 0 ${patternSize}`} fill="none" stroke="#374151" strokeOpacity={0.14} strokeWidth={1} />
            ) : null}
          </pattern>
        </defs>
        <rect data-canvas-background="true" width="100%" height="100%" fill={background.color} />
        {background.pattern !== "solid" ? (
          <rect data-canvas-pattern="true" width="100%" height="100%" fill={`url(#${patternId})`} pointerEvents="none" />
        ) : null}
        <g data-scene-root="true" transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
          {visibleElements
            .filter((element) => backgroundIds.has(element.id))
            .map((element) => (
              <SceneElementView
                key={element.id}
                element={element}
                selected={false}
                editing={false}
                editingText=""
                onPointerDown={onElementPointerDown}
                onDoubleClick={() => undefined}
                onEditingTextChange={() => undefined}
                onFinishEditing={() => undefined}
                onResizePointerDown={onResizePointerDown}
              />
            ))}
          {visibleElements
            .filter((element): element is CanvasConnectorElement => element.type === "connector")
            .map((element) => (
              <ConnectorView key={element.id} element={element} selected={false} layer="path" onPointerDown={onElementPointerDown} />
            ))}
          {visibleElements
            .filter((element): element is CanvasConnectorElement => element.type === "connector")
            .map((element) => (
              <ConnectorView key={element.id} element={element} selected={false} layer="label" onPointerDown={onElementPointerDown} />
            ))}
          {visibleElements
            .filter((element) => element.type !== "connector" && !backgroundIds.has(element.id))
            .map((element) => (
              <SceneElementView
                key={element.id}
                element={element}
                file={element.type === "image" ? scene.files[element.fileId] : undefined}
                selected={false}
                editing={editingId === element.id}
                editingText={editingText}
                onPointerDown={onElementPointerDown}
                onDoubleClick={(candidate) => {
                  if (candidate.type === "text" && !candidate.locked) {
                    setEditingId(candidate.id);
                    setEditingText(candidate.text);
                  }
                }}
                onEditingTextChange={setEditingText}
                onFinishEditing={finishTextEditing}
                onResizePointerDown={onResizePointerDown}
              />
            ))}
          {visibleElements.filter(element => element.type !== "connector" && hasArchitectureDetails(element) &&
            (camera.zoom >= 0.45 || element.id === selectedId)).map(element => {
            const bounds = getElementBounds(element);
            return <g key={`details-${element.id}`} className="canvas-details-badge" data-editor-overlay="true"
              aria-expanded={selectedId === element.id && inspectorMode === "details" && !backgroundOpen}
              aria-controls={`component-details-${board.id}`}
              data-details-for={element.id} role="button" tabIndex={0} aria-label={`Details for ${elementName(element)}`}
              transform={`translate(${bounds.x + bounds.width} ${bounds.y}) scale(${1 / camera.zoom})`}
              onPointerDown={event => event.stopPropagation()}
              onClick={event => { event.stopPropagation(); openDetails(element.id, false, true); }}
              onKeyDown={event => {
                event.stopPropagation();
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(element.id, true, true); }
              }}>
              <title>Open or close component details</title>
              <rect x={-70} y={-28} width={70} height={24} rx={7} />
              <text x={-59} y={-12}>Details ↗</text>
            </g>;
          })}
          {selectedElements.map((element) => (
            <ElementSelectionView
              key={element.id}
              element={element}
              onResizePointerDown={onResizePointerDown}
            />
          ))}
          {marqueeBounds ? (
            <rect
              data-editor-overlay="true"
              className="canvas-marquee"
              x={marqueeBounds.x}
              y={marqueeBounds.y}
              width={marqueeBounds.width}
              height={marqueeBounds.height}
              rx={6}
            />
          ) : null}
        </g>
      </svg>

      <div className="canvas-toolbar" role="toolbar" aria-label="Canvas tools">
        <div className="canvas-toolbar__group">
          {TOOL_ITEMS.slice(0, 2).map(({ tool: itemTool, label, key, icon: Icon }) => (
            <button key={itemTool} className={`canvas-tool${tool === itemTool ? " is-active" : ""}`} type="button" aria-label={`${label} (${key})`} title={`${label} · ${key}`} aria-pressed={tool === itemTool} onClick={() => setTool(itemTool)}>
              <Icon aria-hidden="true" /><kbd>{key}</kbd>
            </button>
          ))}
        </div>
        <div className="canvas-toolbar__group">
          {TOOL_ITEMS.slice(2).map(({ tool: itemTool, label, key, icon: Icon }) => (
            <button key={itemTool} className={`canvas-tool${tool === itemTool ? " is-active" : ""}`} type="button" aria-label={`${label} (${key})`} title={`${label} · ${key}`} aria-pressed={tool === itemTool} onClick={() => setTool(itemTool)}>
              <Icon aria-hidden="true" /><kbd>{key}</kbd>
            </button>
          ))}
          <button className="canvas-tool" type="button" aria-label="Add image" title="Add image · browse, drop, or paste" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus aria-hidden="true" />
          </button>
        </div>
        <div className="canvas-toolbar__group">
          <button className={`canvas-tool${backgroundOpen ? " is-active" : ""}`} type="button" aria-label="Canvas background" title="Canvas background" aria-expanded={backgroundOpen} onClick={() => setBackgroundOpen((open) => !open)}>
            <span className="canvas-background-swatch" style={{ "--canvas-swatch": background.color } as CSSProperties} />
          </button>
          <button className="canvas-tool" type="button" onClick={undo} disabled={!undoRef.current.length} aria-label="Undo"><Undo2 aria-hidden="true" /></button>
          <button className="canvas-tool" type="button" onClick={redo} disabled={!redoRef.current.length} aria-label="Redo"><Redo2 aria-hidden="true" /></button>
          <button
            className="canvas-tool"
            type="button"
            onClick={() => setSelectedLocked(!selectedElementsLocked)}
            disabled={selectedElements.length === 0}
            aria-label={selectedElementsLocked ? "Unlock selection" : "Lock selection"}
            title={selectedElementsLocked ? "Unlock selection" : "Lock selection"}
          >
            {selectedElementsLocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          </button>
          <button className="canvas-tool" type="button" onClick={deleteSelection} disabled={!hasDeletableSelection} aria-label="Delete selection"><Trash2 aria-hidden="true" /></button>
        </div>
      </div>

      <div className="canvas-lock-controls" role="group" aria-label="Board locking">
        <button type="button" onClick={() => setAllLocked(true)} disabled={allElementsLocked || visibleElements.length === 0}>
          <Lock aria-hidden="true" />
          Lock all
        </button>
        <button type="button" onClick={() => setAllLocked(false)} disabled={allElementsUnlocked || visibleElements.length === 0}>
          <LockOpen aria-hidden="true" />
          Unlock all
        </button>
      </div>

      {selectedElement && !backgroundOpen ? (
        <section
          ref={inspectorRef}
          id={`component-details-${board.id}`}
          className={`canvas-element-panel${inspectorMode === "details" ? " canvas-element-panel--reference" : ""}`}
          tabIndex={-1}
          aria-label="Selected element inspector"
          onWheel={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setSelectedIds([]);
              rootRef.current?.focus();
            }
          }}
        >
          <header className="canvas-element-panel__header">
            <div>
              <span>Selected</span>
              <strong>
                {inspectorMode === "details" ? elementName(selectedElement) : selectedElement.type === "system"
                  ? "System component"
                  : selectedElement.type === "shape"
                    ? "Shape"
                    : selectedElement.type === "connector"
                      ? "Connector"
                      : selectedElement.type === "text"
                        ? "Text"
                        : "Image"}
              </strong>
            </div>
            <div className="canvas-element-panel__header-actions">
              <button
                type="button"
                className="canvas-element-panel__lock"
                onClick={() => setSelectedLocked(!selectedElement.locked)}
                aria-label={selectedElement.locked ? "Unlock selected element" : "Lock selected element"}
              >
                {selectedElement.locked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
                {selectedElement.locked ? "Unlock" : "Lock"}
              </button>
              <button
                type="button"
                className="canvas-element-panel__close"
                onClick={() => {
                  setSelectedIds([]);
                  rootRef.current?.focus();
                }}
                aria-label="Close element inspector"
                title="Close inspector · Escape"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </header>

          {inspectorMode === "details" ? <ComponentDetails key={selectedElement.id} element={selectedElement} elements={visibleElements}
            onEdit={() => { syncInspectorDrafts(selectedElement); setInspectorMode("edit"); }}
            onNavigate={id => openDetails(id, true)} /> : <>
          <button type="button" onClick={() => { syncInspectorDrafts(selectedElement); setInspectorMode("details"); }}>
            {selectedInspectorChanged ? "Cancel changes" : "View details"}
          </button>
          <label className="canvas-element-panel__field">
            {selectedElement.type === "system"
              ? "Title"
              : selectedElement.type === "image"
                ? "Alt text"
                : selectedElement.type === "text"
                  ? "Body / explanation"
                  : "Label"}
            {selectedElement.type === "text" || selectedElement.type === "shape" || selectedElement.type === "connector" ? (
              <textarea
                value={labelDraft}
                disabled={selectedElement.locked}
                aria-label={selectedElement.type === "text" ? "Body or explanation" : "Element label"}
                rows={selectedElement.type === "text" ? 4 : 2}
                onChange={(event) => setLabelDraft(event.target.value)}
              />
            ) : (
              <input
                value={labelDraft}
                disabled={selectedElement.locked}
                aria-label={selectedElement.type === "system" ? "Component title" : selectedElement.type === "image" ? "Image alt text" : "Element label"}
                onChange={(event) => setLabelDraft(event.target.value)}
              />
            )}
          </label>

          {selectedElement.type === "system" ? (
            <label className="canvas-element-panel__field">
              Subtitle
              <textarea
                value={subtitleDraft}
                disabled={selectedElement.locked}
                aria-label="Component subtitle"
                rows={2}
                onChange={(event) => setSubtitleDraft(event.target.value)}
              />
            </label>
          ) : null}

          {selectedElement.type === "system" ? (
            <label className="canvas-element-panel__field">
              Body / explanation
              <textarea
                value={bodyDraft}
                disabled={selectedElement.locked}
                aria-label="Component body or explanation"
                rows={4}
                onChange={(event) => setBodyDraft(event.target.value)}
              />
            </label>
          ) : null}

          {selectedElement.type === "system" ? (
            <label className="canvas-element-panel__field">
              Capacity annotation
              <textarea value={capacityDraft} disabled={selectedElement.locked}
                aria-label="Capacity annotation" rows={2} maxLength={240}
                onChange={(event) => setCapacityDraft(event.target.value)} />
            </label>
          ) : null}

          {selectedElement.type !== "image" ? (
            <div className="canvas-element-panel__typography">
              <label className="canvas-element-panel__field">
                {selectedElement.type === "system"
                  ? "Title font size"
                  : selectedElement.type === "text"
                    ? "Text font size"
                    : selectedElement.type === "connector"
                      ? "Connector label font size"
                      : "Shape label font size"}
                <input
                  type="number"
                  min="1"
                  max="512"
                  step="1"
                  value={fontSizeDraftValue}
                  disabled={selectedElement.locked}
                  aria-label={
                    selectedElement.type === "system"
                      ? "Title font size"
                      : selectedElement.type === "text"
                        ? "Text font size"
                        : selectedElement.type === "connector"
                          ? "Connector label font size"
                          : "Shape label font size"
                  }
                  onChange={(event) => setFontSizeDraftValue(event.target.value)}
                />
              </label>
              {selectedElement.type === "system" ? (
                <label className="canvas-element-panel__field">
                  Body font size
                  <input
                    type="number"
                    min="1"
                    max="512"
                    step="1"
                    value={bodyFontSizeDraft}
                    disabled={selectedElement.locked}
                    aria-label="Body font size"
                    onChange={(event) => setBodyFontSizeDraft(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="canvas-element-panel__field">
                Text alignment
                <select
                  value={textAlignDraft}
                  disabled={selectedElement.locked}
                  aria-label="Text alignment"
                  onChange={(event) =>
                    setTextAlignDraft(event.target.value as CanvasTextAlign)
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          ) : null}

          <div className="canvas-element-panel__dimensions">
            <label className="canvas-element-panel__field">
              Width
              <input
                type="number"
                min={selectedMinimumWidth}
                step="1"
                value={widthDraft}
                disabled={selectedElement.locked}
                aria-label="Element width"
                onChange={(event) => setWidthDraft(event.target.value)}
              />
            </label>
            <label className="canvas-element-panel__field">
              Height
              <input
                type="number"
                min={selectedElement.type === "connector" ? 0 : 24}
                step="1"
                value={heightDraft}
                disabled={selectedElement.locked}
                aria-label="Element height"
                onChange={(event) => setHeightDraft(event.target.value)}
              />
            </label>
          </div>

          <details className="canvas-element-panel__details">
            <summary>Architecture details</summary>
            <div className="canvas-element-panel__detail-fields">
              {METADATA_FIELDS.map(({ key, label }) => (
                <label key={key} className="canvas-element-panel__field">
                  {label}
                  {key === "referenceLinks" ? <span className="reference-links-help">One link per line: Name | https://address. Links open in a new tab after Apply changes.</span> : null}
                  {key === "inputs" || key === "outputs" || key === "explanation" || key === "referenceLinks" ? (
                    <textarea
                      rows={key === "explanation" || key === "referenceLinks" ? 4 : 2}
                      placeholder={key === "referenceLinks" ? "Documentation | https://example.com/docs" : undefined}
                      maxLength={4000}
                      value={metadataDraft[key] ?? ""}
                      disabled={selectedElement.locked}
                      aria-label={label}
                      onChange={(event) =>
                        setMetadataDraft((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      maxLength={4000}
                      value={metadataDraft[key] ?? ""}
                      disabled={selectedElement.locked}
                      aria-label={label}
                      onChange={(event) =>
                        setMetadataDraft((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </details>

          </>}

          {selectedProvenance ? (
            <details className="canvas-element-panel__details">
              <summary>Verified visual provenance</summary>
              <dl className="canvas-element-panel__provenance">
                <div><dt>Source / package</dt><dd>{selectedProvenance.source}</dd></div>
                <div><dt>Name / export</dt><dd>{selectedProvenance.name}</dd></div>
                <div><dt>Source file</dt><dd>{selectedProvenance.sourceFile}</dd></div>
                <div><dt>Type</dt><dd>{selectedProvenance.kind}</dd></div>
                <div><dt>Category</dt><dd>{selectedProvenance.category}</dd></div>
                <div><dt>Why this visual</dt><dd>{selectedProvenance.why}</dd></div>
              </dl>
              <p className="canvas-element-panel__provenance-note">
                This icon represents the concept; it is not the runtime object itself.
              </p>
            </details>
          ) : null}

          {selectedElement.locked ? (
            <p className="canvas-element-panel__status"><Lock aria-hidden="true" /> Locked elements stay selectable, but cannot be edited, moved, resized, or deleted.</p>
          ) : null}

          {inspectorMode === "edit" ? <div className="canvas-element-panel__actions">
            <button
              type="button"
              onClick={applySelectedInspector}
              disabled={selectedElement.locked || !selectedInspectorChanged}
            >
              Apply changes
            </button>
            {onSaveSelectionToLibrary ? (
              <button
                type="button"
                onClick={saveSelectionToLibrary}
                disabled={
                  selectedElement.type === "connector" ||
                  selectedElement.type === "image" ||
                  selectedInspectorChanged
                }
                title={
                  selectedElement.type === "connector"
                    ? "Connectors cannot be saved as standalone components"
                    : selectedElement.type === "image"
                      ? "Images depend on board assets and cannot be saved as components yet"
                      : selectedInspectorChanged
                        ? "Apply pending changes before saving this component"
                        : "Save this customized element as a reusable component"
                }
              >
                <BookmarkPlus aria-hidden="true" />
                Save component
              </button>
            ) : null}
          </div> : null}
        </section>
      ) : null}

      {backgroundOpen ? (
        <section className="canvas-background-panel" aria-label="Canvas background settings">
          <label className="canvas-background-panel__label">
            Canvas color
            <input type="color" value={background.color} onChange={(event) => setBackground({ color: event.target.value })} />
          </label>
          <div className="canvas-background-options">
            {(["solid", "dots", "grid"] as const).map((pattern) => (
              <button type="button" key={pattern} className={background.pattern === pattern ? "is-active" : undefined} aria-pressed={background.pattern === pattern} onClick={() => setBackground({ pattern })}>
                <span className={pattern === "solid" ? undefined : `is-${pattern}`} style={{ "--canvas-preview": background.color } as CSSProperties} />
                {pattern === "solid" ? "Plain" : pattern === "dots" ? "Dots" : "Grid"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <LayoutControls
        key={board.id}
        value={scene.appState.layoutSpacing}
        onTidy={tidyLayout}
        onUnlockAndTidy={visibleElements.some(element => element.locked) ? spacing => tidyLayout(spacing, true) : undefined}
        disabled={visibleElements.length === 0 || visibleElements.some((element) => element.locked)}
        disabledReason={visibleElements.length === 0 ? "Add elements to tidy the layout" : "Unlock all elements to tidy layout"}
      />

      <div className="canvas-zoom-controls" aria-label="Zoom controls">
        <button type="button" onClick={() => zoomBy(0.82)} aria-label="Zoom out"><Minus aria-hidden="true" /></button>
        <output aria-label="Current zoom">{Math.round(camera.zoom * 100)}%</output>
        <button type="button" onClick={() => zoomBy(1.22)} aria-label="Zoom in"><Plus aria-hidden="true" /></button>
        <button type="button" onClick={zoomToFit} aria-label="Fit all content to viewport" title="Fit all content"><Scan aria-hidden="true" /></button>
        <button type="button" onClick={zoomToSelection} disabled={selectedElements.length === 0} aria-label="Fit selected element to viewport" title="Fit selection">
          <span aria-hidden="true">1</span>
        </button>
      </div>

      <p className="canvas-hint">Click canvas to focus · Wheel pans · Ctrl/Cmd + wheel zooms · Space-drag pans</p>
      {error ? (
        <div className="canvas-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(undefined)} aria-label="Dismiss image error"><X aria-hidden="true" /></button>
        </div>
      ) : null}
      {draggingImage ? <div className="canvas-drop-overlay">Drop image onto the canvas</div> : null}
      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          if (event.target.files) void handleImageFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export const areEditorCanvasPropsEqual = (
  previous: EditorCanvasProps,
  next: EditorCanvasProps,
): boolean =>
  previous.board.id === next.board.id &&
  previous.board.name === next.board.name &&
  previous.board.scene === next.board.scene &&
  previous.onApiReady === next.onApiReady &&
  previous.onSceneChange === next.onSceneChange &&
  previous.onError === next.onError &&
  previous.onSaveSelectionToLibrary === next.onSaveSelectionToLibrary;

export const EditorCanvas = memo(EditorCanvasComponent, areEditorCanvasPropsEqual);
