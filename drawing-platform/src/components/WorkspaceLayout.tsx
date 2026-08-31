import type { ReactNode } from "react";

export interface WorkspaceLayoutProps {
  header: ReactNode;
  boardNavigator: ReactNode;
  stencilShelf: ReactNode;
  children: ReactNode;
}

export function WorkspaceLayout({
  header,
  boardNavigator,
  stencilShelf,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="system-canvas-app">
      {header}
      <div className="workspace-layout">
        {boardNavigator}
        <main className="canvas-stage" aria-label="Drawing canvas">
          {children}
        </main>
        {stencilShelf}
      </div>
    </div>
  );
}
