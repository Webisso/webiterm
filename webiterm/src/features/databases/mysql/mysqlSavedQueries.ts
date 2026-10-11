export type SavedMysqlQuery = {
  id: string;
  name: string;
  sql: string;
  updatedAt: number;
};

const STORAGE_KEY = "webiterm.mysql.savedQueries.v1";

type Store = Record<string, SavedMysqlQuery[]>;

function scopeKey(connectionId: string, database: string): string {
  return `${connectionId}::${database}`;
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listSavedMysqlQueries(
  connectionId: string,
  database: string,
): SavedMysqlQuery[] {
  const items = readStore()[scopeKey(connectionId, database)] ?? [];
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function upsertSavedMysqlQuery(
  connectionId: string,
  database: string,
  input: { id?: string; name: string; sql: string },
): SavedMysqlQuery {
  const store = readStore();
  const key = scopeKey(connectionId, database);
  const list = store[key] ?? [];
  const trimmedName = input.name.trim();
  const trimmedSql = input.sql.trim();
  const entry: SavedMysqlQuery = {
    id: input.id ?? crypto.randomUUID(),
    name: trimmedName,
    sql: trimmedSql,
    updatedAt: Date.now(),
  };
  const next = list.filter((item) => item.id !== entry.id);
  next.unshift(entry);
  store[key] = next;
  writeStore(store);
  return entry;
}

export function deleteSavedMysqlQuery(
  connectionId: string,
  database: string,
  id: string,
): void {
  const store = readStore();
  const key = scopeKey(connectionId, database);
  const list = store[key] ?? [];
  store[key] = list.filter((item) => item.id !== id);
  writeStore(store);
}
