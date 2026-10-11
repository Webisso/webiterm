import type { Update } from "@tauri-apps/plugin-updater";
import { useState } from "react";
import type { UpdateInstallProgress } from "../../lib/appUpdater";
import { installAppUpdate } from "../../lib/appUpdater";

type UpdateAvailableModalProps = {
  update: Update;
  currentVersion: string;
  onClose: () => void;
};

export function UpdateAvailableModal({ update, currentVersion, onClose }: UpdateAvailableModalProps) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UpdateInstallProgress | null>(null);

  const notes = update.body?.trim() ?? "";

  async function onInstall() {
    setInstalling(true);
    setError(null);
    try {
      await installAppUpdate(update, (event) => {
        setProgress(event);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setInstalling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-6"
      role="presentation"
      onClick={installing ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-surface shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <h2 id="update-title" className="text-[16px] font-medium text-ink">Update available</h2>
          <p className="mt-2 text-[13px] text-muted">
            WebiTerm {currentVersion} → {update.version}
          </p>
          {notes ? (
            <p className="mt-4 max-h-40 overflow-y-auto text-[13px] leading-6 whitespace-pre-wrap text-muted">
              {notes}
            </p>
          ) : null}
          {installing && progress ? (
            <p className="mt-4 text-[13px] text-faint">
              Downloading…
              {progress.totalBytes
                ? ` ${Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))}%`
                : ""}
            </p>
          ) : null}
          {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 px-6 pt-2 pb-6">
          <button
            type="button"
            disabled={installing}
            onClick={onClose}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-ink hover:bg-raised disabled:opacity-50"
          >
            Later
          </button>
          <button
            type="button"
            disabled={installing}
            onClick={() => void onInstall()}
            className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas disabled:opacity-50"
          >
            {installing ? "Installing…" : "Install update"}
          </button>
        </div>
      </div>
    </div>
  );
}
