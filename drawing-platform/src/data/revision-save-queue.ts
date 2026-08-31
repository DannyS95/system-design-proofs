import type { BoardDocument, BoardScene } from "../../shared/contracts.js";

export type SaveStatus =
  | "saved-local"
  | "saving"
  | "synced"
  | "offline"
  | "conflict";

export type PendingBoardSave = {
  name: string;
  scene: BoardScene;
};

type TimerHandle = ReturnType<typeof setTimeout>;

export type RevisionSaveQueueOptions = {
  initialRevision: number;
  delayMs?: number;
  retryMs?: number;
  save: (
    payload: PendingBoardSave,
    expectedRevision: number,
  ) => Promise<BoardDocument>;
  onStatus: (status: SaveStatus, message?: string) => void;
  onSaved: (document: BoardDocument) => void;
};

const errorKind = (error: unknown): "conflict" | "offline" => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 409
  ) {
    return "conflict";
  }
  return "offline";
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "The board could not be synced.";

export class RevisionSaveQueue {
  private revision: number;
  private pending: PendingBoardSave | null = null;
  private inFlight = false;
  private timer: TimerHandle | null = null;
  private retryTimer: TimerHandle | null = null;
  private disposed = false;
  private readonly delayMs: number;
  private readonly retryMs: number;

  constructor(private readonly options: RevisionSaveQueueOptions) {
    this.revision = options.initialRevision;
    this.delayMs = options.delayMs ?? 700;
    this.retryMs = options.retryMs ?? 2_500;
  }

  enqueue(payload: PendingBoardSave): void {
    if (this.disposed) {
      return;
    }

    this.pending = payload;
    this.options.onStatus("saved-local");
    this.clearTimer();

    if (!this.inFlight) {
      this.timer = setTimeout(() => void this.flush(), this.delayMs);
    }
  }

  async flush(): Promise<void> {
    if (this.disposed || this.inFlight || !this.pending) {
      return;
    }

    this.clearTimer();
    this.clearRetryTimer();
    const payload = this.pending;
    this.pending = null;
    this.inFlight = true;
    let succeeded = false;
    this.options.onStatus("saving");

    try {
      const saved = await this.options.save(payload, this.revision);
      if (this.disposed) {
        return;
      }
      this.revision = saved.revision;
      succeeded = true;
      this.options.onSaved(saved);
      this.options.onStatus(this.pending ? "saved-local" : "synced");
    } catch (error) {
      if (this.disposed) {
        return;
      }
      this.pending ??= payload;
      const kind = errorKind(error);
      this.options.onStatus(kind, errorMessage(error));
      if (kind === "offline") {
        this.retryTimer = setTimeout(() => void this.flush(), this.retryMs);
      }
    } finally {
      this.inFlight = false;
      if (succeeded && !this.disposed && this.pending && !this.retryTimer) {
        void this.flush();
      }
    }
  }

  retry(): void {
    if (this.disposed) {
      return;
    }
    this.clearRetryTimer();
    void this.flush();
  }

  updateRevision(revision: number): void {
    this.revision = revision;
  }

  dispose(): void {
    this.disposed = true;
    this.pending = null;
    this.clearTimer();
    this.clearRetryTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
