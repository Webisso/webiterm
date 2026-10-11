import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { normalizeIpcError } from "../../lib/ipc";
import { sshClose, sshOpen, sshResize, sshWrite } from "../../lib/connections";
import { applyTerminalInput } from "./terminalInput";

export type TerminalPaneHandle = {
  injectCommand: (command: string) => void;
  focus: () => void;
};

type TerminalPaneProps = {
  connectionId: string;
  terminalSessionId: string;
  onFailed?: (message: string) => void;
  onLastCommand?: (command: string) => void;
};

export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(
  function TerminalPane(
    { connectionId, terminalSessionId, onFailed, onLastCommand },
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
        void sshWrite(terminalSessionId, command).catch((error) => {
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

      let cancelled = false;
      let unlisten: (() => void) | null = null;
      let inputEnabled = false;
      let lineBuffer = "";

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontFamily: "SF Mono, ui-monospace, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.15,
        scrollback: 5000,
        theme: {
          background: "#101114",
          foreground: "#e8eaee",
          cursor: "#8eabff",
          selectionBackground: "#3d4f7a",
        },
      });
      termRef.current = term;
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container);
      fit.fit();
      term.writeln("Connecting…");

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
        void sshWrite(terminalSessionId, data).catch((error) => {
          term.writeln(`\r\n\x1b[31m${normalizeIpcError(error)}\x1b[0m`);
        });
      });

      const resizeObserver = new ResizeObserver(() => {
        fit.fit();
        if (!inputEnabled || cancelled) {
          return;
        }
        void sshResize(terminalSessionId, term.cols, term.rows);
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
          await sshOpen(connectionId, terminalSessionId);
          if (cancelled) {
            return;
          }
          inputEnabled = true;
          inputEnabledRef.current = true;
          fit.fit();
          void sshResize(terminalSessionId, term.cols, term.rows);
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
        void sshClose(terminalSessionId);
        term.dispose();
      };
    }, [connectionId, terminalSessionId]);

    return (
      <div
        ref={containerRef}
        className="h-full w-full min-h-0 bg-canvas p-1 outline-none"
        tabIndex={-1}
        role="application"
        aria-label="SSH terminal"
      />
    );
  },
);
