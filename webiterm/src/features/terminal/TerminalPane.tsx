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
import { applyTerminalInput } from "./terminalInput";
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
};

export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(
  function TerminalPane(
    { mode, connectionId, terminalSessionId, onFailed, onLastCommand },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onFailedRef = useRef(onFailed);
    const onLastCommandRef = useRef(onLastCommand);
    const termRef = useRef<Terminal | null>(null);
    const inputEnabledRef = useRef(false);

    onFailedRef.current = onFailed;
    onLastCommandRef.current = onLastCommand;

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

      const dataDisposable = term.onData((data) => {
        if (!inputEnabled || cancelled) {
          return;
        }
        const next = applyTerminalInput(lineBuffer, data);
        lineBuffer = next.line;
        if (next.submitted) {
          onLastCommandRef.current?.(next.submitted);
        }
        const writeData =
          mode === "local"
            ? (payload: string) => localShellWrite(terminalSessionId, payload)
            : (payload: string) => sshWrite(terminalSessionId, payload);
        void writeData(data).catch((error) => {
          term.writeln(`\r\n\x1b[31m${normalizeIpcError(error)}\x1b[0m`);
        });
      });

      const resizeTerminal =
        mode === "local"
          ? (cols: number, rows: number) => localShellResize(terminalSessionId, cols, rows)
          : (cols: number, rows: number) => sshResize(terminalSessionId, cols, rows);
      const closeTerminal =
        mode === "local"
          ? () => localShellClose(terminalSessionId)
          : () => sshClose(terminalSessionId);

      const resizeObserver = new ResizeObserver(() => {
        fit.fit();
        if (!inputEnabled || cancelled) {
          return;
        }
        if (term.cols < 2 || term.rows < 2) {
          return;
        }
        void resizeTerminal(term.cols, term.rows);
      });
      resizeObserver.observe(container);

      const onWindowResize = () => fit.fit();
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
          if (mode === "local") {
            await localShellOpen(terminalSessionId);
          } else {
            if (!connectionId) {
              throw new Error("Missing connection for SSH terminal.");
            }
            await sshOpen(connectionId, terminalSessionId);
          }
          if (cancelled) {
            return;
          }
          inputEnabled = true;
          inputEnabledRef.current = true;
          fit.fit();
          if (term.cols >= 2 && term.rows >= 2) {
            void resizeTerminal(term.cols, term.rows);
          }
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
