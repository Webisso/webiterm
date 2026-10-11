import { describe, expect, test } from "vitest";
import { normalizeIpcError, parseAppStatus } from "../src/lib/ipc";

describe("desktop status parsing", () => {
  test("accepts the camelCase status contract", () => {
    expect(
      parseAppStatus({
        appVersion: "0.1.0",
        schemaVersion: 1,
        databaseReady: true,
        storagePath: "/tmp/webiterm.json",
      }),
    ).toEqual({
      appVersion: "0.1.0",
      schemaVersion: 1,
      databaseReady: true,
      storagePath: "/tmp/webiterm.json",
    });
  });

  test("rejects a payload that is missing storage state", () => {
    expect(() =>
      parseAppStatus({
        appVersion: "0.1.0",
        schemaVersion: 1,
        storagePath: "/tmp/webiterm.json",
      }),
    ).toThrow(/databaseReady/);
  });

  test("reads a structured command error", () => {
    expect(normalizeIpcError({ code: "local_storage", message: "Local storage is unavailable." })).toBe(
      "Local storage is unavailable.",
    );
  });
});
