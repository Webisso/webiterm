import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLogo } from "../components/AppLogo";
import { CommandPalette } from "../components/CommandPalette";
import { Inspector } from "../components/Inspector";
import { Kbd } from "../components/Kbd";
import { Sidebar } from "../components/Sidebar";
import { StatusBar } from "../components/StatusBar";
import { Workspace } from "../components/Workspace";
import type { ConnectionOpenMode } from "../features/connections/ConnectionContextMenu";
import { BoardNameModal } from "../features/boards/BoardNameModal";
import { ConnectionForm } from "../features/connections/ConnectionForm";
import { ConnectionGroupModal } from "../features/connections/ConnectionGroupModal";
import { useConnections } from "../hooks/useConnections";
import type { StatusState } from "../hooks/useAppStatus";
import type { ShowAlertOptions } from "../hooks/useAlertModal";
import { normalizeIpcError } from "../lib/ipc";
import {
  createTaskBoard,
  deleteTaskBoard,
  deleteTaskBoardsForGroup,
  listTaskBoards,
  renameTaskBoard,
} from "../lib/boards";
import {
  createFolderNote,
  deleteFolderNote,
  deleteFolderNotesForGroup,
  listFolderNotes,
  renameFolderNote,
} from "../lib/notes";
import { exportLocalData, importLocalData } from "../lib/connections";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { CommandItem } from "../types/desktop";
import type { TaskBoardSummary } from "../types/boards";
import type { FolderNoteSummary } from "../types/notes";
import { flushNoteSaver } from "../features/notes/noteSaveRegistry";
import type {
  ConnectionGroup,
  ConnectionInput,
  ConnectionSummary,
  WorkspaceSession,
} from "../types/connections";

type AppShellProps = {
  state: StatusState;
  collapsed: boolean;
  saveError: string | null;
  showAlert: (message: string, options?: ShowAlertOptions) => void;
  onOpenPermissions: () => void;
  onOpenAbout: () => void;
  onToggleInspector: () => void;
  onRetry: () => void;
  onReload: () => void;
  onDismissSaveError: () => void;
};

export function AppShell({
  state,
  collapsed,
  showAlert,
  onOpenPermissions,
  onOpenAbout,
  onToggleInspector,
  onRetry,
  onReload,
}: AppShellProps) {
  const ready = state.kind === "ready";
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    connections,
    groups,
    saveConnection,
    saveGroup,
    removeConnection,
    removeGroup,
    moveConnectionToGroup,
    runTest,
    refresh,
    error: connectionsError,
  } = useConnections(ready, query);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionSummary | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ConnectionGroup | null>(null);
  const [groupParentId, setGroupParentId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [boards, setBoards] = useState<TaskBoardSummary[]>([]);
  const [notes, setNotes] = useState<FolderNoteSummary[]>([]);
  const [boardModal, setBoardModal] = useState<
    | { mode: "create"; groupId: string }
    | { mode: "rename"; board: TaskBoardSummary }
    | null
  >(null);
  const [noteModal, setNoteModal] = useState<
    | { mode: "create"; groupId: string }
    | { mode: "rename"; note: FolderNoteSummary }
    | null
  >(null);

  useEffect(() => {
    if (connectionsError) {
      showAlert(connectionsError, { title: "Connections", tone: "danger" });
    }
  }, [connectionsError, showAlert]);

  const refreshBoards = useCallback(async () => {
    if (!ready) {
      return;
    }
    try {
      setBoards(await listTaskBoards());
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Boards", tone: "danger" });
    }
  }, [ready, showAlert]);

  useEffect(() => {
    void refreshBoards();
  }, [refreshBoards]);

  const refreshNotes = useCallback(async () => {
    if (!ready) {
      return;
    }
    try {
      setNotes(await listFolderNotes());
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Notes", tone: "danger" });
    }
  }, [ready, showAlert]);

  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "new-connection",
        title: "New connection",
        keywords: ["profile", "ssh", "mysql"],
      },
      {
        id: "open-about",
        title: "About WebiTerm",
        keywords: ["version", "github", "webiterm", "about"],
      },
      {
        id: "open-permissions",
        title: "Local data",
        shortcut: "⌘⇧U",
        keywords: ["export", "import", "json", "backup"],
      },
      {
        id: "export-data",
        title: "Export local data",
        keywords: ["json", "backup", "save"],
      },
      {
        id: "import-data",
        title: "Import local data",
        keywords: ["json", "restore"],
      },
      {
        id: "toggle-inspector",
        title: collapsed ? "Show inspector" : "Hide inspector",
        shortcut: "⌘\\",
        keywords: ["panel", "sidebar", "details"],
      },
      {
        id: "reload-status",
        title: "Reload application status",
        keywords: ["refresh", "storage", "database"],
      },
      {
        id: "focus-search",
        title: "Focus connection search",
        keywords: ["find", "connections", "filter"],
      },
    ],
    [collapsed],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (meta && event.key === "\\") {
        event.preventDefault();
        onToggleInspector();
      }
      if (meta && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewForm();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggleInspector]);

  function openNewForm() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleSave(input: ConnectionInput) {
    await saveConnection(input, editing?.id);
    setFormOpen(false);
    setEditing(null);
    showAlert("Connection saved.", { title: "Saved", tone: "success" });
  }

  async function handleExportData() {
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
      showAlert("Export saved. The file includes passwords in plain text.", {
        title: "Exported",
        tone: "success",
      });
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Export failed", tone: "danger" });
    }
  }

  async function handleImportData() {
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
      await importLocalData(picked);
      window.location.reload();
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Import failed", tone: "danger" });
    }
  }

  const flushActiveNote = useCallback(async () => {
    const current = sessions.find((session) => session.id === activeSessionId);
    if (current?.kind === "note") {
      await flushNoteSaver(current.noteId);
    }
  }, [activeSessionId, sessions]);

  async function handleOpen(connection: ConnectionSummary, mode: ConnectionOpenMode) {
    try {
      await flushActiveNote();
      const openSsh = mode === "ssh" || (mode === "default" && connection.kind === "ssh");
      const openFtp = mode === "ftp" || (mode === "default" && connection.kind === "ftp");
      if (openSsh) {
        if (connection.kind !== "ssh" && connection.kind !== "ftp") {
          showAlert("SSH is only available for SSH and FTP profiles.", { tone: "warning" });
          return;
        }
        const terminalSessionId = crypto.randomUUID();
        const sameProfileCount = sessions.filter(
          (session) => session.kind === "ssh" && session.connectionId === connection.id,
        ).length;
        const session: WorkspaceSession = {
          id: crypto.randomUUID(),
          kind: "ssh",
          connectionId: connection.id,
          title: sessionTitle(connection.name, "SSH", sameProfileCount),
          terminalSessionId,
        };
        setSessions((current) => [...current, session]);
        setActiveSessionId(session.id);
      } else if (openFtp) {
        if (connection.kind !== "ssh" && connection.kind !== "ftp") {
          showAlert("SFTP is only available for SSH and SFTP profiles.", { tone: "warning" });
          return;
        }
        const ftpSessionId = crypto.randomUUID();
        const sameProfileCount = sessions.filter(
          (session) => session.kind === "ftp" && session.connectionId === connection.id,
        ).length;
        const session: WorkspaceSession = {
          id: crypto.randomUUID(),
          kind: "ftp",
          connectionId: connection.id,
          title: sessionTitle(connection.name, "SFTP", sameProfileCount),
          ftpSessionId,
        };
        setSessions((current) => [...current, session]);
        setActiveSessionId(session.id);
      } else if (connection.kind === "mysql") {
        const session: WorkspaceSession = {
          id: crypto.randomUUID(),
          kind: "mysql",
          connectionId: connection.id,
          title: connection.name,
        };
        setSessions((current) => [...current, session]);
        setActiveSessionId(session.id);
      } else {
        showAlert("PostgreSQL sessions are not implemented yet.", { tone: "info" });
      }
      void refresh();
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Could not open", tone: "danger" });
    }
  }

  function sessionTitle(name: string, protocol: "SSH" | "SFTP", existing: number) {
    const base = `${name} · ${protocol}`;
    return existing > 0 ? `${base} (${existing + 1})` : base;
  }

  const openLocalTerminal = useCallback(async () => {
    await flushActiveNote();
    const terminalSessionId = crypto.randomUUID();
    const session: WorkspaceSession = {
      id: crypto.randomUUID(),
      kind: "local",
      title: "Local",
      terminalSessionId,
    };
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
  }, [flushActiveNote]);

  async function handleTest(connection: ConnectionSummary) {
    try {
      const result = await runTest(connection.id);
      showAlert(result.message, {
        title: result.ok ? "Connection OK" : "Connection failed",
        tone: result.ok ? "success" : "warning",
      });
      void refresh();
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Test failed", tone: "danger" });
    }
  }

  async function handleDelete(connection: ConnectionSummary) {
    if (!window.confirm(`Delete “${connection.name}”?`)) {
      return;
    }
    try {
      await removeConnection(connection.id);
      if (selectedId === connection.id) {
        setSelectedId(null);
      }
      setSessions((current) =>
        current.filter(
          (session) =>
            session.kind === "board" ||
            session.kind === "note" ||
            session.kind === "local" ||
            session.connectionId !== connection.id,
        ),
      );
      showAlert("Connection deleted.", { title: "Deleted", tone: "info" });
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Delete failed", tone: "danger" });
    }
  }

  function runCommand(id: string) {
    setPaletteOpen(false);
    if (id === "new-connection") {
      openNewForm();
    } else if (id === "open-about") {
      onOpenAbout();
    } else if (id === "open-permissions") {
      onOpenPermissions();
    } else if (id === "export-data") {
      void handleExportData();
    } else if (id === "import-data") {
      void handleImportData();
    } else if (id === "toggle-inspector") {
      onToggleInspector();
    } else if (id === "reload-status") {
      onReload();
      void refresh();
    } else if (id === "focus-search") {
      searchRef.current?.focus();
    }
  }

  async function openNote(note: FolderNoteSummary) {
    await flushActiveNote();
    const existing = sessions.find(
      (session) => session.kind === "note" && session.noteId === note.id,
    );
    if (existing) {
      setActiveSessionId(existing.id);
      return;
    }
    const session: WorkspaceSession = {
      id: crypto.randomUUID(),
      kind: "note",
      noteId: note.id,
      groupId: note.groupId,
      title: note.title,
    };
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
  }

  const handleNoteSaved = useCallback((note: FolderNoteSummary) => {
    setNotes((current) => {
      const next = current.map((item) => (item.id === note.id ? note : item));
      return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
    });
    setSessions((current) =>
      current.map((session) =>
        session.kind === "note" && session.noteId === note.id
          ? { ...session, title: note.title }
          : session,
      ),
    );
  }, []);

  async function openBoard(board: TaskBoardSummary) {
    await flushActiveNote();
    const existing = sessions.find(
      (session) => session.kind === "board" && session.boardId === board.id,
    );
    if (existing) {
      setActiveSessionId(existing.id);
      return;
    }
    const session: WorkspaceSession = {
      id: crypto.randomUUID(),
      kind: "board",
      boardId: board.id,
      groupId: board.groupId,
      title: board.name,
    };
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
  }

  async function handleDeleteGroup(group: ConnectionGroup) {
    if (!window.confirm(`Delete folder "${group.name}"? Connections stay, ungrouped.`)) {
      return;
    }
    await removeGroup(group.id);
    try {
      await deleteTaskBoardsForGroup(group.id);
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Boards", tone: "warning" });
    }
    try {
      await deleteFolderNotesForGroup(group.id);
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Notes", tone: "warning" });
    }
    setBoards((current) => current.filter((board) => board.groupId !== group.id));
    setNotes((current) => current.filter((note) => note.groupId !== group.id));
    setSessions((current) =>
      current.filter(
        (session) =>
          (session.kind !== "board" && session.kind !== "note") || session.groupId !== group.id,
      ),
    );
  }

  async function handleDeleteNote(note: FolderNoteSummary) {
    if (!window.confirm(`Delete note “${note.title}”?`)) {
      return;
    }
    try {
      await deleteFolderNote(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setSessions((current) =>
        current.filter((session) => session.kind !== "note" || session.noteId !== note.id),
      );
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Notes", tone: "danger" });
    }
  }

  async function handleDeleteBoard(board: TaskBoardSummary) {
    if (!window.confirm(`Delete board “${board.name}”?`)) {
      return;
    }
    try {
      await deleteTaskBoard(board.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));
      setSessions((current) =>
        current.filter((session) => session.kind !== "board" || session.boardId !== board.id),
      );
    } catch (error) {
      showAlert(normalizeIpcError(error), { title: "Boards", tone: "danger" });
    }
  }

  const selectSession = useCallback(
    async (id: string) => {
      if (id !== activeSessionId) {
        await flushActiveNote();
      }
      setActiveSessionId(id);
    },
    [activeSessionId, flushActiveNote],
  );

  const closeSession = useCallback(
    async (id: string) => {
      const closing = sessions.find((session) => session.id === id);
      if (closing?.kind === "note") {
        await flushNoteSaver(closing.noteId);
      }
      setSessions((current) => {
        const next = current.filter((session) => session.id !== id);
        if (activeSessionId === id) {
          setActiveSessionId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeSessionId, sessions],
  );

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex h-12 shrink-0 items-center border-b border-line pl-[84px] pr-3">
        <h1 className="sr-only">WebiTerm</h1>
        <div className="h-full min-w-0 flex-1" data-tauri-drag-region />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-7 items-center gap-2 rounded-md border border-line bg-surface px-2 text-[12px] text-muted hover:bg-raised hover:text-ink"
          >
            Commands
            <Kbd>⌘K</Kbd>
          </button>
          <button
            type="button"
            aria-pressed={!collapsed}
            onClick={onToggleInspector}
            className="inline-flex h-7 items-center gap-2 rounded-md border border-line bg-surface px-2 text-[12px] text-muted hover:bg-raised hover:text-ink"
          >
            {collapsed ? "Show inspector" : "Hide inspector"}
            <Kbd>⌘\</Kbd>
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {ready ? (
          <>
            <Sidebar
              query={query}
              onQueryChange={setQuery}
              searchRef={searchRef}
              connections={connections}
              groups={groups}
              boards={boards}
              notes={notes}
              selectedId={selectedId}
              onSelect={(connection) => setSelectedId(connection.id)}
              onOpen={(connection, mode) => void handleOpen(connection, mode)}
              onEdit={(connection) => {
                setEditing(connection);
                setFormOpen(true);
              }}
              onDelete={(connection) => void handleDelete(connection)}
              onTest={(connection) => void handleTest(connection)}
              onNewConnection={openNewForm}
              onNewGroup={(parentId) => {
                setEditingGroup(null);
                setGroupParentId(parentId ?? null);
                setGroupModalOpen(true);
              }}
              onEditGroup={(group) => {
                setEditingGroup(group);
                setGroupParentId(null);
                setGroupModalOpen(true);
              }}
              onDeleteGroup={(group) => {
                void handleDeleteGroup(group);
              }}
              onMoveToGroup={(connection, groupId) => {
                void moveConnectionToGroup(connection.id, groupId);
              }}
              onOpenBoard={openBoard}
              onNewBoard={(groupId) => setBoardModal({ mode: "create", groupId })}
              onRenameBoard={(board) => setBoardModal({ mode: "rename", board })}
              onDeleteBoard={(board) => {
                void handleDeleteBoard(board);
              }}
              onOpenNote={openNote}
              onNewNote={(groupId) => setNoteModal({ mode: "create", groupId })}
              onRenameNote={(note) => setNoteModal({ mode: "rename", note })}
              onDeleteNote={(note) => {
                void handleDeleteNote(note);
              }}
            />
            <Workspace
              sessions={sessions}
              activeSessionId={activeSessionId}
              connections={connections}
              groups={groups}
              onSelectSession={(id) => void selectSession(id)}
              onCloseSession={(id) => void closeSession(id)}
              onCreateLocalTerminal={openLocalTerminal}
              onNoteSaved={handleNoteSaved}
            />
            <Inspector collapsed={collapsed} state={state} onRetry={onRetry} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[13px] text-muted">
            <AppLogo size={64} className="opacity-90" />
            <p>{state.kind === "loading" ? "Loading…" : "Desktop runtime is not ready."}</p>
          </div>
        )}
      </div>
      {ready ? <StatusBar state={state} /> : null}
      {paletteOpen ? (
        <CommandPalette commands={commands} onRun={runCommand} onClose={() => setPaletteOpen(false)} />
      ) : null}
      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-surface shadow-panel"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <ConnectionForm
              initial={editing}
              groups={groups}
              onCancel={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              onSave={handleSave}
            />
          </div>
        </div>
      ) : null}
      {groupModalOpen ? (
        <ConnectionGroupModal
          key={`${editingGroup?.id ?? "new"}:${groupParentId ?? "root"}`}
          initial={editingGroup}
          groups={groups}
          parentId={groupParentId}
          onCancel={() => {
            setGroupModalOpen(false);
            setEditingGroup(null);
            setGroupParentId(null);
          }}
          onSave={async (input) => {
            await saveGroup(
              {
                ...input,
                parentId: input.parentId ?? groupParentId ?? editingGroup?.parentId ?? undefined,
              },
              editingGroup?.id,
            );
            setGroupModalOpen(false);
            setEditingGroup(null);
            setGroupParentId(null);
          }}
        />
      ) : null}
      {noteModal ? (
        <BoardNameModal
          title={noteModal.mode === "create" ? "New note" : "Rename note"}
          initialName={noteModal.mode === "rename" ? noteModal.note.title : ""}
          onCancel={() => setNoteModal(null)}
          onSave={async (name) => {
            if (noteModal.mode === "create") {
              const created = await createFolderNote(noteModal.groupId, name);
              setNotes((current) =>
                [created.note, ...current].sort(
                  (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title),
                ),
              );
              setNoteModal(null);
              openNote(created.note);
              return;
            }
            const renamed = await renameFolderNote(noteModal.note.id, name);
            setNotes((current) =>
              current.map((item) => (item.id === renamed.id ? renamed : item)),
            );
            setSessions((current) =>
              current.map((session) =>
                session.kind === "note" && session.noteId === renamed.id
                  ? { ...session, title: renamed.title }
                  : session,
              ),
            );
            setNoteModal(null);
          }}
        />
      ) : null}
      {boardModal ? (
        <BoardNameModal
          title={boardModal.mode === "create" ? "New board" : "Rename board"}
          initialName={boardModal.mode === "rename" ? boardModal.board.name : ""}
          onCancel={() => setBoardModal(null)}
          onSave={async (name) => {
            if (boardModal.mode === "create") {
              const created = await createTaskBoard(boardModal.groupId, name);
              setBoards((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
              setBoardModal(null);
              openBoard(created);
              return;
            }
            const renamed = await renameTaskBoard(boardModal.board.id, name);
            setBoards((current) =>
              current.map((item) => (item.id === renamed.id ? renamed : item)),
            );
            setSessions((current) =>
              current.map((session) =>
                session.kind === "board" && session.boardId === renamed.id
                  ? { ...session, title: renamed.name }
                  : session,
              ),
            );
            setBoardModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
