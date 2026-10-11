import { useCallback, useEffect, useState } from "react";
import {
  getAppStatus,
  getLocalPreferences,
  isDesktopRuntime,
  normalizeIpcError,
  setInspectorCollapsed,
} from "../lib/ipc";
import type { AppStatus, LocalPreferences } from "../types/desktop";

export type StatusState =
  | { kind: "loading" }
  | { kind: "desktop-unavailable" }
  | { kind: "error"; message: string }
  | { kind: "ready"; status: AppStatus; preferences: LocalPreferences };

export function useAppStatus() {
  const [state, setState] = useState<StatusState>({ kind: "loading" });

  const reload = useCallback(async () => {
    if (!isDesktopRuntime()) {
      setState({ kind: "desktop-unavailable" });
      return;
    }
    setState((current) => (current.kind === "ready" ? current : { kind: "loading" }));
    try {
      const [status, preferences] = await Promise.all([getAppStatus(), getLocalPreferences()]);
      setState({ kind: "ready", status, preferences });
    } catch (error) {
      setState({ kind: "error", message: normalizeIpcError(error) });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persistInspector = useCallback(async (collapsed: boolean) => {
    if (!isDesktopRuntime()) {
      return;
    }
    await setInspectorCollapsed(collapsed);
  }, []);

  return { state, reload, persistInspector };
}
