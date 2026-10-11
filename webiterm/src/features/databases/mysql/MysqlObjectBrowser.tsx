import { useMemo } from "react";

type MysqlObjectBrowserProps = {
  databases: string[];
  databasesLoading: boolean;
  databasesError: string | null;
  selectedDatabase: string | null;
  expandedDatabases: Set<string>;
  tablesByDatabase: Record<string, string[]>;
  tablesLoading: Record<string, boolean>;
  browserFilter: string;
  onFilterChange: (value: string) => void;
  onRefreshDatabases: () => void;
  selectedTable: { database: string; table: string } | null;
  onSelectDatabase: (name: string) => void;
  onToggleDatabaseExpanded: (name: string) => void;
  onDoubleClickDatabase: (name: string) => void;
  onSelectTable: (database: string, table: string) => void;
  onOpenTable: (database: string, table: string) => void;
  onRefreshTables: (database: string) => void;
};

export function MysqlObjectBrowser({
  databases,
  databasesLoading,
  databasesError,
  selectedDatabase,
  expandedDatabases,
  tablesByDatabase,
  tablesLoading,
  browserFilter,
  onFilterChange,
  onRefreshDatabases,
  selectedTable,
  onSelectDatabase,
  onToggleDatabaseExpanded,
  onDoubleClickDatabase,
  onSelectTable,
  onOpenTable,
  onRefreshTables,
}: MysqlObjectBrowserProps) {
  const filter = browserFilter.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!filter) {
      return databases.map((db) => ({
        db,
        tables: tablesByDatabase[db] ?? [],
      }));
    }
    return databases
      .map((db) => {
        const tables = (tablesByDatabase[db] ?? []).filter((table) =>
          table.toLowerCase().includes(filter),
        );
        const dbMatch = db.toLowerCase().includes(filter);
        if (!dbMatch && tables.length === 0) {
          return null;
        }
        return { db, tables: dbMatch ? tablesByDatabase[db] ?? [] : tables };
      })
      .filter((item): item is { db: string; tables: string[] } => item !== null);
  }, [databases, filter, tablesByDatabase]);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="border-b border-line px-3 py-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Objects
          </span>
          <button
            type="button"
            disabled={databasesLoading}
            onClick={onRefreshDatabases}
            className="text-[11px] text-accent hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <input
          value={browserFilter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter databases & tables…"
          className="h-7 w-full rounded-md border border-line bg-canvas px-2 text-[12px]"
          spellCheck={false}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {databasesLoading && databases.length === 0 ? (
          <p className="px-2 py-1 text-[12px] text-faint">Loading…</p>
        ) : null}
        {databasesError ? (
          <p className="px-2 py-1 text-[12px] text-danger">{databasesError}</p>
        ) : null}
        <ul className="space-y-0.5" role="tree">
          {filtered.map(({ db, tables }) => {
            const expanded = expandedDatabases.has(db);
            const selected = selectedDatabase === db;
            const loadingTables = tablesLoading[db];
            return (
              <li key={db} role="treeitem" aria-expanded={expanded}>
                <div
                  className={`flex items-center gap-0.5 rounded-md ${
                    selected ? "bg-accent-soft/80" : "hover:bg-raised/50"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={expanded ? "Collapse" : "Expand"}
                    onClick={() => onToggleDatabaseExpanded(db)}
                    className="flex h-7 w-6 shrink-0 items-center justify-center text-faint"
                  >
                    <Chevron open={expanded} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDatabase(db)}
                    onDoubleClick={() => onDoubleClickDatabase(db)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left"
                    title="Double-click to expand tables"
                  >
                    <DbIcon />
                    <span className="truncate text-[12px] font-medium text-ink">{db}</span>
                  </button>
                </div>
                {expanded ? (
                  <ul className="ml-4 border-l border-line/60 pl-1">
                    {loadingTables ? (
                      <li className="px-2 py-1 text-[11px] text-faint">Loading tables…</li>
                    ) : null}
                    {!loadingTables && tables.length === 0 ? (
                      <li className="flex items-center justify-between px-2 py-1">
                        <span className="text-[11px] text-faint">No tables</span>
                        <button
                          type="button"
                          onClick={() => onRefreshTables(db)}
                          className="text-[10px] text-accent"
                        >
                          Retry
                        </button>
                      </li>
                    ) : null}
                    {tables.map((table) => {
                      const tableSelected =
                        selectedTable?.database === db && selectedTable.table === table;
                      return (
                      <li key={table}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTable(db, table);
                            onOpenTable(db, table);
                          }}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-raised/60 ${
                            tableSelected ? "bg-accent-soft/60 ring-1 ring-inset ring-accent/30" : ""
                          }`}
                          title="Open table data"
                        >
                          <TableIcon />
                          <span className="truncate text-[12px] text-muted">{table}</span>
                        </button>
                      </li>
                    );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
      fill="currentColor"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function DbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}
