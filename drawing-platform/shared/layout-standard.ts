/** World-space geometry shared by the editor and generated teaching scenes. */
export const SPACING = Object.freeze({
  label: 8,
  compact: 12,
  padding: 16,
  connector: 24,
  sibling: 32,
  subsection: 48,
  section: 64,
});

export const LAYOUT_STANDARD = Object.freeze({
  spacing: SPACING,
  cardPadding: SPACING.padding,
  sectionPadding: SPACING.sibling,
  iconSize: 32,
  iconPlateSize: SPACING.subsection,
  iconGap: SPACING.compact,
  textGap: SPACING.label,
  labelPaddingX: SPACING.label,
  labelPaddingY: SPACING.label,
  labelLineGap: SPACING.label,
  maxSystemWidth: 640,
  maxShapeWidth: 720,
  maxTextWidth: 760,
  maxLabelWidth: 320,
  titleFontSize: 18,
  bodyFontSize: 14,
  capacityFontSize: 12,
  labelFontSize: 14,
  minArrowheadSize: 10,
  maxArrowheadSize: 14,
  minInitialZoom: 0.7,
  maxInitialZoom: 1,
});

/** Arrowheads stay in world units, independently of SVG stroke scaling. */
export const arrowheadSize = (strokeWidth: number): number =>
  Math.min(
    LAYOUT_STANDARD.maxArrowheadSize,
    Math.max(LAYOUT_STANDARD.minArrowheadSize, 8 + Math.max(0, strokeWidth)),
  );

export interface ConnectorEnvelope {
  style: { strokeWidth: number };
  startArrow?: string;
  endArrow?: string;
}

const connectorEnvelopeWidth = (connector: ConnectorEnvelope): number =>
  Math.max(
    connector.style.strokeWidth,
    connector.startArrow === "arrow" || connector.endArrow === "arrow"
      ? arrowheadSize(connector.style.strokeWidth)
      : 0,
  );

/** Minimum centreline spacing uses both neighboring line/head envelopes. */
export const connectorClearance = (
  first: ConnectorEnvelope,
  second: ConnectorEnvelope,
): number => Math.ceil(Math.max(
  SPACING.connector,
  (connectorEnvelopeWidth(first) + connectorEnvelopeWidth(second)) / 2 +
    SPACING.label +
    Math.max(first.style.strokeWidth, second.style.strokeWidth),
));

/** Required edge length includes real endpoint envelopes and their clear gaps. */
export const requiredPortSpan = (
  connectors: readonly ConnectorEnvelope[],
  minimumClearance: number = SPACING.connector,
  padding: number = SPACING.padding,
): number => {
  if (connectors.length === 0) return 0;
  let span = padding * 2 + connectorEnvelopeWidth(connectors[0]) / 2 +
    connectorEnvelopeWidth(connectors[connectors.length - 1]) / 2;
  for (let index = 1; index < connectors.length; index++) {
    span += Math.max(minimumClearance, connectorClearance(connectors[index - 1], connectors[index]));
  }
  return span;
};

/** Center a measured sequence on its owning side without collapsing end ports. */
export const portOffsets = (
  connectors: readonly ConnectorEnvelope[],
  availableSpan: number,
  minimumClearance: number = SPACING.connector,
  padding: number = SPACING.padding,
): number[] => {
  if (connectors.length === 0) return [];
  let offset = Math.max(0, (availableSpan - requiredPortSpan(connectors, minimumClearance, padding)) / 2) +
    padding + connectorEnvelopeWidth(connectors[0]) / 2;
  return connectors.map((connector, index) => {
    if (index) offset += Math.max(minimumClearance, connectorClearance(connectors[index - 1], connector));
    return offset;
  });
};

/** Muted semantic colors shared by templates and future constructors. */
export const CANVAS_PALETTE = Object.freeze({
  ink: "#17212b",
  muted: "#66717d",
  paper: "#f7f4ec",
  white: "#ffffff",
  line: "#c9c6bc",
  blue: "#496b8a",
  blueSoft: "#eaf0f4",
  green: "#527760",
  greenSoft: "#edf3ee",
  purple: "#775d83",
  purpleSoft: "#f1edf4",
  amber: "#9b713c",
  amberSoft: "#f6f0e4",
  coral: "#a15f4b",
  coralSoft: "#f6ede8",
  cyan: "#477d80",
  cyanSoft: "#eaf2f2",
});
