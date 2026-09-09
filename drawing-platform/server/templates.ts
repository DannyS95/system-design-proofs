import {
  createEmptyScene,
  type TemplateDefinition,
} from "../shared/contracts.js";
import { CDN_TEMPLATE } from "./generated/cdn-template.js";
import { DISTRIBUTED_CACHE_TEMPLATE } from "./generated/distributed-cache-template.js";
import { KV_STORE_TEMPLATE } from "./generated/kv-store-template.js";
import { SOCIAL_FEED_DISTRIBUTED_CACHE_TEMPLATE } from "./generated/social-feed-distributed-cache-template.js";
import { SYSTEM_CANVAS_APP_TEMPLATE } from "./generated/system-canvas-app-template.js";

export const DEFAULT_TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: "blank",
    name: "Blank board",
    description: "An empty canvas for a new system explanation.",
    scene: createEmptyScene(),
  },
  KV_STORE_TEMPLATE,
  CDN_TEMPLATE,
  SOCIAL_FEED_DISTRIBUTED_CACHE_TEMPLATE,
  DISTRIBUTED_CACHE_TEMPLATE,
  SYSTEM_CANVAS_APP_TEMPLATE,
];
