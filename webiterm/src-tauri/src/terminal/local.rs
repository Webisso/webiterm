use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::sync::mpsc;

use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use serde::Serialize;
use tauri::AppHandle;
use uuid::Uuid;

use crate::error::AppError;
use crate::terminal::emit_terminal_output;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellSessionInfo {
    pub id: String,
    pub title: String,
}

enum LocalIoCommand {
    Write(Vec<u8>),
    Resize { cols: u16, rows: u16 },
    Shutdown,
}

struct LocalSession {
    command_tx: mpsc::Sender<LocalIoCommand>,
}

pub struct LocalTerminalManager {
    sessions: Mutex<HashMap<String, LocalSession>>,
}

impl LocalTerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn open(
        &self,
        app: AppHandle,
        terminal_session_id: Option<String>,
    ) -> Result<LocalShellSessionInfo, AppError> {
        let session_id = terminal_session_id
            .filter(|id| !id.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let info = LocalShellSessionInfo {
            id: session_id.clone(),
            title: "Local".to_string(),
        };
        let event_name = format!("terminal-output-{}", session_id);
        let (command_tx, command_rx) = mpsc::channel();
        {
            let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
            sessions.insert(
                session_id.clone(),
                LocalSession {
                    command_tx: command_tx.clone(),
                },
            );
        }
        std::thread::spawn(move || run_local_session_io(app, event_name, command_rx));
        Ok(info)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        session
            .command_tx
            .send(LocalIoCommand::Write(data.as_bytes().to_vec()))
            .map_err(|_| AppError::ConnectionFailed("Local shell is closed.".to_string()))?;
        Ok(())
    }

    pub fn resize(&self, session_id: &str, cols: u32, rows: u32) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        session
            .command_tx
            .send(LocalIoCommand::Resize {
                cols: cols.min(u16::MAX as u32) as u16,
                rows: rows.min(u16::MAX as u32) as u16,
            })
            .map_err(|_| AppError::ConnectionFailed("Local shell is closed.".to_string()))?;
        Ok(())
    }

    pub fn close(&self, session_id: &str) -> Result<(), AppError> {
        let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.remove(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let _ = session.command_tx.send(LocalIoCommand::Shutdown);
        Ok(())
    }
}

fn run_local_session_io(app: AppHandle, event_name: String, commands: mpsc::Receiver<LocalIoCommand>) {
    let pty_system = native_pty_system();
    let pair = match pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }) {
        Ok(pair) => pair,
        Err(_) => {
            emit_terminal_output(
                &app,
                &event_name,
                "\r\n\x1b[31mCould not open a local terminal.\x1b[0m\r\n".to_string(),
            );
            return;
        }
    };

    let shell = default_shell();
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("CLICOLOR", "1");
    cmd.env("CLICOLOR_FORCE", "1");
    cmd.env("FORCE_COLOR", "1");

    let mut child = match pair.slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(_) => {
            emit_terminal_output(
                &app,
                &event_name,
                "\r\n\x1b[31mCould not start the local shell.\x1b[0m\r\n".to_string(),
            );
            return;
        }
    };

    let mut reader = match pair.master.try_clone_reader() {
        Ok(reader) => reader,
        Err(_) => {
            let _ = child.kill();
            return;
        }
    };
    let mut writer = match pair.master.take_writer() {
        Ok(writer) => writer,
        Err(_) => {
            let _ = child.kill();
            return;
        }
    };

    let app_reader = app.clone();
    let event_name_reader = event_name.clone();
    let (read_done_tx, read_done_rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        while let Ok(count) = reader.read(&mut buffer) {
            if count == 0 {
                break;
            }
            let payload = String::from_utf8_lossy(&buffer[..count]).to_string();
            emit_terminal_output(&app_reader, &event_name_reader, payload);
        }
        let _ = read_done_tx.send(());
    });

    let mut running = true;
    while running {
        match commands.recv_timeout(std::time::Duration::from_millis(50)) {
            Ok(LocalIoCommand::Shutdown) => running = false,
            Ok(LocalIoCommand::Write(data)) => {
                if writer.write_all(&data).is_err() {
                    running = false;
                }
            }
            Ok(LocalIoCommand::Resize { cols, rows }) => {
                let _ = pair.master.resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                });
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if child.try_wait().ok().flatten().is_some() {
                    running = false;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => running = false,
        }
    }

    let _ = child.kill();
    let _ = child.wait();
    let _ = read_done_rx.recv_timeout(std::time::Duration::from_millis(250));
    emit_terminal_output(&app, &event_name, "\r\n[session closed]\r\n".to_string());
}

fn default_shell() -> String {
    if let Ok(shell) = std::env::var("SHELL") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if std::path::Path::new("/bin/zsh").exists() {
        return "/bin/zsh".to_string();
    }
    "/bin/bash".to_string()
}
