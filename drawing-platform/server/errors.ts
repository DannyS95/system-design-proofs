export class BoardNotFoundError extends Error {
  readonly boardId: string;

  constructor(boardId: string) {
    super(`Board '${boardId}' was not found`);
    this.name = "BoardNotFoundError";
    this.boardId = boardId;
  }
}

export class TemplateNotFoundError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(`Template '${templateId}' was not found`);
    this.name = "TemplateNotFoundError";
    this.templateId = templateId;
  }
}

export class RevisionConflictError extends Error {
  readonly boardId: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(boardId: string, expectedRevision: number, actualRevision: number) {
    super(
      `Board '${boardId}' is at revision ${actualRevision}, not ${expectedRevision}`,
    );
    this.name = "RevisionConflictError";
    this.boardId = boardId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class FinalBoardDeletionError extends Error {
  readonly boardId: string;

  constructor(boardId: string) {
    super("The final board cannot be deleted");
    this.name = "FinalBoardDeletionError";
    this.boardId = boardId;
  }
}

export class CorruptSnapshotError extends Error {
  readonly filename: string;

  constructor(filename: string, cause?: unknown) {
    super(`Snapshot '${filename}' is not a valid board document`, { cause });
    this.name = "CorruptSnapshotError";
    this.filename = filename;
  }
}
