import { EmptyState } from "./EmptyState";
import { SessionTabBar } from "./SessionTabBar";
import { TaskBoardPane } from "../features/boards/TaskBoardPane";
import { FolderNotePane } from "../features/notes/FolderNotePane";
import { MysqlPane } from "../features/databases/MysqlPane";
import { FtpPane } from "../features/ftp/FtpPane";
import { LocalTerminalWorkspace } from "../features/terminal/LocalTerminalWorkspace";
import { SshTerminalWorkspace } from "../features/terminal/SshTerminalWorkspace";
import type { ConnectionGroup, ConnectionSummary, WorkspaceSession } from "../types/connections";
import type { FolderNoteSummary } from "../types/notes";

type WorkspaceProps = {
  sessions: WorkspaceSession[];
  activeSessionId: string | null;
  connections: ConnectionSummary[];
  groups: ConnectionGroup[];
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
  onCreateLocalTerminal: () => void;
  onNoteSaved: (note: FolderNoteSummary) => void;
};

export function Workspace({
  sessions,
  activeSessionId,
  connections,
  groups,
  onSelectSession,
  onCloseSession,
  onCreateLocalTerminal,
  onNoteSaved,
}: WorkspaceProps) {
  const active = sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;
  const noteSessions = sessions.filter((session) => session.kind === "note");
  const terminalSessions = sessions.filter(
    (session): session is Extract<WorkspaceSession, { kind: "ssh" } | { kind: "local" }> =>
      (session.kind === "ssh" || session.kind === "local") && Boolean(session.terminalSessionId),
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-canvas" aria-label="Workspace">
      <SessionTabBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        connections={connections}
        groups={groups}
        onSelectSession={onSelectSession}
        onCloseSession={onCloseSession}
      />
      <div className="relative min-h-0 flex-1">
        {noteSessions.map((session) => {
          const visible = active?.kind === "note" && active.noteId === session.noteId;
          return (
            <div
              key={session.noteId}
              className={`absolute inset-0 flex min-h-0 flex-col ${visible ? "" : "hidden"}`}
              aria-hidden={!visible}
            >
              <FolderNotePane
                noteId={session.noteId}
                folderName={groups.find((group) => group.id === session.groupId)?.name ?? "Folder"}
                onSaved={onNoteSaved}
              />
            </div>
          );
        })}
        {!active ? (
          <div className="flex h-full items-center justify-center px-8">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
              <EmptyState
                align="center"
                title="No active session"
                description="Open a connection from the sidebar, or start a local shell on this Mac."
                hint="Profiles, passwords, and boards stay in a local JSON file on this device."
              />
              <button
                type="button"
                onClick={onCreateLocalTerminal}
                className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-4 text-[13px] font-medium text-ink hover:bg-raised"
              >
                Create local terminal
              </button>
            </div>
          </div>
        ) : null}
        {terminalSessions.map((session) => {
          const visible = active?.id === session.id;
          const terminalSessionId = session.terminalSessionId!;
          return (
            <div
              key={terminalSessionId}
              className={`absolute inset-0 flex min-h-0 flex-col ${visible ? "" : "hidden"}`}
              aria-hidden={!visible}
            >
              {session.kind === "local" ? (
                <LocalTerminalWorkspace
                  terminalSessionId={terminalSessionId}
                  onNewLocalTerminal={onCreateLocalTerminal}
                />
              ) : session.kind === "ssh" ? (
                <SshTerminalWorkspace
                  connectionId={session.connectionId}
                  terminalSessionId={terminalSessionId}
                />
              ) : null}
            </div>
          );
        })}
        {active && active.kind === "ftp" && active.ftpSessionId ? (
          <FtpPane
            key={active.ftpSessionId}
            connectionId={active.connectionId}
            ftpSessionId={active.ftpSessionId}
          />
        ) : active?.kind === "mysql" ? (
          <MysqlPane connectionId={active.connectionId} />
        ) : active?.kind === "board" ? (
          <TaskBoardPane
            key={active.boardId}
            boardId={active.boardId}
            folderName={groups.find((group) => group.id === active.groupId)?.name ?? "Folder"}
            accent={groups.find((group) => group.id === active.groupId)?.color ?? "#f59e0b"}
          />
        ) : active?.kind === "note" ||
          active?.kind === "ssh" ||
          active?.kind === "local" ||
          !active ? null : (
          <div className="flex h-full items-center justify-center px-8">
            <EmptyState
              align="center"
              title="Session unavailable"
              description="This session could not be started. Close the tab and try again."
            />
          </div>
        )}
      </div>
    </section>
  );
}
