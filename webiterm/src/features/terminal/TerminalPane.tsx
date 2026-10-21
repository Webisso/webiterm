import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { normalizeIpcError } from "../../lib/ipc";
import {
  localShellClose,
  localShellOpen,
  localShellResize,
  localShellWrite,
  sshClose,
  sshOpen,
  sshResize,
  sshWrite,
} from "../../lib/connections";
import { attachTerminalClipboard } from "./terminalClipboard";
import { applyTerminalInput } from "./terminalInput";
import {
  readTerminalDimensions,
  scheduleTerminalGeometrySync,
} from "./terminalGeometry";
import {
  cancelDeferredTerminalClose,
  deferTerminalClose,
} from "./terminalSessionClose";
import { webitermTerminalOptions } from "./terminalTheme";
import "./terminalChrome.css";

export type TerminalPaneHandle = {
  injectCommand: (command: string) => void;
  focus: () => void;
};

type TerminalPaneProps = {
  mode: "ssh" | "local";
  connectionId?: string;
  terminalSessionId: string;
  onFailed?: (message: string) => void;
  onLastCommand?: (command: string) => void;
  /** Return true to swallow Enter (e.g. open in-app editor instead of running nano). */
  onBeforeSubmitCommand?: (command: string) => boolean;
};

export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(
  function TerminalPane(
    { mode, connectionId, terminalSessionId, onFailed, onLastCommand, onBeforeSubmitCommand },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onFailedRef = useRef(onFailed);
    const onLastCommandRef = useRef(onLastCommand);
    const onBeforeSubmitCommandRef = useRef(onBeforeSubmitCommand);
    const termRef = useRef<Terminal | null>(null);
    const inputEnabledRef = useRef(false);

    onFailedRef.current = onFailed;
    onLastCommandRef.current = onLastCommand;
    onBeforeSubmitCommandRef.current = onBeforeSubmitCommand;

    useImperativeHandle(ref, () => ({
      injectCommand(command: string) {
        const term = termRef.current;
        if (!term || !inputEnabledRef.current || !command) {
          return;
        }
        const write =
          mode === "local"
            ? (data: string) => localShellWrite(terminalSessionId, data)
            : (data: string) => sshWrite(terminalSessionId, data);
        void write(command).catch((error) => {
          term.writeln(`\r\n\x1b[31m${normalizeIpcError(error)}\x1b[0m`);
        });
        term.focus();
      },
      focus() {
        termRef.current?.focus();
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      cancelDeferredTerminalClose(terminalSessionId);

      let cancelled = false;
      let unlisten: (() => void) | null = null;
      let inputEnabled = false;
      let backendReady = false;
      let lineBuffer = "";

      const term = new Terminal(webitermTerminalOptions);
      termRef.current = term;
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container);
      fit.fit();
      term.writeln(mode === "local" ? "Starting local shell…" : "Connecting…");

      let clearedBanner = false;
      const eventName = `terminal-output-${terminalSessionId}`;
      const webview = getCurrentWebviewWindow();

      const focusTerminal = () => {
        term.focus();
      };
      container.addEventListener("mousedown", focusTerminal);

      const writeToBackend = (payload: string) =>
        mode === "local"
          ? localShellWrite(terminalSessionId, payload)
          : sshWrite(terminalSessionId, payload);

      const resizeTerminal =
        mode === "local"
          ? (cols: number, rows: number) => localShellResize(terminalSessionId, cols, rows)
          : (cols: number, rows: number) => sshResize(terminalSessionId, cols, rows);

      const pushGeometry = () => {
        if (!backendReady || cancelled) {
          return;
        }
        const dims = readTerminalDimensions(fit, term, container);
        if (!dims) {
          return;
        }
        void resizeTerminal(dims.cols, dims.rows);
      };

      attachTerminalClipboard(term, (text) => {
        if (!inputEnabled || cancelled) {
          return;
        }
        void writeToBackend(text).catch((error) => {
          term.writeln(`\r\n\x1b[31m${normalizeIpcError(error)}\x1b[0m`);
        });
      });

      const dataDisposable = term.onData((data) => {
        if (!inputEnabled || cancelled) {
          return;
        }
        const next = applyTerminalInput(lineBuffer, data);
        lineBuffer = next.line;
        let swallowSubmit = false;
        if (next.submitted) {
          onLastCommandRef.current?.(next.submitted);
          if (onBeforeSubmitCommandRef.current?.(next.submitted)) {
            term.write("\r\x1b[2K");
            void writeToBackend("\x15").catch(() => undefined);
            swallowSubmit = true;
          }
        }
        if (swallowSubmit) {
          return;
        }
        void writeToBackend(data).catch((error) => {
          term.writeln(`\r\n\x1b[31m${normalizeIpcError(error)}\x1b[0m`);
        });
      });

      const closeTerminal =
        mode === "local"
          ? () => localShellClose(terminalSessionId)
          : () => sshClose(terminalSessionId);

      const resizeObserver = new ResizeObserver(() => {
        pushGeometry();
      });
      resizeObserver.observe(container);

      const onWindowResize = () => pushGeometry();
      window.addEventListener("resize", onWindowResize);

      void (async () => {
        unlisten = await webview.listen<string>(eventName, (event) => {
          if (cancelled) {
            return;
          }
          if (!clearedBanner) {
            term.clear();
            clearedBanner = true;
          }
          term.write(event.payload);
        });

        if (cancelled) {
          unlisten();
          unlisten = null;
          return;
        }

        try {
          const initial = readTerminalDimensions(fit, term, container);
          if (mode === "local") {
            await localShellOpen(
              terminalSessionId,
              initial?.cols,
              initial?.rows,
            );
          } else {
            if (!connectionId) {
              throw new Error("Missing connection for SSH terminal.");
            }
            await sshOpen(
              connectionId,
              terminalSessionId,
              initial?.cols,
              initial?.rows,
            );
          }
          if (cancelled) {
            return;
          }
          backendReady = true;
          inputEnabled = true;
          inputEnabledRef.current = true;
          scheduleTerminalGeometrySync(fit, term, (cols, rows) => {
            void resizeTerminal(cols, rows);
          }, container);
          focusTerminal();
        } catch (error) {
          if (cancelled) {
            return;
          }
          const message = normalizeIpcError(error);
          term.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
          onFailedRef.current?.(message);
        }
      })();

      return () => {
        cancelled = true;
        inputEnabled = false;
        inputEnabledRef.current = false;
        termRef.current = null;
        window.removeEventListener("resize", onWindowResize);
        container.removeEventListener("mousedown", focusTerminal);
        resizeObserver.disconnect();
        dataDisposable.dispose();
        unlisten?.();
        const sessionId = terminalSessionId;
        deferTerminalClose(sessionId, () => {
          void closeTerminal();
        });
        term.dispose();
      };
    }, [connectionId, mode, terminalSessionId]);

    return (
      <div
        ref={containerRef}
        className="terminal-pane h-full w-full min-h-0 outline-none"
        tabIndex={-1}
        role="application"
        aria-label={mode === "local" ? "Local terminal" : "SSH terminal"}
      />
    );
  },
);
