import { EmptyState } from "./EmptyState";
import { SessionTabBar } from "./SessionTabBar";
import { TaskBoardPane } from "../features/boards/TaskBoardPane";
import { MysqlPane } from "../features/databases/MysqlPane";
import { FtpPane } from "../features/ftp/FtpPane";
import { SshTerminalWorkspace } from "../features/terminal/SshTerminalWorkspace";
import type { ConnectionGroup, ConnectionSummary, WorkspaceSession } from "../types/connections";

type WorkspaceProps = {
  sessions: WorkspaceSession[];
  activeSessionId: string | null;
  connections: ConnectionSummary[];
  groups: ConnectionGroup[];
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
};

export function Workspace({
  sessions,
  activeSessionId,
  connections,
  groups,
  onSelectSession,
  onCloseSession,
}: WorkspaceProps) {
  const active = sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;

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
      <div className="min-h-0 flex-1">
        {!active ? (
          <div className="flex h-full items-center justify-center px-8">
            <EmptyState
              align="center"
              title="No active session"
              description="Open a connection from the sidebar to start SSH, SFTP, or MySQL sessions."
              hint="Profiles, passwords, and boards stay in a local JSON file on this device."
            />
          </div>
        ) : active.kind === "ssh" && active.terminalSessionId ? (
          <SshTerminalWorkspace
            key={active.terminalSessionId}
            connectionId={active.connectionId}
            terminalSessionId={active.terminalSessionId}
          />
        ) : active.kind === "ftp" && active.ftpSessionId ? (
          <FtpPane
            key={active.ftpSessionId}
            connectionId={active.connectionId}
            ftpSessionId={active.ftpSessionId}
          />
        ) : active.kind === "mysql" ? (
          <MysqlPane connectionId={active.connectionId} />
        ) : active.kind === "board" ? (
          <TaskBoardPane
            key={active.boardId}
            boardId={active.boardId}
            folderName={groups.find((group) => group.id === active.groupId)?.name ?? "Folder"}
            accent={groups.find((group) => group.id === active.groupId)?.color ?? "#f59e0b"}
          />
        ) : (
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
