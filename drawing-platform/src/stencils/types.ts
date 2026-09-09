export const STENCIL_CATEGORIES = [
  "Routing",
  "Services",
  "Distributed Data",
  "Systems",
  "Hardware",
] as const;

export type StencilCategory = (typeof STENCIL_CATEGORIES)[number];

/**
 * Stable, vendor-neutral visual concepts understood by the custom canvas.
 *
 * Icon identifiers are data, not component names: saved boards can keep the
 * same icon while the SVG drawing is refined in a later release.
 */
export type SystemIconId =
  | "internet"
  | "global-routing"
  | "edge-pop"
  | "load-balancer"
  | "service-routing"
  | "application-router"
  | "data-router"
  | "hash-ring"
  | "browser"
  | "canvas"
  | "whiteboard"
  | "workspace"
  | "local-storage"
  | "file-snapshot"
  | "template-grid"
  | "image"
  | "import-export"
  | "origin-shield"
  | "control-plane"
  | "client"
  | "application-server"
  | "fallback"
  | "writer"
  | "worker"
  | "scheduler"
  | "service-registry"
  | "request-coalescer"
  | "policy-gate"
  | "telemetry"
  | "key-value-store"
  | "cache"
  | "database"
  | "distributed-database"
  | "message-queue"
  | "partition"
  | "virtual-node"
  | "replica-group"
  | "leader"
  | "process"
  | "thread"
  | "operating-system"
  | "runtime"
  | "network-socket"
  | "file-system"
  | "server"
  | "cpu"
  | "memory"
  | "disk"
  | "network-interface"
  | "rack";

/** A vendor-neutral component that can be placed on the canvas. */
export interface StencilDefinition {
  readonly id: string;
  readonly category: StencilCategory;
  readonly name: string;
  readonly role: string;
  readonly accent: `#${string}`;
  readonly iconId: SystemIconId;
  readonly keywords: readonly string[];
}

/** Scene coordinates around which a newly inserted stencil is centered. */
export interface StencilPlacement {
  readonly x: number;
  readonly y: number;
}
