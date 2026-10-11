import { useState } from "react";
import {
  createSshCommandFavorite,
  deleteSshCommandFavorite,
  updateSshCommandFavorite,
} from "../../lib/connections";
import { normalizeIpcError } from "../../lib/ipc";
import type { SshCommandFavorite } from "../../types/connections";
import { FAVORITE_COLORS, SHORTCUT_OPTIONS } from "../favorites/constants";

type SshCommandFavoritesPanelProps = {
  open: boolean;
  connectionId: string;
  favorites: SshCommandFavorite[];
  lastCommand: string | null;
  onClose: () => void;
  onChanged: () => void;
  onInject: (command: string) => void;
};

export function SshCommandFavoritesPanel({
  open,
  connectionId,
  favorites,
  lastCommand,
  onClose,
  onChanged,
  onInject,
}: SshCommandFavoritesPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");
  const [adding, setAdding] = useState(false);

  async function patchFavorite(id: string, update: Parameters<typeof updateSshCommandFavorite>[1]) {
    setBusyId(id);
    setError(null);
    try {
      await updateSshCommandFavorite(id, update);
      onChanged();
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function removeFavorite(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteSshCommandFavorite(id);
      onChanged();
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function addFavorite(payload: { label: string; command: string }) {
    const trimmedLabel = payload.label.trim();
    const trimmedCommand = payload.command.trim();
    if (!trimmedLabel || !trimmedCommand) {
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await createSshCommandFavorite({
        connectionId,
        label: trimmedLabel,
        command: trimmedCommand,
      });
      setLabel("");
      setCommand("");
      onChanged();
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setAdding(false);
    }
  }

  async function addLastCommand() {
    if (!lastCommand) {
      return;
    }
    const suggested = lastCommand.slice(0, 48);
    await addFavorite({ label: suggested, command: lastCommand });
  }

  return (
    <aside
      aria-label="SSH command favorites"
      aria-hidden={!open}
      inert={!open}
      className={`flex shrink-0 flex-col overflow-hidden border-line bg-surface transition-[width,opacity,border-color] duration-150 ${
        open ? "w-[300px] border-l opacity-100" : "w-0 border-l-0 opacity-0"
      }`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[12px] text-faint">Commands</span>
        <button type="button" onClick={onClose} className="text-[12px] text-muted hover:text-ink">
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {error ? <p className="mb-3 text-[12px] text-danger">{error}</p> : null}

        <div className="mb-4 space-y-2 rounded-md border border-line/80 bg-canvas/40 p-2.5">
          <p className="text-[11px] font-medium text-faint">New command</p>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Label"
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[12px]"
          />
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Command (Enter not sent when used)"
            rows={3}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-line bg-canvas px-2 py-1.5 font-mono text-[12px]"
          />
          <button
            type="button"
            disabled={adding || !label.trim() || !command.trim()}
            onClick={() => void addFavorite({ label, command })}
            className="h-8 w-full rounded-md bg-accent text-[12px] font-medium text-canvas disabled:opacity-50"
          >
            {adding ? "Saving…" : "Add command"}
          </button>
          {lastCommand ? (
            <button
              type="button"
              disabled={adding}
              onClick={() => void addLastCommand()}
              className="w-full rounded-md border border-line px-2 py-1.5 text-left text-[11px] text-muted hover:bg-raised/60 hover:text-ink"
            >
              <span className="block text-[10px] uppercase tracking-wide text-faint">Last run</span>
              <span className="line-clamp-2 font-mono">{lastCommand}</span>
            </button>
          ) : null}
        </div>

        {favorites.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-faint">
            Save commands here, then click to paste into the terminal without pressing Enter.
          </p>
        ) : (
          <ul className="space-y-3">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="rounded-md border border-line/80 bg-canvas/40 p-2.5"
              >
                <button
                  type="button"
                  disabled={busyId === favorite.id}
                  onClick={() => onInject(favorite.command)}
                  className="flex w-full items-start gap-2 text-left"
                  title="Paste into terminal (no Enter)"
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: favorite.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink hover:text-accent">
                      {favorite.label}
                    </span>
                    <span className="line-clamp-2 font-mono text-[11px] text-faint">
                      {favorite.command}
                    </span>
                  </span>
                </button>
                <div className="mt-2 flex flex-wrap gap-1">
                  {FAVORITE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      disabled={busyId === favorite.id}
                      aria-label={`Color ${color}`}
                      onClick={() => void patchFavorite(favorite.id, { color })}
                      className={`h-5 w-5 rounded-full border-2 ${
                        favorite.color.toLowerCase() === color ? "border-ink" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[11px] text-faint">Shortcut</label>
                  <select
                    disabled={busyId === favorite.id}
                    value={favorite.shortcutKey ?? ""}
                    onChange={(event) =>
                      void patchFavorite(favorite.id, { shortcutKey: event.target.value })
                    }
                    className="h-7 min-w-0 flex-1 rounded-md border border-line bg-canvas px-2 text-[12px]"
                  >
                    {SHORTCUT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyId === favorite.id}
                    onClick={() => void removeFavorite(favorite.id)}
                    className="text-[11px] text-danger"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
