import { useCallback, useEffect, useRef, useState } from "react";
import { listSshCommandFavorites } from "../../lib/connections";
import type { SshCommandFavorite } from "../../types/connections";
import { keyboardShortcutFromEvent } from "../favorites/constants";
import { parseRemoteEditorPath } from "./remoteEditorCommand";
import { SshCommandFavoritesPanel } from "./SshCommandFavoritesPanel";
import { TerminalPane, type TerminalPaneHandle } from "./TerminalPane";

type SshTerminalWorkspaceProps = {
  connectionId: string;
  terminalSessionId: string;
  onOpenRemoteFile?: (
    remotePath: string,
    sourceTerminalSessionId: string,
  ) => void;
};

export function SshTerminalWorkspace({
  connectionId,
  terminalSessionId,
  onOpenRemoteFile,
}: SshTerminalWorkspaceProps) {
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [favorites, setFavorites] = useState<SshCommandFavorite[]>([]);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const terminalRef = useRef<TerminalPaneHandle | null>(null);
  const onOpenRemoteFileRef = useRef(onOpenRemoteFile);
  onOpenRemoteFileRef.current = onOpenRemoteFile;

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

  const handleBeforeSubmitCommand = useCallback(
    (command: string) => {
      const path = parseRemoteEditorPath(command);
      if (!path || !onOpenRemoteFileRef.current) {
        return false;
      }
      onOpenRemoteFileRef.current(path, terminalSessionId);
      return true;
    },
    [terminalSessionId],
  );

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
            <span className="text-[11px] text-faint">
              nanoo .env — edit in app · nano — server editor
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1">
          <TerminalPane
            ref={terminalRef}
            mode="ssh"
            connectionId={connectionId}
            terminalSessionId={terminalSessionId}
            onLastCommand={setLastCommand}
            onBeforeSubmitCommand={onOpenRemoteFile ? handleBeforeSubmitCommand : undefined}
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
