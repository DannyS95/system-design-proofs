import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  CanvasConnectorElement,
  CanvasElement,
  CanvasFile,
  CanvasShapeElement,
  CanvasTextAlign,
} from "../../shared/contracts.js";
import { SystemIcon } from "./SystemIcon.js";
import { dashArray, getElementBounds, polylineMidpoint } from "./canvas-model.js";
import {
  getConnectorLabelLayout,
  getShapeTextLayout,
  getSystemTextLayout,
  getTextElementLayout,
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
  const systemLayout = element.type === "system" ? getSystemTextLayout(element) : undefined;
  const shapeLayout = element.type === "shape" ? getShapeTextLayout(element) : undefined;
  const textLayout = element.type === "text" ? getTextElementLayout(element) : undefined;
  const systemAlign = element.type === "system" ? element.align ?? "left" : "left";
  const systemTextX = systemLayout
    ? textXForAlign(systemLayout.x, systemLayout.width, systemAlign)
    : 0;
  const shapeAlign = element.type === "shape" ? element.align ?? "center" : "center";
  const shapeTextX = element.type === "shape"
    ? textXForAlign(12, Math.max(0, element.width - 24), shapeAlign)
    : 0;

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
              x={12}
              y={(element.height - 56) / 2}
              width={56}
              height={56}
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
              x={23}
              y={(element.height - 34) / 2}
              width={34}
              height={34}
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
                  4 +
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
                    4 +
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
                  (systemLayout.subtitle ? systemLayout.subtitle.height + 4 : 0) +
                  4 +
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
                    (systemLayout.subtitle ? systemLayout.subtitle.height + 4 : 0) +
                    4 +
                    systemLayout.body.fontSize
                  }
                  textAnchor={textAnchorForAlign(systemAlign)}
                />
              </text>
            ) : null}
          </>
        ) : null}

        {element.type === "shape" ? (
          <>
            {renderShape(element)}
            {element.label && shapeLayout ? (
              <text
                x={shapeTextX}
                y={(element.height - shapeLayout.height) / 2 + shapeLayout.fontSize}
                textAnchor={textAnchorForAlign(shapeAlign)}
                fill={element.style.textColor}
                fontSize={shapeLayout.fontSize}
                fontWeight={600}
              >
                <SvgTextLines
                  block={shapeLayout}
                  x={shapeTextX}
                  y={(element.height - shapeLayout.height) / 2 + shapeLayout.fontSize}
                  textAnchor={textAnchorForAlign(shapeAlign)}
                />
              </text>
            ) : null}
          </>
        ) : null}

        {element.type === "text" && !editing ? (
          <text
            x={textXForAlign(0, element.width, element.align)}
            y={element.fontSize}
            textAnchor={textAnchorForAlign(element.align)}
            fill={element.style.textColor}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily === "mono" ? "ui-monospace, monospace" : "inherit"}
            fontWeight={element.fontWeight}
          >
            {textLayout ? (
              <SvgTextLines
                block={textLayout}
                x={textXForAlign(0, element.width, element.align)}
                y={element.fontSize}
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
}: {
  element: CanvasConnectorElement;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, element: CanvasElement) => void;
}) {
  if (element.deleted) return null;
  const points = element.points.map(([x, y]) => `${x},${y}`).join(" ");
  const middle = polylineMidpoint(element.points);
  const labelLayout = element.label
    ? getConnectorLabelLayout(element.label, element.fontSize)
    : undefined;
  const visualBounds = getElementBounds(element);
  const labelAlign = element.align ?? "center";
  const labelTextX = labelLayout
    ? textXForAlign(
        middle.x - labelLayout.width / 2 + 8,
        labelLayout.width - 16,
        labelAlign,
      )
    : middle.x;
  return (
    <g
      className={`canvas-node${element.locked ? " is-locked" : ""}`}
      transform={`translate(${element.x} ${element.y})`}
      opacity={element.style.opacity}
      onPointerDown={(event) => onPointerDown(event, element)}
      data-element-id={element.id}
    >
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(14, element.style.strokeWidth + 10)}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill="none"
        stroke={element.style.stroke}
        strokeWidth={element.style.strokeWidth}
        strokeDasharray={dashArray(element.style.strokeStyle)}
        markerStart={element.startArrow === "arrow" ? "url(#canvas-arrow-start)" : undefined}
        markerEnd={element.endArrow === "arrow" ? "url(#canvas-arrow-end)" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {element.label && labelLayout ? (
        <g className="canvas-connector-label">
          <rect
            x={middle.x - labelLayout.width / 2}
            y={middle.y - labelLayout.height - 12}
            width={labelLayout.width}
            height={labelLayout.height + 8}
            rx={8}
            fill="#f8f5ed"
            fillOpacity={0.94}
          />
          <text
            x={labelTextX}
            y={
              middle.y -
              labelLayout.height -
              12 +
              labelLayout.fontSize
            }
            textAnchor={textAnchorForAlign(labelAlign)}
            fill={element.style.textColor}
            fontFamily="ui-monospace, monospace"
            fontSize={labelLayout.fontSize}
            fontWeight={700}
          >
            <SvgTextLines
              block={labelLayout}
              x={labelTextX}
              y={
                middle.y -
                labelLayout.height -
                12 +
                labelLayout.fontSize
              }
              textAnchor={textAnchorForAlign(labelAlign)}
            />
          </text>
        </g>
      ) : null}
      {selected ? (
        <rect
          data-editor-overlay="true"
          className="canvas-selection"
          x={visualBounds.x - element.x}
          y={visualBounds.y - element.y}
          width={visualBounds.width}
          height={visualBounds.height}
          rx={7}
        />
      ) : null}
    </g>
  );
}
