import {
  createEmptyScene,
  type TemplateDefinition,
} from "../shared/contracts.js";

export const DEFAULT_TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: "blank",
    name: "Blank board",
    description: "An empty canvas for a new system explanation.",
    scene: createEmptyScene(),
  },
];
