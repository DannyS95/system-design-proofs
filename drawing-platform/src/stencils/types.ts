export const STENCIL_CATEGORIES = [
  "Routing",
  "Services",
  "Distributed Data",
  "Systems",
  "Hardware",
] as const;

export type StencilCategory = (typeof STENCIL_CATEGORIES)[number];

/** A vendor-neutral component that can be placed on the canvas. */
export interface StencilDefinition {
  readonly id: string;
  readonly category: StencilCategory;
  readonly name: string;
  readonly role: string;
  readonly accent: `#${string}`;
  readonly glyph: string;
  readonly keywords: readonly string[];
}

/** Scene coordinates around which a newly inserted stencil is centered. */
export interface StencilPlacement {
  readonly x: number;
  readonly y: number;
}
