import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
  type BoardScene,
  type CanvasConnectorElement,
  type CanvasElementStyle,
  type CanvasShapeElement,
  type CanvasSystemElement,
  type CanvasTextElement,
} from "../shared/contracts.js";
import {
  addCanvasWheelListener,
  applyElementTypographyDraft,
  applyElementTextDraft,
  EditorCanvas,
  areEditorCanvasPropsEqual,
  findElementsInsideArea,
  getElementTypographyDraft,
  getElementTextDraft,
  hasElementInspectorChanges,
  isElementTypographyDraftValid,
  type EditorCanvasProps,
} from "../src/editor/EditorCanvas.js";
import {
  ConnectorView,
  SceneElementView,
} from "../src/editor/CanvasElementView.js";

const style: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#3972d6",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#1d2939",
};

const board: BoardDocument = {
  schemaVersion: BOARD_SCHEMA_VERSION,
  id: "board-one",
  name: "Board one",
  revision: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  scene: createEmptyScene(),
};

const onApiReady = vi.fn();
const onSceneChange = vi.fn();

const props = (
  candidate: BoardDocument,
  overrides: Partial<EditorCanvasProps> = {},
): EditorCanvasProps => ({
  board: candidate,
  onApiReady,
  onSceneChange,
  ...overrides,
});

const systemNode: CanvasSystemElement = {
  id: "service-node",
  type: "system",
  x: 320,
  y: 160,
  width: 224,
  height: 112,
  rotation: 0,
  style,
  iconId: "application-server",
  title: "Application service",
  subtitle: "Routes a request",
  variant: "service",
};

const connector: CanvasConnectorElement = {
  id: "request-path",
  type: "connector",
  x: 80,
  y: 216,
  width: 240,
  height: 1,
  rotation: 0,
  style: { ...style, fill: "transparent" },
  points: [[0, 0], [240, 0]],
  startArrow: "none",
  endArrow: "arrow",
  label: "request",
  endBinding: systemNode.id,
};

const frame: CanvasShapeElement = {
  id: "routing-frame",
  type: "shape",
  shape: "rectangle",
  x: 40,
  y: 100,
  width: 560,
  height: 240,
  rotation: 0,
  style: { ...style, fill: "#eef2ff", stroke: "#a5b4fc" },
};

const note: CanvasTextElement = {
  id: "mechanism-note",
  type: "text",
  x: 0,
  y: 0,
  width: 220,
  height: 80,
  rotation: 0,
  style,
  text: "A cache hit ends in RAM.",
  fontSize: 20,
  fontFamily: "sans",
  fontWeight: 600,
  align: "left",
};

const visualScene = (pattern: "solid" | "dots" | "grid"): BoardScene => ({
  ...createEmptyScene(),
  // Deliberately unordered: the renderer establishes frame → route → node layers.
  elements: [systemNode, connector, frame],
  appState: {
    camera: { x: 120, y: -40, zoom: 0.75 },
    background: { color: "#eef2ff", pattern, spacing: 28 },
  },
});

describe("EditorCanvas render boundary", () => {
  it("area-selects contained elements without capturing a surrounding frame", () => {
    expect(
      findElementsInsideArea(
        [frame, systemNode, connector],
        { x: 570, y: 300 },
        { x: 300, y: 140 },
      ),
    ).toEqual(["service-node"]);
  });

  it("ignores revision-only wrappers produced by remote save acknowledgements", () => {
    const acknowledged = {
      ...board,
      revision: 2,
      updatedAt: "2026-01-01T00:00:01.000Z",
    };

    expect(areEditorCanvasPropsEqual(props(board), props(acknowledged))).toBe(true);
  });

  it("rerenders for a different scene, name, board, or callback", () => {
    expect(
      areEditorCanvasPropsEqual(
        props(board),
        props({ ...board, scene: { ...board.scene } }),
      ),
    ).toBe(false);
    expect(
      areEditorCanvasPropsEqual(props(board), props({ ...board, name: "Renamed" })),
    ).toBe(false);
    expect(
      areEditorCanvasPropsEqual(props(board), props({ ...board, id: "board-two" })),
    ).toBe(false);
    expect(
      areEditorCanvasPropsEqual(
        props(board),
        props(board, { onSceneChange: vi.fn() }),
      ),
    ).toBe(false);
    expect(
      areEditorCanvasPropsEqual(props(board), props(board, { onError: vi.fn() })),
    ).toBe(false);
  });

  it("renders semantic nodes and connectors on the transformed native SVG", () => {
    const rendered = renderToStaticMarkup(
      createElement(EditorCanvas, {
        ...props({ ...board, name: "Routing map", scene: visualScene("grid") }),
      }),
    );

    expect(rendered).toContain("Infinite drawing canvas for Routing map");
    expect(rendered).toContain('data-canvas-background="true"');
    expect(rendered).toContain('fill="#eef2ff"');
    expect(rendered).toContain('data-canvas-pattern="true"');
    expect(rendered).toContain(
      'data-scene-root="true" transform="translate(120 -40) scale(0.75)"',
    );
    expect(rendered).toContain('data-element-id="service-node"');
    expect(rendered).toContain("Application service");
    expect(rendered).toContain('data-element-id="request-path"');
    expect(rendered).toContain('data-element-id="routing-frame"');
    expect(rendered).toContain("request");
    expect(rendered.indexOf('data-element-id="routing-frame"')).toBeLessThan(
      rendered.indexOf('data-element-id="request-path"'),
    );
    expect(rendered.indexOf('data-element-id="request-path"')).toBeLessThan(
      rendered.indexOf('data-element-id="service-node"'),
    );
  });

  it("renders dots and omits the pattern overlay for a plain background", () => {
    const dotted = renderToStaticMarkup(
      createElement(EditorCanvas, {
        ...props({ ...board, scene: visualScene("dots") }),
      }),
    );
    const plain = renderToStaticMarkup(
      createElement(EditorCanvas, {
        ...props({ ...board, scene: visualScene("solid") }),
      }),
    );

    expect(dotted).toContain('data-canvas-pattern="true"');
    expect(dotted).toMatch(/<pattern[^>]*><circle/);
    expect(plain).not.toContain('data-canvas-pattern="true"');
  });

  it("exposes board-wide and selected-element locking controls", () => {
    const rendered = renderToStaticMarkup(
      createElement(EditorCanvas, props({ ...board, scene: visualScene("dots") })),
    );

    expect(rendered).toContain('aria-label="Board locking"');
    expect(rendered).toContain("Lock all");
    expect(rendered).toContain("Unlock all");
    expect(rendered).toContain('aria-label="Lock selection"');
  });
});

describe("editable element text", () => {
  it("customizes system title, subtitle, and body without losing visual identity", () => {
    const customized = applyElementTextDraft(systemNode, {
      primary: "Feed cache",
      secondary: "RAM copy · source of truth is the database",
      body: "A miss returns to the API before it reads the database.",
    });

    expect(customized).toMatchObject({
      type: "system",
      title: "Feed cache",
      subtitle: "RAM copy · source of truth is the database",
      body: "A miss returns to the API before it reads the database.",
      iconId: "application-server",
      variant: "service",
      style,
      x: 320,
      y: 160,
    });
    expect(getElementTextDraft(customized)).toEqual({
      primary: "Feed cache",
      secondary: "RAM copy · source of truth is the database",
      body: "A miss returns to the API before it reads the database.",
    });
  });

  it("customizes and clears shape and connector labels", () => {
    const labeledShape = applyElementTextDraft(frame, {
      primary: "Cache tier",
      secondary: "ignored",
    });
    const labeledConnector = applyElementTextDraft(connector, {
      primary: "cache miss",
      secondary: "ignored",
    });

    expect(labeledShape).toMatchObject({ label: "Cache tier" });
    expect(labeledConnector).toMatchObject({ label: "cache miss" });
    expect(
      applyElementTextDraft(labeledConnector, { primary: "", secondary: "" }),
    ).not.toHaveProperty("label");
  });

  it("requires pending inspector edits to be applied before library save", () => {
    const currentDraft = {
      primary: systemNode.title,
      secondary: systemNode.subtitle ?? "",
      body: "",
      fontSize: "15",
      bodyFontSize: "11",
      align: "left" as const,
      width: "224",
      height: "112",
      metadata: {},
    };

    expect(hasElementInspectorChanges(systemNode, currentDraft)).toBe(false);
    expect(
      hasElementInspectorChanges(systemNode, {
        ...currentDraft,
        primary: "Pending title",
      }),
    ).toBe(true);
    expect(
      hasElementInspectorChanges(systemNode, {
        ...currentDraft,
        width: "300",
      }),
    ).toBe(true);
    expect(
      hasElementInspectorChanges(systemNode, {
        ...currentDraft,
        fontSize: "18",
      }),
    ).toBe(true);
    expect(
      hasElementInspectorChanges(systemNode, {
        ...currentDraft,
        bodyFontSize: "14",
      }),
    ).toBe(true);
    expect(
      hasElementInspectorChanges(systemNode, {
        ...currentDraft,
        align: "right",
      }),
    ).toBe(true);
  });

  it("applies typography per element type while preserving unrelated fields", () => {
    expect(getElementTypographyDraft(systemNode)).toEqual({
      fontSize: "15",
      bodyFontSize: "11",
      align: "left",
    });
    expect(
      applyElementTypographyDraft(
        systemNode,
        getElementTypographyDraft(systemNode),
      ),
    ).not.toHaveProperty("titleFontSize");

    const readableSystem = applyElementTypographyDraft(systemNode, {
      fontSize: "18",
      bodyFontSize: "14",
      align: "right",
    });
    const readableShape = applyElementTypographyDraft(
      { ...frame, label: "Placement" },
      { fontSize: "17", bodyFontSize: "", align: "left" },
    );
    const readableConnector = applyElementTypographyDraft(connector, {
      fontSize: "14",
      bodyFontSize: "",
      align: "right",
    });
    const readableText = applyElementTypographyDraft(note, {
      fontSize: "22",
      bodyFontSize: "",
      align: "center",
    });

    expect(readableSystem).toMatchObject({
      titleFontSize: 18,
      bodyFontSize: 14,
      align: "right",
      iconId: systemNode.iconId,
      style,
      x: systemNode.x,
      width: systemNode.width,
    });
    expect(readableShape).toMatchObject({ fontSize: 17, align: "left" });
    expect(readableConnector).toMatchObject({
      fontSize: 14,
      align: "right",
      points: connector.points,
      endBinding: systemNode.id,
    });
    expect(readableText).toMatchObject({ fontSize: 22, align: "center" });

    expect(
      isElementTypographyDraftValid(systemNode, {
        fontSize: "",
        bodyFontSize: "14",
        align: "left",
      }),
    ).toBe(false);
    expect(
      isElementTypographyDraftValid(systemNode, {
        fontSize: "18",
        bodyFontSize: "513",
        align: "left",
      }),
    ).toBe(false);
    expect(() =>
      applyElementTypographyDraft(systemNode, {
        fontSize: "0",
        bodyFontSize: "14",
        align: "left",
      }),
    ).toThrow(/1 to 512/);
  });
});

describe("editable element typography rendering", () => {
  const viewCallbacks = {
    selected: false,
    editing: false,
    editingText: "",
    onPointerDown: () => undefined,
    onDoubleClick: () => undefined,
    onEditingTextChange: () => undefined,
    onFinishEditing: () => undefined,
    onResizePointerDown: () => undefined,
  };

  it("renders configured card, shape, text, and connector typography", () => {
    const cardMarkup = renderToStaticMarkup(
      createElement(SceneElementView, {
        ...viewCallbacks,
        element: {
          ...systemNode,
          body: "The database remains authoritative.",
          titleFontSize: 18,
          bodyFontSize: 14,
          align: "right",
        },
      }),
    );
    const shapeMarkup = renderToStaticMarkup(
      createElement(SceneElementView, {
        ...viewCallbacks,
        element: {
          ...frame,
          label: "Key placement",
          iconId: "virtual-node",
          fontSize: 17,
          align: "left",
        },
      }),
    );
    const textMarkup = renderToStaticMarkup(
      createElement(SceneElementView, {
        ...viewCallbacks,
        element: { ...note, fontSize: 22, align: "center" },
      }),
    );
    const connectorMarkup = renderToStaticMarkup(
      createElement(ConnectorView, {
        element: { ...connector, fontSize: 14, align: "right" },
        selected: false,
        onPointerDown: () => undefined,
      }),
    );

    expect(cardMarkup).toContain('font-size="18"');
    expect(cardMarkup).toContain('font-size="13"');
    expect(cardMarkup).toContain('font-size="14"');
    expect(cardMarkup).toContain('text-anchor="end"');
    expect(shapeMarkup).toContain('font-size="17"');
    expect(shapeMarkup).toContain('text-anchor="start"');
    expect(shapeMarkup).toContain('viewBox="0 0 24 24"');
    expect(shapeMarkup).toContain('cx="20" cy="12" r="2.5"');
    expect(textMarkup).toContain('font-size="22"');
    expect(textMarkup).toContain('text-anchor="middle"');
    expect(connectorMarkup).toContain('font-size="14"');
    expect(connectorMarkup).toContain('text-anchor="end"');
  });

  it("keeps legacy rendering defaults when optional typography is absent", () => {
    const cardMarkup = renderToStaticMarkup(
      createElement(SceneElementView, {
        ...viewCallbacks,
        element: { ...systemNode, body: "Legacy body size" },
      }),
    );
    const shapeMarkup = renderToStaticMarkup(
      createElement(SceneElementView, {
        ...viewCallbacks,
        element: { ...frame, label: "Legacy shape label" },
      }),
    );
    const connectorMarkup = renderToStaticMarkup(
      createElement(ConnectorView, {
        element: connector,
        selected: false,
        onPointerDown: () => undefined,
      }),
    );

    expect(cardMarkup).toContain('font-size="15"');
    expect(cardMarkup).toContain('font-size="10"');
    expect(cardMarkup).toContain('font-size="11"');
    expect(shapeMarkup).toContain('font-size="14"');
    expect(shapeMarkup).toContain('text-anchor="middle"');
    expect(connectorMarkup).toContain('font-size="10"');
    expect(connectorMarkup).toContain('text-anchor="middle"');
  });
});

describe("canvas wheel ownership", () => {
  it("installs and removes a native non-passive wheel listener", () => {
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as EventTarget;
    const listener = vi.fn() as EventListener;

    const remove = addCanvasWheelListener(target, listener);
    expect(target.addEventListener).toHaveBeenCalledWith(
      "wheel",
      listener,
      { passive: false },
    );

    remove();
    expect(target.removeEventListener).toHaveBeenCalledWith(
      "wheel",
      listener,
      { passive: false },
    );
  });
});
