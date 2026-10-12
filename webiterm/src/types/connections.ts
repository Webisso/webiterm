export type ConnectionKind = "ssh" | "ftp" | "mysql" | "postgresql";
export type AuthMethod = "password" | "private_key" | "agent" | "none";
export type LastStatus = "unknown" | "ok" | "failed";

export type ConnectionGroup = {
  id: string;
  name: string;
  color: string;
  iconId: string;
  parentId?: string;
  sortOrder: number;
};

export type ConnectionSummary = {
  id: string;
  kind: ConnectionKind;
  name: string;
  host: string;
  port: number;
  username: string;
  databaseName?: string;
  authMethod: AuthMethod;
  privateKeyPath?: string;
  startupCommand?: string;
  sftpInitialPath?: string;
  groupId?: string;
  favorite: boolean;
  tags: string[];
  sshTunnelProfileId?: string;
  lastStatus: LastStatus;
  lastError?: string;
  lastConnectedAt?: string;
  updatedAt: string;
};

export type ConnectionInput = {
  kind: ConnectionKind;
  name: string;
  host: string;
  port: number;
  username: string;
  databaseName?: string;
  authMethod: AuthMethod;
  password?: string;
  privateKeyPath?: string;
  startupCommand?: string;
  sftpInitialPath?: string;
  groupId?: string;
  favorite: boolean;
  tags: string[];
  sshTunnelProfileId?: string;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  durationMs: number;
};

export type TerminalSessionInfo = {
  id: string;
  connectionId: string;
  title: string;
};

export type MysqlQueryResult = {
  columns: string[];
  rows: string[][]; 
  rowCount: number;
  truncated?: boolean;
  durationMs: number;
  rowsAffected?: number | null;
};

export type FtpEntry = {
  name: string;
  isDir: boolean;
  size: number;
};

export type FtpListResult = {
  path: string;
  entries: FtpEntry[];
};

export type FtpSessionInfo = {
  id: string;
  connectionId: string;
  title: string;
};

export type SftpEditorPrefs = {
  defaultApplication?: string;
  extensionApps: Record<string, string>;
};

export type FtpPrepareEditResult = {
  localPath: string;
  remotePath: string;
};

export type FtpSyncEditsResult = {
  uploaded: number;
};

export type SftpFavorite = {
  id: string;
  connectionId: string;
  remotePath: string;
  displayName: string;
  isDir: boolean;
  color: string;
  shortcutKey?: string;
  sortOrder: number;
};

export type SshCommandFavorite = {
  id: string;
  connectionId: string;
  label: string;
  command: string;
  color: string;
  shortcutKey?: string;
  sortOrder: number;
};

export type SshCommandFavoriteInput = {
  connectionId: string;
  label: string;
  command: string;
  color?: string;
  shortcutKey?: string;
};

export type SftpFavoriteInput = {
  connectionId: string;
  remotePath: string;
  displayName: string;
  isDir: boolean;
  color?: string;
  shortcutKey?: string;
};

export type LocalShellSessionInfo = {
  id: string;
  title: string;
};

export type WorkspaceSession =
  | { id: string; kind: "ssh"; connectionId: string; title: string; terminalSessionId?: string }
  | { id: string; kind: "ftp"; connectionId: string; title: string; ftpSessionId?: string }
  | { id: string; kind: "mysql"; connectionId: string; title: string }
  | { id: string; kind: "local"; title: string; terminalSessionId?: string }
  | { id: string; kind: "board"; boardId: string; groupId: string; title: string }
  | { id: string; kind: "note"; noteId: string; groupId: string; title: string };
