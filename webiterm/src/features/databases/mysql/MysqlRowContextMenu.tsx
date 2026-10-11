import { useEffect, useRef } from "react";

type MysqlRowContextMenuProps = {
  x: number;
  y: number;
  onViewFull: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function MysqlRowContextMenu({
  x,
  y,
  onViewFull,
  onDelete,
  onClose,
}: MysqlRowContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[80] min-w-[180px] rounded-md border border-line bg-surface py-1 shadow-panel"
      style={{ left: x, top: y }}
      role="menu"
    >
      <MenuItem onClick={onViewFull}>View full record</MenuItem>
      <div className="my-1 border-t border-line" />
      <MenuItem tone="danger" onClick={onDelete}>Delete row</MenuItem>
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
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left text-[13px] ${
        tone === "danger" ? "text-danger hover:bg-raised/80" : "text-ink hover:bg-raised/80"
      }`}
    >
      {children}
    </button>
  );
}
