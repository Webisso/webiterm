type UnsavedRemoteFileDialogProps = {
  fileLabel: string;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedRemoteFileDialog({
  fileLabel,
  saving,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedRemoteFileDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-remote-title"
        aria-describedby="unsaved-remote-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="unsaved-remote-title" className="text-[15px] font-medium text-ink">
          Save changes?
        </h2>
        <p id="unsaved-remote-message" className="mt-3 text-[13px] leading-relaxed text-muted">
          <span className="font-mono text-ink">{fileLabel}</span> has unsaved changes. Save before
          closing?
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-8 rounded-md border border-line px-4 text-[13px] text-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="h-8 rounded-md border border-line px-4 text-[13px] text-muted hover:text-ink disabled:opacity-50"
          >
            Don&apos;t save
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
