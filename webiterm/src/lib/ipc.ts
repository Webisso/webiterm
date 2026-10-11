import { invoke } from "@tauri-apps/api/core";
import type { AppStatus, CommandError, LocalPreferences } from "../types/desktop";

export function isDesktopRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getAppStatus(): Promise<AppStatus> {
  return parseAppStatus(await invoke("get_app_status"));
}

export async function getLocalPreferences(): Promise<LocalPreferences> {
  return parseLocalPreferences(await invoke("get_local_preferences"));
}

export async function setInspectorCollapsed(collapsed: boolean): Promise<LocalPreferences> {
  return parseLocalPreferences(await invoke("set_inspector_collapsed", { collapsed }));
}

export function parseAppStatus(value: unknown): AppStatus {
  const record = expectRecord(value, "status");
  return {
    appVersion: expectString(record, "appVersion"),
    schemaVersion: expectNumber(record, "schemaVersion"),
    databaseReady: expectBoolean(record, "databaseReady"),
    storagePath: expectString(record, "storagePath"),
  };
}

export function parseLocalPreferences(value: unknown): LocalPreferences {
  const record = expectRecord(value, "preferences");
  return {
    inspectorCollapsed: expectBoolean(record, "inspectorCollapsed"),
  };
}

export function normalizeIpcError(error: unknown): string {
  const commandError = readCommandError(error);
  if (commandError) {
    return commandError.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return truncate(error.trim());
  }
  return "The desktop runtime returned an unexpected error.";
}

function readCommandError(error: unknown): CommandError | null {
  if (isCommandError(error)) {
    return error;
  }
  if (typeof error === "string") {
    try {
      const parsed: unknown = JSON.parse(error);
      if (isCommandError(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isCommandError(value: unknown): value is CommandError {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.code === "string" && typeof value.message === "string";
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Unexpected ${label} payload.`);
  }
  return value;
}

function expectString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Unexpected ${key} payload.`);
  }
  return value;
}

function expectBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`Unexpected ${key} payload.`);
  }
  return value;
}

function expectNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Unexpected ${key} payload.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncate(value: string): string {
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}
