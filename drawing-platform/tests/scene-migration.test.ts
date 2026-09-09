import { describe, expect, it } from "vitest";

import { BOARD_SCHEMA_VERSION } from "../shared/contracts.js";
import {
  migrateLegacyBoardScene,
  parseBoardDocument,
} from "../shared/validation.js";
import { parseBoardImport } from "../src/editor/scene.js";

const pixel = "data:image/png;base64,iVBORw0KGgo=";

const legacyScene = {
  elements: [
    {
      id: "rect",
      type: "rectangle",
      x: 10,
      y: 20,
      width: 180,
      height: 90,
      angle: 0,
      strokeColor: "#334155",
      backgroundColor: "#ffffff",
      strokeWidth: 2,
      strokeStyle: "solid",
      opacity: 80,
    },
    { id: "ellipse", type: "ellipse", x: 220, y: 20, width: 90, height: 90 },
    { id: "diamond", type: "diamond", x: 340, y: 20, width: 100, height: 90 },
    {
      id: "label",
      type: "text",
      x: 10,
      y: 130,
      width: 240,
      height: 30,
      text: "Route to a healthy replica",
      fontSize: 18,
      fontFamily: 2,
      textAlign: "center",
      strokeColor: "#0f172a",
      isDeleted: false,
    },
    {
      id: "arrow",
      type: "arrow",
      x: 190,
      y: 65,
      width: 30,
      height: 0,
      points: [[4, 2], [34, 2]],
      startBinding: { elementId: "rect" },
      endBinding: { elementId: "ellipse" },
      endArrowhead: "arrow",
    },
    {
      id: "line",
      type: "line",
      x: 300,
      y: 170,
      width: 100,
      height: 0,
      points: [[0, 0], [100, 0]],
    },
    {
      id: "freehand",
      type: "freedraw",
      x: 310,
      y: 210,
      width: 80,
      height: 40,
      points: [[0, 0], [30, 40], [80, 10]],
    },
    {
      id: "legacy-embed",
      type: "embeddable",
      x: 410,
      y: 200,
      width: 200,
      height: 120,
    },
    {
      id: "image",
      type: "image",
      x: 480,
      y: 20,
      width: 160,
      height: 120,
      fileId: "pixel",
      alt: "Imported diagram",
    },
  ],
  appState: {
    scrollX: 42,
    scrollY: -17,
    zoom: { value: 1.5 },
    viewBackgroundColor: "#f1f5f9",
    gridModeEnabled: true,
    gridStep: 32,
  },
  files: {
    pixel: {
      id: "pixel",
      mimeType: "image/png",
      dataURL: pixel,
      created: 1_788_134_400_000,
    },
  },
};

describe("schema-v1 scene migration", () => {
  it("migrates every supported Excalidraw primitive without dropping elements", () => {
    const scene = migrateLegacyBoardScene(legacyScene);

    expect(scene.elements).toHaveLength(legacyScene.elements.length);
    expect(scene.elements.map(({ type }) => type)).toEqual([
      "shape",
      "shape",
      "shape",
      "text",
      "connector",
      "connector",
      "connector",
      "shape",
      "image",
    ]);
    expect(scene.elements[0]).toMatchObject({
      id: "rect",
      shape: "rectangle",
      rotation: 0,
      style: { opacity: 0.8 },
    });
    expect(scene.elements[3]).toMatchObject({
      id: "label",
      text: "Route to a healthy replica",
      fontFamily: "sans",
      align: "center",
      deleted: false,
    });
    expect(scene.elements[4]).toMatchObject({
      type: "connector",
      points: [[4, 2], [34, 2]],
      startBinding: "rect",
      endBinding: "ellipse",
      endArrow: "arrow",
    });
    expect(scene.elements[5]).toMatchObject({ endArrow: "none" });
    expect(scene.elements[6]).toMatchObject({
      type: "connector",
      points: [[0, 0], [30, 40], [80, 10]],
      endArrow: "none",
    });
    expect(scene.elements[7]).toMatchObject({
      type: "shape",
      label: "Legacy embed",
      locked: true,
    });
    expect(scene.elements[8]).toMatchObject({ fileId: "pixel" });
    expect(scene.files.pixel).toMatchObject({
      id: "pixel",
      mimeType: "image/png",
      dataURL: pixel,
    });
    expect(scene.appState).toEqual({
      camera: { x: 42, y: -17, zoom: 1.5 },
      background: { color: "#f1f5f9", pattern: "grid", spacing: 32 },
    });
  });

  it("upgrades a complete v1 document while preserving its metadata", () => {
    const migrated = parseBoardDocument({
      schemaVersion: 1,
      id: "legacy-board",
      name: "Legacy routing",
      revision: 7,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:02:00.000Z",
      scene: legacyScene,
    });

    expect(migrated).toMatchObject({
      schemaVersion: BOARD_SCHEMA_VERSION,
      id: "legacy-board",
      name: "Legacy routing",
      revision: 7,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:02:00.000Z",
    });
    expect(migrated.scene.elements).toHaveLength(legacyScene.elements.length);
  });

  it("routes open Excalidraw imports through the same migration", () => {
    const imported = parseBoardImport({ type: "excalidraw", ...legacyScene });

    expect(imported.name).toBeUndefined();
    expect(imported.scene.elements).toHaveLength(legacyScene.elements.length);
    expect(imported.scene.appState.background.pattern).toBe("grid");
  });

  it("names unsupported legacy types and ids instead of silently discarding them", () => {
    expect(() =>
      migrateLegacyBoardScene({
        elements: [
          { id: "unknown-frame", type: "frame", x: 0, y: 0, width: 100, height: 100 },
        ],
        appState: {},
        files: {},
      }),
    ).toThrow(/unsupported legacy element type 'frame'.*unknown-frame/);
  });
});
