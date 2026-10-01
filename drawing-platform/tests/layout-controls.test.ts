import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LayoutControls } from "../src/editor/LayoutControls.js";

describe("explicit layout spacing controls", () => {
  it("shows persisted spacing without applying a layout on render", () => {
    const onTidy = vi.fn();
    const rendered = renderToStaticMarkup(createElement(LayoutControls, {
      value: { nodeGap: 80, edgeClearance: 48 },
      onTidy,
    }));

    expect(rendered).toMatch(/min="24" max="160"[^>]*aria-label="Node distance"[^>]*value="80"/);
    expect(rendered).toMatch(/min="24" max="96"[^>]*aria-label="Arrow clearance"[^>]*value="48"/);
    expect(rendered).toContain('type="button">Tidy layout</button>');
    expect(rendered).toContain("Whole board · no selection needed");
    expect(onTidy).not.toHaveBeenCalled();
  });

  it("makes the existing lock requirement available on the disabled tidy action", () => {
    const rendered = renderToStaticMarkup(createElement(LayoutControls, {
      onTidy: vi.fn(),
      disabled: true,
      disabledReason: "Unlock all elements to tidy layout",
    }));

    expect(rendered).toContain('disabled="" title="Unlock all elements to tidy layout">Tidy layout');
  });
});


it("offers an explicit action for locked boards instead of a disabled dead end", () => {
  const rendered = renderToStaticMarkup(createElement(LayoutControls, {
    onTidy: vi.fn(), disabled: true, disabledReason: "Unlock all elements to tidy layout", onUnlockAndTidy: vi.fn(),
  }));
  expect(rendered).toContain('role="status">Unlock all elements to tidy layout');
  expect(rendered).toContain('type="button">Unlock all and tidy</button>');
});
