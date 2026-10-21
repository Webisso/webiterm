import { describe, expect, test } from "vitest";
import {
  applyCdCommand,
  parseRemoteEditorPath,
} from "../src/features/terminal/remoteEditorCommand";

describe("remoteEditorCommand", () => {
  test("parseRemoteEditorPath only intercepts nanoo", () => {
    expect(parseRemoteEditorPath("nanoo .env")).toBe(".env");
    expect(parseRemoteEditorPath("nanoo config/app.php")).toBe("config/app.php");
    expect(parseRemoteEditorPath("nano .env")).toBeNull();
    expect(parseRemoteEditorPath("vim .env")).toBeNull();
    expect(parseRemoteEditorPath("ls -la")).toBeNull();
  });

  test("applyCdCommand tracks relative and absolute cd", () => {
    expect(applyCdCommand(null, "cd /var/www")).toBe("/var/www");
    expect(applyCdCommand("/var/www", "cd html")).toBe("/var/www/html");
    expect(applyCdCommand("/var/www", "pwd")).toBe("/var/www");
  });
});
