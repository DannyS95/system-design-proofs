import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { BoardScene } from "../../shared/contracts.js";
import { SPACING } from "../../shared/layout-standard.js";
import "./layout-controls.css";

export type LayoutSpacing = NonNullable<BoardScene["appState"]["layoutSpacing"]>;

export interface LayoutControlsProps {
  value?: LayoutSpacing;
  onTidy: (spacing: LayoutSpacing) => void;
  disabled?: boolean;
  disabledReason?: string;
  onUnlockAndTidy?: (spacing: LayoutSpacing) => void;
}

/** Slider gestures apply spacing to the whole board as one undoable edit. */
export function LayoutControls({
  value,
  onTidy,
  disabled = false,
  disabledReason,
  onUnlockAndTidy,
}: LayoutControlsProps) {
  const [nodeGap, setNodeGap] = useState(value?.nodeGap ?? SPACING.sibling);
  const [edgeClearance, setEdgeClearance] = useState(
    value?.edgeClearance ?? SPACING.connector,
  );
  useEffect(() => {
    setNodeGap(value?.nodeGap ?? SPACING.sibling);
    setEdgeClearance(value?.edgeClearance ?? SPACING.connector);
  }, [value?.nodeGap, value?.edgeClearance]);
  const apply = () => {
    if (!disabled) onTidy({ nodeGap, edgeClearance });
  };
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  return (
    <details
      ref={detailsRef}
      className="canvas-layout-controls"
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" && detailsRef.current?.open) {
          event.preventDefault();
          detailsRef.current.open = false;
          summaryRef.current?.focus();
        }
      }}
    >
      <summary ref={summaryRef}>
        <SlidersHorizontal aria-hidden="true" />
        Layout spacing
      </summary>
      <section className="canvas-layout-controls__panel" aria-label="Layout spacing">
        <p>Whole board · no selection needed. Release a slider or click Tidy layout to apply.</p>
        {disabled ? <p role="status">{disabledReason}</p> : null}
        <label>
          <span>Node distance <output>{nodeGap}</output></span>
          <input
            type="range"
            onPointerUp={apply}
            onKeyUp={(event) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) apply();
            }}
            min={24}
            max={160}
            step={8}
            value={nodeGap}
            aria-label="Node distance"
            onChange={(event) => setNodeGap(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Arrow clearance <output>{edgeClearance}</output></span>
          <input
            type="range"
            onPointerUp={apply}
            onKeyUp={(event) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) apply();
            }}
            min={24}
            max={96}
            step={8}
            value={edgeClearance}
            aria-label="Arrow clearance"
            onChange={(event) => setEdgeClearance(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onClick={() => onTidy({ nodeGap, edgeClearance })}
        >
          Tidy layout
        </button>
        {onUnlockAndTidy ? <button type="button" onClick={() => onUnlockAndTidy({ nodeGap, edgeClearance })}>
          Unlock all and tidy
        </button> : null}
      </section>
    </details>
  );
}
