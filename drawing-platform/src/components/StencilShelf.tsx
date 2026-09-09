import type { CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Shapes,
  Trash2,
  X,
} from "lucide-react";

import { SystemIcon } from "../editor/SystemIcon";

export interface StencilShelfItem {
  id: string;
  name: string;
  role: string;
  category: string;
  accent: string;
  iconId: string;
  keywords?: readonly string[];
  removable?: boolean;
}

export interface StencilShelfProps {
  stencils: readonly StencilShelfItem[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onInsertStencil: (stencilId: string) => void;
  onRemoveStencil?: (stencilId: string) => void;
  onToggleCollapsed: () => void;
  collapsed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function stencilStyle(accent: string): CSSProperties {
  return { "--stencil-accent": accent } as CSSProperties;
}

export function StencilShelf({
  stencils,
  searchQuery,
  onSearchQueryChange,
  onInsertStencil,
  onRemoveStencil,
  onToggleCollapsed,
  collapsed = false,
  isOpen = false,
  onClose,
}: StencilShelfProps) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredStencils = normalizedQuery
    ? stencils.filter((stencil) =>
        [
          stencil.name,
          stencil.role,
          stencil.category,
          ...(stencil.keywords ?? []),
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        ),
      )
    : stencils;

  const groupedStencils = new Map<string, StencilShelfItem[]>();
  for (const stencil of filteredStencils) {
    const group = groupedStencils.get(stencil.category) ?? [];
    group.push(stencil);
    groupedStencils.set(stencil.category, group);
  }

  return (
    <>
      {isOpen && onClose ? (
        <button
          className="drawer-scrim drawer-scrim--right"
          type="button"
          aria-label="Close stencil shelf"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`side-panel stencil-shelf${collapsed ? " is-collapsed" : ""}${isOpen ? " is-open" : ""}`}
        aria-label="IT stencil shelf"
      >
        <button
          className="stencil-shelf__expand"
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expand stencil shelf"
        >
          <Shapes aria-hidden="true" />
          <span>Components</span>
          <ChevronLeft aria-hidden="true" />
        </button>

        <div className="stencil-shelf__content">
            <div className="side-panel__header">
              <div>
                <p className="eyebrow">Build your system</p>
                <h2>Components</h2>
              </div>
              <div className="side-panel__header-actions">
                <button
                  className="icon-button stencil-shelf__collapse"
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label="Collapse stencil shelf"
                  title="Collapse shelf"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
                {onClose ? (
                  <button
                    className="icon-button side-panel__close"
                    type="button"
                    onClick={onClose}
                    aria-label="Close stencil shelf"
                  >
                    <X aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <label className="search-field">
              <Search aria-hidden="true" />
              <span className="sr-only">Search components</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search name, role, category…"
                autoComplete="off"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange("")}
                  aria-label="Clear component search"
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="stencil-shelf__scroll">
              {groupedStencils.size > 0 ? (
                Array.from(groupedStencils, ([category, items]) => (
                  <section className="stencil-group" key={category}>
                    <div className="stencil-group__heading">
                      <h3>{category}</h3>
                      <span>{items.length}</span>
                    </div>
                    <div className="stencil-grid">
                      {items.map((stencil) => (
                        <div className="stencil-card-wrap" key={stencil.id}>
                          <button
                            className="stencil-card"
                            style={stencilStyle(stencil.accent)}
                            type="button"
                            onClick={() => onInsertStencil(stencil.id)}
                            title={`Add ${stencil.name}: ${stencil.role}`}
                          >
                            <span className="stencil-card__glyph" aria-hidden="true">
                              <SystemIcon
                                iconId={stencil.iconId}
                                size={19}
                                color={stencil.accent}
                              />
                            </span>
                            <span className="stencil-card__copy">
                              <strong>{stencil.name}</strong>
                              <small>{stencil.role}</small>
                            </span>
                            <Plus className="stencil-card__add" aria-hidden="true" />
                          </button>
                          {stencil.removable && onRemoveStencil ? (
                            <button
                              className="stencil-card__remove"
                              type="button"
                              aria-label={`Remove ${stencil.name} from my library`}
                              title="Remove from my library"
                              onClick={() => onRemoveStencil(stencil.id)}
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="stencil-no-match">
                  <span className="stencil-no-match__mark" aria-hidden="true">
                    <Search />
                  </span>
                  <strong>No components found</strong>
                  <p>Try a role like “route,” “store,” or “compute.”</p>
                  <button
                    className="button button--quiet"
                    type="button"
                    onClick={() => onSearchQueryChange("")}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

            <p className="side-panel__footnote">
              Select a component to place an editable copy in the canvas.
            </p>
        </div>
      </aside>
    </>
  );
}
