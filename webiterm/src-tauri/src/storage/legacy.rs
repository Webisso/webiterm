use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::{Value, json};

use super::document::LocalDocument;
use super::{
    ConnectionGroup, SftpEditorPrefs, SftpFavorite, SshCommandFavorite, StoredConnection,
    TaskBoardDetail,
};

pub fn import_if_empty(document: &mut LocalDocument, json_path: &Path) -> bool {
    if !document.connections.is_empty()
        || !document.groups.is_empty()
        || !document.boards.is_empty()
        || !document.sftp_favorites.is_empty()
        || !document.ssh_command_favorites.is_empty()
    {
        return false;
    }
    let database = json_path.with_file_name("webiterm.db");
    if !database.is_file() {
        return false;
    }
    let Ok(groups) = sqlite_json(
        &database,
        "SELECT id, name, color, icon_id AS iconId, parent_id AS parentId, sort_order AS sortOrder FROM connection_groups",
    ) else {
        return false;
    };
    let Ok(profiles) = sqlite_json(
        &database,
        "SELECT id, kind, name, host, port, username, database_name AS databaseName, auth_method AS authMethod, private_key_path AS privateKeyPath, startup_command AS startupCommand, sftp_initial_path AS sftpInitialPath, group_id AS groupId, favorite, tags_json AS tagsJson, ssh_tunnel_profile_id AS sshTunnelProfileId, IFNULL(last_status, 'unknown') AS lastStatus, last_error AS lastError, last_connected_at AS lastConnectedAt, updated_at AS updatedAt FROM connection_profiles",
    ) else {
        return false;
    };
    document.groups = map_groups(&groups);
    document.connections = map_connections(&profiles);
    if let Ok(rows) = sqlite_json(
        &database,
        "SELECT id, connection_id AS connectionId, remote_path AS remotePath, display_name AS displayName, is_dir AS isDir, color, shortcut_key AS shortcutKey, sort_order AS sortOrder FROM sftp_favorites",
    ) {
        document.sftp_favorites = map_sftp_favorites(&rows);
    }
    if let Ok(rows) = sqlite_json(
        &database,
        "SELECT id, connection_id AS connectionId, label, command, color, shortcut_key AS shortcutKey, sort_order AS sortOrder FROM ssh_command_favorites",
    ) {
        document.ssh_command_favorites = map_ssh_favorites(&rows);
    }
    if let Ok(rows) = sqlite_json(
        &database,
        "SELECT default_application AS defaultApplication, extension_apps_json AS extensionAppsJson FROM sftp_editor_prefs LIMIT 1",
    ) {
        if let Some(prefs) = rows
            .as_array()
            .and_then(|items| items.first())
            .and_then(map_editor)
        {
            document.sftp_editor = prefs;
        }
    }
    if let Ok(rows) = sqlite_json(
        &database,
        "SELECT value FROM app_settings WHERE key = 'inspector_collapsed' LIMIT 1",
    ) {
        document.inspector_collapsed = rows
            .as_array()
            .and_then(|items| items.first())
            .and_then(|row| row.get("value"))
            .and_then(|value| value.as_str())
            == Some("true");
    }
    if let Some(boards) = load_mysql_boards(&database) {
        document.boards = boards;
    }
    tracing::info!(
        groups = document.groups.len(),
        connections = document.connections.len(),
        boards = document.boards.len(),
        "imported legacy local data into json"
    );
    true
}

fn map_groups(value: &Value) -> Vec<ConnectionGroup> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|row| {
            let mut row = row.clone();
            blank_to_null(&mut row, "parentId");
            serde_json::from_value(row).ok()
        })
        .collect()
}

fn map_connections(value: &Value) -> Vec<StoredConnection> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|row| {
            let mut row = row.clone();
            let tags = row
                .get("tagsJson")
                .and_then(|item| item.as_str())
                .and_then(|text| serde_json::from_str::<Value>(text).ok())
                .unwrap_or_else(|| json!([]));
            if let Some(object) = row.as_object_mut() {
                object.remove("tagsJson");
                object.insert("tags".to_string(), tags);
            }
            if let Some(flag) = row.get("favorite").and_then(|item| item.as_i64()) {
                row["favorite"] = json!(flag != 0);
            }
            for key in [
                "databaseName",
                "privateKeyPath",
                "startupCommand",
                "sftpInitialPath",
                "groupId",
                "sshTunnelProfileId",
                "lastError",
                "lastConnectedAt",
            ] {
                blank_to_null(&mut row, key);
            }
            if row
                .get("lastStatus")
                .and_then(|item| item.as_str())
                .unwrap_or("")
                .is_empty()
            {
                row["lastStatus"] = json!("unknown");
            }
            serde_json::from_value(row).ok()
        })
        .collect()
}

fn map_sftp_favorites(value: &Value) -> Vec<SftpFavorite> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|row| {
            let mut row = row.clone();
            if let Some(flag) = row.get("isDir").and_then(|item| item.as_i64()) {
                row["isDir"] = json!(flag != 0);
            }
            blank_to_null(&mut row, "shortcutKey");
            serde_json::from_value(row).ok()
        })
        .collect()
}

fn map_ssh_favorites(value: &Value) -> Vec<SshCommandFavorite> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|row| {
            let mut row = row.clone();
            blank_to_null(&mut row, "shortcutKey");
            serde_json::from_value(row).ok()
        })
        .collect()
}

fn map_editor(row: &Value) -> Option<SftpEditorPrefs> {
    let default_application = row
        .get("defaultApplication")
        .and_then(|item| item.as_str())
        .filter(|text| !text.is_empty())
        .map(str::to_string);
    let extension_apps = row
        .get("extensionAppsJson")
        .and_then(|item| item.as_str())
        .and_then(|text| serde_json::from_str(text).ok())
        .unwrap_or_default();
    Some(SftpEditorPrefs {
        default_application,
        extension_apps,
    })
}

fn load_mysql_boards(database: &Path) -> Option<Vec<TaskBoardDetail>> {
    let config = sqlite_json(
        database,
        "SELECT host, port, username, database_name AS databaseName, storage_password AS storagePassword FROM secrets_store_meta LIMIT 1",
    )
    .ok()?;
    let row = config.as_array()?.first()?.clone();
    let host = row.get("host")?.as_str()?.to_string();
    let port = row.get("port")?.as_i64()?;
    let username = row.get("username")?.as_str()?.to_string();
    let database_name = row.get("databaseName")?.as_str()?.to_string();
    let password = row
        .get("storagePassword")
        .and_then(|item| item.as_str())
        .unwrap_or("")
        .to_string();
    let sql = r#"SELECT JSON_ARRAYAGG(item) FROM (
        SELECT JSON_OBJECT(
            'board', JSON_OBJECT('id', b.id, 'groupId', b.group_id, 'name', b.name),
            'tasks', (
                SELECT IFNULL(JSON_ARRAYAGG(task_item), JSON_ARRAY()) FROM (
                    SELECT JSON_OBJECT(
                        'id', t.id,
                        'columnKey', t.column_key,
                        'title', t.title,
                        'body', t.body,
                        'sortOrder', t.sort_order,
                        'images', (
                            SELECT IFNULL(JSON_ARRAYAGG(JSON_OBJECT(
                                'id', i.id,
                                'mime', i.mime,
                                'dataBase64', REPLACE(TO_BASE64(i.data), '\n', '')
                            )), JSON_ARRAY())
                            FROM webiterm_task_images i WHERE i.task_id = t.id
                        ),
                        'comments', (
                            SELECT IFNULL(JSON_ARRAYAGG(comment_item), JSON_ARRAY()) FROM (
                                SELECT JSON_OBJECT(
                                    'id', c.id,
                                    'body', c.body,
                                    'createdAt', DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ'),
                                    'image', (
                                        SELECT JSON_OBJECT(
                                            'id', ci.id,
                                            'mime', ci.mime,
                                            'dataBase64', REPLACE(TO_BASE64(ci.data), '\n', '')
                                        )
                                        FROM webiterm_comment_images ci
                                        WHERE ci.comment_id = c.id
                                        LIMIT 1
                                    )
                                ) AS comment_item
                                FROM webiterm_task_comments c
                                WHERE c.task_id = t.id
                                ORDER BY c.created_at
                            ) comments
                        )
                    ) AS task_item
                    FROM webiterm_tasks t
                    WHERE t.board_id = b.id
                    ORDER BY t.sort_order, t.id
                ) tasks
            )
        ) AS item
        FROM webiterm_boards b
        ORDER BY b.name
    ) boards"#;
    let text = mysql_query(&host, port, &username, &password, &database_name, sql).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("null") {
        return Some(Vec::new());
    }
    serde_json::from_str(trimmed).ok()
}

fn sqlite_json(database: &Path, sql: &str) -> Result<Value, String> {
    let output = Command::new("sqlite3")
        .arg("-json")
        .arg(database)
        .arg(sql)
        .output()
        .map_err(|err| err.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(json!([]));
    }
    serde_json::from_str(trimmed).map_err(|err| err.to_string())
}

fn mysql_query(
    host: &str,
    port: i64,
    username: &str,
    password: &str,
    database: &str,
    sql: &str,
) -> Result<String, String> {
    let program = mysql_program().ok_or_else(|| "mysql client was not found".to_string())?;
    let mut command = Command::new(program);
    command
        .arg("--protocol=TCP")
        .arg("-N")
        .arg("-B")
        .arg("--raw")
        .arg("-h")
        .arg(host)
        .arg("-P")
        .arg(port.to_string())
        .arg("-u")
        .arg(username)
        .arg(database)
        .arg("-e")
        .arg(sql);
    if !password.is_empty() {
        command.env("MYSQL_PWD", password);
    }
    let output = command.output().map_err(|err| err.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn mysql_program() -> Option<PathBuf> {
    for candidate in ["/opt/homebrew/bin/mysql", "/usr/local/bin/mysql", "mysql"] {
        if Command::new(candidate).arg("--version").output().is_ok() {
            return Some(PathBuf::from(candidate));
        }
    }
    None
}

fn blank_to_null(value: &mut Value, key: &str) {
    let blank = value
        .get(key)
        .and_then(|item| item.as_str())
        .is_some_and(|text| text.is_empty());
    if blank {
        value[key] = Value::Null;
    }
}
