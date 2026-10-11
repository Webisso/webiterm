import type { ConnectionGroup } from "../../types/connections";

/** Normalize group rows from IPC (camelCase) and guard against snake_case leaks. */
export function normalizeConnectionGroup(raw: ConnectionGroup): ConnectionGroup {
  const parentFromSnake = (raw as ConnectionGroup & { parent_id?: string | null }).parent_id;
  const parentId = raw.parentId ?? parentFromSnake ?? undefined;
  return {
    ...raw,
    parentId: parentId || undefined,
  };
}
