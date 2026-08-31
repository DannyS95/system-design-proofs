import { describe, expect, it } from "vitest";

import {
  BOARD_SCHEMA_VERSION,
  createEmptyScene,
  type BoardDocument,
} from "../shared/contracts.js";
import {
  ContractValidationError,
  isBoardDocument,
  parseBoardDocument,
  parseBoardId,
  parseCreateBoardInput,
  parseImportedScene,
  parseSaveBoardInput,
} from "../shared/validation.js";

const validDocument: BoardDocument = {
  schemaVersion: BOARD_SCHEMA_VERSION,
  id: "routing-board",
  name: "Routing board",
  revision: 2,
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:01:00.000Z",
  scene: {
    elements: [{ id: "node-1", type: "rectangle", x: 10, y: 20 }],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  },
};

describe("board contract validation", () => {
  it("accepts a versioned serializable board document", () => {
    expect(parseBoardDocument(validDocument)).toEqual(validDocument);
    expect(isBoardDocument(validDocument)).toBe(true);
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

  it("rejects non-JSON scene values before import", () => {
    const scene = createEmptyScene();
    scene.appState.onChange = () => undefined;

    expect(() => parseImportedScene(scene)).toThrow(/JSON-compatible/);
    expect(() =>
      parseImportedScene({ elements: [], appState: [], files: {} }),
    ).toThrow(/appState.*object/);
  });

  it("rejects unsupported schema versions and reversed timestamps", () => {
    expect(() =>
      parseBoardDocument({ ...validDocument, schemaVersion: 2 }),
    ).toThrow(/schemaVersion/);
    expect(() =>
      parseBoardDocument({
        ...validDocument,
        updatedAt: "2026-08-31T11:59:00.000Z",
      }),
    ).toThrow(/earlier than createdAt/);
  });
});
