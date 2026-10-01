import { describe, expect, it } from "vitest";

import {
  createEmptyScene,
  type CanvasConnectorElement,
  type CanvasElementStyle,
  type CanvasImageElement,
  type CanvasShapeElement,
  type CanvasTextElement,
} from "../shared/contracts.js";
import { parseBoardScene, parseSaveBoardInput } from "../shared/validation.js";
import {
  cloneScene,
  deleteElementAndDetachBindings,
  dashArray,
  findElementAt,
  fitElementToContent,
  fitElementHeightToText,
  fitSceneToContent,
  getElementBounds,
  getSceneBounds,
  moveBoundConnectors,
  normalizeConnectorGeometry,
  polylineMidpoint,
  resizeElementAndBoundConnectors,
  updateElement,
} from "../src/editor/canvas-model.js";

const style: CanvasElementStyle = {
  fill: "#ffffff",
  stroke: "#344054",
  strokeWidth: 2,
  strokeStyle: "solid",
  opacity: 1,
  textColor: "#1d2939",
};

const shape = (
  id: string,
  x: number,
  y: number,
  width = 100,
  height = 60,
  deleted = false,
): CanvasShapeElement => ({
  id,
  type: "shape",
  shape: "rectangle",
  x,
  y,
  width,
  height,
  rotation: 0,
  style: { ...style },
  ...(deleted ? { deleted: true } : {}),
});

const boundConnector: CanvasConnectorElement = {
  id: "connection",
  type: "connector",
  x: 0,
  y: 0,
  width: 100,
  height: 0,
  rotation: 0,
  style: { ...style, fill: "transparent" },
  points: [[0, 0], [100, 0]],
  startArrow: "none",
  endArrow: "arrow",
  startBinding: "source",
  endBinding: "target",
};

describe("custom canvas model", () => {
  it("deep-clones typed scene state for history and persistence", () => {
    const original = {
      ...createEmptyScene(),
      elements: [shape("node", -40, 20)],
    };
    const cloned = cloneScene(original);

    cloned.appState.camera.x = 900;
    cloned.elements[0].style.stroke = "#ff0000";

    expect(original.appState.camera.x).toBe(0);
    expect(original.elements[0].style.stroke).toBe("#344054");
    expect(cloned).not.toBe(original);
    expect(cloned.elements[0]).not.toBe(original.elements[0]);
  });

  it("measures non-linear layouts across negative and positive coordinates", () => {
    const bounds = getSceneBounds([
      shape("north-west", -450, -300, 100, 50),
      shape("south-east", 1200, 900, 200, 100),
      shape("deleted-outlier", 9000, 9000, 500, 500, true),
    ]);

    expect(bounds).toEqual({
      x: -450,
      y: -300,
      width: 1850,
      height: 1300,
    });
    expect(getSceneBounds([])).toEqual({
      x: -240,
      y: -160,
      width: 480,
      height: 320,
    });
  });

  it("derives connector bounds from every local point", () => {
    expect(
      getElementBounds({
        ...boundConnector,
        x: 100,
        y: 50,
        points: [[20, -10], [-30, 40], [60, 15]],
      }),
    ).toEqual({ x: 64, y: 34, width: 102, height: 62 });
  });

  it("preserves saved node positions and camera while repairing undersized text", () => {
    const original = {
      ...createEmptyScene(),
      elements: [{ ...shape("choice", -300, 180, 30, 24),
        label: "LFU eviction · TTL expiry", fontSize: 18 }],
      appState: { ...createEmptyScene().appState, camera: { x: 100, y: 45, zoom: 0.41 } },
    };
    const repaired = fitSceneToContent(original);
    expect(repaired.elements[0]).toMatchObject({ x: -300, y: 180 });
    expect(repaired.elements[0].height).toBeGreaterThan(24);
    expect(repaired.appState.camera).toEqual(original.appState.camera);
    expect(original.elements[0].width).toBe(30);
  });

  it("preserves a persisted label's world position during route normalization", () => {
    const normalized = normalizeConnectorGeometry({
      ...boundConnector, x: 100, y: 50, points: [[-20, 10], [160, 10]],
      label: "read", labelPosition: [80, -20],
    });
    expect(normalized.labelPosition).toEqual([100, -30]);
    expect(normalized.x + normalized.labelPosition![0]).toBe(180);
    expect(normalized.y + normalized.labelPosition![1]).toBe(30);
  });

  it("keeps a persisted label beside its segment when a route is resized", () => {
    const scene = { ...createEmptyScene(), elements: [{
      ...boundConnector, label: "read", labelPosition: [50, -24] as [number, number],
    }] };
    const resized = resizeElementAndBoundConnectors(scene, boundConnector.id, 200, 0);
    expect(resized.elements[0]).toMatchObject({ labelPosition: [100, -24] });
  });

  it("selects the topmost visible node and ignores connectors and tombstones", () => {
    const bottom = shape("bottom", 0, 0);
    const top = shape("top", 20, 10);
    const deleted = shape("deleted", 25, 15, 100, 60, true);

    expect(
      findElementAt([bottom, top, deleted, boundConnector], { x: 30, y: 20 })
        ?.id,
    ).toBe("top");
    expect(
      findElementAt([bottom, top], { x: 30, y: 20 }, "top")?.id,
    ).toBe("bottom");
    expect(findElementAt([bottom], { x: 500, y: 500 })).toBeUndefined();
  });

  it("updates one element without mutating the original scene", () => {
    const original = {
      ...createEmptyScene(),
      elements: [shape("first", 0, 0), shape("second", 200, 0)],
    };
    const updated = updateElement(original, "second", (element) => ({
      ...element,
      x: 260,
    }));

    expect(original.elements[1].x).toBe(200);
    expect(updated.elements[0]).toBe(original.elements[0]);
    expect(updated.elements[1].x).toBe(260);
  });

  it("moves only the bound endpoints when a node moves", () => {
    const scene = {
      ...createEmptyScene(),
      elements: [
        shape("source", -100, 0),
        shape("target", 100, 0),
        boundConnector,
      ],
    };

    const sourceMoved = moveBoundConnectors(scene, "source", { x: 10, y: 5 });
    const bothMoved = moveBoundConnectors(sourceMoved, "target", {
      x: -3,
      y: 8,
    });
    const connector = bothMoved.elements.find(
      (element): element is CanvasConnectorElement =>
        element.type === "connector",
    );

    const absolutePoints = connector?.points.map(([x, y]) => [
      x + connector.x,
      y + connector.y,
    ]);
    expect(absolutePoints?.[0]).toEqual([10, 5]);
    expect(absolutePoints?.at(-1)).toEqual([97, 8]);
    expect(connector).toMatchObject({ x: 10, y: 5, width: 87, height: 3 });
    expect(
      absolutePoints?.slice(1).every(([x, y], index) => {
        const previous = absolutePoints[index];
        return previous[0] === x || previous[1] === y;
      }),
    ).toBe(true);
    expect(boundConnector.points).toEqual([[0, 0], [100, 0]]);
  });

  it("normalizes connector position and dimensions without moving its route", () => {
    const normalized = normalizeConnectorGeometry({
      ...boundConnector,
      x: 80,
      y: 50,
      width: 999,
      height: 999,
      points: [[20, -10], [-30, 40], [60, 15]],
    });

    expect(normalized).toMatchObject({ x: 50, y: 40, width: 90, height: 50 });
    expect(normalized.points).toEqual([[50, 0], [0, 50], [90, 25]]);
  });

  it("keeps bound endpoints attached when either node is resized", () => {
    const source = shape("source", 0, 0, 100, 60);
    const target = shape("target", 200, 0, 100, 60);
    const connection: CanvasConnectorElement = {
      ...boundConnector,
      points: [[100, 30], [200, 30]],
    };
    const scene = {
      ...createEmptyScene(),
      elements: [source, target, connection],
    };

    const sourceResized = resizeElementAndBoundConnectors(
      scene,
      "source",
      200,
      120,
    );
    const targetResized = resizeElementAndBoundConnectors(
      sourceResized,
      "target",
      200,
      120,
    );
    const resizedConnector = targetResized.elements.find(
      (element): element is CanvasConnectorElement =>
        element.type === "connector",
    );

    expect(resizedConnector).toMatchObject({
      x: 200,
      y: 60,
      width: 0,
      height: 0,
      points: [[0, 0], [0, 0]],
    });
  });

  it("grows edited text and reroutes its bound connector orthogonally", () => {
    const note: CanvasTextElement = {
      id: "detail-note",
      type: "text",
      x: 200,
      y: 0,
      width: 80,
      height: 24,
      rotation: 0,
      style: { ...style, fill: "transparent", stroke: "transparent" },
      text: "A long explanation that wraps across several editable lines.",
      fontSize: 16,
      fontFamily: "sans",
      fontWeight: 500,
      align: "left",
    };
    const connection: CanvasConnectorElement = {
      ...boundConnector,
      points: [[0, 12], [200, 12]],
      startBinding: undefined,
      endBinding: note.id,
    };
    const resized = fitElementHeightToText(
      { ...createEmptyScene(), elements: [note, connection] },
      note.id,
    );
    const grown = resized.elements.find(({ id }) => id === note.id);
    const route = resized.elements.find(
      (element): element is CanvasConnectorElement => element.type === "connector",
    );
    const absolute = route?.points.map(([x, y]) => [x + route.x, y + route.y]);

    expect(grown?.height).toBeGreaterThan(note.height);
    expect(absolute?.at(-1)).toEqual([note.x, (grown?.height ?? 0) / 2]);
    expect(
      absolute?.slice(1).every(([x, y], index) => {
        const previous = absolute[index];
        return previous[0] === x || previous[1] === y;
      }),
    ).toBe(true);
  });

  it("grows natural width, wraps at the maximum, and expands its parent", () => {
    const container = shape("panel", 100, 100, 260, 160);
    const note: CanvasTextElement = {
      id: "child-note",
      type: "text",
      x: 140,
      y: 180,
      width: 80,
      height: 24,
      rotation: 0,
      style: { ...style, fill: "transparent", stroke: "transparent" },
      text: "A detailed content-aware explanation that should choose a readable width before wrapping.",
      fontSize: 18,
      fontFamily: "sans",
      fontWeight: 500,
      align: "left",
      parentId: container.id,
    };
    const fitted = fitElementToContent(
      { ...createEmptyScene(), elements: [container, note] },
      note.id,
      { growWidth: true },
    );
    const fittedNote = fitted.elements.find(({ id }) => id === note.id);
    const fittedParent = fitted.elements.find(({ id }) => id === container.id);

    expect(fittedNote?.width).toBeGreaterThan(note.width);
    expect(fittedNote?.width).toBeLessThanOrEqual(760);
    expect(fittedNote?.height).toBeGreaterThanOrEqual(note.height);
    expect(fittedParent?.width).toBeGreaterThanOrEqual(
      (fittedNote?.x ?? 0) + (fittedNote?.width ?? 0) + 24 - container.x,
    );
    expect(fittedParent?.height).toBeGreaterThanOrEqual(
      (fittedNote?.y ?? 0) + (fittedNote?.height ?? 0) + 24 - container.y,
    );
  });

  it("refuses a manual width below an unbreakable text token", () => {
    const note: CanvasTextElement = {
      id: "token-note",
      type: "text",
      x: 0,
      y: 0,
      width: 300,
      height: 30,
      rotation: 0,
      style,
      text: "unbreakable-content-token",
      fontSize: 20,
      fontFamily: "mono",
      fontWeight: 500,
      align: "left",
    };
    const resized = resizeElementAndBoundConnectors(
      { ...createEmptyScene(), elements: [note] },
      note.id,
      24,
      24,
    ).elements[0];

    expect(resized.width).toBeGreaterThan(24);
    expect(resized.height).toBeGreaterThanOrEqual(24);
  });

  it("preserves a real zero-height connector and can give it a height", () => {
    const horizontal: CanvasConnectorElement = {
      ...boundConnector,
      height: 0,
    };
    const scene = { ...createEmptyScene(), elements: [horizontal] };

    const unchanged = resizeElementAndBoundConnectors(
      scene,
      horizontal.id,
      100,
      0,
    );
    const angled = resizeElementAndBoundConnectors(
      unchanged,
      horizontal.id,
      200,
      40,
    );

    expect(unchanged.elements[0]).toMatchObject({
      width: 100,
      height: 0,
      points: [[0, 0], [100, 0]],
    });
    expect(angled.elements[0]).toMatchObject({
      width: 200,
      height: 40,
      points: [[0, 0], [200, 40]],
    });
    expect(unchanged.elements[0]).toMatchObject({
      startBinding: "source",
      endBinding: "target",
    });
    expect(angled.elements[0]).not.toHaveProperty("startBinding");
    expect(angled.elements[0]).not.toHaveProperty("endBinding");
  });

  it("removes dangling bindings when an attached node is deleted", () => {
    const child = { ...shape("child", 20, 20), parentId: "source" };
    const scene = {
      ...createEmptyScene(),
      elements: [
        shape("source", 0, 0),
        child,
        shape("target", 200, 0),
        boundConnector,
      ],
    };
    const deleted = deleteElementAndDetachBindings(scene, "source");
    const connector = deleted.elements.find(
      (element): element is CanvasConnectorElement => element.type === "connector",
    );

    expect(deleted.elements.some(({ id }) => id === "source")).toBe(false);
    expect(connector).not.toHaveProperty("startBinding");
    expect(connector?.endBinding).toBe("target");
    expect(deleted.elements.find(({ id }) => id === child.id)).not.toHaveProperty(
      "parentId",
    );
  });

  it("detaches deleted canonical destinations while retaining locked local annotations and their routes", () => {
    const destination = shape("target", 1000, 0);
    const localReference = {
      ...shape("local-target", 200, 0), referenceId: destination.id,
      label: "↗ Monitoring", locked: true,
    };
    const localRoute = { ...boundConnector, id: "local-route", endBinding: localReference.id };
    const scene = {
      ...createEmptyScene(),
      elements: [shape("source", 0, 0), destination, localReference, boundConnector, localRoute],
    };
    const before = cloneScene(scene);
    const deleted = deleteElementAndDetachBindings(scene, destination.id);
    const retainedReference = deleted.elements.find(({ id }) => id === localReference.id);

    expect(retainedReference).toMatchObject({
      label: "↗ Monitoring", x: 200, y: 0, width: 100, height: 60, locked: true,
    });
    expect(retainedReference).not.toHaveProperty("referenceId");
    expect(deleted.elements.find(({ id }) => id === localRoute.id)).toEqual(localRoute);
    expect(deleted.elements.find(({ id }) => id === boundConnector.id)).not.toHaveProperty("endBinding");
    expect(parseSaveBoardInput({ name: "Edited board", expectedRevision: 0, scene: deleted }).scene).toEqual(deleted);
    expect(scene).toEqual(before);
    expect(parseBoardScene(before)).toEqual(before);
  });

  it("deletes a local reference without removing its canonical component or sibling references", () => {
    const destination = shape("target", 1000, 0);
    const first = { ...shape("first-reference", 200, 0), referenceId: destination.id };
    const second = { ...shape("second-reference", 200, 200), referenceId: destination.id };
    const attached = { ...boundConnector, endBinding: first.id };
    const scene = {
      ...createEmptyScene(),
      elements: [shape("source", 0, 0), destination, first, second, attached],
    };
    const deleted = deleteElementAndDetachBindings(scene, first.id);

    expect(deleted.elements.find(({ id }) => id === destination.id)).toEqual(destination);
    expect(deleted.elements.find(({ id }) => id === second.id)).toEqual(second);
    expect(deleted.elements.find(({ id }) => id === attached.id)).not.toHaveProperty("endBinding");
    expect(parseBoardScene(deleted)).toEqual(deleted);
  });

  it("keeps local references attached to the cloned canonical component in independent scene copies", () => {
    const canonical = shape("target", 1000, 0);
    const reference = { ...shape("local-target", 200, 0), referenceId: canonical.id };
    const scene = { ...createEmptyScene(), elements: [canonical, reference] };
    const copy = cloneScene(scene);
    const copiedReference = copy.elements.find(({ id }) => id === reference.id)!;
    const copiedDestination = copy.elements.find(({ id }) => id === copiedReference.referenceId)!;

    expect(copiedDestination.id).toBe(canonical.id);
    expect(copiedDestination).not.toBe(canonical);
    copiedDestination.x = -500;
    expect(canonical.x).toBe(1000);
    expect(parseBoardScene(copy)).toEqual(copy);
  });

  it("prunes an image asset only after its final placed image is deleted", () => {
    const first: CanvasImageElement = {
      id: "first-image",
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      rotation: 0,
      style,
      fileId: "shared-file",
    };
    const second: CanvasImageElement = { ...first, id: "second-image", x: 120 };
    const scene = {
      ...createEmptyScene(),
      elements: [first, second],
      files: {
        "shared-file": {
          id: "shared-file",
          mimeType: "image/png" as const,
          dataURL: "data:image/png;base64,AAAA",
        },
        orphan: {
          id: "orphan",
          mimeType: "image/png" as const,
          dataURL: "data:image/png;base64,AAAA",
        },
      },
    };

    const oneRemaining = deleteElementAndDetachBindings(scene, first.id);
    expect(Object.keys(oneRemaining.files)).toEqual(["shared-file"]);
    const noneRemaining = deleteElementAndDetachBindings(oneRemaining, second.id);
    expect(noneRemaining.files).toEqual({});
  });

  it("includes a connector label in fit-to-content bounds", () => {
    const unlabeled = getElementBounds({ ...boundConnector, startArrow: "none", endArrow: "none" });
    const labeled = getElementBounds({
      ...boundConnector,
      startArrow: "none",
      endArrow: "none",
      label: "database result returns through the API",
    });

    expect(labeled.y).toBeLessThan(unlabeled.y);
    expect(labeled.width).toBeGreaterThan(unlabeled.width);

    const readable = getElementBounds({
      ...boundConnector,
      startArrow: "none",
      endArrow: "none",
      label: "database result returns through the API",
      fontSize: 20,
    });
    expect(readable.y).toBeLessThan(labeled.y);
    expect(readable.height).toBeGreaterThan(labeled.height);
  });

  it("maps semantic stroke styles to SVG dash patterns", () => {
    expect(dashArray("solid")).toBeUndefined();
    expect(dashArray("dashed")).toBe("8 6");
    expect(dashArray("dotted")).toBe("2 6");
  });

  it("anchors a route label halfway along a multi-segment connector", () => {
    expect(polylineMidpoint([[0, 0], [100, 0], [100, 300]])).toEqual({
      x: 100,
      y: 100,
    });
  });
});
