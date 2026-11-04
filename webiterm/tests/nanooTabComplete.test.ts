import { describe, expect, it } from "vitest";
import { extractNanooFromScreenLine } from "../src/features/terminal/terminalInput";
import { parseRemoteEditorPath } from "../src/features/terminal/remoteEditorCommand";

describe("nanoo with shell completion", () => {
  it("reads the completed path from the screen line", () => {
    const line = "root@cloud:/var/www# nanoo /var/www/.env";
    expect(extractNanooFromScreenLine(line)).toBe("nanoo /var/www/.env");
  });
  it("works with a bare prompt and history recall", () => {
    expect(extractNanooFromScreenLine("$ nanoo .env")).toBe("nanoo .env");
  });
  it("ignores other commands mentioning nanoo", () => {
    expect(extractNanooFromScreenLine("root@cloud:~# echo nanoo x")).toBeNull();
  });
  it("parses escaped spaces and quotes", () => {
    expect(parseRemoteEditorPath("nanoo /a/My\\ File.txt")).toBe("/a/My File.txt");
    expect(parseRemoteEditorPath("nanoo '/a/b c'")).toBe("/a/b c");
    expect(parseRemoteEditorPath("nanoo -x ~/.env")).toBe("~/.env");
  });
});
