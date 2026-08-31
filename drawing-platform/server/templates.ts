import {
  createEmptyScene,
  type TemplateDefinition,
} from "../shared/contracts.js";
import { KV_STORE_TEMPLATE } from "./generated/kv-store-template.js";

export const DEFAULT_TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: "blank",
    name: "Blank board",
    description: "An empty canvas for a new system explanation.",
    scene: createEmptyScene(),
  },
  KV_STORE_TEMPLATE,
];
