import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BoardNavigator } from "../src/components/BoardNavigator.js";

describe("BoardNavigator template actions", () => {
  it("renders preview and persistent add as separate controls", () => {
    const markup = renderToStaticMarkup(
      <BoardNavigator
        boards={[]}
        templates={[
          {
            id: "distributed-cache",
            name: "Distributed Cache",
            description: "Financial cache path",
          },
        ]}
        onSelectBoard={vi.fn()}
        onCreateBoard={vi.fn()}
        onPreviewTemplate={vi.fn()}
        onCreateFromTemplate={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );

    expect(markup).toContain(
      'aria-label="Preview Distributed Cache without saving"',
    );
    expect(markup).toContain(
      'aria-label="Add Distributed Cache as a saved board"',
    );
    expect(markup).toContain(
      "Select a template to preview it. Use + to create a saved board.",
    );
  });
});
