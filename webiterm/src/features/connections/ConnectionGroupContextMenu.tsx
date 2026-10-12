import { useEffect, useRef } from "react";
import type { ConnectionGroup } from "../../types/connections";

type ConnectionGroupContextMenuProps = {
  group: ConnectionGroup;
  x: number;
  y: number;
  onNewSubfolder: () => void;
  onNewBoard: () => void;
  onNewNote: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ConnectionGroupContextMenu({
  x,
  y,
  onNewSubfolder,
  onNewBoard,
  onNewNote,
  onEdit,
  onDelete,
  onClose,
}: ConnectionGroupContextMenuProps) {
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
      className="fixed z-50 min-w-[180px] rounded-md border border-line bg-surface py-1 shadow-panel"
      style={{ left: x, top: y }}
      role="menu"
    >
      <MenuItem onClick={onNewSubfolder}>Add subfolder inside…</MenuItem>
      <MenuItem onClick={onNewBoard}>New board…</MenuItem>
      <MenuItem onClick={onNewNote}>New note…</MenuItem>
      <MenuItem onClick={onEdit}>Edit folder</MenuItem>
      <div className="my-1 border-t border-line" />
      <MenuItem tone="danger" onClick={onDelete}>Delete folder</MenuItem>
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
