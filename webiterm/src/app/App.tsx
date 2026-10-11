import { useEffect, useState } from "react";
import { useAppStatus } from "../hooks/useAppStatus";
import { normalizeIpcError } from "../lib/ipc";
import { AppBootstrap } from "./AppBootstrap";

export function App() {
  const { state, reload, persistInspector } = useAppStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) {
      return;
    }
    if (state.kind === "ready") {
      setCollapsed(state.preferences.inspectorCollapsed);
      setHydrated(true);
    } else if (state.kind === "desktop-unavailable" || state.kind === "error") {
      setHydrated(true);
    }
  }, [hydrated, state]);

  async function toggleInspector() {
    const next = !collapsed;
    setCollapsed(next);
    setSaveError(null);
    try {
      await persistInspector(next);
    } catch (error) {
      setCollapsed(!next);
      setSaveError(normalizeIpcError(error));
    }
  }

  return (
    <AppBootstrap
      state={state}
      collapsed={collapsed}
      saveError={saveError}
      onToggleInspector={() => {
        void toggleInspector();
      }}
      onRetry={() => {
        void reload();
      }}
      onReload={() => {
        void reload();
      }}
      onDismissSaveError={() => setSaveError(null)}
    />
  );
}
