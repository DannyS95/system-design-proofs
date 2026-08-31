import { ArrowRight, FilePlus2, LayoutTemplate, RefreshCw } from "lucide-react";

function BrandMark() {
  return (
    <span className="state-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export interface AppLoadingStateProps {
  message?: string;
}

export function AppLoadingState({
  message = "Opening your canvas…",
}: AppLoadingStateProps) {
  return (
    <main className="app-state app-state--loading" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true">
        <BrandMark />
      </div>
      <p>{message}</p>
    </main>
  );
}

export interface AppEmptyStateProps {
  onCreateBoard: () => void;
  onBrowseTemplates: () => void;
  isCreating?: boolean;
}

export function AppEmptyState({
  onCreateBoard,
  onBrowseTemplates,
  isCreating = false,
}: AppEmptyStateProps) {
  return (
    <section className="app-state app-state--empty" aria-labelledby="empty-state-title">
      <div className="empty-illustration" aria-hidden="true">
        <div className="empty-illustration__node empty-illustration__node--one" />
        <div className="empty-illustration__node empty-illustration__node--two" />
        <div className="empty-illustration__node empty-illustration__node--three" />
        <svg viewBox="0 0 280 160">
          <path d="M70 50 C110 50 110 82 140 82 C170 82 170 116 212 116" />
          <path d="M70 50 C110 50 108 116 140 116" />
        </svg>
      </div>
      <p className="eyebrow">A clear system starts here</p>
      <h1 id="empty-state-title">Give the idea some room.</h1>
      <p className="app-state__description">
        Start with a quiet canvas, or use a teaching template to make the first
        connections for you.
      </p>
      <div className="app-state__actions">
        <button
          className="button button--primary button--large"
          type="button"
          onClick={onCreateBoard}
          disabled={isCreating}
        >
          <FilePlus2 aria-hidden="true" />
          {isCreating ? "Creating board…" : "Create blank board"}
        </button>
        <button
          className="button button--secondary button--large"
          type="button"
          onClick={onBrowseTemplates}
        >
          <LayoutTemplate aria-hidden="true" />
          Browse templates
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export interface AppErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function AppErrorState({
  title = "The canvas could not open",
  message,
  onRetry,
  retryLabel = "Try again",
}: AppErrorStateProps) {
  return (
    <main className="app-state app-state--error" role="alert">
      <div className="error-glyph" aria-hidden="true">
        <span>!</span>
      </div>
      <p className="eyebrow">Something interrupted the workspace</p>
      <h1>{title}</h1>
      <p className="app-state__description">{message}</p>
      <button className="button button--primary button--large" type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        {retryLabel}
      </button>
    </main>
  );
}
