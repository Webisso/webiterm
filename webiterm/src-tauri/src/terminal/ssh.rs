use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Mutex;
use std::sync::mpsc;
use std::time::Duration;

use serde::Serialize;
use ssh2::Session;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::domain::ConnectionSummary;
use crate::domain::connection::{AuthMethod, ConnectionKind};
use crate::error::AppError;
use crate::storage::build_mysql_url;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSessionInfo {
    pub id: String,
    pub connection_id: String,
    pub title: String,
}

enum SshIoCommand {
    Write(Vec<u8>),
    Resize { cols: u32, rows: u32 },
    Shutdown,
}

struct SshSession {
    command_tx: mpsc::Sender<SshIoCommand>,
}

pub struct SshTerminalManager {
    sessions: Mutex<HashMap<String, SshSession>>,
}

impl SshTerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn open(
        &self,
        app: AppHandle,
        connection: ConnectionSummary,
        password: Option<String>,
        terminal_session_id: Option<String>,
    ) -> Result<TerminalSessionInfo, AppError> {
        if !matches!(
            connection.kind,
            crate::domain::ConnectionKind::Ssh | crate::domain::ConnectionKind::Ftp
        ) {
            return Err(AppError::InvalidInput);
        }
        let secret = password;
        let session_id = terminal_session_id
            .filter(|id| !id.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let info = TerminalSessionInfo {
            id: session_id.clone(),
            connection_id: connection.id.clone(),
            title: connection.name.clone(),
        };
        let host = connection.host.clone();
        let port = ssh_port_for(&connection);
        let username = connection.username.clone();
        let auth_method = connection.auth_method;
        let private_key_path = connection.private_key_path.clone();
        let startup_command = connection.startup_command.clone();
        let secret = secret.unwrap_or_default();
        let event_name = format!("terminal-output-{}", session_id);
        let (stream, session) = tokio::time::timeout(
            Duration::from_secs(45),
            tokio::task::spawn_blocking(move || {
                open_ssh_channel(
                    &host,
                    port,
                    &username,
                    auth_method,
                    &secret,
                    private_key_path.as_deref(),
                )
            }),
        )
        .await
        .map_err(|_| AppError::ConnectionFailed("SSH connection timed out.".to_string()))?
        .map_err(|_| AppError::ConnectionFailed("SSH task failed.".to_string()))??;
        let (command_tx, command_rx) = mpsc::channel();
        {
            let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
            sessions.insert(
                session_id.clone(),
                SshSession {
                    command_tx: command_tx.clone(),
                },
            );
        }
        std::thread::spawn(move || {
            run_ssh_session_io(
                app,
                event_name,
                stream,
                session,
                command_rx,
                startup_command,
            );
        });
        Ok(info)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        session
            .command_tx
            .send(SshIoCommand::Write(data.as_bytes().to_vec()))
            .map_err(|_| AppError::ConnectionFailed("SSH session is closed.".to_string()))?;
        Ok(())
    }

    pub fn resize(&self, session_id: &str, cols: u32, rows: u32) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        session
            .command_tx
            .send(SshIoCommand::Resize { cols, rows })
            .map_err(|_| AppError::ConnectionFailed("SSH session is closed.".to_string()))?;
        Ok(())
    }

    pub fn close(&self, session_id: &str) -> Result<(), AppError> {
        let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.remove(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let _ = session.command_tx.send(SshIoCommand::Shutdown);
        Ok(())
    }
}

fn run_ssh_session_io(
    app: AppHandle,
    event_name: String,
    mut channel: ssh2::Channel,
    session: Session,
    commands: mpsc::Receiver<SshIoCommand>,
    startup_command: Option<String>,
) {
    session.set_blocking(false);
    let mut buffer = [0_u8; 4096];

    if let Some(command) = startup_command
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        std::thread::sleep(Duration::from_millis(250));
        let mut payload = command.to_string();
        payload.push('\n');
        if !apply_ssh_command(&mut channel, SshIoCommand::Write(payload.into_bytes())) {
            emit_terminal_output(&app, &event_name, "\r\n[session closed]\r\n".to_string());
            return;
        }
    }

    loop {
        if !drain_ssh_commands(&mut channel, &commands) {
            break;
        }

        match channel.read(&mut buffer) {
            Ok(0) => break,
            Ok(count) => {
                let payload = String::from_utf8_lossy(&buffer[..count]).to_string();
                emit_terminal_output(&app, &event_name, payload);
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                wait_for_ssh_io(&session, &commands, &mut channel);
            }
            Err(_) => break,
        }
    }

    let _ = channel.close();
    let _ = session.disconnect(None, "closed", None);
    emit_terminal_output(&app, &event_name, "\r\n[session closed]\r\n".to_string());
}

fn drain_ssh_commands(
    channel: &mut ssh2::Channel,
    commands: &mpsc::Receiver<SshIoCommand>,
) -> bool {
    while let Ok(command) = commands.try_recv() {
        if !apply_ssh_command(channel, command) {
            return false;
        }
    }
    true
}

fn apply_ssh_command(channel: &mut ssh2::Channel, command: SshIoCommand) -> bool {
    match command {
        SshIoCommand::Shutdown => false,
        SshIoCommand::Write(data) => channel.write_all(&data).is_ok() && channel.flush().is_ok(),
        SshIoCommand::Resize { cols, rows } => {
            channel.request_pty_size(cols, rows, None, None).is_ok()
        }
    }
}

fn wait_for_ssh_io(
    session: &Session,
    commands: &mpsc::Receiver<SshIoCommand>,
    channel: &mut ssh2::Channel,
) {
    for _ in 0..40 {
        if !drain_ssh_commands(channel, commands) {
            return;
        }
        if session.block_directions() != ssh2::BlockDirections::None {
            std::thread::sleep(Duration::from_millis(2));
            return;
        }
        std::thread::sleep(Duration::from_millis(5));
    }
}

pub(crate) fn ssh_port_for(connection: &ConnectionSummary) -> u16 {
    match connection.kind {
        ConnectionKind::Ftp => 22,
        _ => connection.port,
    }
}

pub(crate) fn connect_ssh_session(
    host: &str,
    port: u16,
    username: &str,
    auth_method: AuthMethod,
    secret: &str,
    private_key_path: Option<&str>,
) -> Result<Session, AppError> {
    let address = format!("{}:{}", host, port);
    let tcp = TcpStream::connect(&address)
        .map_err(|_| AppError::ConnectionFailed("Could not reach the SSH host.".to_string()))?;
    let mut session = Session::new()
        .map_err(|_| AppError::ConnectionFailed("Could not create SSH session.".to_string()))?;
    session.set_tcp_stream(tcp);
    session.set_blocking(true);
    session
        .handshake()
        .map_err(|_| AppError::ConnectionFailed("SSH handshake failed.".to_string()))?;
    ssh_authenticate(&session, username, auth_method, secret, private_key_path)?;
    Ok(session)
}

fn open_ssh_channel(
    host: &str,
    port: u16,
    username: &str,
    auth_method: AuthMethod,
    secret: &str,
    private_key_path: Option<&str>,
) -> Result<(ssh2::Channel, Session), AppError> {
    let session = connect_ssh_session(host, port, username, auth_method, secret, private_key_path)?;
    let mut channel = session
        .channel_session()
        .map_err(|_| AppError::ConnectionFailed("Could not open SSH channel.".to_string()))?;
    channel
        .request_pty("xterm-256color", None, Some((80, 24, 0, 0)))
        .map_err(|_| AppError::ConnectionFailed("Could not request SSH PTY.".to_string()))?;
    channel
        .shell()
        .map_err(|_| AppError::ConnectionFailed("Could not start SSH shell.".to_string()))?;
    Ok((channel, session))
}

fn ssh_authenticate(
    session: &Session,
    username: &str,
    auth_method: AuthMethod,
    secret: &str,
    private_key_path: Option<&str>,
) -> Result<(), AppError> {
    match auth_method {
        AuthMethod::Password => {
            if secret.is_empty() {
                return Err(AppError::ConnectionFailed(
                    "No password saved for this profile. Edit the connection and save a password."
                        .to_string(),
                ));
            }
            session.userauth_password(username, secret).map_err(|_| {
                AppError::ConnectionFailed("SSH password authentication failed.".to_string())
            })?;
            ensure_ssh_authenticated(session)?;
        }
        AuthMethod::PrivateKey => {
            let passphrase = if secret.is_empty() {
                None
            } else {
                Some(secret)
            };
            let keys = private_key_candidates(private_key_path);
            if keys.is_empty() {
                return Err(AppError::ConnectionFailed(
                    "No private key path configured and ~/.ssh was not found.".to_string(),
                ));
            }
            let mut tried = false;
            let mut last_message = "Private key authentication failed.".to_string();
            for key_path in keys {
                if !key_path.is_file() {
                    continue;
                }
                tried = true;
                match session.userauth_pubkey_file(username, None, &key_path, passphrase) {
                    Ok(()) if session.authenticated() => return Ok(()),
                    Ok(()) => {
                        last_message =
                            format!("The server rejected the key at {}.", key_path.display());
                    }
                    Err(_) => {
                        last_message = format!(
                            "Could not authenticate with the key at {}.",
                            key_path.display()
                        );
                    }
                }
            }
            if !tried {
                return Err(AppError::ConnectionFailed(
                    "Private key file not found. Choose a key file or place id_ed25519 or id_rsa in ~/.ssh."
                        .to_string(),
                ));
            }
            return Err(AppError::ConnectionFailed(last_message));
        }
        AuthMethod::Agent => {
            session.userauth_agent(username).map_err(|_| {
                AppError::ConnectionFailed(
                    "SSH agent authentication failed. Run ssh-add, or switch to private key file authentication."
                        .to_string(),
                )
            })?;
            ensure_ssh_authenticated(session)?;
        }
        AuthMethod::None => {
            return Err(AppError::ConnectionFailed(
                "SSH requires password, private key, or SSH agent authentication.".to_string(),
            ));
        }
    }
    Ok(())
}

fn ensure_ssh_authenticated(session: &Session) -> Result<(), AppError> {
    if session.authenticated() {
        Ok(())
    } else {
        Err(AppError::ConnectionFailed(
            "SSH authentication did not complete.".to_string(),
        ))
    }
}

fn emit_terminal_output(app: &AppHandle, event_name: &str, payload: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event_name, payload);
        return;
    }
    let _ = app.emit(event_name, payload);
}

fn expand_home_path(path: &str) -> std::path::PathBuf {
    if path == "~"
        && let Ok(home) = std::env::var("HOME")
    {
        return std::path::PathBuf::from(home);
    }
    if let Some(rest) = path.strip_prefix("~/")
        && let Ok(home) = std::env::var("HOME")
    {
        return std::path::PathBuf::from(home).join(rest);
    }
    std::path::PathBuf::from(path)
}

fn default_private_key_paths() -> Vec<std::path::PathBuf> {
    std::env::var("HOME")
        .map(|home| {
            let ssh = std::path::PathBuf::from(home).join(".ssh");
            vec![ssh.join("id_ed25519"), ssh.join("id_rsa")]
        })
        .unwrap_or_default()
}

fn private_key_candidates(explicit: Option<&str>) -> Vec<std::path::PathBuf> {
    if let Some(path) = explicit.filter(|value| !value.is_empty()) {
        vec![expand_home_path(path)]
    } else {
        default_private_key_paths()
    }
}

pub fn effective_mysql_database<'a>(
    connection: &'a ConnectionSummary,
    database_override: Option<&'a str>,
) -> Option<&'a str> {
    database_override
        .filter(|name| !name.is_empty())
        .or(connection
            .database_name
            .as_deref()
            .filter(|name| !name.is_empty()))
}

// MySQL query helper used by database commands module.
pub async fn run_mysql_query(
    connection: &ConnectionSummary,
    password: &str,
    sql: &str,
    database_override: Option<&str>,
) -> Result<MysqlQueryResult, AppError> {
    if connection.kind != crate::domain::ConnectionKind::Mysql {
        return Err(AppError::InvalidInput);
    }
    let url = build_mysql_url(
        &connection.username,
        &password,
        &connection.host,
        connection.port,
        effective_mysql_database(connection, database_override),
    );
    let started = std::time::Instant::now();
    let pool = sqlx::mysql::MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&url)
        .await
        .map_err(|_| AppError::ConnectionFailed("Could not connect to MySQL.".to_string()))?;
    let trimmed = sql.trim().to_string();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput);
    }
    let lowered = trimmed.to_ascii_lowercase();
    let is_result_set = lowered.starts_with("select")
        || lowered.starts_with("show")
        || lowered.starts_with("describe")
        || lowered.starts_with("explain")
        || lowered.starts_with("with");
    use sqlx::{Column, Row};
    if is_result_set {
        let rows = sqlx::raw_sql(sqlx::AssertSqlSafe(trimmed.as_str()))
            .fetch_all(&pool)
            .await
            .map_err(|err| AppError::ConnectionFailed(err.to_string()))?;
        pool.close().await;
        let columns = if let Some(first) = rows.first() {
            first
                .columns()
                .iter()
                .map(|column| column.name().to_string())
                .collect()
        } else {
            Vec::new()
        };
        let fetched = rows.len();
        let truncated = fetched > 500;
        let mut values = Vec::new();
        for row in rows.iter().take(500) {
            let mut line = Vec::new();
            for index in 0..row.len() {
                line.push(format_mysql_value(row, index));
            }
            values.push(line);
        }
        let row_count = values.len();
        Ok(MysqlQueryResult {
            columns,
            rows: values,
            row_count,
            truncated,
            duration_ms: started.elapsed().as_millis() as u64,
            rows_affected: None,
        })
    } else {
        let result = sqlx::raw_sql(sqlx::AssertSqlSafe(trimmed.as_str()))
            .execute(&pool)
            .await
            .map_err(|err| AppError::ConnectionFailed(err.to_string()))?;
        pool.close().await;
        let affected = result.rows_affected();
        Ok(MysqlQueryResult {
            columns: vec!["Status".to_string()],
            rows: vec![vec![format!("{} row(s) affected", affected)]],
            row_count: 1,
            truncated: false,
            duration_ms: started.elapsed().as_millis() as u64,
            rows_affected: Some(affected),
        })
    }
}

fn format_mysql_value(row: &sqlx::mysql::MySqlRow, index: usize) -> String {
    use sqlx::Row;
    if row
        .try_get::<Option<String>, _>(index)
        .ok()
        .flatten()
        .is_some()
    {
        return row.try_get::<String, _>(index).unwrap_or_default();
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(index) {
        return value
            .map(|v| v.to_string())
            .unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<f64>, _>(index) {
        return value
            .map(|v| v.to_string())
            .unwrap_or_else(|| "NULL".to_string());
    }
    "NULL".to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MysqlQueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub row_count: usize,
    pub truncated: bool,
    pub duration_ms: u64,
    pub rows_affected: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expand_home_path_leaves_absolute_paths() {
        assert_eq!(
            expand_home_path("/var/key"),
            std::path::PathBuf::from("/var/key")
        );
    }
}
