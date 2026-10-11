import { useEffect, useRef } from "react";
import type { ConnectionGroup, ConnectionSummary } from "../../types/connections";

export type ConnectionOpenMode = "ssh" | "ftp" | "default";

type ConnectionContextMenuProps = {
  connection: ConnectionSummary;
  groups: ConnectionGroup[];
  x: number;
  y: number;
  onOpen: (connection: ConnectionSummary, mode: ConnectionOpenMode) => void;
  onEdit: (connection: ConnectionSummary) => void;
  onTest: (connection: ConnectionSummary) => void;
  onDelete: (connection: ConnectionSummary) => void;
  onMoveToGroup: (connection: ConnectionSummary, groupId: string | null) => void;
  onClose: () => void;
};

export function ConnectionContextMenu({
  connection,
  groups,
  x,
  y,
  onOpen,
  onEdit,
  onTest,
  onDelete,
  onMoveToGroup,
  onClose,
}: ConnectionContextMenuProps) {
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

  const remote = connection.kind === "ssh" || connection.kind === "ftp";

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border border-line bg-surface py-1 shadow-panel"
      style={{ left: x, top: y }}
      role="menu"
    >
      {remote ? (
        <>
          <MenuItem onClick={() => onOpen(connection, "ssh")}>SSH</MenuItem>
          <MenuItem onClick={() => onOpen(connection, "ftp")}>SFTP</MenuItem>
          <Divider />
        </>
      ) : (
        <MenuItem onClick={() => onOpen(connection, "default")}>Open</MenuItem>
      )}
      <MenuItem onClick={() => onTest(connection)}>Test</MenuItem>
      <MenuItem onClick={() => onEdit(connection)}>Edit</MenuItem>
      {groups.length > 0 ? (
        <>
          <Divider />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-faint">Move to folder</div>
          <div className="max-h-40 overflow-auto">
            <MenuItem onClick={() => onMoveToGroup(connection, null)}>Ungrouped</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} onClick={() => onMoveToGroup(connection, group.id)}>
                {group.name}
              </MenuItem>
            ))}
          </div>
        </>
      ) : null}
      <Divider />
      <MenuItem tone="danger" onClick={() => onDelete(connection)}>Delete</MenuItem>
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
      onClick={() => onClick()}
      className={`block w-full px-3 py-1.5 text-left text-[13px] ${
        tone === "danger" ? "text-danger hover:bg-raised/80" : "text-ink hover:bg-raised/80"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="my-1 border-t border-line" />;
}
