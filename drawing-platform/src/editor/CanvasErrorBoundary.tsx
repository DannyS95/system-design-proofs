import { Component, type ErrorInfo, type ReactNode } from "react";

export interface CanvasErrorBoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  error?: Error;
}

/** Keeps board navigation and JSON recovery available if rendering one scene fails. */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("System Canvas editor failed", error, info.componentStack);
  }

  componentDidUpdate(previous: CanvasErrorBoundaryProps): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: undefined });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="canvas-failure" role="alert">
        <span className="canvas-failure__mark" aria-hidden="true">!</span>
        <h2>This canvas could not render</h2>
        <p>
          The workspace is still running. Open another board or export this board’s JSON
          from the header before retrying.
        </p>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => this.setState({ error: undefined })}
        >
          Retry canvas
        </button>
      </section>
    );
  }
}
