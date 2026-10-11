import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { exportLocalData, importLocalData } from "../../lib/connections";
import { getAppStatus, normalizeIpcError } from "../../lib/ipc";
import type { AppStatus } from "../../types/desktop";

type PermissionsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PermissionsModal({ open: visible, onClose }: PermissionsModalProps) {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setStatus(await getAppStatus());
    } catch (error) {
      setMessageOk(false);
      setMessage(normalizeIpcError(error));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setMessage(null);
    void refresh();
  }, [visible, refresh]);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const path = await save({
        title: "Export WebiTerm data",
        defaultPath: "webiterm.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) {
        return;
      }
      await exportLocalData(path);
      setMessageOk(true);
      setMessage("Export saved. The file includes passwords in plain text.");
    } catch (error) {
      setMessageOk(false);
      setMessage(normalizeIpcError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setMessage(null);
    try {
      const picked = await open({
        title: "Import WebiTerm data",
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (typeof picked !== "string") {
        return;
      }
      if (
        !window.confirm(
          "Replace all local profiles, passwords, folders, favorites, and boards with this file?",
        )
      ) {
        return;
      }
      setBusy(true);
      await importLocalData(picked);
      window.location.reload();
    } catch (error) {
      setMessageOk(false);
      setMessage(normalizeIpcError(error));
      setBusy(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permissions-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="permissions-title" className="text-[17px] font-medium text-ink">
            Local data
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Everything lives in one JSON file on this device. Passwords are stored in plain text.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
          <div className="rounded-lg border border-line px-3 py-2.5">
            <p className="text-[13px] font-medium text-ink">Data file</p>
            <p className="mt-1 break-all font-mono text-[12px] text-muted">
              {status?.storagePath ?? (busy ? "Checking…" : "Unavailable")}
            </p>
          </div>
          <p className="text-[12px] leading-relaxed text-faint">
            Export writes the whole document. Import replaces the current document and reloads the
            app.
          </p>
          {message ? (
            <p className={`text-[12px] ${messageOk ? "text-ok" : "text-warning"}`}>{message}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleExport()}
              className="h-8 rounded-md border border-line px-3 text-[12px] text-ink hover:bg-raised disabled:opacity-60"
            >
              Export…
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleImport()}
              className="h-8 rounded-md border border-line px-3 text-[12px] text-ink hover:bg-raised disabled:opacity-60"
            >
              Import…
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
