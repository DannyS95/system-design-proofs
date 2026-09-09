import { describe, expect, it } from "vitest";

import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
  type CanvasElementStyle,
} from "../shared/contracts.js";
import {
  ContractValidationError,
  isBoardDocument,
  parseBoardDocument,
  parseBoardId,
  parseBoardScene,
  parseCreateBoardInput,
  parseImportedScene,
  parseSaveBoardInput,
} from "../shared/validation.js";

const style: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#334155",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#0f172a",
};

const validDocument: BoardDocument = {
  schemaVersion: BOARD_SCHEMA_VERSION,
  id: "routing-board",
  name: "Routing board",
  revision: 2,
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:01:00.000Z",
  scene: {
    elements: [
      {
        id: "node-1",
        type: "system",
        x: 10,
        y: 20,
        width: 216,
        height: 104,
        rotation: 0,
        style,
        iconId: "global-routing",
        title: "Global routing",
        subtitle: "Closest healthy edge",
        body: "Chooses a region before cluster routing begins.",
        variant: "routing",
        metadata: {
          runtimeLocation: "edge control plane",
          layer: "global routing",
          sourcePath: "src/routing.ts",
          packageName: "project-owned",
          objectType: "service",
          inputs: "client address and health",
          outputs: "selected region",
          ownership: "infrastructure team",
          explanation: "This icon is a visual representation, not the process.",
        },
      },
    ],
    appState: {
      camera: { x: 30, y: -20, zoom: 1.25 },
      background: { color: "#f8fafc", pattern: "dots", spacing: 24 },
    },
    files: {},
  },
};

describe("board contract validation", () => {
  it("accepts a typed schema-v2 board document", () => {
    expect(parseBoardDocument(validDocument)).toEqual(validDocument);
    expect(isBoardDocument(validDocument)).toBe(true);
    expect(BOARD_SCHEMA_VERSION).toBe(2);
  });

  it("round-trips optional typography without hydrating legacy defaults", () => {
    const legacyScene = validDocument.scene;
    const legacyParsed = parseBoardScene(legacyScene);
    expect(legacyParsed).toEqual(legacyScene);
    expect(legacyParsed.elements[0]).not.toHaveProperty("titleFontSize");
    expect(legacyParsed.elements[0]).not.toHaveProperty("align");

    const system = {
      ...legacyScene.elements[0],
      titleFontSize: 18,
      bodyFontSize: 14,
      align: "right" as const,
    };
    const shape = {
      id: "shape-note",
      type: "shape" as const,
      shape: "rectangle" as const,
      x: 0,
      y: 160,
      width: 180,
      height: 80,
      rotation: 0,
      style,
      label: "Readable note",
      fontSize: 17,
      align: "left" as const,
    };
    const text = {
      id: "text-note",
      type: "text" as const,
      x: 200,
      y: 160,
      width: 180,
      height: 80,
      rotation: 0,
      style,
      text: "Editable text",
      fontSize: 22,
      fontFamily: "sans" as const,
      fontWeight: 600 as const,
      align: "center" as const,
    };
    const connector = {
      id: "labeled-route",
      type: "connector" as const,
      x: 0,
      y: 280,
      width: 180,
      height: 0,
      rotation: 0,
      style,
      points: [[0, 0], [180, 0]] as [[number, number], [number, number]],
      startArrow: "none" as const,
      endArrow: "arrow" as const,
      label: "Readable route",
      fontSize: 14,
      align: "right" as const,
    };
    const scene = { ...legacyScene, elements: [system, shape, text, connector] };

    expect(parseBoardScene(scene)).toEqual(scene);
  });

  it.each([
    ["system title size", { titleFontSize: 0 }],
    ["system body size", { bodyFontSize: 513 }],
    ["system alignment", { align: "justify" }],
  ])("rejects invalid %s typography", (_label, typography) => {
    expect(() =>
      parseBoardScene({
        ...validDocument.scene,
        elements: [{ ...validDocument.scene.elements[0], ...typography }],
      }),
    ).toThrow();
  });

  it("rejects invalid shape and connector typography", () => {
    const shape = {
      id: "shape-note",
      type: "shape",
      shape: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      style,
      fontSize: 0,
    };
    const connector = {
      id: "route",
      type: "connector",
      x: 0,
      y: 80,
      width: 100,
      height: 0,
      rotation: 0,
      style,
      points: [[0, 0], [100, 0]],
      startArrow: "none",
      endArrow: "arrow",
      align: "justify",
    };

    expect(() =>
      parseBoardScene({ ...createEmptyScene(), elements: [shape] }),
    ).toThrow(/fontSize/);
    expect(() =>
      parseBoardScene({ ...createEmptyScene(), elements: [connector] }),
    ).toThrow(/align/);
  });

  it.each(["../secret", "has/slash", "Uppercase", "-leading", "", "a".repeat(65)])(
    "rejects the unsafe board identifier %j",
    (boardId) => {
      expect(() => parseBoardId(boardId)).toThrow(ContractValidationError);
    },
  );

  it("normalizes names and rejects malformed write contracts", () => {
    expect(parseCreateBoardInput({ name: "  Cache notes  " })).toEqual({
      name: "Cache notes",
    });
    expect(() =>
      parseSaveBoardInput({
        name: "Valid",
        expectedRevision: -1,
        scene: createEmptyScene(),
      }),
    ).toThrow(/non-negative integer/);
    expect(() => parseCreateBoardInput({ name: "ok", extra: true })).toThrow(
      /unexpected field/,
    );
  });

  it("rejects non-JSON values and malformed custom-canvas state", () => {
    const scene = createEmptyScene();
    (scene.appState as unknown as Record<string, unknown>).onChange = () => undefined;

    expect(() => parseImportedScene(scene)).toThrow(/JSON-compatible/);
    expect(() =>
      parseBoardScene({ elements: [], appState: [], files: {} }),
    ).toThrow(/appState.*object/);
    expect(() =>
      parseBoardScene({
        ...createEmptyScene(),
        appState: {
          ...createEmptyScene().appState,
          camera: { x: 0, y: 0, zoom: Number.POSITIVE_INFINITY },
        },
      }),
    ).toThrow(/finite JSON number/);
  });

  it("rejects duplicate element ids and dangling image references", () => {
    const scene = createEmptyScene();
    const text = {
      id: "same",
      type: "text" as const,
      x: 0,
      y: 0,
      width: 120,
      height: 30,
      rotation: 0,
      style,
      text: "Route",
      fontSize: 16,
      fontFamily: "sans" as const,
      fontWeight: 600 as const,
      align: "left" as const,
    };
    expect(() =>
      parseBoardScene({ ...scene, elements: [text, { ...text }] }),
    ).toThrow(/duplicates element id 'same'/);

    expect(() =>
      parseBoardScene({
        ...scene,
        elements: [
          {
            id: "photo",
            type: "image",
            x: 0,
            y: 0,
            width: 320,
            height: 240,
            rotation: 0,
            style,
            fileId: "missing",
          },
        ],
      }),
    ).toThrow(/references missing file 'missing'/);
  });

  it("rejects unsupported schema versions and reversed timestamps", () => {
    expect(() =>
      parseBoardDocument({ ...validDocument, schemaVersion: 3 }),
    ).toThrow(/schemaVersion/);
    expect(() =>
      parseBoardDocument({
        ...validDocument,
        updatedAt: "2026-08-31T11:59:00.000Z",
      }),
    ).toThrow(/earlier than createdAt/);
  });
});
