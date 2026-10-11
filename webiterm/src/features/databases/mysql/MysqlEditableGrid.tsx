import { useCallback, useState } from "react";
import type { MysqlQueryResult } from "../../../types/connections";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { mysqlQuery } from "../../../lib/connections";
import { MysqlResultGrid } from "./MysqlResultGrid";
import { MysqlRowContextMenu } from "./MysqlRowContextMenu";
import { buildDeleteSql, buildUpdateSql } from "./mysqlRowSql";

type MysqlEditableGridProps = {
  connectionId: string;
  database: string;
  table: string;
  result: MysqlQueryResult;
  primaryKeys: string[];
  selectedRowIndex: number | null;
  onSelectRow: (rowIndex: number | null) => void;
  onResultUpdated: (result: MysqlQueryResult) => void;
  onOpenRecord: (rowIndex: number) => void;
  onError: (message: string) => void;
};

type PendingCellSave = {
  rowIndex: number;
  columnIndex: number;
  columnName: string;
  oldValue: string;
  newValue: string;
  rowSnapshot: string[];
};

type RowMenu = { rowIndex: number; x: number; y: number };

export function MysqlEditableGrid({
  connectionId,
  database,
  table,
  result,
  primaryKeys,
  selectedRowIndex,
  onSelectRow,
  onResultUpdated,
  onOpenRecord,
  onError,
}: MysqlEditableGridProps) {
  const [rowMenu, setRowMenu] = useState<RowMenu | null>(null);
  const [editing, setEditing] = useState<{ rowIndex: number; columnIndex: number } | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState("");
  const [pendingSave, setPendingSave] = useState<PendingCellSave | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCommitEdit = useCallback(() => {
    if (!editing) {
      return;
    }
    const row = result.rows[editing.rowIndex];
    if (!row) {
      setEditing(null);
      return;
    }
    const columnName = result.columns[editing.columnIndex];
    if (!columnName) {
      setEditing(null);
      return;
    }
    const oldValue = row[editing.columnIndex] ?? "";
    const newValue = editDraft;
    if (newValue === oldValue) {
      setEditing(null);
      return;
    }
    setPendingSave({
      rowIndex: editing.rowIndex,
      columnIndex: editing.columnIndex,
      columnName,
      oldValue,
      newValue,
      rowSnapshot: [...row],
    });
    setEditing(null);
  }, [editDraft, editing, result.columns, result.rows]);

  async function applyCellSave(pending: PendingCellSave) {
    setBusy(true);
    onError("");
    try {
      const sql = buildUpdateSql(
        table,
        result.columns,
        pending.rowSnapshot,
        primaryKeys,
        pending.columnName,
        pending.newValue,
      );
      await mysqlQuery(connectionId, sql, database);
      const nextRows = result.rows.map((row, index) => {
        if (index !== pending.rowIndex) {
          return row;
        }
        return row.map((cell, cellIndex) =>
          cellIndex === pending.columnIndex ? pending.newValue : cell,
        );
      });
      onResultUpdated({ ...result, rows: nextRows });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
      setPendingSave(null);
    }
  }

  async function applyDelete(rowIndex: number) {
    const row = result.rows[rowIndex];
    if (!row) {
      return;
    }
    setBusy(true);
    onError("");
    try {
      const sql = buildDeleteSql(table, result.columns, row, primaryKeys);
      await mysqlQuery(connectionId, sql, database);
      const nextRows = result.rows.filter((_, index) => index !== rowIndex);
      onResultUpdated({ ...result, rows: nextRows, rowCount: nextRows.length });
      onSelectRow(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  return (
    <>
      <MysqlResultGrid
        result={result}
        busy={busy}
        selectedRowIndex={selectedRowIndex}
        editingCell={editing}
        editDraft={editDraft}
        onSelectRow={onSelectRow}
        onRowContextMenu={(rowIndex, event) => {
          event.preventDefault();
          onSelectRow(rowIndex);
          setRowMenu({ rowIndex, x: event.clientX, y: event.clientY });
        }}
        onStartEdit={(rowIndex, columnIndex, value) => {
          setEditing({ rowIndex, columnIndex });
          setEditDraft(value === "NULL" ? "" : value);
        }}
        onEditDraftChange={setEditDraft}
        onCommitEdit={requestCommitEdit}
        onCancelEdit={() => setEditing(null)}
      />
      {rowMenu ? (
        <MysqlRowContextMenu
          x={rowMenu.x}
          y={rowMenu.y}
          onClose={() => setRowMenu(null)}
          onViewFull={() => {
            onOpenRecord(rowMenu.rowIndex);
            setRowMenu(null);
          }}
          onDelete={() => {
            setPendingDelete(rowMenu.rowIndex);
            setRowMenu(null);
          }}
        />
      ) : null}
      {pendingSave ? (
        <ConfirmModal
          title="Save changes?"
          message={`Update column “${pendingSave.columnName}”?`}
          confirmLabel="Save"
          cancelLabel="Cancel"
          onConfirm={() => void applyCellSave(pendingSave)}
          onCancel={() => setPendingSave(null)}
        />
      ) : null}
      {pendingDelete !== null ? (
        <ConfirmModal
          title="Delete row?"
          message="This will permanently delete the row from the database. Continue?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => void applyDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}
