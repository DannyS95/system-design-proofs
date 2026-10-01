import { describe, expect, it } from "vitest";

import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
  type BoardScene,
  type CanvasElementStyle,
  type CanvasShapeElement,
  type CanvasSystemElement,
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

const authoredLayoutScene = (): BoardScene => ({
  ...structuredClone(validDocument.scene),
  appState: {
    ...validDocument.scene.appState,
    layoutSpacing: { nodeGap: 80, edgeClearance: 48 },
  },
  elements: [
    { ...validDocument.scene.elements[0], x: 1375.5, y: -420.25 },
    {
      id: "authored-frame", type: "shape", shape: "rectangle",
      x: -300, y: 400, width: 400, height: 300, rotation: 0, style,
      layoutRole: "container",
    },
    {
      id: "authored-ring", type: "shape", shape: "ellipse",
      x: 750, y: -600, width: 400, height: 400, rotation: 0, style,
      layoutRole: "mechanism", layoutGroup: "custom-ring",
    },
    {
      id: "authored-token", type: "shape", shape: "ellipse",
      x: 1118, y: -432, width: 64, height: 64, rotation: 0, style,
      layoutGroup: "custom-ring",
    },
    {
      id: "authored-route", type: "connector",
      x: 1591.5, y: -368.25, width: 500, height: 0, rotation: 0, style,
      points: [[0, 0], [500, 0]], startArrow: "none", endArrow: "arrow",
      startBinding: "node-1", label: "request", labelPosition: [175.25, -46.5],
    },
  ],
});

const localReferenceScene = (): BoardScene => {
  const scene = authoredLayoutScene();
  const monitoring: CanvasSystemElement = {
    id: "monitoring", type: "system", x: 3000, y: 800, width: 240, height: 100,
    rotation: 0, style, iconId: "telemetry", title: "Monitoring",
    subtitle: "hit ratio · replica health", variant: "observability",
  };
  const localReference: CanvasShapeElement = {
    id: "local-monitoring", type: "shape", shape: "rectangle",
    x: 2200, y: -450, width: 140, height: 50, rotation: 0, style,
    label: "↗ Monitoring", referenceId: monitoring.id,
    metadata: { objectType: "reference" },
  };
  return {
    ...scene,
    elements: [
      ...scene.elements.map((element) => element.id === "authored-route"
        ? { ...element, endBinding: localReference.id }
        : element),
      monitoring,
      localReference,
    ],
  };
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

  it("preserves applied spacing, authored label positions and semantic groups through save and JSON reload", () => {
    const scene = authoredLayoutScene();
    const saved = parseSaveBoardInput({ name: validDocument.name, expectedRevision: 2, scene });
    const reloaded = parseBoardDocument(JSON.parse(JSON.stringify({ ...validDocument, scene: saved.scene })) as unknown);

    expect(reloaded.scene).toEqual(scene);
    expect(reloaded.scene.appState.layoutSpacing).toEqual({ nodeGap: 80, edgeClearance: 48 });
    expect(reloaded.scene.elements.find(({ id }) => id === "authored-route"))
      .toMatchObject({ labelPosition: [175.25, -46.5] });
  });

  it("imports authored coordinates and spacing without automatically tidying them", () => {
    const scene = authoredLayoutScene();
    const before = structuredClone(scene);

    expect(parseImportedScene(scene)).toEqual(before);
    expect(scene).toEqual(before);
    expect(parseBoardScene(validDocument.scene).appState).not.toHaveProperty("layoutSpacing");
    expect(parseBoardScene(validDocument.scene).elements[0]).not.toHaveProperty("layoutGroup");
  });

  it("round-trips a local visual reference with its canonical destination and unchanged runtime component count", () => {
    const scene = localReferenceScene();
    const document = { ...validDocument, scene };
    const parsed = parseBoardDocument(JSON.parse(JSON.stringify(document)) as unknown);
    expect(parsed).toEqual(document);
    const route = parsed.scene.elements.find(({ id }) => id === "authored-route");
    if (route?.type !== "connector") throw new Error("Expected a connector fixture");
    const localReference = parsed.scene.elements.find(({ id }) => id === route.endBinding);
    const destination = parsed.scene.elements.find(({ id }) => id === localReference?.referenceId);
    expect(localReference).toMatchObject({ type: "shape", label: "↗ Monitoring", referenceId: "monitoring" });
    expect(destination).toMatchObject({ id: "monitoring", type: "system", iconId: "telemetry" });
    expect(parsed.scene.elements.filter(({ type }) => type === "system")).toHaveLength(2);
  });

  it.each(["missing-component", "local-monitoring", "authored-route"])(
    "rejects local reference target %s", (referenceId) => {
      const scene = localReferenceScene();
      expect(() => parseBoardScene({
        ...scene,
        elements: scene.elements.map((element) => element.id === "local-monitoring"
          ? { ...element, referenceId }
          : element),
      })).toThrow(/referenceId.*distinct existing component/i);
    },
  );

  it("rejects chained and cyclic reference destinations", () => {
    const scene = localReferenceScene();
    const reference = scene.elements.find(({ id }) => id === "local-monitoring")!;
    const chained = { ...reference, id: "chained-reference", referenceId: reference.id };
    expect(() => parseImportedScene({ ...scene, elements: [...scene.elements, chained] }))
      .toThrow(/referenceId.*not another reference/i);
    expect(() => parseBoardScene({
      ...scene,
      elements: [
        ...scene.elements.map((element) => element.id === reference.id
          ? { ...element, referenceId: chained.id }
          : element),
        chained,
      ],
    })).toThrow(/referenceId.*not another reference/i);
  });

  it.each([
    { nodeGap: 23, edgeClearance: 48 },
    { nodeGap: 161, edgeClearance: 48 },
    { nodeGap: 80, edgeClearance: 23 },
    { nodeGap: 80, edgeClearance: 97 },
    { nodeGap: Number.POSITIVE_INFINITY, edgeClearance: 48 },
    { nodeGap: 80, edgeClearance: Number.NaN },
    { nodeGap: "80", edgeClearance: 48 },
    { nodeGap: 80 },
    { nodeGap: 80, edgeClearance: 48, automatic: true },
  ])("rejects malformed saved layout spacing %j", (layoutSpacing) => {
    expect(() => parseBoardScene({
      ...validDocument.scene,
      appState: { ...validDocument.scene.appState, layoutSpacing },
    })).toThrow(ContractValidationError);
  });

  it.each([
    [1], [1, 2, 3], [Number.POSITIVE_INFINITY, 0], [0, Number.NaN], ["12", 0],
  ])("rejects malformed connector label position %j", (...labelPosition) => {
    const scene = authoredLayoutScene();
    expect(() => parseBoardScene({
      ...scene,
      elements: scene.elements.map((element) => element.type === "connector" ? { ...element, labelPosition } : element),
    })).toThrow(ContractValidationError);
  });

  it.each([
    { layoutGroup: "" }, { layoutGroup: 42 }, { layoutGroup: "g".repeat(300) },
    { layoutRole: "section" },
  ])("rejects invalid layout group or role %j", (layout) => {
    const scene = authoredLayoutScene();
    expect(() => parseBoardScene({
      ...scene,
      elements: scene.elements.map((element) => element.id === "authored-ring" ? { ...element, ...layout } : element),
    })).toThrow(ContractValidationError);
  });

  it("round-trips semantic shape icons and validated visual parents", () => {
    const container = {
      id: "shard-b-group",
      type: "shape" as const,
      shape: "rectangle" as const,
      x: 0,
      y: 0,
      width: 600,
      height: 400,
      rotation: 0,
      style,
    };
    const logicalShard = {
      id: "logical-shard-b",
      type: "shape" as const,
      shape: "rectangle" as const,
      x: 20,
      y: 20,
      width: 240,
      height: 100,
      rotation: 0,
      style,
      label: "Cache Shard B",
      iconId: "partition",
      parentId: container.id,
    };
    const scene = {
      ...validDocument.scene,
      elements: [container, logicalShard],
    };

    expect(parseBoardScene(scene)).toEqual(scene);
    expect(() =>
      parseBoardScene({
        ...scene,
        elements: [{ ...logicalShard, parentId: logicalShard.id }],
      }),
    ).toThrow(/parentId.*must not reference itself/i);
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
