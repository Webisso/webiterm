import type { MysqlQueryResult } from "../../../types/connections";

type MysqlResultGridProps = {
  result: MysqlQueryResult;
  emptyMessage?: string;
  busy?: boolean;
  selectedRowIndex?: number | null;
  editingCell?: { rowIndex: number; columnIndex: number } | null;
  editDraft?: string;
  onSelectRow?: (rowIndex: number) => void;
  onRowContextMenu?: (rowIndex: number, event: React.MouseEvent) => void;
  onStartEdit?: (rowIndex: number, columnIndex: number, value: string) => void;
  onEditDraftChange?: (value: string) => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
};

export function MysqlResultGrid({
  result,
  emptyMessage,
  busy = false,
  selectedRowIndex = null,
  editingCell = null,
  editDraft = "",
  onSelectRow,
  onRowContextMenu,
  onStartEdit,
  onEditDraftChange,
  onCommitEdit,
  onCancelEdit,
}: MysqlResultGridProps) {
  const interactive = Boolean(onSelectRow);

  if (result.columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-muted">
        {emptyMessage ?? "No columns in result."}
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${busy ? "opacity-70" : ""}`}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-raised shadow-[0_1px_0_var(--color-line)]">
            <tr>
              <th className="w-12 border-b border-line px-2 py-1.5 text-right font-medium text-faint">
                #
              </th>
              {result.columns.map((column) => (
                <th
                  key={column}
                  className="max-w-[280px] truncate border-b border-line px-2 py-1.5 font-medium text-ink"
                  title={column}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length + 1}
                  className="px-3 py-8 text-center text-faint"
                >
                  Empty result set
                </td>
              </tr>
            ) : (
              result.rows.map((row, rowIndex) => {
                const selected = selectedRowIndex === rowIndex;
                return (
                  <tr
                    key={rowIndex}
                    onClick={() => onSelectRow?.(rowIndex)}
                    onContextMenu={(event) => onRowContextMenu?.(rowIndex, event)}
                    className={`cursor-default ${
                      selected
                        ? "bg-accent/20 ring-1 ring-inset ring-accent/40"
                        : rowIndex % 2 === 0
                          ? "bg-canvas hover:bg-raised/25"
                          : "bg-canvas/60 hover:bg-raised/25"
                    }`}
                  >
                    <td className="border-b border-line/50 px-2 py-1 text-right font-mono text-[11px] text-faint">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, cellIndex) => {
                      const isEditing =
                        editingCell?.rowIndex === rowIndex &&
                        editingCell?.columnIndex === cellIndex;
                      return (
                        <td
                          key={cellIndex}
                          className="max-w-[320px] border-b border-line/50 px-1 py-0.5 font-mono text-[11px] text-ink"
                          onDoubleClick={(event) => {
                            if (!interactive || !onStartEdit) {
                              return;
                            }
                            event.stopPropagation();
                            onStartEdit(rowIndex, cellIndex, cell);
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editDraft}
                              onChange={(event) => onEditDraftChange?.(event.target.value)}
                              onBlur={() => onCommitEdit?.()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  onCommitEdit?.();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  onCancelEdit?.();
                                }
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="h-7 w-full min-w-[120px] rounded border border-accent/50 bg-canvas px-1.5 text-[11px] outline-none ring-1 ring-accent/30"
                            />
                          ) : (
                            <span
                              className="block truncate px-1 py-0.5"
                              title={cell}
                            >
                              <CellValue value={cell} />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "NULL") {
    return <span className="italic text-faint">NULL</span>;
  }
  return <span>{value}</span>;
}
