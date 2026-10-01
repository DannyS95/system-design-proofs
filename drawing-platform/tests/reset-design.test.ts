import { describe, expect, it } from "vitest";
import { BOARD_SCHEMA_VERSION, type BoardDocument } from "../shared/contracts.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { findDesignTemplate } from "../src/editor/reset-design.js";

const copy = (id: string): BoardDocument => ({
  schemaVersion: BOARD_SCHEMA_VERSION, id: "my-board", name: "My renamed design",
  revision: 4, createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z",
  scene: structuredClone(DEFAULT_TEMPLATES.find(template => template.id === id)!.scene),
});

describe("reset design template recognition", () => {
  for (const template of DEFAULT_TEMPLATES.filter(template => template.id !== "blank")) {
    it(`recognizes an edited and renamed ${template.id} copy`, () => {
      const board = copy(template.id);
      board.scene.elements = board.scene.elements.slice(3);
      board.scene.elements[0].x += 100;
      expect(findDesignTemplate(board, DEFAULT_TEMPLATES)?.id).toBe(template.id);
    });
  }

  it("does not replace a custom board just because its name matches a template", () => {
    const board = copy("cdn");
    board.name = "CDN";
    board.scene.elements.forEach(element => { element.id = `custom-${element.id}`; });
    expect(findDesignTemplate(board, DEFAULT_TEMPLATES)).toBeUndefined();
  });

  it("restores an emptied preview using its explicit template identity", () => {
    const board = copy("cdn");
    board.scene.elements = [];
    expect(findDesignTemplate(board, DEFAULT_TEMPLATES, "cdn")?.id).toBe("cdn");
    expect(findDesignTemplate(board, DEFAULT_TEMPLATES)).toBeUndefined();
  });
});
