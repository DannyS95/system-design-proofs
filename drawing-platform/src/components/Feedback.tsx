import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="dialog-layer" role="presentation">
      <button
        className="dialog-layer__backdrop"
        type="button"
        onClick={busy ? undefined : onCancel}
        aria-label="Close confirmation"
      />
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className={`confirm-dialog__icon confirm-dialog__icon--${tone}`} aria-hidden="true">
          <TriangleAlert />
        </div>
        <div className="confirm-dialog__copy">
          <p className="eyebrow">Please confirm</p>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>
        <div className="confirm-dialog__actions">
          <button
            ref={cancelButtonRef}
            className="button button--secondary"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

export interface ToastViewportProps {
  messages: readonly ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: XCircle,
} satisfies Record<ToastTone, typeof Info>;

export function ToastViewport({ messages, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {messages.map((message) => {
        const tone = message.tone ?? "info";
        const ToastIcon = TOAST_ICONS[tone];
        return (
          <article className={`toast toast--${tone}`} key={message.id} role="status">
            <ToastIcon className="toast__icon" aria-hidden="true" />
            <div className="toast__copy">
              <strong>{message.title}</strong>
              {message.description ? <p>{message.description}</p> : null}
            </div>
            <button
              className="icon-button toast__dismiss"
              type="button"
              onClick={() => onDismiss(message.id)}
              aria-label={`Dismiss ${message.title}`}
            >
              <X aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
