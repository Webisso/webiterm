import { useCallback, useEffect, useRef, useState } from "react";
import { listSshCommandFavorites } from "../../lib/connections";
import type { SshCommandFavorite } from "../../types/connections";
import { keyboardShortcutFromEvent } from "../favorites/constants";
import { SshCommandFavoritesPanel } from "./SshCommandFavoritesPanel";
import { TerminalPane, type TerminalPaneHandle } from "./TerminalPane";

type SshTerminalWorkspaceProps = {
  connectionId: string;
  terminalSessionId: string;
};

export function SshTerminalWorkspace({
  connectionId,
  terminalSessionId,
}: SshTerminalWorkspaceProps) {
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [favorites, setFavorites] = useState<SshCommandFavorite[]>([]);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const terminalRef = useRef<TerminalPaneHandle | null>(null);

  const reloadFavorites = useCallback(async () => {
    try {
      const items = await listSshCommandFavorites(connectionId);
      setFavorites(items);
    } catch {
      setFavorites([]);
    }
  }, [connectionId]);

  useEffect(() => {
    void reloadFavorites();
  }, [reloadFavorites]);

  const injectCommand = useCallback((command: string) => {
    terminalRef.current?.injectCommand(command);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = keyboardShortcutFromEvent(event);
      if (!shortcut) {
        return;
      }
      const favorite = favorites.find((item) => item.shortcutKey === shortcut);
      if (!favorite) {
        return;
      }
      event.preventDefault();
      injectCommand(favorite.command);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [favorites, injectCommand]);

  return (
    <div className="flex h-full min-h-0 bg-canvas text-[13px] text-ink">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
          <button
            type="button"
            aria-pressed={commandsOpen}
            onClick={() => setCommandsOpen((open) => !open)}
            className="h-7 shrink-0 rounded-md border border-line px-2 text-[12px] text-muted hover:text-ink"
          >
            Commands{favorites.length > 0 ? ` (${favorites.length})` : ""}
          </button>
          {lastCommand ? (
            <span className="min-w-0 truncate font-mono text-[11px] text-faint" title={lastCommand}>
              Last: {lastCommand}
            </span>
          ) : (
            <span className="text-[11px] text-faint">Run a command to capture it as a favorite</span>
          )}
        </div>
        <div className="min-h-0 flex-1">
          <TerminalPane
            ref={terminalRef}
            mode="ssh"
            connectionId={connectionId}
            terminalSessionId={terminalSessionId}
            onLastCommand={setLastCommand}
          />
        </div>
      </div>
      <SshCommandFavoritesPanel
        open={commandsOpen}
        connectionId={connectionId}
        favorites={favorites}
        lastCommand={lastCommand}
        onClose={() => setCommandsOpen(false)}
        onChanged={() => void reloadFavorites()}
        onInject={injectCommand}
      />
    </div>
  );
}
