use tauri::State;

use crate::error::{AppError, CommandError, command_error};
use crate::storage::{self, Database};
use crate::terminal::{RemoteFileContent, SshTerminalManager};

#[tauri::command]
pub async fn ssh_read_remote_file(
    state: State<'_, Database>,
    connection_id: String,
    remote_path: String,
    working_directory: Option<String>,
) -> Result<RemoteFileContent, CommandError> {
    let connection = storage::get_connection(&state, &connection_id)
        .map_err(command_error)?
        .ok_or_else(|| command_error(AppError::NotFound))?;
    let password = storage::resolve_password(&state, &connection.id)
        .map_err(command_error)?
        .unwrap_or_default();
    let working_directory = working_directory
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    tokio::task::spawn_blocking(move || {
        crate::terminal::read_connection_remote_file(
            &connection,
            &password,
            &remote_path,
            working_directory.as_deref(),
        )
    })
    .await
    .map_err(|_| command_error(AppError::ConnectionFailed("Read task failed.".to_string())))?
    .map_err(command_error)
}

#[tauri::command]
pub async fn ssh_write_remote_file(
    state: State<'_, Database>,
    connection_id: String,
    remote_path: String,
    working_directory: Option<String>,
    content: String,
) -> Result<String, CommandError> {
    let connection = storage::get_connection(&state, &connection_id)
        .map_err(command_error)?
        .ok_or_else(|| command_error(AppError::NotFound))?;
    let password = storage::resolve_password(&state, &connection.id)
        .map_err(command_error)?
        .unwrap_or_default();
    let working_directory = working_directory
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    tokio::task::spawn_blocking(move || {
        crate::terminal::write_connection_remote_file(
            &connection,
            &password,
            &remote_path,
            working_directory.as_deref(),
            &content,
        )
    })
    .await
    .map_err(|_| command_error(AppError::ConnectionFailed("Write task failed.".to_string())))?
    .map_err(command_error)
}

#[tauri::command]
pub async fn ssh_terminal_read_file(
    manager: State<'_, SshTerminalManager>,
    connection_id: String,
    terminal_session_id: String,
    remote_path: String,
) -> Result<RemoteFileContent, CommandError> {
    let _ = connection_id;
    let captured = manager
        .read_file_via_shell(&terminal_session_id, &remote_path)
        .map_err(command_error)?;
    Ok(RemoteFileContent {
        resolved_path: captured.resolved_path,
        content: captured.content,
        truncated: captured.truncated,
    })
}

#[tauri::command]
pub async fn ssh_terminal_write_file(
    manager: State<'_, SshTerminalManager>,
    connection_id: String,
    terminal_session_id: String,
    remote_path: String,
    content: String,
) -> Result<String, CommandError> {
    let _ = connection_id;
    manager
        .write_file_via_shell(&terminal_session_id, &remote_path, &content)
        .map_err(command_error)
}
