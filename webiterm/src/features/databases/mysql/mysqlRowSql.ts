import { quoteIdent } from "./mysqlSql";
import type { MysqlQueryResult } from "../../../types/connections";

export function parsePrimaryKeyColumns(result: MysqlQueryResult): string[] {
  const columnIndex = result.columns.findIndex(
    (column) => column.toLowerCase() === "column_name",
  );
  const pick = columnIndex >= 0 ? columnIndex : 0;
  const names = result.rows
    .map((row) => row[pick]?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

export function sqlLiteral(displayValue: string): string {
  if (displayValue === "NULL") {
    return "NULL";
  }
  return `'${displayValue.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

export function buildRowWhereClause(
  columns: string[],
  row: string[],
  primaryKeys: string[],
): string {
  const keys = primaryKeys.length > 0 ? primaryKeys : columns;
  const parts = keys.map((key) => {
    const index = columns.indexOf(key);
    const value = index >= 0 ? row[index] ?? "NULL" : "NULL";
    return `${quoteIdent(key)} = ${sqlLiteral(value)}`;
  });
  return parts.join(" AND ");
}

export function buildUpdateSql(
  table: string,
  columns: string[],
  row: string[],
  primaryKeys: string[],
  columnName: string,
  newDisplayValue: string,
): string {
  const where = buildRowWhereClause(columns, row, primaryKeys);
  const setValue = sqlLiteral(newDisplayValue);
  return `UPDATE ${quoteIdent(table)} SET ${quoteIdent(columnName)} = ${setValue} WHERE ${where} LIMIT 1;`;
}

/** Builds UPDATE for all changed columns; returns null if nothing changed. */
export function buildRowUpdateSql(
  table: string,
  columns: string[],
  originalRow: string[],
  newRow: string[],
  primaryKeys: string[],
): string | null {
  const assignments: string[] = [];
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column) {
      continue;
    }
    const before = originalRow[index] ?? "";
    const after = newRow[index] ?? "";
    if (before !== after) {
      assignments.push(`${quoteIdent(column)} = ${sqlLiteral(after)}`);
    }
  }
  if (assignments.length === 0) {
    return null;
  }
  const where = buildRowWhereClause(columns, originalRow, primaryKeys);
  return `UPDATE ${quoteIdent(table)} SET ${assignments.join(", ")} WHERE ${where} LIMIT 1;`;
}

export function buildDeleteSql(
  table: string,
  columns: string[],
  row: string[],
  primaryKeys: string[],
): string {
  const where = buildRowWhereClause(columns, row, primaryKeys);
  return `DELETE FROM ${quoteIdent(table)} WHERE ${where} LIMIT 1;`;
}
