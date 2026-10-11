import { save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeIpcError } from "../../lib/ipc";
import {
  createSftpFavorite,
  deleteSftpFavorite,
  ftpChangeDir,
  ftpClose,
  ftpDelete,
  ftpDownload,
  ftpGoto,
  ftpList,
  ftpOpen,
  ftpPrepareEdit,
  ftpRename,
  ftpSyncEdits,
  getSftpEditorPrefs,
  listSftpFavorites,
  openPathWithApplication,
  type FtpEntry,
  type FtpListResult,
} from "../../lib/connections";
import type { SftpEditorPrefs, SftpFavorite } from "../../types/connections";
import { FtpFavoritesPanel } from "./FtpFavoritesPanel";
import { joinRemotePath, parentRemotePath } from "./sftpPaths";
import { keyboardShortcutFromEvent } from "../favorites/constants";
import { SftpEditorSettings } from "./SftpEditorSettings";

type FtpPaneProps = {
  connectionId: string;
  ftpSessionId: string;
};

type ContextTarget = {
  entry: FtpEntry;
  x: number;
  y: number;
};

export function FtpPane({ connectionId, ftpSessionId }: FtpPaneProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<FtpListResult | null>(null);
  const [context, setContext] = useState<ContextTarget | null>(null);
  const [editorSettingsOpen, setEditorSettingsOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favorites, setFavorites] = useState<SftpFavorite[]>([]);
  const [everListed, setEverListed] = useState(false);
  const [highlightEntryName, setHighlightEntryName] = useState<string | null>(null);
  const [pathEditing, setPathEditing] = useState(false);
  const [pathDraft, setPathDraft] = useState("");
  const editorPrefsRef = useRef<SftpEditorPrefs>({ extensionApps: {} });
  const pathInputRef = useRef<HTMLInputElement>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  const favoriteByPath = useMemo(() => {
    const map = new Map<string, SftpFavorite>();
    for (const favorite of favorites) {
      map.set(favorite.remotePath, favorite);
    }
    return map;
  }, [favorites]);

  const reloadFavorites = useCallback(async () => {
    try {
      const items = await listSftpFavorites(connectionId);
      setFavorites(items);
    } catch {
      setFavorites([]);
    }
  }, [connectionId]);

  const loadListing = useCallback(
    async (loader: () => Promise<FtpListResult>) => {
      setLoading(true);
      setError(null);
      setListing(null);
      try {
        const result = await loader();
        setListing(result);
        setEverListed(true);
      } catch (err) {
        setError(normalizeIpcError(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setHighlightEntryName(null);
    setPathEditing(false);
    await loadListing(() => ftpList(ftpSessionId));
  }, [ftpSessionId, loadListing]);

  const gotoPath = useCallback(
    async (path: string, options?: { highlight?: string | null }) => {
      if (options?.highlight !== undefined) {
        setHighlightEntryName(options.highlight);
      } else {
        setHighlightEntryName(null);
      }
      setPathEditing(false);
      await loadListing(() => ftpGoto(ftpSessionId, path));
    },
    [ftpSessionId, loadListing],
  );

  const navigateFavorite = useCallback(
    (favorite: SftpFavorite) => {
      const parent = parentRemotePath(favorite.remotePath);
      const name = favorite.displayName;
      void gotoPath(parent, { highlight: name });
    },
    [gotoPath],
  );

  useEffect(() => {
    if (loading || !highlightEntryName || !listing) {
      return;
    }
    const row = highlightRowRef.current;
    if (!row) {
      return;
    }
    window.requestAnimationFrame(() => {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [loading, highlightEntryName, listing]);

  useEffect(() => {
    if (!pathEditing) {
      return;
    }
    pathInputRef.current?.focus();
    pathInputRef.current?.select();
  }, [pathEditing]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setListing(null);
      try {
        await ftpOpen(connectionId, ftpSessionId);
        if (cancelled) {
          return;
        }
        const result = await ftpList(ftpSessionId);
        if (!cancelled) {
          setListing(result);
          setEverListed(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(normalizeIpcError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      void ftpClose(ftpSessionId);
    };
  }, [connectionId, ftpSessionId]);

  useEffect(() => {
    void reloadFavorites();
  }, [reloadFavorites]);

  useEffect(() => {
    void getSftpEditorPrefs().then((prefs) => {
      editorPrefsRef.current = prefs;
    });
  }, [editorSettingsOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = keyboardShortcutFromEvent(event);
      if (!shortcut) {
        return;
      }
      const favorite = favorites.find((item) => item.shortcutKey === shortcut);
      if (!favorite) {
        return;
      }
      event.preventDefault();
      void navigateFavorite(favorite);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [favorites, navigateFavorite]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void ftpSyncEdits(ftpSessionId).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [ftpSessionId]);

  async function enterDirectory(entry: FtpEntry) {
    if (!entry.isDir) {
      return;
    }
    setHighlightEntryName(null);
    setPathEditing(false);
    await loadListing(() => ftpChangeDir(ftpSessionId, entry.name));
  }

  function openPathEditor() {
    setPathDraft(listing?.path ?? "/");
    setPathEditing(true);
  }

  function cancelPathEditor() {
    setPathEditing(false);
    setPathDraft(listing?.path ?? "/");
  }

  function commitPathEditor() {
    const raw = pathDraft.trim() || "/";
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    void gotoPath(normalized);
  }

  async function downloadEntry(entry: FtpEntry) {
    const destination = await save({
      title: "Save file",
      defaultPath: entry.name,
    });
    if (!destination) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ftpDownload(ftpSessionId, entry.name, destination);
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  async function editEntry(entry: FtpEntry) {
    if (entry.isDir) {
      return;
    }
    const prefs = editorPrefsRef.current;
    const application = resolveEditorApp(entry.name, prefs);
    setLoading(true);
    setError(null);
    try {
      const prepared = await ftpPrepareEdit(ftpSessionId, entry.name);
      await openPathWithApplication(prepared.localPath, application);
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  async function renameEntry(entry: FtpEntry) {
    const next = window.prompt("New name", entry.name);
    if (!next || next === entry.name) {
      return;
    }
    await loadListing(() => ftpRename(ftpSessionId, entry.name, next.trim()));
  }

  async function addFavorite(entry: FtpEntry) {
    const remotePath = joinRemotePath(listing?.path ?? "/", entry.name);
    setError(null);
    try {
      await createSftpFavorite({
        connectionId,
        remotePath,
        displayName: entry.name,
        isDir: entry.isDir,
      });
      await reloadFavorites();
      setFavoritesOpen(true);
    } catch (err) {
      setError(normalizeIpcError(err));
    }
  }

  async function removeFavoriteForEntry(entry: FtpEntry) {
    const remotePath = joinRemotePath(listing?.path ?? "/", entry.name);
    const favorite = favoriteByPath.get(remotePath);
    if (!favorite) {
      return;
    }
    setError(null);
    try {
      await deleteSftpFavorite(favorite.id);
      await reloadFavorites();
    } catch (err) {
      setError(normalizeIpcError(err));
    }
  }

  async function deleteEntry(entry: FtpEntry) {
    const label = entry.isDir ? "folder" : "file";
    if (!window.confirm(`Delete ${label} "${entry.name}"?`)) {
      return;
    }
    await loadListing(() => ftpDelete(ftpSessionId, entry.name, entry.isDir));
  }

  const crumbs = buildBreadcrumbs(listing?.path ?? "/");

  return (
    <div className="flex h-full min-h-0 bg-canvas text-[13px] text-ink">
      <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="h-7 shrink-0 rounded-md border border-line px-2 text-[12px] text-muted hover:text-ink disabled:opacity-50"
        >
          Refresh
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            if (pathEditing) {
              event.preventDefault();
            }
          }}
          onClick={() => (pathEditing ? cancelPathEditor() : openPathEditor())}
          disabled={loading}
          aria-pressed={pathEditing}
          title={pathEditing ? "Cancel path edit" : "Edit path"}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-muted hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        {pathEditing ? (
          <input
            ref={pathInputRef}
            value={pathDraft}
            onChange={(event) => setPathDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitPathEditor();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelPathEditor();
              }
            }}
            spellCheck={false}
            className="h-7 min-w-0 flex-1 rounded-md border border-accent/50 bg-canvas px-2 font-mono text-[12px] text-ink ring-1 ring-accent/30"
            aria-label="Remote path"
          />
        ) : (
          <nav
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto font-mono text-[12px]"
            aria-label="Remote path"
          >
            {crumbs.map((crumb, index) => (
              <span key={crumb.path} className="flex shrink-0 items-center gap-0.5">
                {index > 0 ? <span className="text-faint">/</span> : null}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void gotoPath(crumb.path)}
                  className="rounded px-0.5 text-muted hover:text-accent hover:underline disabled:opacity-50"
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
        )}
        <button
          type="button"
          aria-pressed={favoritesOpen}
          onClick={() => setFavoritesOpen((open) => !open)}
          className="h-7 shrink-0 rounded-md border border-line px-2 text-[12px] text-muted hover:text-ink"
          title="Favorites"
        >
          Favorites{favorites.length > 0 ? ` (${favorites.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setEditorSettingsOpen(true)}
          className="h-7 shrink-0 rounded-md border border-line px-2 text-[12px] text-muted hover:text-ink"
          title="Editor applications"
        >
          Editors…
        </button>
      </div>
      {error ? (
        <p className="border-b border-line px-3 py-2 text-[12px] text-danger">{error}</p>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full min-h-[120px] items-center justify-center">
            <p className="text-faint">{everListed ? "Loading…" : "Connecting to SFTP…"}</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {(listing?.entries ?? []).map((entry) => {
                const remotePath = joinRemotePath(listing?.path ?? "/", entry.name);
                const favorite = favoriteByPath.get(remotePath);
                const highlighted = highlightEntryName === entry.name;
                return (
                <tr
                  key={entry.name}
                  ref={highlighted ? highlightRowRef : undefined}
                  className={`border-t border-line/60 hover:bg-raised/40 ${
                    highlighted ? "bg-accent/15 ring-1 ring-inset ring-accent/35" : ""
                  }`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContext({ entry, x: event.clientX, y: event.clientY });
                  }}
                >
                  <td className="px-3 py-1.5">
                    {favorite ? (
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: favorite.color }}
                        title="Favorite"
                        aria-hidden
                      />
                    ) : null}
                    {entry.isDir ? (
                      <button
                        type="button"
                        onClick={() => void enterDirectory(entry)}
                        className="text-left text-accent hover:underline"
                      >
                        {entry.name}/
                      </button>
                    ) : (
                      <span>{entry.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[12px] text-muted">
                    {entry.isDir ? "—" : formatSize(entry.size)}
                  </td>
                  <td className="px-3 py-1.5 text-muted">
                    {entry.isDir ? "Folder" : "File"}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
      {context ? (
        <FtpContextMenu
          entry={context.entry}
          isFavorite={favoriteByPath.has(
            joinRemotePath(listing?.path ?? "/", context.entry.name),
          )}
          x={context.x}
          y={context.y}
          onClose={() => setContext(null)}
          onAddFavorite={() => {
            setContext(null);
            void addFavorite(context.entry);
          }}
          onRemoveFavorite={() => {
            setContext(null);
            void removeFavoriteForEntry(context.entry);
          }}
          onDownload={() => {
            setContext(null);
            void downloadEntry(context.entry);
          }}
          onEdit={() => {
            setContext(null);
            void editEntry(context.entry);
          }}
          onRename={() => {
            setContext(null);
            void renameEntry(context.entry);
          }}
          onDelete={() => {
            setContext(null);
            void deleteEntry(context.entry);
          }}
        />
      ) : null}
      {editorSettingsOpen ? (
        <SftpEditorSettings onClose={() => setEditorSettingsOpen(false)} />
      ) : null}
      </div>
      <FtpFavoritesPanel
        open={favoritesOpen}
        favorites={favorites}
        onClose={() => setFavoritesOpen(false)}
        onNavigate={(favorite) => navigateFavorite(favorite)}
        onChanged={() => void reloadFavorites()}
      />
    </div>
  );
}

function FtpContextMenu({
  entry,
  isFavorite,
  x,
  y,
  onClose,
  onAddFavorite,
  onRemoveFavorite,
  onDownload,
  onEdit,
  onRename,
  onDelete,
}: {
  entry: FtpEntry;
  isFavorite: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onAddFavorite: () => void;
  onRemoveFavorite: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border border-line bg-surface py-1 shadow-panel"
      style={{ left: x, top: y }}
      role="menu"
    >
      {isFavorite ? (
        <MenuItem onClick={onRemoveFavorite}>Remove from favorites</MenuItem>
      ) : (
        <MenuItem onClick={onAddFavorite}>Add to favorites</MenuItem>
      )}
      <div className="my-1 border-t border-line" />
      {!entry.isDir ? (
        <>
          <MenuItem onClick={onDownload}>Download…</MenuItem>
          <MenuItem onClick={onEdit}>Edit</MenuItem>
          <div className="my-1 border-t border-line" />
        </>
      ) : null}
      <MenuItem onClick={onRename}>Rename</MenuItem>
      <MenuItem tone="danger" onClick={onDelete}>Delete</MenuItem>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  tone = "default",
}: {
  children: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick();
      }}
      className={`block w-full px-3 py-1.5 text-left text-[13px] ${
        tone === "danger" ? "text-danger hover:bg-raised/80" : "text-ink hover:bg-raised/80"
      }`}
    >
      {children}
    </button>
  );
}

function buildBreadcrumbs(path: string): { label: string; path: string }[] {
  const normalized = path || "/";
  if (normalized === "/") {
    return [{ label: "/", path: "/" }];
  }
  const parts = normalized.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "/", path: "/" }];
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    crumbs.push({ label: part, path: acc });
  }
  return crumbs;
}

function resolveEditorApp(fileName: string, prefs: SftpEditorPrefs): string | undefined {
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  if (ext && prefs.extensionApps[ext]) {
    return prefs.extensionApps[ext];
  }
  return prefs.defaultApplication?.trim() || undefined;
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
