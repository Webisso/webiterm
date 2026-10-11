import { useState } from "react";
import { normalizeIpcError } from "../../lib/ipc";

type BoardNameModalProps = {
  title: string;
  initialName?: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
};

export function BoardNameModal({ title, initialName = "", onCancel, onSave }: BoardNameModalProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSave(name);
    } catch (err) {
      setError(normalizeIpcError(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-4 shadow-panel"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-[14px] font-medium text-ink">{title}</h2>
        <label className="mt-3 block space-y-1">
          <span className="text-[12px] text-muted">Name</span>
          <input
            autoFocus
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px] text-ink"
          />
        </label>
        {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || name.trim().length === 0}
            className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-canvas disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
