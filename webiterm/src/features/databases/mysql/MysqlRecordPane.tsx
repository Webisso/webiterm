import { useEffect, useState } from "react";

type MysqlRecordPaneProps = {
  database: string;
  table: string;
  columns: string[];
  originalRow: string[];
  busy?: boolean;
  error?: string | null;
  onSave: (row: string[]) => Promise<void>;
  onCancel: () => void;
};

export function MysqlRecordPane({
  database,
  table,
  columns,
  originalRow,
  busy = false,
  error = null,
  onSave,
  onCancel,
}: MysqlRecordPaneProps) {
  const [draft, setDraft] = useState<string[]>(() => [...originalRow]);

  useEffect(() => {
    setDraft([...originalRow]);
  }, [originalRow]);

  const dirty = draft.some((value, index) => value !== (originalRow[index] ?? ""));

  function updateCell(index: number, value: string) {
    setDraft((prev) => prev.map((cell, cellIndex) => (cellIndex === index ? value : cell)));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-xl space-y-1">
          <p className="mb-4 text-[12px] text-faint">
            <span className="font-mono text-muted">{database}</span>
            <span> · </span>
            <span className="font-mono text-ink">{table}</span>
          </p>
          {columns.map((column, index) => (
            <label key={column} className="block space-y-1 border-b border-line/40 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
                {column}
              </span>
              <textarea
                value={draft[index] ?? ""}
                disabled={busy}
                onChange={(event) => updateCell(index, event.target.value)}
                rows={draft[index] && draft[index].length > 80 ? 4 : 1}
                className="w-full resize-y rounded-md border border-line bg-canvas px-2 py-1.5 font-mono text-[12px] text-ink disabled:opacity-60"
              />
            </label>
          ))}
        </div>
      </div>
      {error ? (
        <div className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-[12px] text-danger">
          {error}
        </div>
      ) : null}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setDraft([...originalRow]);
            onCancel();
          }}
          className="h-8 rounded-md border border-line px-4 text-[13px] text-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void onSave(draft)}
          className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
