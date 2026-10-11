import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionGroup,
  ConnectionInput,
  ConnectionSummary,
  ConnectionTestResult,
  FtpListResult,
  FtpPrepareEditResult,
  FtpSessionInfo,
  FtpSyncEditsResult,
  MysqlQueryResult,
  SftpEditorPrefs,
  SftpFavorite,
  SftpFavoriteInput,
  SshCommandFavorite,
  SshCommandFavoriteInput,
  TerminalSessionInfo,
} from "../types/connections";

export type { FtpEntry, FtpListResult, FtpSessionInfo } from "../types/connections";

export async function listConnections(query = ""): Promise<ConnectionSummary[]> {
  return invoke("list_connections", { query });
}

export async function listConnectionGroups(): Promise<ConnectionGroup[]> {
  return invoke("list_connection_groups_cmd");
}

export async function createConnectionGroup(input: {
  name: string;
  color?: string;
  iconId?: string;
  parentId?: string | null;
}): Promise<ConnectionGroup> {
  return invoke("create_connection_group_cmd", {
    input: {
      name: input.name,
      color: input.color ?? "#6366f1",
      iconId: input.iconId ?? "folder",
      parentId: input.parentId ?? null,
    },
  });
}

export async function updateConnectionGroup(
  id: string,
  update: {
    name?: string;
    color?: string;
    iconId?: string;
    parentId?: string | null;
    sortOrder?: number;
  },
): Promise<ConnectionGroup> {
  return invoke("update_connection_group_cmd", { id, update });
}

export async function deleteConnectionGroup(id: string): Promise<void> {
  return invoke("delete_connection_group_cmd", { id });
}

export async function assignConnectionGroup(
  id: string,
  groupId: string | null,
): Promise<ConnectionSummary> {
  return invoke("assign_connection_group_cmd", { id, groupId });
}

export async function createConnection(input: ConnectionInput): Promise<ConnectionSummary> {
  return invoke("create_connection", { input });
}

export async function updateConnection(
  id: string,
  input: ConnectionInput,
): Promise<ConnectionSummary> {
  return invoke("update_connection", { id, input });
}

export async function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

export async function testConnection(id: string): Promise<ConnectionTestResult> {
  return invoke("test_connection", { id });
}

export async function exportLocalData(path: string): Promise<void> {
  return invoke("export_local_data", { path });
}

export async function importLocalData(path: string): Promise<void> {
  return invoke("import_local_data", { path });
}

export async function sshOpen(
  connectionId: string,
  terminalSessionId?: string,
): Promise<TerminalSessionInfo> {
  return invoke("ssh_open", { connectionId, terminalSessionId });
}

export async function sshWrite(sessionId: string, data: string): Promise<void> {
  return invoke("ssh_write", { sessionId, data });
}

export async function sshResize(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("ssh_resize", { sessionId, cols, rows });
}

export async function sshClose(sessionId: string): Promise<void> {
  return invoke("ssh_close", { sessionId });
}

export async function mysqlQuery(
  connectionId: string,
  sql: string,
  database?: string | null,
): Promise<MysqlQueryResult> {
  return invoke("mysql_query", {
    connectionId,
    sql,
    database: database?.trim() ? database.trim() : null,
  });
}

export async function ftpOpen(
  connectionId: string,
  ftpSessionId?: string,
): Promise<FtpSessionInfo> {
  return invoke("ftp_open", { connectionId, ftpSessionId });
}

export async function ftpList(sessionId: string): Promise<FtpListResult> {
  return invoke("ftp_list", { sessionId });
}

export async function ftpChangeDir(sessionId: string, path: string): Promise<FtpListResult> {
  return invoke("ftp_change_dir", { sessionId, path });
}

export async function ftpParentDir(sessionId: string): Promise<FtpListResult> {
  return invoke("ftp_parent_dir", { sessionId });
}

export async function ftpGoto(sessionId: string, path: string): Promise<FtpListResult> {
  return invoke("ftp_goto", { sessionId, path });
}

export async function ftpDownload(
  sessionId: string,
  fileName: string,
  localPath: string,
): Promise<void> {
  return invoke("ftp_download", { sessionId, fileName, localPath });
}

export async function ftpDelete(
  sessionId: string,
  name: string,
  isDir: boolean,
): Promise<FtpListResult> {
  return invoke("ftp_delete", { sessionId, name, isDir });
}

export async function ftpRename(
  sessionId: string,
  fromName: string,
  toName: string,
): Promise<FtpListResult> {
  return invoke("ftp_rename", { sessionId, fromName, toName });
}

export async function ftpPrepareEdit(
  sessionId: string,
  fileName: string,
): Promise<FtpPrepareEditResult> {
  return invoke("ftp_prepare_edit", { sessionId, fileName });
}

export async function ftpSyncEdits(sessionId: string): Promise<FtpSyncEditsResult> {
  return invoke("ftp_sync_edits", { sessionId });
}

export async function ftpClose(sessionId: string): Promise<void> {
  return invoke("ftp_close", { sessionId });
}

export async function getSftpEditorPrefs(): Promise<SftpEditorPrefs> {
  return invoke("get_sftp_editor_prefs");
}

export async function setSftpEditorPrefs(prefs: SftpEditorPrefs): Promise<SftpEditorPrefs> {
  return invoke("set_sftp_editor_prefs", { prefs });
}

export async function openPathWithApplication(
  path: string,
  application?: string,
): Promise<void> {
  return invoke("open_path_with_application", { path, application });
}

export async function listSftpFavorites(connectionId: string): Promise<SftpFavorite[]> {
  return invoke("list_sftp_favorites_cmd", { connectionId });
}

export async function createSftpFavorite(input: SftpFavoriteInput): Promise<SftpFavorite> {
  return invoke("create_sftp_favorite_cmd", { input });
}

export async function updateSftpFavorite(
  id: string,
  update: {
    displayName?: string;
    color?: string;
    shortcutKey?: string;
    sortOrder?: number;
  },
): Promise<SftpFavorite> {
  return invoke("update_sftp_favorite_cmd", { id, update });
}

export async function deleteSftpFavorite(id: string): Promise<void> {
  return invoke("delete_sftp_favorite_cmd", { id });
}

export async function listSshCommandFavorites(
  connectionId: string,
): Promise<SshCommandFavorite[]> {
  return invoke("list_ssh_command_favorites_cmd", { connectionId });
}

export async function createSshCommandFavorite(
  input: SshCommandFavoriteInput,
): Promise<SshCommandFavorite> {
  return invoke("create_ssh_command_favorite_cmd", { input });
}

export async function updateSshCommandFavorite(
  id: string,
  update: {
    label?: string;
    command?: string;
    color?: string;
    shortcutKey?: string;
    sortOrder?: number;
  },
): Promise<SshCommandFavorite> {
  return invoke("update_ssh_command_favorite_cmd", { id, update });
}

export async function deleteSshCommandFavorite(id: string): Promise<void> {
  return invoke("delete_ssh_command_favorite_cmd", { id });
}
