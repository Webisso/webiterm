import { useEffect, useState } from "react";
import { getSftpEditorPrefs, setSftpEditorPrefs } from "../../lib/connections";
import { normalizeIpcError } from "../../lib/ipc";
import type { SftpEditorPrefs } from "../../types/connections";

type SftpEditorSettingsProps = {
  onClose: () => void;
};

const COMMON_EXTENSIONS = [".txt", ".md", ".json", ".xml", ".html", ".css", ".js", ".ts", ".tsx", ".php", ".py", ".rb", ".go", ".rs", ".sql", ".yml", ".yaml", ".env", ".sh"];

export function SftpEditorSettings({ onClose }: SftpEditorSettingsProps) {
  const [prefs, setPrefs] = useState<SftpEditorPrefs>({ extensionApps: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newExt, setNewExt] = useState("");
  const [newApp, setNewApp] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await getSftpEditorPrefs();
        setPrefs(loaded);
      } catch (err) {
        setError(normalizeIpcError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await setSftpEditorPrefs(prefs);
      setPrefs(saved);
      onClose();
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setSaving(false);
    }
  }

  function applyDefaultToAll() {
    const app = prefs.defaultApplication?.trim();
    if (!app) {
      return;
    }
    const next: Record<string, string> = { ...prefs.extensionApps };
    for (const ext of COMMON_EXTENSIONS) {
      next[ext] = app;
    }
    setPrefs({ ...prefs, extensionApps: next });
  }

  function addAssociation() {
    const ext = normalizeExtension(newExt);
    const app = newApp.trim();
    if (!ext || !app) {
      return;
    }
    setPrefs({
      ...prefs,
      extensionApps: { ...prefs.extensionApps, [ext]: app },
    });
    setNewExt("");
    setNewApp("");
  }

  function removeAssociation(ext: string) {
    const next = { ...prefs.extensionApps };
    delete next[ext];
    setPrefs({ ...prefs, extensionApps: next });
  }

  const associations = Object.entries(prefs.extensionApps).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-line bg-surface shadow-panel"
        role="dialog"
        aria-labelledby="sftp-editor-settings-title"
      >
        <div className="border-b border-line px-4 py-3">
          <h2 id="sftp-editor-settings-title" className="text-[15px] font-medium text-ink">
            SFTP editor applications
          </h2>
          <p className="mt-1 text-[12px] text-faint">
            Like FileZilla: pick a default app, or map extensions (e.g. .php → Cursor). macOS app names as shown in Finder.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
          {loading ? (
            <p className="text-faint">Loading…</p>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-[12px] text-faint">Default application</span>
                <input
                  value={prefs.defaultApplication ?? ""}
                  onChange={(event) =>
                    setPrefs({ ...prefs, defaultApplication: event.target.value || undefined })
                  }
                  placeholder="e.g. Cursor, Visual Studio Code, TextEdit"
                  className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
                />
              </label>
              <button
                type="button"
                disabled={!prefs.defaultApplication?.trim()}
                onClick={() => applyDefaultToAll()}
                className="h-8 rounded-md border border-line px-3 text-[12px] text-muted hover:text-ink disabled:opacity-50"
              >
                Apply default to common file types
              </button>
              <div>
                <p className="mb-2 text-[12px] text-faint">Extension → application</p>
                <ul className="mb-3 max-h-40 overflow-auto rounded-md border border-line">
                  {associations.length === 0 ? (
                    <li className="px-3 py-2 text-[12px] text-faint">No custom mappings yet.</li>
                  ) : (
                    associations.map(([ext, app]) => (
                      <li
                        key={ext}
                        className="flex items-center justify-between gap-2 border-t border-line/60 px-3 py-1.5 first:border-t-0"
                      >
                        <span className="font-mono text-[12px] text-ink">{ext}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{app}</span>
                        <button
                          type="button"
                          onClick={() => removeAssociation(ext)}
                          className="text-[11px] text-danger"
                        >
                          Remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={newExt}
                    onChange={(event) => setNewExt(event.target.value)}
                    placeholder=".ext"
                    className="h-8 w-24 rounded-md border border-line bg-canvas px-2 font-mono text-[12px]"
                  />
                  <input
                    value={newApp}
                    onChange={(event) => setNewApp(event.target.value)}
                    placeholder="Application name"
                    className="h-8 min-w-0 flex-1 rounded-md border border-line bg-canvas px-2 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => addAssociation()}
                    className="h-8 rounded-md border border-line px-3 text-[12px] text-muted"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void save()}
            className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-canvas disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}
