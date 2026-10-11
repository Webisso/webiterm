import { useCallback, useEffect, useMemo, useState } from "react";
import type { MysqlQueryResult } from "../../../types/connections";
import { MysqlQueryStats } from "./MysqlQueryStats";
import { MysqlResultGrid } from "./MysqlResultGrid";
import { quoteIdent } from "./mysqlSql";
import {
  deleteSavedMysqlQuery,
  listSavedMysqlQueries,
  type SavedMysqlQuery,
  upsertSavedMysqlQuery,
} from "./mysqlSavedQueries";

type MysqlQueryEditorProps = {
  connectionId: string;
  database: string | null;
  sql: string;
  onSqlChange: (sql: string) => void;
  queryResult: MysqlQueryResult | null;
  queryError: string | null;
  queryBusy: boolean;
  lastExecutedSql: string;
  onRun: () => void;
  onClearResults: () => void;
  sqlRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function MysqlQueryEditor({
  connectionId,
  database,
  sql,
  onSqlChange,
  queryResult,
  queryError,
  queryBusy,
  lastExecutedSql,
  onRun,
  onClearResults,
  sqlRef,
}: MysqlQueryEditorProps) {
  const [saved, setSaved] = useState<SavedMysqlQuery[]>([]);
  const [saveName, setSaveName] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const refreshSaved = useCallback(() => {
    if (!database) {
      setSaved([]);
      return;
    }
    setSaved(listSavedMysqlQueries(connectionId, database));
  }, [connectionId, database]);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const selectedSaved = useMemo(
    () => saved.find((item) => item.id === selectedSavedId) ?? null,
    [saved, selectedSavedId],
  );

  function loadSaved(item: SavedMysqlQuery) {
    setSelectedSavedId(item.id);
    onSqlChange(item.sql);
    setSaveName(item.name);
  }

  function handleSave() {
    if (!database || !saveName.trim() || !sql.trim()) {
      return;
    }
    const entry = upsertSavedMysqlQuery(connectionId, database, {
      id: selectedSavedId ?? undefined,
      name: saveName.trim(),
      sql,
    });
    setSelectedSavedId(entry.id);
    refreshSaved();
  }

  function handleDelete(id: string) {
    if (!database) {
      return;
    }
    deleteSavedMysqlQuery(connectionId, database, id);
    if (selectedSavedId === id) {
      setSelectedSavedId(null);
    }
    refreshSaved();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <button
          type="button"
          disabled={queryBusy}
          onClick={onRun}
          className="h-8 rounded-md bg-accent px-4 text-[12px] font-medium text-canvas disabled:opacity-50"
        >
          {queryBusy ? "Running…" : "Run"}
        </button>
        <button
          type="button"
          onClick={onClearResults}
          className="h-8 rounded-md border border-line px-3 text-[12px] text-muted"
        >
          Clear results
        </button>
        <button
          type="button"
          disabled={!database}
          onClick={() => {
            if (!database) {
              return;
            }
            onSqlChange(`${sql.trimEnd()}\n\nSHOW TABLES FROM ${quoteIdent(database)};\n`);
          }}
          className="h-8 rounded-md border border-line px-3 text-[12px] text-muted"
        >
          SHOW TABLES
        </button>
        <span className="ml-auto text-[11px] text-faint">⌘↵ Run · DB: {database ?? "—"}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-line bg-sidebar">
          <div className="border-b border-line px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Saved queries
            </p>
            <p className="mt-0.5 text-[10px] text-faint">
              {database ? `Per database: ${database}` : "Select a database in Objects"}
            </p>
          </div>
          <div className="space-y-2 border-b border-line p-2">
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Query name"
              disabled={!database}
              className="h-7 w-full rounded-md border border-line bg-canvas px-2 text-[12px] disabled:opacity-50"
            />
            <button
              type="button"
              disabled={!database || !saveName.trim() || !sql.trim()}
              onClick={handleSave}
              className="h-7 w-full rounded-md bg-accent/90 text-[12px] font-medium text-canvas disabled:opacity-50"
            >
              {selectedSaved ? "Update saved" : "Save query"}
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-auto p-1.5">
            {saved.length === 0 ? (
              <li className="px-2 py-2 text-[11px] text-faint">No saved queries yet.</li>
            ) : (
              saved.map((item) => (
                <li key={item.id}>
                  <div
                    className={`rounded-md border px-2 py-1.5 ${
                      selectedSavedId === item.id
                        ? "border-accent/40 bg-accent-soft/50"
                        : "border-transparent hover:bg-raised/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadSaved(item)}
                      className="w-full truncate text-left text-[12px] font-medium text-ink"
                      title={item.name}
                    >
                      {item.name}
                    </button>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          loadSaved(item);
                          onRun();
                        }}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-[10px] text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </aside>
        <div className="grid min-h-0 grid-rows-[minmax(140px,38%)_minmax(0,1fr)]">
          <div className="min-h-0 border-b border-line">
            <textarea
              ref={sqlRef}
              value={sql}
              onChange={(event) => onSqlChange(event.target.value)}
              spellCheck={false}
              className="h-full w-full resize-none bg-[#0d0f12] p-3 font-mono text-[12px] leading-relaxed text-ink outline-none"
              placeholder="SELECT …"
            />
          </div>
          <div className="min-h-0 flex flex-col bg-canvas">
            {queryError ? (
              <div className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                {queryError}
              </div>
            ) : null}
            {queryResult ? (
              <MysqlResultGrid result={queryResult} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-[13px] text-faint">
                Run a query to see results here.
              </div>
            )}
          </div>
        </div>
      </div>
      <MysqlQueryStats
        database={database}
        sqlPreview={lastExecutedSql}
        result={queryResult}
        error={queryError}
        busy={queryBusy}
      />
    </div>
  );
}
