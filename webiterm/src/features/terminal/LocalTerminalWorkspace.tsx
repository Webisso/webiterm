import { useRef } from "react";
import { TerminalPane, type TerminalPaneHandle } from "./TerminalPane";

type LocalTerminalWorkspaceProps = {
  terminalSessionId: string;
  onNewLocalTerminal: () => void;
};

export function LocalTerminalWorkspace({
  terminalSessionId,
  onNewLocalTerminal,
}: LocalTerminalWorkspaceProps) {
  const terminalRef = useRef<TerminalPaneHandle | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-[13px] text-ink">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={onNewLocalTerminal}
          className="h-7 shrink-0 rounded-md border border-line bg-surface px-2.5 text-[12px] text-muted hover:bg-raised hover:text-ink"
        >
          New local terminal
        </button>
        <span className="text-[11px] text-faint">Runs on this Mac — open as many tabs as you need</span>
      </div>
      <div className="min-h-0 flex-1">
        <TerminalPane
          ref={terminalRef}
          mode="local"
          terminalSessionId={terminalSessionId}
        />
      </div>
    </div>
  );
}
