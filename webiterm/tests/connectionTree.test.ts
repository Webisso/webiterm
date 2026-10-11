import { describe, expect, test } from "vitest";
import {
  buildConnectionTree,
  collectVisibleTreeRows,
} from "../src/features/connections/connectionTree";
import type { ConnectionGroup } from "../src/types/connections";

function group(
  id: string,
  name: string,
  parentId?: string,
): ConnectionGroup {
  return {
    id,
    name,
    color: "#6366f1",
    iconId: "folder",
    parentId,
    sortOrder: 0,
  };
}

describe("buildConnectionTree", () => {
  test("nests folders when parentId is set", () => {
    const groups = [group("a", "Root"), group("b", "Child", "a")];
    const { roots } = buildConnectionTree(groups, []);
    expect(roots).toHaveLength(1);
    const root = roots[0];
    expect(root?.id).toBe("a");
    expect(root?.children).toHaveLength(1);
    expect(root?.children[0]?.id).toBe("b");
  });

  test("visible rows indent nested folders", () => {
    const groups = [group("a", "Root"), group("b", "Child", "a")];
    const { roots } = buildConnectionTree(groups, []);
    const rows = collectVisibleTreeRows(roots, new Set());
    const depths = rows.map((row) => (row.kind === "group" ? row.depth : -1));
    expect(depths).toEqual([0, 1]);
  });

  test("lists boards under their folder", () => {
    const groups = [group("a", "Root")];
    const { roots } = buildConnectionTree(groups, [], [
      { id: "board-1", groupId: "a", name: "Sprint" },
    ]);
    const rows = collectVisibleTreeRows(roots, new Set());
    expect(rows.map((row) => row.kind)).toEqual(["group", "board"]);
    const board = rows[1];
    expect(board?.kind).toBe("board");
    if (board?.kind === "board") {
      expect(board.board.name).toBe("Sprint");
      expect(board.depth).toBe(1);
    }
  });
});
