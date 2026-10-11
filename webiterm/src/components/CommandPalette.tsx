import { useEffect, useId, useRef, useState } from "react";
import { filterCommands, moveSelection } from "../lib/commands";
import type { CommandItem } from "../types/desktop";
import { Kbd } from "./Kbd";

type CommandPaletteProps = {
  commands: readonly CommandItem[];
  onRun: (id: string) => void;
  onClose: () => void;
};

export function CommandPalette({ commands, onRun, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const visible = filterCommands(commands, query);
  const safeIndex = visible.length === 0 ? 0 : Math.min(selected, visible.length - 1);
  const active = visible[safeIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[16vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-[560px] overflow-hidden rounded-lg border border-line bg-surface shadow-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          placeholder="Search commands"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected(moveSelection(safeIndex, 1, visible.length));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected(moveSelection(safeIndex, -1, visible.length));
              return;
            }
            if (event.key === "Enter" && active) {
              event.preventDefault();
              onRun(active.id);
            }
          }}
          className="h-12 w-full border-b border-line bg-transparent px-4 text-[14px] outline-none placeholder:text-faint"
        />
        <ul id={listId} role="listbox" className="max-h-72 overflow-auto p-1.5">
          {visible.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-muted">No matching commands</li>
          ) : (
            visible.map((command, index) => {
              const isSelected = index === safeIndex;
              return (
                <li key={command.id} role="presentation">
                  <button
                    id={`${listId}-${command.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => onRun(command.id)}
                    className={`flex h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] ${
                      isSelected ? "bg-accent-soft text-ink" : "text-muted"
                    }`}
                  >
                    <span>{command.title}</span>
                    {command.shortcut ? <Kbd>{command.shortcut}</Kbd> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[11px] text-faint">
          <span>↑↓ navigate</span>
          <span>enter select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
