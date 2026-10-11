import type { MysqlQueryResult } from "../../../types/connections";

export function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

export function selectTablePreview(table: string, limit = 500): string {
  return `SELECT * FROM ${quoteIdent(table)} LIMIT ${limit};`;
}

export function parseDatabaseNames(result: MysqlQueryResult): string[] {
  const columnIndex = result.columns.findIndex(
    (column) => column.toLowerCase() === "database",
  );
  const index = columnIndex >= 0 ? columnIndex : 0;
  const names = result.rows
    .map((row) => row[index]?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function parseTableNames(result: MysqlQueryResult): string[] {
  const columnIndex = result.columns.findIndex((column) =>
    column.toLowerCase().startsWith("tables_in"),
  );
  const index =
    columnIndex >= 0
      ? columnIndex
      : result.columns.findIndex((column) => column.toLowerCase() === "name");
  const pick = index >= 0 ? index : 0;
  const names = result.rows
    .map((row) => row[pick]?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function extractRunnableQuery(text: string, selectionStart: number, selectionEnd: number): string {
  const selected = text.slice(selectionStart, selectionEnd).trim();
  if (selected) {
    return selected;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  const statements = trimmed
    .split(/;\s*\n|;\s*$/m)
    .map((part) => part.trim())
    .filter(Boolean);
  if (statements.length === 0) {
    return trimmed.endsWith(";") ? trimmed.slice(0, -1).trim() : trimmed;
  }
  return statements.at(-1) ?? trimmed;
}
