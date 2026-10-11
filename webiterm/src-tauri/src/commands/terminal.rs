use tauri::{AppHandle, State};

use crate::error::{AppError, CommandError, command_error};
use crate::storage::{self, Database};
use crate::terminal::{SshTerminalManager, TerminalSessionInfo};

#[tauri::command]
pub async fn ssh_open(
    app: AppHandle,
    state: State<'_, Database>,
    manager: State<'_, SshTerminalManager>,
    connection_id: String,
    terminal_session_id: Option<String>,
) -> Result<TerminalSessionInfo, CommandError> {
    let connection = storage::get_connection(&state, &connection_id)
        .map_err(command_error)?
        .ok_or_else(|| command_error(AppError::NotFound))?;
    let password = storage::resolve_password(&state, &connection.id).map_err(command_error)?;
    manager
        .open(app, connection, password, terminal_session_id)
        .await
        .map_err(command_error)
}

#[tauri::command]
pub async fn ssh_write(
    manager: State<'_, SshTerminalManager>,
    session_id: String,
    data: String,
) -> Result<(), CommandError> {
    manager.write(&session_id, &data).map_err(command_error)
}

#[tauri::command]
pub async fn ssh_resize(
    manager: State<'_, SshTerminalManager>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), CommandError> {
    manager
        .resize(&session_id, cols, rows)
        .map_err(command_error)
}

#[tauri::command]
pub async fn ssh_close(
    manager: State<'_, SshTerminalManager>,
    session_id: String,
) -> Result<(), CommandError> {
    manager.close(&session_id).map_err(command_error)
}
