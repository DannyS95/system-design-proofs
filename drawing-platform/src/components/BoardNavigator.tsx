import {
  FilePlus2,
  Info,
  LayoutTemplate,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export interface BoardNavigationItem {
  id: string;
  name: string;
  updatedAtLabel?: string;
  elementCount?: number;
  canDelete?: boolean;
}

export interface TemplateNavigationItem {
  id: string;
  name: string;
  description: string;
}

export interface BoardNavigatorProps {
  boards: readonly BoardNavigationItem[];
  activeBoardId?: string;
  templates?: readonly TemplateNavigationItem[];
  activeTemplateId?: string;
  loadingTemplateId?: string;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onPreviewTemplate: (templateId: string) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onRequestDelete: (board: BoardNavigationItem) => void;
  onClose?: () => void;
  isOpen?: boolean;
  isCreating?: boolean;
  actionError?: string;
}

function BoardInitial({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || "•";
  return <span className="board-item__initial">{initial}</span>;
}

export function BoardNavigator({
  boards,
  activeBoardId,
  templates = [],
  activeTemplateId,
  loadingTemplateId,
  onSelectBoard,
  onCreateBoard,
  onPreviewTemplate,
  onCreateFromTemplate,
  onRequestDelete,
  onClose,
  isOpen = false,
  isCreating = false,
  actionError,
}: BoardNavigatorProps) {
  return (
    <>
      {isOpen && onClose ? (
        <button
          className="drawer-scrim"
          type="button"
          aria-label="Close board navigator"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`side-panel board-navigator${isOpen ? " is-open" : ""}`}
        aria-label="Board navigator"
      >
        <div className="side-panel__header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Your boards</h2>
          </div>
          {onClose ? (
            <button
              className="icon-button side-panel__close"
              type="button"
              onClick={onClose}
              aria-label="Close board navigator"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button
          className="button button--panel"
          type="button"
          onClick={onCreateBoard}
          disabled={isCreating}
        >
          {isCreating ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          <span>{isCreating ? "Creating board…" : "Create blank board"}</span>
        </button>

        {actionError ? (
          <div className="action-message action-message--error" role="alert">
            {actionError}
          </div>
        ) : null}

        <nav className="board-list" aria-label="Boards">
          {boards.length > 0 ? (
            boards.map((board) => {
              const isActive = board.id === activeBoardId;
              const canDelete = board.canDelete ?? boards.length > 1;

              return (
                <div
                  className={`board-item${isActive ? " is-active" : ""}`}
                  key={board.id}
                >
                  <button
                    className="board-item__select"
                    type="button"
                    onClick={() => onSelectBoard(board.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <BoardInitial name={board.name} />
                    <span className="board-item__copy">
                      <strong>{board.name}</strong>
                      <small>
                        {board.updatedAtLabel ?? "Not synced yet"}
                        {typeof board.elementCount === "number"
                          ? ` · ${board.elementCount} element${board.elementCount === 1 ? "" : "s"}`
                          : ""}
                      </small>
                    </span>
                  </button>
                  <button
                    className="icon-button board-item__delete"
                    type="button"
                    onClick={() => onRequestDelete(board)}
                    disabled={!canDelete}
                    aria-label={
                      canDelete
                        ? `Delete ${board.name}`
                        : "The final board cannot be deleted"
                    }
                    title={
                      canDelete
                        ? `Delete ${board.name}`
                        : "Create another board before deleting this one"
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="compact-empty-state">
              <FilePlus2 aria-hidden="true" />
              <strong>No boards yet</strong>
              <span>Create a blank canvas or start from a template.</span>
            </div>
          )}
        </nav>

        {boards.length === 1 ? (
          <p className="board-list__guard">
            <Info aria-hidden="true" />
            The final board stays put. Create another board before deleting it.
          </p>
        ) : null}

        {templates.length > 0 ? (
          <section className="template-section" aria-labelledby="template-heading">
            <div className="section-heading">
              <span className="section-heading__icon" aria-hidden="true">
                <LayoutTemplate />
              </span>
              <div>
                <p className="eyebrow">Starting points</p>
                <h3 id="template-heading">Templates</h3>
              </div>
            </div>

            <div className="template-list">
              {templates.map((template, index) => (
                <div
                  className={`template-card${template.id === activeTemplateId ? " is-previewing" : ""}`}
                  key={template.id}
                >
                  <button
                    className="template-card__select"
                    type="button"
                    onClick={() => onPreviewTemplate(template.id)}
                    disabled={isCreating || Boolean(loadingTemplateId)}
                    aria-label={`Preview ${template.name} without saving`}
                    aria-pressed={template.id === activeTemplateId}
                  >
                    <span className={`template-card__preview template-card__preview--${(index % 3) + 1}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="template-card__copy">
                      <strong>{template.name}</strong>
                      <small>{template.description}</small>
                    </span>
                  </button>
                  <button
                    className="template-card__add"
                    type="button"
                    onClick={() => onCreateFromTemplate(template.id)}
                    disabled={isCreating || Boolean(loadingTemplateId)}
                    aria-label={`Add ${template.name} as a saved board`}
                    title={`Add ${template.name} as a saved board`}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="side-panel__footnote">
          Select a template to preview it. Use + to create a saved board.
        </p>
      </aside>
    </>
  );
}
