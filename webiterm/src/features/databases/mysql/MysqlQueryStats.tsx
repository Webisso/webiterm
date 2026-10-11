import type { MysqlQueryResult } from "../../../types/connections";

type MysqlQueryStatsProps = {
  database: string | null;
  sqlPreview: string;
  result: MysqlQueryResult | null;
  error: string | null;
  busy: boolean;
};

export function MysqlQueryStats({
  database,
  sqlPreview,
  result,
  error,
  busy,
}: MysqlQueryStatsProps) {
  const status = busy ? "running" : error ? "error" : result ? "ok" : "idle";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-sidebar px-3 py-1.5 text-[11px]">
      <StatPill
        label="Status"
        value={
          status === "running"
            ? "Running…"
            : status === "error"
              ? "Error"
              : status === "ok"
                ? "OK"
                : "Ready"
        }
        tone={status === "error" ? "danger" : status === "ok" ? "ok" : "default"}
      />
      {database ? <StatPill label="Database" value={database} mono /> : null}
      {result ? (
        <>
          <StatPill label="Time" value={`${result.durationMs} ms`} />
          <StatPill label="Rows" value={String(result.rowCount)} />
          <StatPill label="Columns" value={String(result.columns.length)} />
          {result.rowsAffected != null && result.rowsAffected !== undefined ? (
            <StatPill label="Affected" value={String(result.rowsAffected)} />
          ) : null}
          {result.truncated ? (
            <span className="text-warning">Showing first 500 rows</span>
          ) : null}
        </>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-mono text-faint" title={sqlPreview}>
        {sqlPreview ? sqlPreview.replace(/\s+/g, " ").slice(0, 120) : "No query executed yet"}
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
  mono = false,
  tone = "default",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "ok" | "danger";
}) {
  const valueClass =
    tone === "danger"
      ? "text-danger"
      : tone === "ok"
        ? "text-ok"
        : "text-ink";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-faint">{label}</span>
      <span className={`${valueClass} ${mono ? "font-mono" : ""}`}>{value}</span>
    </span>
  );
}
