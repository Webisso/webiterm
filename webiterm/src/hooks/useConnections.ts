import { useCallback, useEffect, useState } from "react";
import {
  assignConnectionGroup,
  createConnection,
  createConnectionGroup,
  deleteConnection,
  deleteConnectionGroup,
  listConnectionGroups,
  listConnections,
  testConnection,
  updateConnection,
  updateConnectionGroup,
} from "../lib/connections";
import { isDesktopRuntime, normalizeIpcError } from "../lib/ipc";
import { normalizeConnectionGroup } from "../features/connections/normalizeGroup";
import type {
  ConnectionGroup,
  ConnectionInput,
  ConnectionSummary,
} from "../types/connections";

export function useConnections(enabled: boolean, query: string) {
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [groups, setGroups] = useState<ConnectionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !isDesktopRuntime()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [items, groupItems] = await Promise.all([
        listConnections(query),
        listConnectionGroups(),
      ]);
      setConnections(items);
      setGroups(groupItems.map(normalizeConnectionGroup));
    } catch (err) {
      setError(normalizeIpcError(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConnection = useCallback(
    async (input: ConnectionInput, editId?: string | null) => {
      const saved = editId
        ? await updateConnection(editId, input)
        : await createConnection(input);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const removeConnection = useCallback(
    async (id: string) => {
      await deleteConnection(id);
      await refresh();
    },
    [refresh],
  );

  const runTest = useCallback(async (id: string) => {
    const result = await testConnection(id);
    return result;
  }, []);

  const saveGroup = useCallback(
    async (
      input: { name: string; color: string; iconId: string; parentId?: string },
      editId?: string | null,
    ) => {
      if (editId) {
        await updateConnectionGroup(editId, {
          name: input.name,
          color: input.color,
          iconId: input.iconId,
          parentId: input.parentId ?? null,
        });
      } else {
        const parentId = input.parentId?.trim() || null;
        await createConnectionGroup({
          name: input.name,
          color: input.color,
          iconId: input.iconId,
          parentId,
        });
      }
      await refresh();
    },
    [refresh],
  );

  const removeGroup = useCallback(
    async (id: string) => {
      await deleteConnectionGroup(id);
      await refresh();
    },
    [refresh],
  );

  const moveConnectionToGroup = useCallback(
    async (connectionId: string, groupId: string | null) => {
      await assignConnectionGroup(connectionId, groupId);
      await refresh();
    },
    [refresh],
  );

  return {
    connections,
    groups,
    loading,
    error,
    refresh,
    saveConnection,
    removeConnection,
    runTest,
    saveGroup,
    removeGroup,
    moveConnectionToGroup,
  };
}
