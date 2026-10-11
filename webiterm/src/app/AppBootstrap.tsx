import { listen } from "@tauri-apps/api/event";
import type { Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";
import { AlertModal } from "../components/AlertModal";
import { AboutModal } from "../features/about/AboutModal";
import { PermissionsModal } from "../features/permissions/PermissionsModal";
import { UpdateAvailableModal } from "../features/updates/UpdateAvailableModal";
import { useAlertModal } from "../hooks/useAlertModal";
import type { StatusState } from "../hooks/useAppStatus";
import {
  checkForAppUpdate,
  markUpdateCheckCompleted,
  shouldCheckForUpdatesOnStartup,
} from "../lib/appUpdater";
import { isDesktopRuntime } from "../lib/ipc";
import { AppShell } from "./AppShell";

type AppBootstrapProps = {
  state: StatusState;
  collapsed: boolean;
  saveError: string | null;
  onToggleInspector: () => void;
  onRetry: () => void;
  onReload: () => void;
  onDismissSaveError: () => void;
};

export function AppBootstrap(props: AppBootstrapProps) {
  const { alert, showAlert, dismissAlert } = useAlertModal();
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  const runUpdateCheck = useCallback(
    async (manual: boolean) => {
      if (!isDesktopRuntime()) {
        return;
      }
      const result = await checkForAppUpdate();
      markUpdateCheckCompleted();
      if (result.status === "available") {
        setPendingUpdate(result.update);
        return;
      }
      if (manual && result.status === "current") {
        showAlert("You are on the latest version.", { title: "No updates", tone: "info" });
      }
      if (manual && result.status === "error") {
        showAlert(result.message, { title: "Update check failed", tone: "warning" });
      }
    },
    [showAlert],
  );

  useEffect(() => {
    if (!isDesktopRuntime()) {
      return;
    }
    const unlistenPromise = Promise.all([
      listen("open-permissions-modal", () => {
        setPermissionsOpen(true);
      }),
      listen("open-about-modal", () => {
        setAboutOpen(true);
      }),
      listen("check-for-updates", () => {
        void runUpdateCheck(true);
      }),
    ]);
    return () => {
      void unlistenPromise.then((unlistens) => {
        for (const unlisten of unlistens) {
          unlisten();
        }
      });
    };
  }, [runUpdateCheck]);

  useEffect(() => {
    if (!isDesktopRuntime() || !shouldCheckForUpdatesOnStartup()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void runUpdateCheck(false);
    }, 4_000);
    return () => window.clearTimeout(timer);
  }, [runUpdateCheck]);

  useEffect(() => {
    if (props.saveError) {
      showAlert(props.saveError, { title: "Could not save", tone: "warning" });
      props.onDismissSaveError();
    }
  }, [props.saveError, props.onDismissSaveError, showAlert]);

  return (
    <>
      <AppShell
        {...props}
        showAlert={showAlert}
        onOpenPermissions={() => setPermissionsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />
      {alert ? <AlertModal alert={alert} onClose={dismissAlert} /> : null}
      <PermissionsModal open={permissionsOpen} onClose={() => setPermissionsOpen(false)} />
      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onCheckForUpdates={() => void runUpdateCheck(true)}
      />
      {pendingUpdate ? (
        <UpdateAvailableModal
          update={pendingUpdate}
          currentVersion={
            props.state.kind === "ready" ? props.state.status.appVersion : "0.0.0"
          }
          onClose={() => setPendingUpdate(null)}
        />
      ) : null}
    </>
  );
}
