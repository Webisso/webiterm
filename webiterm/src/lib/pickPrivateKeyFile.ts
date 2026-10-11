import { open } from "@tauri-apps/plugin-dialog";
import { isDesktopRuntime } from "./ipc";

export async function pickPrivateKeyFile(): Promise<string | null> {
  if (!isDesktopRuntime()) {
    throw new Error("File picker is only available in the desktop app.");
  }
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Choose SSH private key",
  });
  if (selected === null) {
    return null;
  }
  if (Array.isArray(selected)) {
    return selected[0] ?? null;
  }
  return selected;
}
