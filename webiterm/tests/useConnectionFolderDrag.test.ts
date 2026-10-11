import { describe, expect, test } from "vitest";
import {
  FOLDER_AUTO_EXPAND_MS,
  UNGROUPED_DROP_KEY,
} from "../src/features/connections/useConnectionFolderDrag";

describe("useConnectionFolderDrag constants", () => {
  test("ungrouped drop key is stable", () => {
    expect(UNGROUPED_DROP_KEY).toBe("ungrouped");
  });

  test("auto expand delay is 1 second", () => {
    expect(FOLDER_AUTO_EXPAND_MS).toBe(1000);
  });
});
