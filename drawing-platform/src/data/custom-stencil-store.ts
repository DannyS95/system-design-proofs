import {
  createEmptyScene,
  type CanvasElement,
  type CanvasShapeElement,
  type CanvasSystemElement,
  type CanvasTextElement,
} from "../../shared/contracts.js";
import { parseBoardScene } from "../../shared/validation.js";
import type { Point } from "../editor/camera.js";
import type { StoragePort } from "./local-board-store.js";

const CUSTOM_STENCIL_KEY = "system-canvas:custom-stencils:v1";
const MAX_CUSTOM_STENCILS = 100;

export type ReusableCanvasElement =
  | CanvasSystemElement
  | CanvasShapeElement
  | CanvasTextElement;

export interface CustomStencilDefinition {
  id: string;
  name: string;
  role: string;
  accent: string;
  iconId: string;
  createdAt: string;
  element: ReusableCanvasElement;
}

const isReusableElement = (
  element: CanvasElement,
): element is ReusableCanvasElement =>
  element.type === "system" ||
  element.type === "shape" ||
  element.type === "text";

const copyElement = <T extends CanvasElement>(element: T): T =>
  JSON.parse(JSON.stringify(element)) as T;

const parseReusableElement = (value: unknown): ReusableCanvasElement => {
  const empty = createEmptyScene();
  const [element] = parseBoardScene({
    ...empty,
    elements: [value],
  }, "customStencil.scene").elements;

  if (!element || !isReusableElement(element)) {
    throw new Error("Custom components must be a system node, shape, or text block.");
  }
  return element;
};

const displayText = (element: ReusableCanvasElement): string => {
  if (element.type === "system") return element.title;
  if (element.type === "shape") {
    return element.label?.trim() || `Custom ${element.shape}`;
  }
  return element.text.trim().split("\n")[0] || "Custom text";
};

const displayRole = (element: ReusableCanvasElement): string => {
  if (element.type === "system") {
    return element.subtitle?.trim() || "Saved system component";
  }
  if (element.type === "shape") return `Saved ${element.shape}`;
  return "Saved text block";
};

const displayIcon = (element: ReusableCanvasElement): string => {
  if (element.type === "system") return element.iconId;
  if (element.type === "text") return "workspace";
  return "whiteboard";
};

const parseItem = (value: unknown): CustomStencilDefinition => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid custom component.");
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    !/^custom-[a-z0-9-]+$/.test(candidate.id) ||
    typeof candidate.createdAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.createdAt))
  ) {
    throw new Error("Invalid custom component metadata.");
  }

  const element = parseReusableElement(candidate.element);

  return {
    id: candidate.id,
    name: displayText(element).slice(0, 80),
    role: displayRole(element).slice(0, 120),
    accent: element.style.stroke,
    iconId: displayIcon(element),
    createdAt: candidate.createdAt,
    element,
  };
};

let customStencilSequence = 0;

const createId = (): string => {
  customStencilSequence += 1;
  return `custom-${Date.now().toString(36)}-${customStencilSequence.toString(36)}`;
};

export type CustomStencilStore = ReturnType<typeof createCustomStencilStore>;

export const createCustomStencilStore = (storage: StoragePort) => ({
  list(): CustomStencilDefinition[] {
    const raw = storage.getItem(CUSTOM_STENCIL_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      return parsed.slice(0, MAX_CUSTOM_STENCILS).flatMap((entry) => {
        try {
          const item = parseItem(entry);
          if (seen.has(item.id)) return [];
          seen.add(item.id);
          return [item];
        } catch {
          return [];
        }
      });
    } catch {
      return [];
    }
  },

  save(element: CanvasElement): CustomStencilDefinition {
    if (!isReusableElement(element)) {
      throw new Error("Save a system node, shape, or text block to the library.");
    }

    // Validate before writing so a draft that bypassed editor validation can
    // never create a library entry that disappears on the next list() call.
    const reusable = parseReusableElement(copyElement(element));
    const item: CustomStencilDefinition = {
      id: createId(),
      name: displayText(reusable).slice(0, 80),
      role: displayRole(reusable).slice(0, 120),
      accent: reusable.style.stroke,
      iconId: displayIcon(reusable),
      createdAt: new Date().toISOString(),
      element: reusable,
    };
    storage.setItem(
      CUSTOM_STENCIL_KEY,
      JSON.stringify([item, ...this.list()].slice(0, MAX_CUSTOM_STENCILS)),
    );
    return item;
  },

  remove(stencilId: string): void {
    storage.setItem(
      CUSTOM_STENCIL_KEY,
      JSON.stringify(this.list().filter(({ id }) => id !== stencilId)),
    );
  },
});

export const instantiateCustomStencil = (
  stencil: CustomStencilDefinition,
  center: Point,
): ReusableCanvasElement => {
  const element = copyElement(stencil.element);
  delete element.deleted;
  return {
    ...element,
    id: createId(),
    x: center.x - element.width / 2,
    y: center.y - element.height / 2,
    locked: false,
  } as ReusableCanvasElement;
};
