import { beforeEach, describe, expect, test } from "vitest";
import {
  deleteSavedMysqlQuery,
  listSavedMysqlQueries,
  upsertSavedMysqlQuery,
} from "../src/features/databases/mysql/mysqlSavedQueries";

describe("mysqlSavedQueries", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("stores queries per connection and database", () => {
    upsertSavedMysqlQuery("conn-1", "shop", { name: "All users", sql: "SELECT * FROM users;" });
    const listed = listSavedMysqlQueries("conn-1", "shop");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("All users");
    expect(listSavedMysqlQueries("conn-1", "other")).toHaveLength(0);
  });

  test("deletes saved query", () => {
    const saved = upsertSavedMysqlQuery("c", "db", { name: "Q", sql: "SELECT 1" });
    deleteSavedMysqlQuery("c", "db", saved.id);
    expect(listSavedMysqlQueries("c", "db")).toHaveLength(0);
  });
});
