import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { AppLogo } from "../../components/AppLogo";
import { getAppStatus, isDesktopRuntime } from "../../lib/ipc";

const PROJECT_WEBSITE = "https://github.com/Webisso/webiterm";

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
  onCheckForUpdates?: () => void;
};

export function AboutModal({ open, onClose, onCheckForUpdates }: AboutModalProps) {
  const [version, setVersion] = useState("0.1.0");

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isDesktopRuntime()) {
      return;
    }
    void getAppStatus()
      .then((status) => setVersion(status.appVersion))
      .catch(() => undefined);
  }, [open]);

  if (!open) {
    return null;
  }

  async function openWebsite() {
    if (!isDesktopRuntime()) {
      window.open(PROJECT_WEBSITE, "_blank", "noopener,noreferrer");
      return;
    }
    await invoke("open_project_website");
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-surface shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-col items-center text-center">
            <AppLogo size={72} className="shadow-panel" />
            <h2 id="about-title" className="mt-4 text-[18px] font-medium text-ink">
              WebiTerm
            </h2>
          </div>
          <p className="mt-2 text-center text-[13px] text-faint">Version {version}</p>
          <p className="mt-5 text-[13px] leading-6 text-muted">
            SSH, SFTP, MySQL, and boards on this Mac. Profiles, passwords, folders, and tasks stay
            in one local JSON file.
          </p>
          <p className="mt-5 text-[13px] leading-6 break-all text-muted">{PROJECT_WEBSITE}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-8 pt-2 pb-8">
          {onCheckForUpdates && isDesktopRuntime() ? (
            <button
              type="button"
              onClick={onCheckForUpdates}
              className="h-8 rounded-md border border-line px-3 text-[13px] text-ink hover:bg-raised"
            >
              Check for updates
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void openWebsite()}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-ink hover:bg-raised"
          >
            Open GitHub
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-canvas"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
