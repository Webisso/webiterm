import type { ConnectionGroup, ConnectionSummary, WorkspaceSession } from "../types/connections";
import {
  resolveSessionTabAccent,
  sessionDisplayName,
  sessionProtocolBadgeClass,
  sessionProtocolLabel,
} from "../features/connections/connectionAppearance";

type SessionTabBarProps = {
  sessions: WorkspaceSession[];
  activeSessionId: string | null;
  connections: ConnectionSummary[];
  groups: ConnectionGroup[];
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
};

export function SessionTabBar({
  sessions,
  activeSessionId,
  connections,
  groups,
  onSelectSession,
  onCloseSession,
}: SessionTabBarProps) {
  const active =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;

  if (sessions.length === 0) {
    return (
      <div
        className="flex h-9 shrink-0 items-center border-b border-line bg-surface/60 px-3"
        role="tablist"
        aria-label="Sessions"
      >
        <span className="text-[12px] text-faint">No open sessions</span>
      </div>
    );
  }

  return (
    <div
      className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-line bg-surface/60 px-2 pt-1"
      role="tablist"
      aria-label="Sessions"
    >
      {sessions.map((session) => {
        const selected = session.id === active?.id;
        const isBoard = session.kind === "board";
        const connection = isBoard
          ? undefined
          : connections.find((item) => item.id === session.connectionId);
        const folder = isBoard ? groups.find((item) => item.id === session.groupId) : undefined;
        const accent = isBoard
          ? (folder?.color ?? "#f59e0b")
          : resolveSessionTabAccent(connection, groups, session.kind);
        const name = sessionDisplayName(session, connection, sessions);
        const protocol = isBoard ? "Board" : sessionProtocolLabel(session.kind);
        const badgeClass = isBoard
          ? "bg-amber-500/20 text-amber-200"
          : sessionProtocolBadgeClass(session.kind);
        const group = isBoard
          ? folder
          : connection?.groupId
            ? groups.find((item) => item.id === connection.groupId)
            : undefined;
        const tooltip = group
          ? `${protocol} · ${name} · ${group.name}`
          : `${protocol} · ${name}`;

        return (
          <div
            key={session.id}
            role="presentation"
            className={`group/tab relative flex max-w-[min(240px,40vw)] shrink-0 items-stretch ${
              selected ? "z-10" : "z-0"
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              title={tooltip}
              onClick={() => onSelectSession(session.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-t-lg border pr-7 pl-2.5 pb-1.5 pt-1 text-left transition-colors ${
                selected
                  ? "-mb-px border-line border-b-canvas bg-canvas text-ink"
                  : "mb-0 border-transparent border-b-transparent bg-transparent text-muted hover:bg-raised/40 hover:text-ink"
              }`}
            >
              <span
                className="h-4 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <span
                className={`inline-flex h-4 shrink-0 items-center rounded px-1 text-[9px] font-semibold leading-none ${badgeClass}`}
              >
                {protocol}
              </span>
              <span className="min-w-0 truncate text-[12px] font-medium">{name}</span>
            </button>
            <button
              type="button"
              aria-label={`Close ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseSession(session.id);
              }}
              className={`absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[15px] leading-none transition-opacity ${
                selected
                  ? "text-faint opacity-70 hover:bg-raised hover:text-ink"
                  : "text-faint opacity-0 group-hover/tab:opacity-70 hover:bg-raised hover:text-ink"
              }`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
