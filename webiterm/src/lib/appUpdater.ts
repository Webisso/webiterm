import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { isDesktopRuntime } from "./ipc";

const UPDATE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const STORAGE_KEY = "webiterm.lastUpdateCheckAt";

export type UpdateCheckResult =
  | { status: "skipped" }
  | { status: "current" }
  | { status: "available"; update: Update }
  | { status: "error"; message: string };

export type UpdateInstallProgress = {
  downloadedBytes: number;
  totalBytes: number | null;
};

export function shouldCheckForUpdatesOnStartup(): boolean {
  if (!isDesktopRuntime()) {
    return false;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return true;
    }
    const last = Number.parseInt(raw, 10);
    if (!Number.isFinite(last)) {
      return true;
    }
    return Date.now() - last >= UPDATE_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function markUpdateCheckCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (!isDesktopRuntime()) {
    return { status: "skipped" };
  }
  try {
    const update = await check();
    if (update) {
      return { status: "available", update };
    }
    return { status: "current" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "error", message };
  }
}

export async function installAppUpdate(
  update: Update,
  onProgress?: (progress: UpdateInstallProgress) => void,
): Promise<void> {
  let downloaded = 0;
  let totalBytes: number | null = null;

  await update.downloadAndInstall((event) => {
    if (!onProgress) {
      return;
    }
    switch (event.event) {
      case "Started":
        downloaded = 0;
        totalBytes = event.data.contentLength ?? null;
        onProgress({ downloadedBytes: 0, totalBytes });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress({ downloadedBytes: downloaded, totalBytes });
        break;
      case "Finished":
        break;
      default:
        break;
    }
  });
  await relaunch();
}
