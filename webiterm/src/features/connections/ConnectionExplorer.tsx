import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { TaskBoardSummary } from "../../types/boards";
import type { FolderNoteSummary } from "../../types/notes";
import type { ConnectionGroup, ConnectionSummary } from "../../types/connections";
import { ConfirmModal } from "../../components/ConfirmModal";
import { EmptyState } from "../../components/EmptyState";
import {
  ConnectionContextMenu,
  type ConnectionOpenMode,
} from "./ConnectionContextMenu";
import {
  buildConnectionTree,
  collectVisibleTreeRows,
  groupPathLabel,
} from "./connectionTree";
import { connectionKindBadgeClass, connectionKindLabel } from "./connectionAppearance";
import { GroupIcon } from "./GroupIcon";
import { ConnectionGroupContextMenu } from "./ConnectionGroupContextMenu";
import {
  FOLDER_AUTO_EXPAND_MS,
  FOLDER_DROP_ATTR,
  UNGROUPED_DROP_KEY,
  useConnectionFolderDrag,
} from "./useConnectionFolderDrag";

const COLLAPSE_KEY = "webiterm.collapsedGroups.v1";
const TREE_INDENT_PX = 20;
const TREE_BASE_PX = 6;

function treePadding(depth: number): number {
  return TREE_BASE_PX + depth * TREE_INDENT_PX;
}

type PendingMove = {
  connection: ConnectionSummary;
  groupId: string | null;
  targetLabel: string;
};

type ConnectionExplorerProps = {
  query: string;
  connections: ConnectionSummary[];
  groups: ConnectionGroup[];
  boards: TaskBoardSummary[];
  notes: FolderNoteSummary[];
  selectedId: string | null;
  onSelect: (connection: ConnectionSummary) => void;
  onOpen: (connection: ConnectionSummary, mode: ConnectionOpenMode) => void;
  onEdit: (connection: ConnectionSummary) => void;
  onDelete: (connection: ConnectionSummary) => void;
  onTest: (connection: ConnectionSummary) => void;
  onNewGroup: (parentId?: string) => void;
  onEditGroup: (group: ConnectionGroup) => void;
  onDeleteGroup: (group: ConnectionGroup) => void;
  onMoveToGroup: (connection: ConnectionSummary, groupId: string | null) => void;
  onOpenBoard: (board: TaskBoardSummary) => void;
  onNewBoard: (groupId: string) => void;
  onRenameBoard: (board: TaskBoardSummary) => void;
  onDeleteBoard: (board: TaskBoardSummary) => void;
  onOpenNote: (note: FolderNoteSummary) => void;
  onNewNote: (groupId: string) => void;
  onRenameNote: (note: FolderNoteSummary) => void;
  onDeleteNote: (note: FolderNoteSummary) => void;
};

export function ConnectionExplorer({
  query,
  connections,
  groups,
  boards,
  notes,
  selectedId,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  onTest,
  onNewGroup,
  onEditGroup,
  onDeleteGroup,
  onMoveToGroup,
  onOpenBoard,
  onNewBoard,
  onRenameBoard,
  onDeleteBoard,
  onOpenNote,
  onNewNote,
  onRenameNote,
  onDeleteNote,
}: ConnectionExplorerProps) {
  const trimmed = query.trim();
  const [connectionMenu, setConnectionMenu] = useState<{
    connection: ConnectionSummary;
    x: number;
    y: number;
  } | null>(null);
  const [groupMenu, setGroupMenu] = useState<{
    group: ConnectionGroup;
    x: number;
    y: number;
  } | null>(null);
  const [boardMenu, setBoardMenu] = useState<{
    board: TaskBoardSummary;
    x: number;
    y: number;
  } | null>(null);
  const [noteMenu, setNoteMenu] = useState<{
    note: FolderNoteSummary;
    x: number;
    y: number;
  } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed());
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );

  const requestMove = useCallback(
    (connection: ConnectionSummary, groupId: string | null) => {
      if (connection.groupId === groupId || (!connection.groupId && !groupId)) {
        return;
      }
      const targetLabel = groupId ? groupNameById.get(groupId) ?? "folder" : "Ungrouped";
      setPendingMove({ connection, groupId, targetLabel });
    },
    [groupNameById],
  );

  const {
    draggingConnectionId,
    hoverFolderKey,
    onConnectionPointerDown,
    folderDropHighlightClass,
    consumeClickAfterDrag,
  } = useConnectionFolderDrag(requestMove);

  const expandFolder = useCallback((groupId: string) => {
    setCollapsed((prev) => {
      if (!prev.has(groupId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(groupId);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!draggingConnectionId || !hoverFolderKey) {
      return;
    }
    if (hoverFolderKey === UNGROUPED_DROP_KEY) {
      return;
    }
    if (!collapsed.has(hoverFolderKey)) {
      return;
    }
    const timer = window.setTimeout(() => {
      expandFolder(hoverFolderKey);
    }, FOLDER_AUTO_EXPAND_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [collapsed, draggingConnectionId, expandFolder, hoverFolderKey]);

  const toggleCollapsed = useCallback((groupId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const tree = useMemo(
    () => buildConnectionTree(groups, connections, boards, notes),
    [groups, connections, boards, notes],
  );

  const visibleRows = useMemo(
    () => collectVisibleTreeRows(tree.roots, collapsed),
    [tree.roots, collapsed],
  );

  if (connections.length === 0 && groups.length === 0) {
    return (
      <div className="px-3 py-6">
        <EmptyState
          title={trimmed ? "No matches" : "No connections"}
          description={
            trimmed
              ? `No saved connections match “${trimmed}”.`
              : "Create a folder or connection profile to get started."
          }
          hint="Use + for connections and the folder button for groups."
        />
      </div>
    );
  }

  if (trimmed) {
    return (
      <>
        <ul className="space-y-0.5 px-2 py-2">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              selected={connection.id === selectedId}
              depth={0}
              groupHint={groupPathLabel(connection.groupId, groups)}
              onSelect={onSelect}
              onOpen={onOpen}
              onContextMenu={(event) => {
                event.preventDefault();
                setConnectionMenu({
                  connection,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              dragging={draggingConnectionId === connection.id}
              onPointerDown={(event) => onConnectionPointerDown(connection, event)}
              shouldIgnoreClick={consumeClickAfterDrag}
            />
          ))}
          {boards
            .filter((board) => board.name.toLowerCase().includes(trimmed.toLowerCase()))
            .map((board) => (
              <BoardRow
                key={board.id}
                board={board}
                depth={0}
                groupHint={groupPathLabel(board.groupId, groups)}
                onOpen={onOpenBoard}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setBoardMenu({ board, x: event.clientX, y: event.clientY });
                }}
              />
            ))}
          {notes
            .filter((note) => note.title.toLowerCase().includes(trimmed.toLowerCase()))
            .map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                depth={0}
                groupHint={groupPathLabel(note.groupId, groups)}
                onOpen={onOpenNote}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setNoteMenu({ note, x: event.clientX, y: event.clientY });
                }}
              />
            ))}
        </ul>
        {connectionMenu ? (
          <ConnectionContextMenu
            connection={connectionMenu.connection}
            groups={groups}
            x={connectionMenu.x}
            y={connectionMenu.y}
            onOpen={(connection, mode) => {
              setConnectionMenu(null);
              onOpen(connection, mode);
            }}
            onEdit={(connection) => {
              setConnectionMenu(null);
              onEdit(connection);
            }}
            onTest={(connection) => {
              setConnectionMenu(null);
              onTest(connection);
            }}
            onDelete={(connection) => {
              setConnectionMenu(null);
              onDelete(connection);
            }}
            onMoveToGroup={(connection, groupId) => {
              setConnectionMenu(null);
              onMoveToGroup(connection, groupId);
            }}
            onClose={() => setConnectionMenu(null)}
          />
        ) : null}
        {boardMenu ? (
          <BoardMenu
            x={boardMenu.x}
            y={boardMenu.y}
            onOpen={() => {
              onOpenBoard(boardMenu.board);
              setBoardMenu(null);
            }}
            onRename={() => {
              onRenameBoard(boardMenu.board);
              setBoardMenu(null);
            }}
            onDelete={() => {
              onDeleteBoard(boardMenu.board);
              setBoardMenu(null);
            }}
            onClose={() => setBoardMenu(null)}
          />
        ) : null}
        {noteMenu ? (
          <NoteMenu
            x={noteMenu.x}
            y={noteMenu.y}
            onOpen={() => {
              onOpenNote(noteMenu.note);
              setNoteMenu(null);
            }}
            onRename={() => {
              onRenameNote(noteMenu.note);
              setNoteMenu(null);
            }}
            onDelete={() => {
              onDeleteNote(noteMenu.note);
              setNoteMenu(null);
            }}
            onClose={() => setNoteMenu(null)}
          />
        ) : null}
        {pendingMove ? (
          <MoveConfirmModal
            pending={pendingMove}
            onConfirm={() => {
              onMoveToGroup(pendingMove.connection, pendingMove.groupId);
              setPendingMove(null);
            }}
            onCancel={() => setPendingMove(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <ul className="space-y-0.5 px-1 py-2" role="tree" aria-label="Connection folders">
        {visibleRows.map((row) => {
          if (row.kind === "group") {
            const node = row.node;
            const isCollapsed = collapsed.has(node.id);
            const count =
              node.connections.length + node.children.length + node.boards.length + node.notes.length;
            const paddingLeft = treePadding(row.depth);
            const autoExpandPending =
              Boolean(draggingConnectionId) &&
              hoverFolderKey === node.id &&
              isCollapsed &&
              (node.children.length > 0 || node.connections.length > 0);
            return (
              <li
                key={node.id}
                role="treeitem"
                aria-expanded={!isCollapsed}
                {...{ [FOLDER_DROP_ATTR]: node.id }}
                className={`rounded-md ${folderDropHighlightClass(node.id)} ${
                  autoExpandPending ? "animate-pulse" : ""
                }`}
              >
                <button
                  type="button"
                  style={{ paddingLeft }}
                  onClick={() => toggleCollapsed(node.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setGroupMenu({ group: node, x: event.clientX, y: event.clientY });
                  }}
                  className="relative flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left transition-colors hover:bg-raised/50"
                >
                  {row.depth > 0 ? (
                    <span
                      className="pointer-events-none absolute bottom-0 top-0 w-px bg-line/60"
                      style={{ left: paddingLeft - 6 }}
                      aria-hidden
                    />
                  ) : null}
                  <Chevron className={isCollapsed ? "" : "rotate-90"} />
                  <GroupIcon iconId={node.iconId} color={node.color} size={16} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                    {node.name}
                  </span>
                  <span className="text-[10px] text-faint">{count}</span>
                </button>
              </li>
            );
          }
          if (row.kind === "board") {
            return (
              <BoardRow
                key={row.board.id}
                board={row.board}
                depth={row.depth}
                onOpen={onOpenBoard}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setBoardMenu({ board: row.board, x: event.clientX, y: event.clientY });
                }}
              />
            );
          }
          if (row.kind === "note") {
            return (
              <NoteRow
                key={row.note.id}
                note={row.note}
                depth={row.depth}
                onOpen={onOpenNote}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setNoteMenu({ note: row.note, x: event.clientX, y: event.clientY });
                }}
              />
            );
          }
          return (
            <ConnectionRow
              key={row.connection.id}
              connection={row.connection}
              selected={row.connection.id === selectedId}
              depth={row.depth}
              onSelect={onSelect}
              onOpen={onOpen}
              onContextMenu={(event) => {
                event.preventDefault();
                setConnectionMenu({
                  connection: row.connection,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              dragging={draggingConnectionId === row.connection.id}
              onPointerDown={(event) =>
                onConnectionPointerDown(row.connection, event)
              }
              shouldIgnoreClick={consumeClickAfterDrag}
            />
          );
        })}
        {tree.ungrouped.length > 0 || groups.length > 0 ? (
          <li
            className={`pt-1 rounded-md ${folderDropHighlightClass(UNGROUPED_DROP_KEY)}`}
            {...{ [FOLDER_DROP_ATTR]: UNGROUPED_DROP_KEY }}
          >
            <div className="mx-1 px-2 py-1">
              <p className="pb-1 text-[10px] font-medium uppercase tracking-wide text-faint">
                Ungrouped
              </p>
            </div>
            <ul className="space-y-0.5">
              {tree.ungrouped.map((connection) => (
                <ConnectionRow
                  key={connection.id}
                  connection={connection}
                  selected={connection.id === selectedId}
                  depth={0}
                  dragging={draggingConnectionId === connection.id}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setConnectionMenu({
                      connection,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  onPointerDown={(event) => onConnectionPointerDown(connection, event)}
                  shouldIgnoreClick={consumeClickAfterDrag}
                />
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
      {connectionMenu ? (
        <ConnectionContextMenu
          connection={connectionMenu.connection}
          groups={groups}
          x={connectionMenu.x}
          y={connectionMenu.y}
          onOpen={(connection, mode) => {
            setConnectionMenu(null);
            onOpen(connection, mode);
          }}
          onEdit={(connection) => {
            setConnectionMenu(null);
            onEdit(connection);
          }}
          onTest={(connection) => {
            setConnectionMenu(null);
            onTest(connection);
          }}
          onDelete={(connection) => {
            setConnectionMenu(null);
            onDelete(connection);
          }}
          onMoveToGroup={(connection, groupId) => {
            setConnectionMenu(null);
            onMoveToGroup(connection, groupId);
          }}
          onClose={() => setConnectionMenu(null)}
        />
      ) : null}
      {groupMenu ? (
        <ConnectionGroupContextMenu
          group={groupMenu.group}
          x={groupMenu.x}
          y={groupMenu.y}
          onNewSubfolder={() => {
            const parentId = groupMenu.group.id;
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(parentId);
              localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
              return next;
            });
            setGroupMenu(null);
            onNewGroup(parentId);
          }}
          onNewBoard={() => {
            const groupId = groupMenu.group.id;
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(groupId);
              localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
              return next;
            });
            setGroupMenu(null);
            onNewBoard(groupId);
          }}
          onNewNote={() => {
            const groupId = groupMenu.group.id;
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(groupId);
              localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
              return next;
            });
            setGroupMenu(null);
            onNewNote(groupId);
          }}
          onEdit={() => {
            setGroupMenu(null);
            onEditGroup(groupMenu.group);
          }}
          onDelete={() => {
            setGroupMenu(null);
            onDeleteGroup(groupMenu.group);
          }}
          onClose={() => setGroupMenu(null)}
        />
      ) : null}
      {boardMenu ? (
        <BoardMenu
          x={boardMenu.x}
          y={boardMenu.y}
          onOpen={() => {
            onOpenBoard(boardMenu.board);
            setBoardMenu(null);
          }}
          onRename={() => {
            onRenameBoard(boardMenu.board);
            setBoardMenu(null);
          }}
          onDelete={() => {
            onDeleteBoard(boardMenu.board);
            setBoardMenu(null);
          }}
          onClose={() => setBoardMenu(null)}
        />
      ) : null}
      {noteMenu ? (
        <NoteMenu
          x={noteMenu.x}
          y={noteMenu.y}
          onOpen={() => {
            onOpenNote(noteMenu.note);
            setNoteMenu(null);
          }}
          onRename={() => {
            onRenameNote(noteMenu.note);
            setNoteMenu(null);
          }}
          onDelete={() => {
            onDeleteNote(noteMenu.note);
            setNoteMenu(null);
          }}
          onClose={() => setNoteMenu(null)}
        />
      ) : null}
      {pendingMove ? (
        <MoveConfirmModal
          pending={pendingMove}
          onConfirm={() => {
            onMoveToGroup(pendingMove.connection, pendingMove.groupId);
            setPendingMove(null);
          }}
          onCancel={() => setPendingMove(null)}
        />
      ) : null}
    </>
  );
}

function MoveConfirmModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingMove;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const intoFolder = pending.groupId !== null;
  const message = intoFolder
    ? `Move “${pending.connection.name}” into folder “${pending.targetLabel}”?`
    : `Move “${pending.connection.name}” to Ungrouped?`;
  return (
    <ConfirmModal
      title="Move connection?"
      message={message}
      confirmLabel="Move"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function ConnectionRow({
  connection,
  selected,
  depth,
  groupHint,
  onSelect,
  onOpen,
  onContextMenu,
  onPointerDown,
  shouldIgnoreClick,
  dragging = false,
}: {
  connection: ConnectionSummary;
  selected: boolean;
  depth: number;
  dragging?: boolean;
  groupHint?: string | null;
  onSelect: (connection: ConnectionSummary) => void;
  onOpen: (connection: ConnectionSummary, mode: ConnectionOpenMode) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  shouldIgnoreClick?: () => boolean;
}) {
  const statusColor =
    connection.lastStatus === "ok"
      ? "bg-ok"
      : connection.lastStatus === "failed"
        ? "bg-danger"
        : "bg-faint";
  const paddingLeft = treePadding(depth) + 18;

  return (
    <li role="treeitem">
      <button
        type="button"
        style={{ paddingLeft }}
        onPointerDown={onPointerDown}
        onClick={() => {
          if (shouldIgnoreClick?.()) {
            return;
          }
          onSelect(connection);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          onOpen(connection, defaultOpenMode(connection.kind));
        }}
        onContextMenu={onContextMenu}
        className={`relative flex w-full cursor-grab flex-col rounded-md py-1.5 pr-2 text-left active:cursor-grabbing ${
          dragging ? "opacity-45" : ""
        } ${selected ? "bg-accent-soft" : "hover:bg-raised/60"}`}
      >
        {depth > 0 ? (
          <span
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-line/50"
            style={{ left: treePadding(depth) - 8 }}
            aria-hidden
          />
        ) : null}
        <div className="flex items-center gap-2">
          <KindIcon kind={connection.kind} />
          <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          <span className="truncate text-[13px] font-medium text-ink">{connection.name}</span>
          {connection.favorite ? <span className="text-[10px] text-warning">★</span> : null}
        </div>
        <span className="truncate pl-[26px] text-[11px] text-faint">
          {groupHint ? `${groupHint} · ` : ""}
          {connection.username}@{connection.host}:{connection.port}
        </span>
      </button>
    </li>
  );
}

function BoardRow({
  board,
  depth,
  groupHint,
  onOpen,
  onContextMenu,
}: {
  board: TaskBoardSummary;
  depth: number;
  groupHint?: string | null;
  onOpen: (board: TaskBoardSummary) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  return (
    <li role="treeitem">
      <button
        type="button"
        style={{ paddingLeft: treePadding(depth) }}
        onClick={() => onOpen(board)}
        onDoubleClick={() => onOpen(board)}
        onContextMenu={onContextMenu}
        className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left hover:bg-raised/60"
      >
        <span className="inline-flex h-4 items-center rounded bg-amber-500/20 px-1 text-[9px] font-semibold text-amber-200">
          Board
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{board.name}</span>
        {groupHint ? <span className="truncate text-[10px] text-faint">{groupHint}</span> : null}
      </button>
    </li>
  );
}

function NoteRow({
  note,
  depth,
  groupHint,
  onOpen,
  onContextMenu,
}: {
  note: FolderNoteSummary;
  depth: number;
  groupHint?: string | null;
  onOpen: (note: FolderNoteSummary) => void;
  onContextMenu: (event: ReactMouseEvent) => void;
}) {
  return (
    <li role="treeitem">
      <button
        type="button"
        style={{ paddingLeft: treePadding(depth) }}
        onClick={() => onOpen(note)}
        onDoubleClick={() => onOpen(note)}
        onContextMenu={onContextMenu}
        className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left hover:bg-raised/60"
      >
        <span className="inline-flex h-4 items-center rounded bg-yellow-500/20 px-1 text-[9px] font-semibold text-yellow-200">
          Note
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{note.title}</span>
        {groupHint ? <span className="truncate text-[10px] text-faint">{groupHint}</span> : null}
      </button>
    </li>
  );
}

function NoteMenu({
  x,
  y,
  onOpen,
  onRename,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
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
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-raised/80" onClick={onOpen}>
        Open
      </button>
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-raised/80" onClick={onRename}>
        Rename
      </button>
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-danger hover:bg-raised/80" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function BoardMenu({
  x,
  y,
  onOpen,
  onRename,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
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
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-raised/80" onClick={onOpen}>
        Open
      </button>
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-raised/80" onClick={onRename}>
        Rename
      </button>
      <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-danger hover:bg-raised/80" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function KindIcon({ kind }: { kind: ConnectionSummary["kind"] }) {
  return (
    <span
      className={`inline-flex h-4 min-w-[28px] items-center justify-center rounded px-1 text-[9px] font-semibold ${connectionKindBadgeClass(kind)}`}
    >
      {connectionKindLabel(kind)}
    </span>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 shrink-0 text-faint transition-transform ${className}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function defaultOpenMode(kind: ConnectionSummary["kind"]): ConnectionOpenMode {
  if (kind === "ftp") {
    return "ftp";
  }
  if (kind === "ssh") {
    return "ssh";
  }
  return "default";
}

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}
