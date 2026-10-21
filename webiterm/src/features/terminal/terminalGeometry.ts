import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

export type TerminalDimensions = { cols: number; rows: number };

/** Hidden tabs report a near-zero box. Fitting then reflows the buffer into a few columns. */
export const MIN_TERMINAL_VIEWPORT_PX = 48;

export function isTerminalViewportMeasurable(container: HTMLElement): boolean {
  return (
    container.clientWidth >= MIN_TERMINAL_VIEWPORT_PX &&
    container.clientHeight >= MIN_TERMINAL_VIEWPORT_PX
  );
}

export function readTerminalDimensions(
  fit: FitAddon,
  term: Terminal,
  container?: HTMLElement,
): TerminalDimensions | null {
  if (container && !isTerminalViewportMeasurable(container)) {
    return null;
  }
  fit.fit();
  if (term.cols < 2 || term.rows < 2) {
    return null;
  }
  return { cols: term.cols, rows: term.rows };
}

export async function whenDocumentFontsReady(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    // Ignore; fit will run with fallback metrics.
  }
}

/** Re-fit after layout and font load; remote PTY size often lags the viewport without this. */
export function scheduleTerminalGeometrySync(
  fit: FitAddon,
  term: Terminal,
  apply: (cols: number, rows: number) => void,
  container?: HTMLElement,
): void {
  const run = () => {
    const dims = readTerminalDimensions(fit, term, container);
    if (dims) {
      apply(dims.cols, dims.rows);
    }
  };
  run();
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
  void whenDocumentFontsReady().then(run);
}
