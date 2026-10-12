/** Defer backend close so React Strict Mode / tab remount does not kill live PTY/SSH. */
const pendingCloses = new Map<string, ReturnType<typeof setTimeout>>();

const CLOSE_DELAY_MS = 200;

export function cancelDeferredTerminalClose(sessionId: string): void {
  const timer = pendingCloses.get(sessionId);
  if (timer !== undefined) {
    clearTimeout(timer);
    pendingCloses.delete(sessionId);
  }
}

export function deferTerminalClose(sessionId: string, close: () => void | Promise<void>): void {
  cancelDeferredTerminalClose(sessionId);
  const timer = setTimeout(() => {
    pendingCloses.delete(sessionId);
    void close();
  }, CLOSE_DELAY_MS);
  pendingCloses.set(sessionId, timer);
}
