import { describe, expect, test } from "vitest";
import { buildRowWhereClause } from "../src/features/databases/mysql/mysqlRowSql";
import { extractRunnableQuery, quoteIdent } from "../src/features/databases/mysql/mysqlSql";

describe("mysqlSql", () => {
  test("quoteIdent escapes backticks", () => {
    expect(quoteIdent("a`b")).toBe("`a``b`");
  });

  test("extractRunnableQuery prefers selection", () => {
    const sql = "SELECT 1;\nSELECT 2;";
    expect(extractRunnableQuery(sql, 10, 18)).toBe("SELECT 2");
  });

  test("buildRowWhereClause uses primary keys", () => {
    const where = buildRowWhereClause(["id", "name"], ["1", "x"], ["id"]);
    expect(where).toBe("`id` = '1'");
  });
});
