use std::collections::{HashMap, VecDeque};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use serde::Serialize;
use ssh2::Session;
use tauri::AppHandle;
use uuid::Uuid;

use crate::domain::ConnectionSummary;
use crate::domain::connection::{AuthMethod, ConnectionKind};
use crate::error::AppError;
use crate::storage::build_mysql_url;
use crate::terminal::emit_terminal_output;
use crate::terminal::shell_file::{self, CapturedShellFile, CaptureReady};

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
    QueryPwd {
        response_tx: mpsc::Sender<Result<String, AppError>>,
    },
    ClearPwdWatch,
    ReadFile {
        path: String,
        response_tx: mpsc::Sender<Result<CapturedShellFile, AppError>>,
    },
    WriteFile {
        path: String,
        content: String,
        response_tx: mpsc::Sender<Result<String, AppError>>,
    },
    ClearFileWatch,
    Shutdown,
}

enum QueuedFile {
    Read {
        path: String,
        response_tx: mpsc::Sender<Result<CapturedShellFile, AppError>>,
    },
    Write {
        path: String,
        content: String,
        response_tx: mpsc::Sender<Result<String, AppError>>,
    },
}

enum FileWatch {
    Read {
        buffer: String,
        started: Instant,
        response_tx: mpsc::Sender<Result<CapturedShellFile, AppError>>,
    },
    Write {
        buffer: String,
        started: Instant,
        response_tx: mpsc::Sender<Result<String, AppError>>,
    },
}

struct PwdWatch {
    buffer: String,
    response_txs: Vec<mpsc::Sender<Result<String, AppError>>>,
    started: Instant,
}

const PWD_QUERY_TIMEOUT: Duration = Duration::from_secs(5);
const PWD_WATCH_MAX_BYTES: usize = 65_536;

const PWD_PROBE_COMMAND: &[u8] = b"pwd -P\n";
const PWD_LINE_PREFIX: &str = "WEBITERM_PWD_LINE=";

struct SshSession {
    command_tx: mpsc::Sender<SshIoCommand>,
}

pub struct SshTerminalManager {
    sessions: Arc<Mutex<HashMap<String, SshSession>>>,
}

impl SshTerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn open(
        &self,
        app: AppHandle,
        connection: ConnectionSummary,
        password: Option<String>,
        terminal_session_id: Option<String>,
        initial_cols: Option<u32>,
        initial_rows: Option<u32>,
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

        {
            let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
            if sessions.contains_key(&session_id) {
                return Ok(info);
            }
        }

        let host = connection.host.clone();
        let port = ssh_port_for(&connection);
        let username = connection.username.clone();
        let auth_method = connection.auth_method;
        let private_key_path = connection.private_key_path.clone();
        let startup_command = connection.startup_command.clone();
        let secret = secret.unwrap_or_default();
        let event_name = format!("terminal-output-{}", session_id);
        let cols = initial_cols.unwrap_or(80).clamp(2, 500);
        let rows = initial_rows.unwrap_or(24).clamp(2, 200);
        let (mut channel, session) = tokio::time::timeout(
            Duration::from_secs(45),
            tokio::task::spawn_blocking(move || {
                open_ssh_channel(
                    &host,
                    port,
                    &username,
                    auth_method,
                    &secret,
                    private_key_path.as_deref(),
                    cols,
                    rows,
                )
            }),
        )
        .await
        .map_err(|_| AppError::ConnectionFailed("SSH connection timed out.".to_string()))?
        .map_err(|_| AppError::ConnectionFailed("SSH task failed.".to_string()))??;
        let (command_tx, command_rx) = mpsc::channel();
        {
            let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
            if sessions.contains_key(&session_id) {
                let _ = channel.close();
                let _ = session.disconnect(None, "superseded", None);
                return Ok(info);
            }
            sessions.insert(
                session_id.clone(),
                SshSession {
                    command_tx: command_tx.clone(),
                },
            );
        }
        let sessions = Arc::clone(&self.sessions);
        std::thread::spawn(move || {
            run_ssh_session_io(
                app,
                event_name,
                session_id,
                sessions,
                channel,
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

    pub fn query_pwd(&self, session_id: &str) -> Result<String, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let (response_tx, response_rx) = mpsc::channel();
        session
            .command_tx
            .send(SshIoCommand::QueryPwd { response_tx })
            .map_err(|_| AppError::ConnectionFailed("SSH session is closed.".to_string()))?;
        match response_rx.recv_timeout(Duration::from_secs(4)) {
            Ok(Ok(path)) if is_plausible_shell_pwd(&path) => Ok(path),
            Ok(Ok(_)) => Err(AppError::ConnectionFailed(
                "Shell returned an invalid working directory.".to_string(),
            )),
            Ok(Err(error)) => Err(error),
            Err(mpsc::RecvTimeoutError::Timeout) => {
                let _ = session
                    .command_tx
                    .send(SshIoCommand::ClearPwdWatch);
                Err(AppError::ConnectionFailed(
                    "Timed out reading shell working directory.".to_string(),
                ))
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => Err(AppError::ConnectionFailed(
                "SSH session is closed.".to_string(),
            )),
        }
    }

    pub fn read_file_via_shell(
        &self,
        session_id: &str,
        remote_path: &str,
    ) -> Result<CapturedShellFile, AppError> {
        let command_tx = self.command_sender(session_id)?;
        let (response_tx, response_rx) = mpsc::channel();
        command_tx
            .send(SshIoCommand::ReadFile {
                path: remote_path.to_string(),
                response_tx,
            })
            .map_err(|_| AppError::ConnectionFailed("SSH session is closed.".to_string()))?;
        wait_file_result(&command_tx, response_rx)
    }

    pub fn write_file_via_shell(
        &self,
        session_id: &str,
        remote_path: &str,
        content: &str,
    ) -> Result<String, AppError> {
        let command_tx = self.command_sender(session_id)?;
        let (response_tx, response_rx) = mpsc::channel();
        command_tx
            .send(SshIoCommand::WriteFile {
                path: remote_path.to_string(),
                content: content.to_string(),
                response_tx,
            })
            .map_err(|_| AppError::ConnectionFailed("SSH session is closed.".to_string()))?;
        wait_file_result(&command_tx, response_rx)
    }

    fn command_sender(&self, session_id: &str) -> Result<mpsc::Sender<SshIoCommand>, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|poison| poison.into_inner());
        sessions
            .get(session_id)
            .map(|session| session.command_tx.clone())
            .ok_or(AppError::SessionNotFound)
    }
}

fn wait_file_result<T>(
    command_tx: &mpsc::Sender<SshIoCommand>,
    response_rx: mpsc::Receiver<Result<T, AppError>>,
) -> Result<T, AppError> {
    match response_rx.recv_timeout(Duration::from_secs(25)) {
        Ok(result) => result,
        Err(mpsc::RecvTimeoutError::Timeout) => {
            let _ = command_tx.send(SshIoCommand::ClearFileWatch);
            Err(AppError::ConnectionFailed(
                "Timed out reading the file from the shell.".to_string(),
            ))
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => Err(AppError::ConnectionFailed(
            "SSH session is closed.".to_string(),
        )),
    }
}

fn run_ssh_session_io(
    app: AppHandle,
    event_name: String,
    session_id: String,
    sessions: Arc<Mutex<HashMap<String, SshSession>>>,
    mut channel: ssh2::Channel,
    session: Session,
    commands: mpsc::Receiver<SshIoCommand>,
    startup_command: Option<String>,
) {
    session.set_blocking(false);
    let mut buffer = [0_u8; 4096];
    let mut pending_write: Vec<u8> = Vec::new();
    let mut shutdown = false;
    let mut pwd_watch: Option<PwdWatch> = None;
    let mut file_watch: Option<FileWatch> = None;
    let mut file_queue: VecDeque<QueuedFile> = VecDeque::new();

    if let Some(command) = startup_command
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        std::thread::sleep(Duration::from_millis(250));
        let mut payload = command.to_string();
        payload.push('\n');
        pending_write.extend(payload.into_bytes());
    }

    while !shutdown {
        expire_pwd_watch_if_needed(&mut pwd_watch);
        expire_file_watch_if_needed(&mut file_watch, &mut file_queue, &mut pending_write);
        flush_ssh_pending_write(&mut channel, &mut pending_write);

        if matches!(
            drain_ssh_commands(
                &mut channel,
                &commands,
                &mut pending_write,
                &mut pwd_watch,
                &mut file_watch,
                &mut file_queue,
            ),
            DrainResult::Shutdown
        ) {
            break;
        }

        if channel.eof() {
            break;
        }

        match channel.read(&mut buffer) {
            Ok(0) => {
                if channel.eof() {
                    break;
                }
                wait_for_ssh_io(
                    &session,
                    &commands,
                    &mut channel,
                    &mut pending_write,
                    &mut shutdown,
                    &mut pwd_watch,
                    &mut file_watch,
                    &mut file_queue,
                );
            }
            Ok(count) => {
                let payload = String::from_utf8_lossy(&buffer[..count]).to_string();
                note_ssh_output(
                    &app,
                    &event_name,
                    &payload,
                    &mut pending_write,
                    &mut pwd_watch,
                    &mut file_watch,
                    &mut file_queue,
                );
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                wait_for_ssh_io(
                    &session,
                    &commands,
                    &mut channel,
                    &mut pending_write,
                    &mut shutdown,
                    &mut pwd_watch,
                    &mut file_watch,
                    &mut file_queue,
                );
            }
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => {}
            Err(_) => {
                std::thread::sleep(Duration::from_millis(10));
            }
        }
    }

    if let Some(watch) = file_watch.take() {
        fail_file_watch(watch, "SSH session is closed.");
    }
    while let Some(op) = file_queue.pop_front() {
        fail_queued_file(op, "SSH session is closed.");
    }
    let _ = channel.close();
    let _ = session.disconnect(None, "closed", None);
    {
        let mut map = sessions.lock().unwrap_or_else(|p| p.into_inner());
        map.remove(&session_id);
    }
    emit_terminal_output(&app, &event_name, "\r\n[session closed]\r\n".to_string());
}

enum DrainResult {
    Continue,
    Shutdown,
}

fn finish_pwd_watch(watch: PwdWatch, result: Result<String, AppError>) {
    for tx in watch.response_txs {
        let outbound = match &result {
            Ok(path) => Ok(path.clone()),
            Err(AppError::ConnectionFailed(message)) => {
                Err(AppError::ConnectionFailed(message.clone()))
            }
            Err(error) => Err(AppError::ConnectionFailed(error.public_message())),
        };
        let _ = tx.send(outbound);
    }
}

fn expire_pwd_watch_if_needed(pwd_watch: &mut Option<PwdWatch>) {
    let expired = pwd_watch.as_ref().is_some_and(|watch| {
        watch.started.elapsed() > PWD_QUERY_TIMEOUT || watch.buffer.len() > PWD_WATCH_MAX_BYTES
    });
    if expired {
        let watch = pwd_watch.take().expect("pwd watch");
        finish_pwd_watch(
            watch,
            Err(AppError::ConnectionFailed(
                "Timed out reading shell working directory.".to_string(),
            )),
        );
    }
}

const FILE_WATCH_TIMEOUT: Duration = Duration::from_secs(20);
const FILE_WATCH_MAX_BYTES: usize = 6 * 1024 * 1024;

fn fail_file_watch(watch: FileWatch, message: &str) {
    let error = AppError::ConnectionFailed(message.to_string());
    match watch {
        FileWatch::Read { response_tx, .. } => {
            let _ = response_tx.send(Err(error));
        }
        FileWatch::Write { response_tx, .. } => {
            let _ = response_tx.send(Err(error));
        }
    }
}

fn fail_queued_file(op: QueuedFile, message: &str) {
    let error = AppError::ConnectionFailed(message.to_string());
    match op {
        QueuedFile::Read { response_tx, .. } => {
            let _ = response_tx.send(Err(error));
        }
        QueuedFile::Write { response_tx, .. } => {
            let _ = response_tx.send(Err(error));
        }
    }
}

fn file_watch_buffer(watch: &mut FileWatch) -> &mut String {
    match watch {
        FileWatch::Read { buffer, .. } | FileWatch::Write { buffer, .. } => buffer,
    }
}

fn file_watch_started(watch: &FileWatch) -> Instant {
    match watch {
        FileWatch::Read { started, .. } | FileWatch::Write { started, .. } => *started,
    }
}

fn launch_file_op(
    pending_write: &mut Vec<u8>,
    pwd_watch: &mut Option<PwdWatch>,
    file_watch: &mut Option<FileWatch>,
    op: QueuedFile,
) {
    if let Some(watch) = pwd_watch.take() {
        finish_pwd_watch(
            watch,
            Err(AppError::ConnectionFailed(
                "Working directory query was interrupted.".to_string(),
            )),
        );
    }
    let script = match &op {
        QueuedFile::Read { path, .. } => shell_file::build_read_script(path),
        QueuedFile::Write { path, content, .. } => shell_file::build_write_script(path, content),
    };
    match script {
        Ok(script) => {
            pending_write.extend(script.into_bytes());
            *file_watch = Some(match op {
                QueuedFile::Read { response_tx, .. } => FileWatch::Read {
                    buffer: String::new(),
                    started: Instant::now(),
                    response_tx,
                },
                QueuedFile::Write { response_tx, .. } => FileWatch::Write {
                    buffer: String::new(),
                    started: Instant::now(),
                    response_tx,
                },
            });
        }
        Err(error) => {
            let message = match error {
                AppError::ConnectionFailed(message) => message,
                other => other.public_message(),
            };
            fail_queued_file(op, &message);
        }
    }
}

fn expire_file_watch_if_needed(
    file_watch: &mut Option<FileWatch>,
    file_queue: &mut VecDeque<QueuedFile>,
    pending_write: &mut Vec<u8>,
) {
    let expired = file_watch.as_ref().is_some_and(|watch| {
        file_watch_started(watch).elapsed() > FILE_WATCH_TIMEOUT
            || file_watch_buffer_len(watch) > FILE_WATCH_MAX_BYTES
    });
    if !expired {
        return;
    }
    pending_write.extend(b"\x03");
    if let Some(watch) = file_watch.take() {
        fail_file_watch(watch, "Timed out reading the file from the shell.");
    }
    while let Some(op) = file_queue.pop_front() {
        fail_queued_file(op, "Timed out reading the file from the shell.");
    }
}

fn file_watch_buffer_len(watch: &FileWatch) -> usize {
    match watch {
        FileWatch::Read { buffer, .. } | FileWatch::Write { buffer, .. } => buffer.len(),
    }
}

fn finish_ready_file_watch(
    pending_write: &mut Vec<u8>,
    pwd_watch: &mut Option<PwdWatch>,
    file_watch: &mut Option<FileWatch>,
    file_queue: &mut VecDeque<QueuedFile>,
) {
    *file_watch = None;
    if let Some(next) = file_queue.pop_front() {
        launch_file_op(pending_write, pwd_watch, file_watch, next);
        return;
    }
    // Drop the captured prompt fragments. An empty line redraws one clean prompt
    // and bash does not store it in history.
    pending_write.extend(b"\n");
}

fn note_ssh_output(
    app: &AppHandle,
    event_name: &str,
    payload: &str,
    pending_write: &mut Vec<u8>,
    pwd_watch: &mut Option<PwdWatch>,
    file_watch: &mut Option<FileWatch>,
    file_queue: &mut VecDeque<QueuedFile>,
) {
    if file_watch.is_some() {
        if let Some(watch) = file_watch.as_mut() {
            file_watch_buffer(watch).push_str(payload);
        }
        let ready = match file_watch.as_ref() {
            Some(FileWatch::Read { buffer, .. }) => shell_file::poll_read(buffer).map(|ready| {
                CaptureReady {
                    value: ready.value.map(|file| FileOpResult::Read(file)),
                    leftover: ready.leftover,
                }
            }),
            Some(FileWatch::Write { buffer, .. }) => shell_file::poll_write(buffer).map(|ready| {
                CaptureReady {
                    value: ready.value.map(FileOpResult::Write),
                    leftover: ready.leftover,
                }
            }),
            None => None,
        };
        if let Some(ready) = ready {
            if let Some(watch) = file_watch.take() {
                match (watch, ready.value) {
                    (FileWatch::Read { response_tx, .. }, Ok(FileOpResult::Read(file))) => {
                        let _ = response_tx.send(Ok(file));
                    }
                    (FileWatch::Write { response_tx, .. }, Ok(FileOpResult::Write(path))) => {
                        let _ = response_tx.send(Ok(path));
                    }
                    (FileWatch::Read { response_tx, .. }, Err(error)) => {
                        let _ = response_tx.send(Err(error));
                    }
                    (FileWatch::Write { response_tx, .. }, Err(error)) => {
                        let _ = response_tx.send(Err(error));
                    }
                    (watch, _) => fail_file_watch(watch, "Could not update that file."),
                }
            }
            finish_ready_file_watch(pending_write, pwd_watch, file_watch, file_queue);
        }
        return;
    }
    emit_ssh_payload(app, event_name, payload.to_string(), pwd_watch);
}

enum FileOpResult {
    Read(CapturedShellFile),
    Write(String),
}

fn drain_ssh_commands(
    channel: &mut ssh2::Channel,
    commands: &mpsc::Receiver<SshIoCommand>,
    pending_write: &mut Vec<u8>,
    pwd_watch: &mut Option<PwdWatch>,
    file_watch: &mut Option<FileWatch>,
    file_queue: &mut VecDeque<QueuedFile>,
) -> DrainResult {
    while let Ok(command) = commands.try_recv() {
        match command {
            SshIoCommand::Shutdown => return DrainResult::Shutdown,
            SshIoCommand::Write(data) => {
                pending_write.extend(data);
            }
            SshIoCommand::Resize { cols, rows } => {
                if cols >= 2 && rows >= 2 {
                    let _ = channel.request_pty_size(cols, rows, None, None);
                }
            }
            SshIoCommand::QueryPwd { response_tx } => {
                if let Some(watch) = pwd_watch.as_mut() {
                    watch.response_txs.push(response_tx);
                    continue;
                }
                *pwd_watch = Some(PwdWatch {
                    buffer: String::new(),
                    response_txs: vec![response_tx],
                    started: Instant::now(),
                });
                pending_write.extend(PWD_PROBE_COMMAND);
            }
            SshIoCommand::ClearPwdWatch => {
                if let Some(watch) = pwd_watch.take() {
                    finish_pwd_watch(
                        watch,
                        Err(AppError::ConnectionFailed(
                            "Timed out reading shell working directory.".to_string(),
                        )),
                    );
                }
            }
            SshIoCommand::ReadFile { path, response_tx } => {
                let op = QueuedFile::Read { path, response_tx };
                if file_watch.is_some() {
                    file_queue.push_back(op);
                } else {
                    launch_file_op(pending_write, pwd_watch, file_watch, op);
                }
            }
            SshIoCommand::WriteFile {
                path,
                content,
                response_tx,
            } => {
                let op = QueuedFile::Write {
                    path,
                    content,
                    response_tx,
                };
                if file_watch.is_some() {
                    file_queue.push_back(op);
                } else {
                    launch_file_op(pending_write, pwd_watch, file_watch, op);
                }
            }
            SshIoCommand::ClearFileWatch => {
                pending_write.extend(b"\x03");
                if let Some(watch) = file_watch.take() {
                    fail_file_watch(watch, "Timed out reading the file from the shell.");
                }
                while let Some(op) = file_queue.pop_front() {
                    fail_queued_file(op, "Timed out reading the file from the shell.");
                }
            }
        }
    }
    DrainResult::Continue
}

fn emit_ssh_payload(
    app: &AppHandle,
    event_name: &str,
    payload: String,
    pwd_watch: &mut Option<PwdWatch>,
) {
    if let Some(watch) = pwd_watch.as_mut() {
        watch.buffer.push_str(&payload);
        if let Some(path) = extract_webiterm_pwd(&watch.buffer) {
            if let Some(watch) = pwd_watch.take() {
                finish_pwd_watch(watch, Ok(path));
            }
        }
    }
    let cleaned = strip_webiterm_pwd_artifacts(&payload);
    if !cleaned.is_empty() {
        emit_terminal_output(app, event_name, cleaned);
    }
}

fn extract_webiterm_pwd(buffer: &str) -> Option<String> {
    let mut resolved = None;
    let mut search_from = 0usize;
    while let Some(rel) = buffer[search_from..].find(PWD_LINE_PREFIX) {
        let idx = search_from + rel;
        let after = &buffer[idx + PWD_LINE_PREFIX.len()..];
        let Some(line_end) = after.find('\n').or_else(|| after.find('\r')) else {
            break;
        };
        let path = normalize_remote_path(after[..line_end].trim());
        if is_plausible_shell_pwd(&path) {
            resolved = Some(path);
        }
        search_from = idx + PWD_LINE_PREFIX.len() + line_end + 1;
    }
    for line in buffer.lines() {
        let trimmed = line.trim().trim_end_matches('\r');
        if trimmed.is_empty() || trimmed.contains(PWD_LINE_PREFIX) || trimmed == "pwd -P" {
            continue;
        }
        if trimmed.starts_with('/') {
            let path = normalize_remote_path(trimmed);
            if is_plausible_shell_pwd(&path) {
                resolved = Some(path);
            }
        }
    }
    resolved
}

pub(crate) fn normalize_remote_path(path: &str) -> String {
    strip_ansi_escapes(path)
        .chars()
        .filter(|ch| *ch != '\r' && *ch != '\n')
        .collect()
}

pub(crate) fn is_plausible_shell_pwd(path: &str) -> bool {
    let path = path.trim();
    if path.is_empty() || path.contains('%') {
        return false;
    }
    if path.chars().any(char::is_whitespace) {
        return false;
    }
    if !(path.starts_with('/') || path.starts_with('~')) {
        return false;
    }
    path.len() >= 2
}

fn strip_ansi_escapes(value: &str) -> String {
    let mut out = String::new();
    let mut chars = value.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            while let Some(&next) = chars.peek() {
                chars.next();
                if next.is_ascii_alphabetic() || next == '@' {
                    break;
                }
            }
            continue;
        }
        out.push(ch);
    }
    out
}

fn strip_webiterm_pwd_artifacts(payload: &str) -> String {
    let mut cleaned = String::new();
    for line in payload.split_inclusive('\n') {
        if line.contains(PWD_LINE_PREFIX) {
            continue;
        }
        cleaned.push_str(line);
    }
    cleaned
}

fn flush_ssh_pending_write(channel: &mut ssh2::Channel, pending: &mut Vec<u8>) {
    while !pending.is_empty() {
        match channel.write(pending) {
            Ok(0) => break,
            Ok(written) => {
                let end = written.min(pending.len());
                pending.drain(0..end);
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => break,
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => break,
        }
    }
}

fn ssh_shell_env() -> [(&'static str, &'static str); 5] {
    [
        ("TERM", "xterm-256color"),
        ("COLORTERM", "truecolor"),
        ("CLICOLOR", "1"),
        ("CLICOLOR_FORCE", "1"),
        ("FORCE_COLOR", "1"),
    ]
}

fn wait_for_ssh_io(
    session: &Session,
    commands: &mpsc::Receiver<SshIoCommand>,
    channel: &mut ssh2::Channel,
    pending_write: &mut Vec<u8>,
    shutdown: &mut bool,
    pwd_watch: &mut Option<PwdWatch>,
    file_watch: &mut Option<FileWatch>,
    file_queue: &mut VecDeque<QueuedFile>,
) {
    expire_pwd_watch_if_needed(pwd_watch);
    expire_file_watch_if_needed(file_watch, file_queue, pending_write);
    let _ = session.keepalive_send();
    flush_ssh_pending_write(channel, pending_write);
    for _ in 0..40 {
        if matches!(
            drain_ssh_commands(
                channel,
                commands,
                pending_write,
                pwd_watch,
                file_watch,
                file_queue,
            ),
            DrainResult::Shutdown
        ) {
            *shutdown = true;
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
    // Keep NAT/firewalls from dropping idle SSH sessions (interval in seconds).
    session.set_keepalive(true, 30);
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
    cols: u32,
    rows: u32,
) -> Result<(ssh2::Channel, Session), AppError> {
    let session = connect_ssh_session(host, port, username, auth_method, secret, private_key_path)?;
    let mut channel = session
        .channel_session()
        .map_err(|_| AppError::ConnectionFailed("Could not open SSH channel.".to_string()))?;
    channel
        .request_pty("xterm-256color", None, Some((cols, rows, 0, 0)))
        .map_err(|_| AppError::ConnectionFailed("Could not request SSH PTY.".to_string()))?;
    for (key, value) in ssh_shell_env() {
        let _ = channel.setenv(key, value);
    }
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
