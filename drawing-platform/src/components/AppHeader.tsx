import type { LucideIcon } from "lucide-react";
import {
  Check,
  Cloud,
  CloudOff,
  Download,
  LoaderCircle,
  Menu,
  Plus,
  Shapes,
  TriangleAlert,
  Upload,
} from "lucide-react";

export type PersistenceStatus =
  | "saved-locally"
  | "saving"
  | "synced"
  | "offline"
  | "conflict";

export interface AppHeaderProps {
  boardName: string;
  syncStatus: PersistenceStatus;
  onBoardNameChange: (name: string) => void;
  onBoardNameCommit?: () => void;
  onNewBoard: () => void;
  onImport: () => void;
  onExport: () => void;
  onOpenBoards?: () => void;
  onOpenStencils?: () => void;
  isCreating?: boolean;
  actionsDisabled?: boolean;
}

interface StatusPresentation {
  label: string;
  detail: string;
  icon: LucideIcon;
}

const STATUS_PRESENTATION: Record<PersistenceStatus, StatusPresentation> = {
  "saved-locally": {
    label: "Saved locally",
    detail: "This board is safe in your browser and waiting to sync.",
    icon: Check,
  },
  saving: {
    label: "Saving",
    detail: "Sending the latest local snapshot to the server.",
    icon: LoaderCircle,
  },
  synced: {
    label: "Synced",
    detail: "The server has accepted the latest visible revision.",
    icon: Cloud,
  },
  offline: {
    label: "Offline",
    detail: "Keep drawing. Your latest snapshot is saved locally and queued.",
    icon: CloudOff,
  },
  conflict: {
    label: "Conflict",
    detail: "The server copy changed. Your local canvas remains untouched.",
    icon: TriangleAlert,
  },
};

export function AppHeader({
  boardName,
  syncStatus,
  onBoardNameChange,
  onBoardNameCommit,
  onNewBoard,
  onImport,
  onExport,
  onOpenBoards,
  onOpenStencils,
  isCreating = false,
  actionsDisabled = false,
}: AppHeaderProps) {
  const status = STATUS_PRESENTATION[syncStatus];
  const StatusIcon = status.icon;

  return (
    <header className="app-header">
      <div className="app-header__identity">
        {onOpenBoards ? (
          <button
            className="icon-button app-header__mobile-action"
            type="button"
            onClick={onOpenBoards}
            aria-label="Open boards"
          >
            <Menu aria-hidden="true" />
          </button>
        ) : null}

        <div className="brand" aria-label="System Canvas">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand__name">
            System <strong>Canvas</strong>
          </span>
        </div>

        <span className="app-header__divider" aria-hidden="true" />

        <label className="board-name-field">
          <span className="sr-only">Board name</span>
          <input
            value={boardName}
            onChange={(event) => onBoardNameChange(event.target.value)}
            onBlur={onBoardNameCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            maxLength={120}
            spellCheck="false"
            aria-label="Board name"
          />
        </label>
      </div>

      <div className="app-header__actions">
        <div
          className={`sync-pill sync-pill--${syncStatus}`}
          title={status.detail}
          role="status"
          aria-live="polite"
        >
          <StatusIcon
            className={syncStatus === "saving" ? "spin" : undefined}
            aria-hidden="true"
          />
          <span>{status.label}</span>
        </div>

        <div className="header-action-group" aria-label="Board actions">
          <button
            className="header-action"
            type="button"
            onClick={onImport}
            disabled={actionsDisabled}
          >
            <Upload aria-hidden="true" />
            <span>Import</span>
          </button>
          <button
            className="header-action"
            type="button"
            onClick={onExport}
            disabled={actionsDisabled}
          >
            <Download aria-hidden="true" />
            <span>Export</span>
          </button>
          <button
            className="button button--primary app-header__new-button"
            type="button"
            onClick={onNewBoard}
            disabled={actionsDisabled || isCreating}
          >
            {isCreating ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            <span>{isCreating ? "Creating" : "New board"}</span>
          </button>
        </div>

        {onOpenStencils ? (
          <button
            className="icon-button app-header__mobile-action"
            type="button"
            onClick={onOpenStencils}
            aria-label="Open stencil shelf"
          >
            <Shapes aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
