import { useCallback, useEffect, useRef, useState } from "react";
import type { MysqlQueryResult } from "../../../types/connections";
import { listConnections, mysqlQuery } from "../../../lib/connections";
import { MysqlObjectBrowser } from "./MysqlObjectBrowser";
import { MysqlEditableGrid } from "./MysqlEditableGrid";
import { MysqlQueryEditor } from "./MysqlQueryEditor";
import { MysqlQueryStats } from "./MysqlQueryStats";
import { MysqlRecordPane } from "./MysqlRecordPane";
import { buildRowUpdateSql, parsePrimaryKeyColumns } from "./mysqlRowSql";
import {
  extractRunnableQuery,
  parseDatabaseNames,
  parseTableNames,
  quoteIdent,
  selectTablePreview,
} from "./mysqlSql";

type MysqlWorkspaceProps = {
  connectionId: string;
};

type TableTab = {
  id: string;
  database: string;
  table: string;
  result: MysqlQueryResult | null;
  error: string | null;
  loading: boolean;
  primaryKeys: string[];
  selectedRowIndex: number | null;
  gridError: string | null;
};

type RecordTab = {
  id: string;
  sourceTableTabId: string;
  rowIndex: number;
  database: string;
  table: string;
  columns: string[];
  row: string[];
  primaryKeys: string[];
  label: string;
  saveBusy: boolean;
  saveError: string | null;
};

type ActiveView =
  | { kind: "none" }
  | { kind: "query" }
  | { kind: "table"; tabId: string }
  | { kind: "record"; tabId: string };

function resolveFallbackView(
  queryTabOpen: boolean,
  tableTabs: TableTab[],
  recordTabs: RecordTab[],
): ActiveView {
  if (queryTabOpen) {
    return { kind: "query" };
  }
  const firstTable = tableTabs[0];
  if (firstTable) {
    return { kind: "table", tabId: firstTable.id };
  }
  const firstRecord = recordTabs[0];
  if (firstRecord) {
    return { kind: "record", tabId: firstRecord.id };
  }
  return { kind: "none" };
}

export function MysqlWorkspace({ connectionId }: MysqlWorkspaceProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [databasesError, setDatabasesError] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [tablesByDatabase, setTablesByDatabase] = useState<Record<string, string[]>>({});
  const [tablesLoading, setTablesLoading] = useState<Record<string, boolean>>({});
  const [browserFilter, setBrowserFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState<{
    database: string;
    table: string;
  } | null>(null);
  const [queryTabOpen, setQueryTabOpen] = useState(false);

  const [sql, setSql] = useState("-- Write SQL here\nSELECT 1;\n");
  const [queryResult, setQueryResult] = useState<MysqlQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryBusy, setQueryBusy] = useState(false);
  const [lastExecutedSql, setLastExecutedSql] = useState("");

  const [tableTabs, setTableTabs] = useState<TableTab[]>([]);
  const tableTabsRef = useRef(tableTabs);
  const [recordTabs, setRecordTabs] = useState<RecordTab[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>({ kind: "none" });

  const sqlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    tableTabsRef.current = tableTabs;
  }, [tableTabs]);

  const loadDatabases = useCallback(async () => {
    setDatabasesLoading(true);
    setDatabasesError(null);
    try {
      const payload = await mysqlQuery(connectionId, "SHOW DATABASES;");
      const names = parseDatabaseNames(payload);
      setDatabases(names);
      setSelectedDatabase((current) => {
        if (current && names.includes(current)) {
          return current;
        }
        return names[0] ?? null;
      });
    } catch (err) {
      setDatabases([]);
      setDatabasesError(err instanceof Error ? err.message : "Could not list databases.");
    } finally {
      setDatabasesLoading(false);
    }
  }, [connectionId]);

  const loadTables = useCallback(
    async (database: string) => {
      setTablesLoading((prev) => ({ ...prev, [database]: true }));
      try {
        const payload = await mysqlQuery(connectionId, "SHOW TABLES;", database);
        const tables = parseTableNames(payload);
        setTablesByDatabase((prev) => ({ ...prev, [database]: tables }));
      } catch {
        setTablesByDatabase((prev) => ({ ...prev, [database]: [] }));
      } finally {
        setTablesLoading((prev) => ({ ...prev, [database]: false }));
      }
    },
    [connectionId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const connections = await listConnections();
        if (cancelled) {
          return;
        }
        const profile = connections.find((item) => item.id === connectionId);
        const defaultDb = profile?.databaseName?.trim() || null;
        if (defaultDb) {
          setSelectedDatabase(defaultDb);
          setExpandedDatabases(new Set([defaultDb]));
        }
      } catch {
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  useEffect(() => {
    void loadDatabases();
  }, [loadDatabases]);

  useEffect(() => {
    for (const db of expandedDatabases) {
      if (!tablesByDatabase[db] && !tablesLoading[db]) {
        void loadTables(db);
      }
    }
  }, [expandedDatabases, loadTables, tablesByDatabase, tablesLoading]);

  const runQuery = useCallback(
    async (statement: string) => {
      const trimmed = statement.trim();
      if (!trimmed) {
        return;
      }
      setQueryBusy(true);
      setQueryError(null);
      setLastExecutedSql(trimmed);
      try {
        const payload = await mysqlQuery(connectionId, trimmed, selectedDatabase);
        setQueryResult(payload);
      } catch (err) {
        setQueryResult(null);
        setQueryError(err instanceof Error ? err.message : "Query failed.");
      } finally {
        setQueryBusy(false);
      }
    },
    [connectionId, selectedDatabase],
  );

  const fetchTablePayload = useCallback(
    async (database: string, table: string) => {
      const payload = await mysqlQuery(
        connectionId,
        selectTablePreview(table),
        database,
      );
      let primaryKeys: string[] = [];
      try {
        const keysPayload = await mysqlQuery(
          connectionId,
          `SHOW KEYS FROM ${quoteIdent(table)} WHERE Key_name = 'PRIMARY';`,
          database,
        );
        primaryKeys = parsePrimaryKeyColumns(keysPayload);
      } catch {
        primaryKeys = [];
      }
      return { payload, primaryKeys };
    },
    [connectionId],
  );

  const runFromEditor = useCallback(() => {
    const el = sqlRef.current;
    const text = el?.value ?? sql;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? text.length;
    const statement = extractRunnableQuery(text, start, end);
    void runQuery(statement);
  }, [runQuery, sql]);

  const loadTableTabData = useCallback(
    async (tabId: string, database: string, table: string) => {
      try {
        const { payload, primaryKeys } = await fetchTablePayload(database, table);
        setTableTabs((prev) =>
          prev.map((item) =>
            item.id === tabId
              ? {
                  ...item,
                  result: payload,
                  primaryKeys,
                  loading: false,
                  error: null,
                  gridError: null,
                }
              : item,
          ),
        );
      } catch (err) {
        setTableTabs((prev) =>
          prev.map((item) =>
            item.id === tabId
              ? {
                  ...item,
                  loading: false,
                  error: err instanceof Error ? err.message : "Could not load table.",
                }
              : item,
          ),
        );
      }
    },
    [fetchTablePayload],
  );

  const openTableTab = useCallback(
    (database: string, table: string) => {
      setSelectedDatabase(database);
      setSelectedTable({ database, table });
      const id = `table:${database}.${table}`;
      setActiveView({ kind: "table", tabId: id });

      const existing = tableTabsRef.current.find((tab) => tab.id === id);
      const hasCachedData = Boolean(existing?.result && !existing.loading);
      if (hasCachedData) {
        return;
      }

      setTableTabs((prev) => {
        const current = prev.find((tab) => tab.id === id);
        if (current) {
          return prev.map((tab) =>
            tab.id === id
              ? { ...tab, loading: true, error: null, gridError: null }
              : tab,
          );
        }
        return [
          ...prev,
          {
            id,
            database,
            table,
            result: null,
            error: null,
            loading: true,
            primaryKeys: [],
            selectedRowIndex: null,
            gridError: null,
          },
        ];
      });

      void loadTableTabData(id, database, table);
    },
    [loadTableTabData],
  );

  const refreshTableTab = useCallback(
    (tabId: string, database: string, table: string) => {
      setTableTabs((prev) =>
        prev.map((item) =>
          item.id === tabId ? { ...item, loading: true, error: null } : item,
        ),
      );
      void loadTableTabData(tabId, database, table);
    },
    [loadTableTabData],
  );

  const updateTableTab = useCallback((tabId: string, patch: Partial<TableTab>) => {
    setTableTabs((prev) =>
      prev.map((item) => (item.id === tabId ? { ...item, ...patch } : item)),
    );
  }, []);

  const openRecordTab = useCallback((tab: TableTab, rowIndex: number) => {
    const row = tab.result?.rows[rowIndex];
    if (!row || !tab.result) {
      return;
    }
    const id = `record:${tab.id}:${rowIndex}`;
    const snapshot = {
      sourceTableTabId: tab.id,
      rowIndex,
      database: tab.database,
      table: tab.table,
      columns: tab.result.columns,
      row: [...row],
      primaryKeys: tab.primaryKeys,
      label: `${tab.table} #${rowIndex + 1}`,
      saveBusy: false,
      saveError: null,
    };
    setRecordTabs((prev) => {
      if (prev.some((item) => item.id === id)) {
        return prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...snapshot,
              }
            : item,
        );
      }
      return [...prev, { id, ...snapshot }];
    });
    setActiveView({ kind: "record", tabId: id });
  }, []);

  const saveRecordTab = useCallback(
    async (recordTabId: string, newRow: string[]) => {
      const record = recordTabsRef.current.find((item) => item.id === recordTabId);
      if (!record) {
        return;
      }
      const sql = buildRowUpdateSql(
        record.table,
        record.columns,
        record.row,
        newRow,
        record.primaryKeys,
      );
      if (!sql) {
        return;
      }
      setRecordTabs((prev) =>
        prev.map((item) =>
          item.id === recordTabId ? { ...item, saveBusy: true, saveError: null } : item,
        ),
      );
      try {
        await mysqlQuery(connectionId, sql, record.database);
        setRecordTabs((prev) =>
          prev.map((item) =>
            item.id === recordTabId
              ? { ...item, row: [...newRow], saveBusy: false, saveError: null }
              : item,
          ),
        );
        setTableTabs((prev) =>
          prev.map((tab) => {
            if (tab.id !== record.sourceTableTabId || !tab.result) {
              return tab;
            }
            const rows = tab.result.rows.map((existing, index) =>
              index === record.rowIndex ? newRow : existing,
            );
            return { ...tab, result: { ...tab.result, rows } };
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Save failed.";
        setRecordTabs((prev) =>
          prev.map((item) =>
            item.id === recordTabId ? { ...item, saveBusy: false, saveError: message } : item,
          ),
        );
      }
    },
    [connectionId],
  );

  const openQueryTab = useCallback(() => {
    setQueryTabOpen(true);
    setActiveView({ kind: "query" });
  }, []);

  const recordTabsRef = useRef(recordTabs);
  useEffect(() => {
    recordTabsRef.current = recordTabs;
  }, [recordTabs]);

  const closeQueryTab = useCallback(() => {
    setQueryTabOpen(false);
    setActiveView((view) => {
      if (view.kind !== "query") {
        return view;
      }
      return resolveFallbackView(
        false,
        tableTabsRef.current,
        recordTabsRef.current,
      );
    });
  }, []);

  const closeTableTab = useCallback(
    (tabId: string) => {
      setTableTabs((prev) => {
        const remaining = prev.filter((tab) => tab.id !== tabId);
        setRecordTabs((records) => {
          const remainingRecords = records.filter((tab) => !tab.id.startsWith(`record:${tabId}:`));
          setActiveView((view) => {
            if (view.kind === "table" && view.tabId === tabId) {
              return resolveFallbackView(queryTabOpen, remaining, remainingRecords);
            }
            if (view.kind === "record" && view.tabId.startsWith(`record:${tabId}:`)) {
              return resolveFallbackView(queryTabOpen, remaining, remainingRecords);
            }
            return view;
          });
          return remainingRecords;
        });
        return remaining;
      });
    },
    [queryTabOpen],
  );

  const closeRecordTab = useCallback(
    (tabId: string) => {
      setRecordTabs((prev) => {
        const remaining = prev.filter((tab) => tab.id !== tabId);
        setActiveView((view) => {
          if (view.kind === "record" && view.tabId === tabId) {
            return resolveFallbackView(queryTabOpen, tableTabsRef.current, remaining);
          }
          return view;
        });
        return remaining;
      });
    },
    [queryTabOpen],
  );

  const toggleDatabaseExpanded = useCallback((database: string) => {
    setExpandedDatabases((prev) => {
      const next = new Set(prev);
      if (next.has(database)) {
        next.delete(database);
      } else {
        next.add(database);
      }
      return next;
    });
  }, []);

  const handleDoubleClickDatabase = useCallback(
    (database: string) => {
      setExpandedDatabases((prev) => new Set(prev).add(database));
      setSelectedDatabase(database);
      void loadTables(database);
    },
    [loadTables],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        if (activeView.kind !== "query") {
          return;
        }
        event.preventDefault();
        runFromEditor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView, runFromEditor]);

  const activeTableTab =
    activeView.kind === "table"
      ? tableTabs.find((tab) => tab.id === activeView.tabId) ?? null
      : null;
  const activeRecordTab =
    activeView.kind === "record"
      ? recordTabs.find((tab) => tab.id === activeView.tabId) ?? null
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex min-h-0 flex-1">
        <MysqlObjectBrowser
          databases={databases}
          databasesLoading={databasesLoading}
          databasesError={databasesError}
          selectedDatabase={selectedDatabase}
          expandedDatabases={expandedDatabases}
          tablesByDatabase={tablesByDatabase}
          tablesLoading={tablesLoading}
          browserFilter={browserFilter}
          onFilterChange={setBrowserFilter}
          onRefreshDatabases={() => void loadDatabases()}
          selectedTable={selectedTable}
          onSelectDatabase={setSelectedDatabase}
          onToggleDatabaseExpanded={toggleDatabaseExpanded}
          onDoubleClickDatabase={handleDoubleClickDatabase}
          onSelectTable={(database, table) => {
            setSelectedDatabase(database);
            setSelectedTable({ database, table });
          }}
          onOpenTable={(database, table) => void openTableTab(database, table)}
          onRefreshTables={(database) => void loadTables(database)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-raised/30 px-3 py-1.5">
            <button
              type="button"
              onClick={openQueryTab}
              className={`h-8 rounded-md px-3 text-[12px] font-medium ${
                activeView.kind === "query"
                  ? "bg-accent text-canvas"
                  : "border border-line text-muted hover:bg-raised/60 hover:text-ink"
              }`}
            >
              Query
            </button>
            {selectedDatabase ? (
              <span className="text-[11px] text-faint">
                DB: <span className="font-mono text-muted">{selectedDatabase}</span>
              </span>
            ) : null}
          </div>
          <div className="shrink-0 border-b border-line bg-raised/40 px-2 py-1.5">
            <div className="flex min-h-[34px] items-center gap-1 overflow-x-auto">
              {queryTabOpen ? (
                <WorkspaceTab
                  title="Query"
                  active={activeView.kind === "query"}
                  onSelect={() => setActiveView({ kind: "query" })}
                  onClose={() => closeQueryTab()}
                />
              ) : null}
              {tableTabs.map((tab) => (
                <WorkspaceTab
                  key={tab.id}
                  title={tab.table}
                  hint={tab.database}
                  active={activeView.kind === "table" && activeView.tabId === tab.id}
                  onSelect={() => setActiveView({ kind: "table", tabId: tab.id })}
                  onClose={() => closeTableTab(tab.id)}
                />
              ))}
              {recordTabs.map((tab) => (
                <WorkspaceTab
                  key={tab.id}
                  title={tab.label}
                  hint="Record"
                  active={activeView.kind === "record" && activeView.tabId === tab.id}
                  onSelect={() => setActiveView({ kind: "record", tabId: tab.id })}
                  onClose={() => closeRecordTab(tab.id)}
                />
              ))}
            </div>
          </div>

          {activeView.kind === "query" && queryTabOpen ? (
            <MysqlQueryEditor
              connectionId={connectionId}
              database={selectedDatabase}
              sql={sql}
              onSqlChange={setSql}
              queryResult={queryResult}
              queryError={queryError}
              queryBusy={queryBusy}
              lastExecutedSql={lastExecutedSql}
              onRun={runFromEditor}
              onClearResults={() => {
                setQueryResult(null);
                setQueryError(null);
              }}
              sqlRef={sqlRef}
            />
          ) : activeView.kind === "table" && activeTableTab ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2">
                <span className="text-[12px] text-muted">
                  <span className="font-mono text-ink">{activeTableTab.database}</span>
                  <span className="text-faint"> · </span>
                  <span className="font-mono text-ink">{activeTableTab.table}</span>
                </span>
                <button
                  type="button"
                  disabled={activeTableTab.loading}
                  onClick={() =>
                    void refreshTableTab(
                      activeTableTab.id,
                      activeTableTab.database,
                      activeTableTab.table,
                    )
                  }
                  className="h-8 rounded-md border border-line px-3 text-[12px] text-muted"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSql(selectTablePreview(activeTableTab.table));
                    openQueryTab();
                  }}
                  className="h-8 rounded-md border border-line px-3 text-[12px] text-muted"
                >
                  Open in Query
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {activeTableTab.loading ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-faint">
                    Loading rows…
                  </div>
                ) : activeTableTab.error ? (
                  <div className="p-4 text-[13px] text-danger">{activeTableTab.error}</div>
                ) : activeTableTab.result ? (
                  <MysqlEditableGrid
                    connectionId={connectionId}
                    database={activeTableTab.database}
                    table={activeTableTab.table}
                    result={activeTableTab.result}
                    primaryKeys={activeTableTab.primaryKeys}
                    selectedRowIndex={activeTableTab.selectedRowIndex}
                    onSelectRow={(rowIndex) =>
                      updateTableTab(activeTableTab.id, { selectedRowIndex: rowIndex })
                    }
                    onResultUpdated={(next) =>
                      updateTableTab(activeTableTab.id, {
                        result: next,
                        gridError: null,
                      })
                    }
                    onOpenRecord={(rowIndex) => openRecordTab(activeTableTab, rowIndex)}
                    onError={(message) =>
                      updateTableTab(activeTableTab.id, { gridError: message })
                    }
                  />
                ) : null}
              </div>
              {activeTableTab.gridError ? (
                <div className="border-t border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">
                  {activeTableTab.gridError}
                </div>
              ) : null}
              {activeTableTab.result ? (
                <MysqlQueryStats
                  database={activeTableTab.database}
                  sqlPreview={selectTablePreview(activeTableTab.table)}
                  result={activeTableTab.result}
                  error={activeTableTab.error}
                  busy={activeTableTab.loading}
                />
              ) : null}
            </div>
          ) : activeView.kind === "record" && activeRecordTab ? (
            <MysqlRecordPane
              database={activeRecordTab.database}
              table={activeRecordTab.table}
              columns={activeRecordTab.columns}
              originalRow={activeRecordTab.row}
              busy={activeRecordTab.saveBusy}
              error={activeRecordTab.saveError}
              onSave={(row) => saveRecordTab(activeRecordTab.id, row)}
              onCancel={() => {
                setRecordTabs((prev) =>
                  prev.map((item) =>
                    item.id === activeRecordTab.id ? { ...item, saveError: null } : item,
                  ),
                );
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[14px] text-muted">No panel open</p>
              <p className="max-w-sm text-[12px] text-faint">
                Use <strong className="font-medium text-ink">Query</strong> above for SQL, or
                double-click a database / table in Objects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceTab({
  title,
  hint,
  active,
  onSelect,
  onClose,
}: {
  title: string;
  hint?: string;
  active: boolean;
  onSelect: () => void;
  onClose: (() => void) | null;
}) {
  return (
    <div
      title={hint ? `${title} (${hint})` : title}
      className={`group flex max-w-[220px] shrink-0 items-center rounded-md border ${
        active
          ? "border-line bg-canvas text-ink shadow-sm"
          : "border-transparent bg-transparent text-muted hover:bg-raised/50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[12px]"
      >
        {title}
      </button>
      {onClose ? (
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="px-1.5 text-[14px] text-faint opacity-0 group-hover:opacity-100 hover:text-ink"
        >
          ×
        </button>
      ) : (
        <span className="w-6" />
      )}
    </div>
  );
}
