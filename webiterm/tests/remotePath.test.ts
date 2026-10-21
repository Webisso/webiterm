import { describe, expect, test } from "vitest";
import {
  chooseRemoteWorkingDirectory,
  isPlausibleRemoteDirectory,
} from "../src/features/terminal/remotePath";

describe("remotePath", () => {
  test("rejects corrupted pwd with spaces", () => {
    expect(isPlausibleRemoteDirectory("/va w re r")).toBe(false);
    expect(isPlausibleRemoteDirectory("/var/www/html")).toBe(true);
  });

  test("prefers project cd over login home pwd", () => {
    expect(
      chooseRemoteWorkingDirectory(
        "/var/www/repiysms/RepiySMS-Web",
        "/home/ubuntu",
      ),
    ).toBe("/var/www/repiysms/RepiySMS-Web");
  });
});
