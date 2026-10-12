import type { RefObject } from "react";
import { ConnectionExplorer } from "../features/connections/ConnectionExplorer";
import type { ConnectionOpenMode } from "../features/connections/ConnectionContextMenu";
import type { TaskBoardSummary } from "../types/boards";
import type { FolderNoteSummary } from "../types/notes";
import type { ConnectionGroup, ConnectionSummary } from "../types/connections";

type SidebarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  connections: ConnectionSummary[];
  groups: ConnectionGroup[];
  boards: TaskBoardSummary[];
  notes: FolderNoteSummary[];
  selectedId: string | null;
  onNewGroup: (parentId?: string) => void;
  onSelect: (connection: ConnectionSummary) => void;
  onOpen: (connection: ConnectionSummary, mode: ConnectionOpenMode) => void;
  onEdit: (connection: ConnectionSummary) => void;
  onDelete: (connection: ConnectionSummary) => void;
  onTest: (connection: ConnectionSummary) => void;
  onNewConnection: () => void;
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

export function Sidebar({
  query,
  onQueryChange,
  searchRef,
  connections,
  boards,
  selectedId,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  onTest,
  onNewConnection,
  groups,
  onNewGroup,
  onEditGroup,
  onDeleteGroup,
  onMoveToGroup,
  onOpenBoard,
  onNewBoard,
  onRenameBoard,
  onDeleteBoard,
  notes,
  onOpenNote,
  onNewNote,
  onRenameNote,
  onDeleteNote,
}: SidebarProps) {
  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="px-3 pb-2 pt-3">
        <label className="sr-only" htmlFor="connection-search">
          Search connections
        </label>
        <input
          id="connection-search"
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search connections"
          autoComplete="off"
          spellCheck={false}
          className="h-8 w-full rounded-md border border-line bg-canvas px-2.5 text-[13px] text-ink placeholder:text-faint"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
          Connections
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-faint">{connections.length}</span>
          <button
            type="button"
            aria-label="New folder"
            onClick={() => onNewGroup()}
            className="flex h-6 w-6 items-center justify-center rounded border border-line text-muted hover:bg-raised hover:text-ink"
            title="New folder"
          >
            <FolderPlusIcon />
          </button>
          <button
            type="button"
            aria-label="New connection"
            onClick={onNewConnection}
            className="flex h-6 w-6 items-center justify-center rounded border border-line text-[15px] text-muted hover:bg-raised hover:text-ink"
          >
            +
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ConnectionExplorer
          query={query}
          connections={connections}
          groups={groups}
          boards={boards}
          notes={notes}
          selectedId={selectedId}
          onNewGroup={onNewGroup}
          onEditGroup={onEditGroup}
          onDeleteGroup={onDeleteGroup}
          onMoveToGroup={onMoveToGroup}
          onSelect={onSelect}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
          onOpenBoard={onOpenBoard}
          onNewBoard={onNewBoard}
          onRenameBoard={onRenameBoard}
          onDeleteBoard={onDeleteBoard}
          onOpenNote={onOpenNote}
          onNewNote={onNewNote}
          onRenameNote={onRenameNote}
          onDeleteNote={onDeleteNote}
        />
      </div>
    </aside>
  );
}

function FolderPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 10v6M9 13h6M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
