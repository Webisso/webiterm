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

/**
 * macOS/Tauri: ensure ⌘C / Ctrl+C copies the xterm selection instead of sending ^C.
 *
 * Paste is intentionally NOT handled here: navigator.clipboard.readText() makes WKWebView
 * show a "Paste" confirmation bubble for content copied from other apps. Letting ⌘V reach
 * the native paste event (handled by xterm) pastes immediately.
 */
export function attachTerminalClipboard(term: Terminal): void {
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
    return true;
  });
}
