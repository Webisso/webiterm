import { describe, expect, test } from "vitest";
import { filterCommands, moveSelection } from "../src/lib/commands";
import type { CommandItem } from "../src/types/desktop";

const commands: CommandItem[] = [
  { id: "inspector", title: "Hide inspector", keywords: ["panel"] },
  { id: "status", title: "Reload application status", keywords: ["storage"] },
  { id: "search", title: "Focus connection search", keywords: ["find"] },
];

describe("command palette filtering", () => {
  test("returns every command for an empty query", () => {
    expect(filterCommands(commands, "  ")).toEqual(commands);
  });

  test("matches title and keywords", () => {
    expect(filterCommands(commands, "storage").map((command) => command.id)).toEqual(["status"]);
    expect(filterCommands(commands, "panel").map((command) => command.id)).toEqual(["inspector"]);
  });

  test("wraps selection inside the visible list", () => {
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, 1, 0)).toBe(0);
  });
});
