import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  CanvasConnectorElement,
  CanvasElement,
  CanvasFile,
  CanvasShapeElement,
  CanvasTextAlign,
} from "../../shared/contracts.js";
import { arrowheadSize, LAYOUT_STANDARD, SPACING } from "../../shared/layout-standard.js";
import { SystemIcon } from "./SystemIcon.js";
import { dashArray, getElementBounds } from "./canvas-model.js";
import {
  getConnectorLabelBounds,
  getConnectorLabelLayout,
  getShapeContentBounds,
  getShapeIconSize,
  getShapeTextLayout,
  getSystemTextLayout,
  getTextElementLayout,
  minimumTextHeight,
  minimumTextWidth,
  shapeIconGap,
  shapePadding,
  type TextBlockLayout,
} from "./text-layout.js";

const SvgTextLines = ({
  block,
  x,
  y,
  textAnchor = "start",
}: {
  block: TextBlockLayout;
  x: number;
  y: number;
  textAnchor?: "start" | "middle" | "end";
}) => (
  <>
    {block.lines.map((line, index) => (
      <tspan
        key={`${index}-${line}`}
        x={x}
        y={y + index * block.lineHeight}
        textAnchor={textAnchor}
        xmlSpace={/^\s/.test(line) ? "preserve" : undefined}
        style={/^\s/.test(line) ? { whiteSpace: "pre" } : undefined}
      >
        {line || " "}
      </tspan>
    ))}
  </>
);

const textAnchorForAlign = (
  align: CanvasTextAlign,
): "start" | "middle" | "end" =>
  align === "left" ? "start" : align === "right" ? "end" : "middle";

const textXForAlign = (
  x: number,
  width: number,
  align: CanvasTextAlign,
): number =>
  align === "left" ? x : align === "right" ? x + width : x + width / 2;

const renderShape = (element: CanvasShapeElement) => {
  const isBackdrop = element.width * element.height >= 120_000;
  const shared = {
    fill: element.style.fill,
    stroke: element.style.stroke,
    strokeWidth: element.style.strokeWidth,
    strokeDasharray: dashArray(element.style.strokeStyle),
    vectorEffect: "non-scaling-stroke" as const,
    pointerEvents: isBackdrop ? "visibleStroke" : "visiblePainted",
  };
  if (element.shape === "ellipse") {
    return (
      <ellipse
        {...shared}
        cx={element.width / 2}
        cy={element.height / 2}
        rx={element.width / 2}
        ry={element.height / 2}
      />
    );
  }
  if (element.shape === "diamond") {
    return (
      <polygon
        {...shared}
        points={`${element.width / 2},0 ${element.width},${element.height / 2} ${element.width / 2},${element.height} 0,${element.height / 2}`}
      />
    );
  }
  return <rect {...shared} width={element.width} height={element.height} rx={12} />;
};

const rotationTransform = (element: CanvasElement): string | undefined =>
  element.rotation
    ? `rotate(${(element.rotation * 180) / Math.PI} ${element.width / 2} ${element.height / 2})`
    : undefined;

export interface SceneElementViewProps {
  element: CanvasElement;
  file?: CanvasFile;
  selected: boolean;
  editing: boolean;
  editingText: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, element: CanvasElement) => void;
  onDoubleClick: (element: CanvasElement) => void;
  onEditingTextChange: (value: string) => void;
  onFinishEditing: (commit: boolean) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    element: CanvasElement,
  ) => void;
}

export function SceneElementView({
  element,
  file,
  selected,
  editing,
  editingText,
  onPointerDown,
  onDoubleClick,
  onEditingTextChange,
  onFinishEditing,
  onResizePointerDown,
}: SceneElementViewProps) {
  if (element.deleted || element.type === "connector") return null;
  // Rendering safety also covers direct SVG exports of legacy scenes. Never
  // mutate saved coordinates or shrink deliberate manual dimensions on load.
  if (element.type !== "image") {
    const width = Math.max(element.width, minimumTextWidth(element));
    element = { ...element, width };
    element = { ...element, height: Math.max(element.height, minimumTextHeight(element)) };
  }
  const systemLayout = element.type === "system" ? getSystemTextLayout(element) : undefined;
  const shapeLayout = element.type === "shape" ? getShapeTextLayout(element) : undefined;
  const textLayout = element.type === "text" ? getTextElementLayout(element) : undefined;
  const systemAlign = element.type === "system" ? element.align ?? "left" : "left";
  const systemTextX = systemLayout
    ? textXForAlign(systemLayout.x, systemLayout.width, systemAlign)
    : 0;
  const shapeAlign = element.type === "shape" ? element.align ?? "center" : "center";
  const shapeContent = element.type === "shape" ? getShapeContentBounds(element) : undefined;
  const shapeTextX = shapeContent
    ? textXForAlign(shapeContent.x, shapeContent.width, shapeAlign)
    : 0;
  const shapeIconSize = element.type === "shape" && element.iconId
    ? getShapeIconSize(element)
    : 0;
  const shapeGap = element.type === "shape" ? shapeIconGap(element) : LAYOUT_STANDARD.textGap;
  const shapeStackHeight = shapeIconSize + (shapeIconSize > 0 && shapeLayout ? shapeGap : 0) +
    (shapeLayout?.height ?? 0);
  const shapeStackTop = Math.max(element.type === "shape" ? shapePadding(element) :
    LAYOUT_STANDARD.cardPadding, (element.height - shapeStackHeight) / 2);

  return (
    <g
      className={`canvas-node${element.locked ? " is-locked" : ""}`}
      transform={`translate(${element.x} ${element.y})`}
      opacity={element.style.opacity}
      onPointerDown={(event) => onPointerDown(event, element)}
      onDoubleClick={() => onDoubleClick(element)}
      data-element-id={element.id}
    >
      <g transform={rotationTransform(element)}>
        {element.type === "system" ? (
          <>
            <title>{element.title}</title>
            <rect
              width={element.width}
              height={element.height}
              rx={16}
              fill={element.style.fill}
              stroke={element.style.stroke}
              strokeWidth={element.style.strokeWidth}
              strokeDasharray={dashArray(element.style.strokeStyle)}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={LAYOUT_STANDARD.cardPadding}
              y={(element.height - LAYOUT_STANDARD.iconPlateSize) / 2}
              width={LAYOUT_STANDARD.iconPlateSize}
              height={LAYOUT_STANDARD.iconPlateSize}
              rx={14}
              fill={element.style.stroke}
              fillOpacity={0.1}
              stroke={element.style.stroke}
              strokeOpacity={0.34}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <SystemIcon
              iconId={element.iconId}
              x={LAYOUT_STANDARD.cardPadding + (LAYOUT_STANDARD.iconPlateSize - LAYOUT_STANDARD.iconSize) / 2}
              y={(element.height - LAYOUT_STANDARD.iconSize) / 2}
              width={LAYOUT_STANDARD.iconSize}
              height={LAYOUT_STANDARD.iconSize}
              color={element.style.stroke}
              aria-hidden="true"
            />
            <text
              x={systemTextX}
              y={(systemLayout?.top ?? 0) + (systemLayout?.title.fontSize ?? 0)}
              textAnchor={textAnchorForAlign(systemAlign)}
              fill={element.style.textColor}
              fontSize={systemLayout?.title.fontSize}
              fontWeight={700}
              letterSpacing="-0.02em"
            >
              {systemLayout ? (
                <SvgTextLines
                  block={systemLayout.title}
                  x={systemTextX}
                  y={systemLayout.top + systemLayout.title.fontSize}
                  textAnchor={textAnchorForAlign(systemAlign)}
                />
              ) : null}
            </text>
            {element.subtitle && systemLayout?.subtitle ? (
              <text
                x={systemTextX}
                y={
                  systemLayout.top +
                  systemLayout.title.height +
                  LAYOUT_STANDARD.textGap +
                  systemLayout.subtitle.fontSize
                }
                textAnchor={textAnchorForAlign(systemAlign)}
                fill={element.style.textColor}
                fillOpacity={0.62}
                fontSize={systemLayout.subtitle.fontSize}
                fontFamily="ui-monospace, monospace"
              >
                <SvgTextLines
                  block={systemLayout.subtitle}
                  x={systemTextX}
                  y={
                    systemLayout.top +
                    systemLayout.title.height +
                    LAYOUT_STANDARD.textGap +
                    systemLayout.subtitle.fontSize
                  }
                  textAnchor={textAnchorForAlign(systemAlign)}
                />
              </text>
            ) : null}
            {element.body && systemLayout?.body ? (
              <text
                x={systemTextX}
                y={
                  systemLayout.top +
                  systemLayout.title.height +
                  (systemLayout.subtitle ? systemLayout.subtitle.height + LAYOUT_STANDARD.textGap : 0) +
                  LAYOUT_STANDARD.textGap +
                  systemLayout.body.fontSize
                }
                textAnchor={textAnchorForAlign(systemAlign)}
                fill={element.style.textColor}
                fillOpacity={0.8}
                fontSize={systemLayout.body.fontSize}
              >
                <SvgTextLines
                  block={systemLayout.body}
                  x={systemTextX}
                  y={
                    systemLayout.top +
                    systemLayout.title.height +
                    (systemLayout.subtitle ? systemLayout.subtitle.height + LAYOUT_STANDARD.textGap : 0) +
                    LAYOUT_STANDARD.textGap +
                    systemLayout.body.fontSize
                  }
                  textAnchor={textAnchorForAlign(systemAlign)}
                />
              </text>
            ) : null}
            {systemLayout?.capacity ? (
              <text x={systemTextX}
                y={systemLayout.top + systemLayout.naturalHeight - systemLayout.capacity.height + systemLayout.capacity.fontSize}
                textAnchor={textAnchorForAlign(systemAlign)} fill={element.style.textColor}
                fillOpacity={0.75} fontSize={systemLayout.capacity.fontSize}>
                <SvgTextLines block={systemLayout.capacity} x={systemTextX}
                  y={systemLayout.top + systemLayout.naturalHeight - systemLayout.capacity.height + systemLayout.capacity.fontSize}
                  textAnchor={textAnchorForAlign(systemAlign)} />
              </text>
            ) : null}
          </>
        ) : null}

        {element.type === "shape" ? (
          <>
            {renderShape(element)}
            {element.iconId ? (
              <SystemIcon
                iconId={element.iconId}
                x={(element.width - shapeIconSize) / 2}
                y={shapeStackTop}
                width={shapeIconSize}
                height={shapeIconSize}
                color={element.style.stroke}
                aria-hidden="true"
              />
            ) : null}
            {element.label && shapeLayout ? (
              <text
                x={shapeTextX}
                y={
                  shapeStackTop +
                  shapeIconSize +
                  (shapeIconSize > 0 ? shapeGap : 0) +
                  shapeLayout.fontSize
                }
                textAnchor={textAnchorForAlign(shapeAlign)}
                fill={element.style.textColor}
                fontSize={shapeLayout.fontSize}
                fontWeight={600}
              >
                <SvgTextLines
                  block={shapeLayout}
                  x={shapeTextX}
                  y={
                    shapeStackTop +
                    shapeIconSize +
                    (shapeIconSize > 0 ? shapeGap : 0) +
                    shapeLayout.fontSize
                  }
                  textAnchor={textAnchorForAlign(shapeAlign)}
                />
              </text>
            ) : null}
          </>
        ) : null}

        {element.type === "text" && !editing ? (
          <text
            x={textXForAlign(SPACING.label, element.width - SPACING.label * 2, element.align)}
            y={SPACING.label + element.fontSize}
            textAnchor={textAnchorForAlign(element.align)}
            fill={element.style.textColor}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily === "mono" ? "ui-monospace, monospace" : "inherit"}
            fontWeight={element.fontWeight}
          >
            {textLayout ? (
              <SvgTextLines
                block={textLayout}
                x={textXForAlign(SPACING.label, element.width - SPACING.label * 2, element.align)}
                y={SPACING.label + element.fontSize}
                textAnchor={textAnchorForAlign(element.align)}
              />
            ) : null}
          </text>
        ) : null}

        {element.type === "text" && editing ? (
          <foreignObject width={Math.max(160, element.width)} height={Math.max(54, element.height)}>
            <textarea
              className="canvas-text-editor"
              value={editingText}
              autoFocus
              aria-label="Edit canvas text"
              style={{
                fontSize: element.fontSize,
                fontFamily:
                  element.fontFamily === "mono"
                    ? "ui-monospace, monospace"
                    : "inherit",
                fontWeight: element.fontWeight,
                textAlign: element.align,
              }}
              onChange={(event) => onEditingTextChange(event.target.value)}
              onBlur={() => onFinishEditing(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  onFinishEditing(false);
                }
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  onFinishEditing(true);
                }
              }}
            />
          </foreignObject>
        ) : null}

        {element.type === "image" ? (
          file ? (
            <>
              <rect
                width={element.width}
                height={element.height}
                rx={10}
                fill="#ffffff"
                stroke={element.style.stroke}
                strokeWidth={element.style.strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <image
                href={file.dataURL}
                width={element.width}
                height={element.height}
                preserveAspectRatio="xMidYMid meet"
                aria-label={element.alt ?? file.name ?? "Canvas image"}
              />
            </>
          ) : (
            <>
              <rect
                width={element.width}
                height={element.height}
                rx={10}
                fill="#fff4f0"
                stroke="#c94f3c"
                strokeDasharray="6 5"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={element.width / 2}
                y={element.height / 2}
                textAnchor="middle"
                fill="#8f3526"
                fontSize={12}
              >
                Image unavailable
              </text>
            </>
          )
        ) : null}
      </g>

      {selected ? (
        <g data-editor-overlay="true">
          <rect
            className="canvas-selection"
            x={-6}
            y={-6}
            width={element.width + 12}
            height={element.height + 12}
            rx={8}
          />
          {!element.locked ? (
            <rect
              className="canvas-resize-handle"
              x={element.width - 5}
              y={element.height - 5}
              width={11}
              height={11}
              rx={2}
              onPointerDown={(event) => onResizePointerDown(event, element)}
            />
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

export function ConnectorView({
  element,
  selected,
  onPointerDown,
  layer = "all",
}: {
  element: CanvasConnectorElement;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, element: CanvasElement) => void;
  layer?: "all" | "path" | "label";
}) {
  if (element.deleted) return null;
  if (layer === "label" && !element.label) return null;
  const points = element.points.map(([x, y]) => `${x},${y}`).join(" ");
  const labelLayout = element.label
    ? getConnectorLabelLayout(element.label, element.fontSize)
    : undefined;
  const labelBounds = getConnectorLabelBounds(element);
  const labelAlign = element.align ?? "center";
  const labelTextX = labelLayout && labelBounds
    ? textXForAlign(
        labelBounds.x - element.x + LAYOUT_STANDARD.labelPaddingX,
        labelLayout.width - LAYOUT_STANDARD.labelPaddingX * 2,
        labelAlign,
      )
    : 0;
  const labelTextY = labelBounds && labelLayout
    ? labelBounds.y - element.y + LAYOUT_STANDARD.labelPaddingY + labelLayout.fontSize
    : 0;
  const markerId = `canvas-arrow-${encodeURIComponent(element.id)}`;
  const markerSize = arrowheadSize(element.style.strokeWidth);
  return (
    <g
      className={`canvas-node${element.locked ? " is-locked" : ""}`}
      transform={`translate(${element.x} ${element.y})`}
      onPointerDown={(event) => onPointerDown(event, element)}
      data-element-id={element.id}
      data-connector-layer={layer}
    >
      {layer !== "label" ? <g opacity={element.style.opacity}>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth={markerSize}
          markerHeight={markerSize}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={element.style.stroke} />
        </marker>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={element.style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
      />
      <polyline
        points={points}
        fill="none"
        stroke={element.style.stroke}
        strokeWidth={element.style.strokeWidth}
        strokeDasharray={dashArray(element.style.strokeStyle)}
        markerStart={element.startArrow === "arrow" ? `url(#${markerId})` : undefined}
        markerEnd={element.endArrow === "arrow" ? `url(#${markerId})` : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      </g> : null}
      {layer !== "path" && element.label && labelLayout && labelBounds ? (
        <g className="canvas-connector-label">
          <rect
            x={labelBounds.x - element.x}
            y={labelBounds.y - element.y}
            width={labelLayout.width}
            height={labelLayout.plateHeight}
            rx={8}
            fill="#f8f5ed"
            fillOpacity={1}
          />
          <text
            x={labelTextX}
            y={labelTextY}
            textAnchor={textAnchorForAlign(labelAlign)}
            fill={element.style.textColor}
            fontFamily="ui-monospace, monospace"
            fontSize={labelLayout.fontSize}
            fontWeight={700}
          >
            <SvgTextLines
              block={labelLayout}
              x={labelTextX}
              y={labelTextY}
              textAnchor={textAnchorForAlign(labelAlign)}
            />
          </text>
        </g>
      ) : null}
      {selected ? <ConnectorSelectionPath element={element} /> : null}
    </g>
  );
}

/** A selected arrow follows its route, leaving the space between bends empty. */
function ConnectorSelectionPath({ element }: { element: CanvasConnectorElement }) {
  return (
    <polyline
      data-editor-overlay="true"
      data-connector-selection={element.id}
      className="canvas-selection"
      points={element.points.map(([x, y]) => `${x},${y}`).join(" ")}
      style={{ strokeWidth: element.style.strokeWidth, vectorEffect: "none" }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    />
  );
}

/** Selection always sits above the complete scene, including later nodes. */
export function ElementSelectionView({
  element,
  onResizePointerDown,
}: {
  element: CanvasElement;
  onResizePointerDown: SceneElementViewProps["onResizePointerDown"];
}) {
  if (element.type === "connector") {
    return (
      <g data-editor-overlay="true" transform={`translate(${element.x} ${element.y})`}>
        <ConnectorSelectionPath element={element} />
      </g>
    );
  }
  const bounds = getElementBounds(element);
  return (
    <g data-editor-overlay="true">
      <rect
        className="canvas-selection"
        x={bounds.x - 6}
        y={bounds.y - 6}
        width={bounds.width + 12}
        height={bounds.height + 12}
        rx={8}
      />
      {!element.locked ? (
        <rect
          className="canvas-resize-handle"
          x={element.x + element.width - 5}
          y={element.y + element.height - 5}
          width={11}
          height={11}
          rx={2}
          onPointerDown={(event) => onResizePointerDown(event, element)}
        />
      ) : null}
    </g>
  );
}
