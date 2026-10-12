import type { TaskBoardSummary } from "../../types/boards";
import type { FolderNoteSummary } from "../../types/notes";
import type { ConnectionGroup, ConnectionSummary } from "../../types/connections";
import { normalizeConnectionGroup } from "./normalizeGroup";

function parentIdOf(group: ConnectionGroup): string | undefined {
  return normalizeConnectionGroup(group).parentId;
}

export type GroupTreeNode = ConnectionGroup & {
  children: GroupTreeNode[];
  connections: ConnectionSummary[];
  boards: TaskBoardSummary[];
  notes: FolderNoteSummary[];
};

export function buildConnectionTree(
  groups: ConnectionGroup[],
  connections: ConnectionSummary[],
  boards: TaskBoardSummary[] = [],
  notes: FolderNoteSummary[] = [],
): { roots: GroupTreeNode[]; ungrouped: ConnectionSummary[] } {
  const nodes = new Map<string, GroupTreeNode>();
  for (const group of groups) {
    const normalized = normalizeConnectionGroup(group);
    nodes.set(normalized.id, {
      ...normalized,
      children: [],
      connections: [],
      boards: [],
      notes: [],
    });
  }
  for (const board of boards) {
    const node = nodes.get(board.groupId);
    if (node) {
      node.boards.push(board);
    }
  }
  for (const note of notes) {
    const node = nodes.get(note.groupId);
    if (node) {
      node.notes.push(note);
    }
  }
  for (const connection of connections) {
    if (!connection.groupId) {
      continue;
    }
    const node = nodes.get(connection.groupId);
    if (node) {
      node.connections.push(connection);
    }
  }
  const roots: GroupTreeNode[] = [];
  for (const node of nodes.values()) {
    const parentId = parentIdOf(node);
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (list: GroupTreeNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const item of list) {
      item.connections.sort((a, b) => connectionSort(a, b));
      item.boards.sort((a, b) => a.name.localeCompare(b.name));
      item.notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
      sortNodes(item.children);
    }
  };
  sortNodes(roots);
  const ungrouped = connections
    .filter((connection) => !connection.groupId || !nodes.has(connection.groupId))
    .sort(connectionSort);
  return { roots, ungrouped };
}

function connectionSort(a: ConnectionSummary, b: ConnectionSummary): number {
  if (a.favorite !== b.favorite) {
    return a.favorite ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

export type VisibleTreeRow =
  | { kind: "group"; node: GroupTreeNode; depth: number }
  | { kind: "connection"; connection: ConnectionSummary; depth: number }
  | { kind: "board"; board: TaskBoardSummary; depth: number }
  | { kind: "note"; note: FolderNoteSummary; depth: number };

export function collectVisibleTreeRows(
  roots: GroupTreeNode[],
  collapsed: Set<string>,
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = [];
  const walk = (nodes: GroupTreeNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({ kind: "group", node, depth });
      if (collapsed.has(node.id)) {
        continue;
      }
      walk(node.children, depth + 1);
      for (const connection of node.connections) {
        rows.push({ kind: "connection", connection, depth: depth + 1 });
      }
      for (const board of node.boards) {
        rows.push({ kind: "board", board, depth: depth + 1 });
      }
      for (const note of node.notes) {
        rows.push({ kind: "note", note, depth: depth + 1 });
      }
    }
  };
  walk(roots, 0);
  return rows;
}

export function groupPathLabel(
  groupId: string | undefined,
  groups: ConnectionGroup[],
): string | null {
  if (!groupId) {
    return null;
  }
  const byId = new Map(groups.map((group) => [group.id, group]));
  const parts: string[] = [];
  let current = byId.get(groupId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}
