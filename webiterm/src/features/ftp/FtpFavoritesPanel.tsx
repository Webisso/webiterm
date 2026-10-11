import { useState } from "react";
import { deleteSftpFavorite, updateSftpFavorite } from "../../lib/connections";
import type { SftpFavorite } from "../../types/connections";
import { normalizeIpcError } from "../../lib/ipc";
import { FAVORITE_COLORS, SHORTCUT_OPTIONS } from "../favorites/constants";

type FtpFavoritesPanelProps = {
  open: boolean;
  favorites: SftpFavorite[];
  onClose: () => void;
  onNavigate: (favorite: SftpFavorite) => void;
  onChanged: () => void;
};

export function FtpFavoritesPanel({
  open,
  favorites,
  onClose,
  onNavigate,
  onChanged,
}: FtpFavoritesPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patchFavorite(id: string, update: Parameters<typeof updateSftpFavorite>[1]) {
    setBusyId(id);
    setError(null);
    try {
      await updateSftpFavorite(id, update);
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
      await deleteSftpFavorite(id);
      onChanged();
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside
      aria-label="SFTP favorites"
      aria-hidden={!open}
      inert={!open}
      className={`flex shrink-0 flex-col overflow-hidden border-line bg-surface transition-[width,opacity,border-color] duration-150 ${
        open ? "w-[300px] border-l opacity-100" : "w-0 border-l-0 opacity-0"
      }`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[12px] text-faint">Favorites</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-muted hover:text-ink"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {error ? <p className="mb-3 text-[12px] text-danger">{error}</p> : null}
        {favorites.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-faint">
            Right-click files or folders in the list and choose &quot;Add to favorites&quot;. Assign
            colors and ⌘1–⌘9 shortcuts here.
          </p>
        ) : (
          <ul className="space-y-3">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="rounded-md border border-line/80 bg-canvas/40 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: favorite.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={busyId === favorite.id}
                      onClick={() => onNavigate(favorite)}
                      className="block max-w-full truncate text-left text-[13px] font-medium text-ink hover:text-accent"
                    >
                      {favorite.displayName}
                      {favorite.isDir ? "/" : ""}
                    </button>
                    <p className="truncate font-mono text-[11px] text-faint">{favorite.remotePath}</p>
                  </div>
                </div>
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
