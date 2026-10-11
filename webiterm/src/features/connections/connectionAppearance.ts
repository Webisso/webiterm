import type {
  ConnectionGroup,
  ConnectionKind,
  ConnectionSummary,
  WorkspaceSession,
} from "../../types/connections";

export type SessionProtocolKind = Exclude<WorkspaceSession["kind"], "board">;

const KIND_ACCENT_HEX: Record<ConnectionKind, string> = {
  ssh: "#8b5cf6",
  ftp: "#38bdf8",
  mysql: "#34d399",
  postgresql: "#f472b6",
};

export function connectionKindLabel(kind: ConnectionKind): string {
  if (kind === "ssh") {
    return "SSH";
  }
  if (kind === "ftp") {
    return "SFTP";
  }
  if (kind === "mysql") {
    return "SQL";
  }
  return "PG";
}

export function sessionProtocolLabel(kind: SessionProtocolKind): string {
  if (kind === "ssh") {
    return "SSH";
  }
  if (kind === "ftp") {
    return "SFTP";
  }
  return "SQL";
}

export function sessionProtocolAccent(kind: SessionProtocolKind): string {
  if (kind === "ssh") {
    return KIND_ACCENT_HEX.ssh;
  }
  if (kind === "ftp") {
    return KIND_ACCENT_HEX.ftp;
  }
  return KIND_ACCENT_HEX.mysql;
}

export function sessionProtocolBadgeClass(kind: SessionProtocolKind): string {
  if (kind === "ssh") {
    return "bg-violet-500/20 text-violet-300";
  }
  if (kind === "ftp") {
    return "bg-sky-500/20 text-sky-300";
  }
  return "bg-emerald-500/20 text-emerald-300";
}

export function connectionKindBadgeClass(kind: ConnectionKind): string {
  if (kind === "postgresql") {
    return "bg-pink-500/20 text-pink-300";
  }
  if (kind === "ssh") {
    return sessionProtocolBadgeClass("ssh");
  }
  if (kind === "ftp") {
    return sessionProtocolBadgeClass("ftp");
  }
  return sessionProtocolBadgeClass("mysql");
}

export function resolveSessionTabAccent(
  connection: ConnectionSummary | undefined,
  groups: ConnectionGroup[],
  sessionKind: SessionProtocolKind,
): string {
  if (connection?.groupId) {
    const group = groups.find((item) => item.id === connection.groupId);
    if (group?.color) {
      return group.color;
    }
  }
  return sessionProtocolAccent(sessionKind);
}

export function sessionDisplayName(
  session: WorkspaceSession,
  connection: ConnectionSummary | undefined,
  allSessions: WorkspaceSession[],
): string {
  if (session.kind === "board") {
    return session.title;
  }
  const base = connection?.name ?? session.title;
  const siblings = allSessions.filter(
    (item) => item.kind === session.kind && item.connectionId === session.connectionId,
  );
  const index = siblings.findIndex((item) => item.id === session.id);
  if (index <= 0) {
    return base;
  }
  return `${base} (${index + 1})`;
}
