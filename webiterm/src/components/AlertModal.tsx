type AlertTone = "info" | "success" | "warning" | "danger";

export type AlertPayload = {
  title: string;
  message: string;
  tone: AlertTone;
};

type AlertModalProps = {
  alert: AlertPayload;
  onClose: () => void;
};

const toneTitle: Record<AlertTone, string> = {
  info: "text-ink",
  success: "text-ok",
  warning: "text-warning",
  danger: "text-danger",
};

export function AlertModal({ alert, onClose }: AlertModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="alert-title" className={`text-[15px] font-medium ${toneTitle[alert.tone]}`}>
          {alert.title}
        </h2>
        <p id="alert-message" className="mt-3 text-[13px] leading-relaxed text-muted">
          {alert.message}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
