import type { Terminal } from "@xterm/xterm";

async function writeClipboard(text: string): Promise<void> {
  if (!text) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

async function readClipboard(): Promise<string> {
  if (navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }
  return "";
}

/**
 * macOS/Tauri: ensure ⌘C / Ctrl+C copies the xterm selection instead of sending ^C,
 * and ⌘V / Ctrl+V pastes into the session.
 */
export function attachTerminalClipboard(
  term: Terminal,
  paste: (text: string) => void,
): void {
  term.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") {
      return true;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.altKey) {
      return true;
    }
    const key = event.key.toLowerCase();
    if (key === "c" && term.hasSelection()) {
      event.preventDefault();
      void writeClipboard(term.getSelection());
      return false;
    }
    if (key === "v") {
      event.preventDefault();
      void readClipboard().then((text) => {
        if (text) {
          paste(text);
        }
      });
      return false;
    }
    if (key === "insert" && event.shiftKey) {
      event.preventDefault();
      void readClipboard().then((text) => {
        if (text) {
          paste(text);
        }
      });
      return false;
    }
    return true;
  });
}
