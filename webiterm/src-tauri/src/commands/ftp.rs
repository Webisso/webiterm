use tauri::State;

use crate::error::{AppError, CommandError, command_error};
use crate::storage::{self, Database};
use std::path::PathBuf;

use crate::terminal::{
    FtpListResult, FtpManager, FtpPrepareEditResult, FtpSessionInfo, FtpSyncEditsResult,
};

#[tauri::command]
pub async fn ftp_open(
    state: State<'_, Database>,
    manager: State<'_, FtpManager>,
    connection_id: String,
    ftp_session_id: Option<String>,
) -> Result<FtpSessionInfo, CommandError> {
    let connection = storage::get_connection(&state, &connection_id)
        .map_err(command_error)?
        .ok_or_else(|| command_error(AppError::NotFound))?;
    let password = storage::resolve_password(&state, &connection.id).map_err(command_error)?;
    manager
        .open(connection, password, ftp_session_id)
        .await
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_list(
    manager: State<'_, FtpManager>,
    session_id: String,
) -> Result<FtpListResult, CommandError> {
    manager.list(&session_id).map_err(command_error)
}

#[tauri::command]
pub fn ftp_change_dir(
    manager: State<'_, FtpManager>,
    session_id: String,
    path: String,
) -> Result<FtpListResult, CommandError> {
    manager
        .change_dir(&session_id, &path)
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_parent_dir(
    manager: State<'_, FtpManager>,
    session_id: String,
) -> Result<FtpListResult, CommandError> {
    manager.parent_dir(&session_id).map_err(command_error)
}

#[tauri::command]
pub fn ftp_goto(
    manager: State<'_, FtpManager>,
    session_id: String,
    path: String,
) -> Result<FtpListResult, CommandError> {
    manager.goto_path(&session_id, &path).map_err(command_error)
}

#[tauri::command]
pub fn ftp_download(
    manager: State<'_, FtpManager>,
    session_id: String,
    file_name: String,
    local_path: String,
) -> Result<(), CommandError> {
    manager
        .download(&session_id, &file_name, PathBuf::from(local_path).as_path())
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_delete(
    manager: State<'_, FtpManager>,
    session_id: String,
    name: String,
    is_dir: bool,
) -> Result<FtpListResult, CommandError> {
    manager
        .delete(&session_id, &name, is_dir)
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_rename(
    manager: State<'_, FtpManager>,
    session_id: String,
    from_name: String,
    to_name: String,
) -> Result<FtpListResult, CommandError> {
    manager
        .rename(&session_id, &from_name, &to_name)
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_prepare_edit(
    manager: State<'_, FtpManager>,
    session_id: String,
    file_name: String,
) -> Result<FtpPrepareEditResult, CommandError> {
    manager
        .prepare_edit(&session_id, &file_name)
        .map_err(command_error)
}

#[tauri::command]
pub fn ftp_sync_edits(
    manager: State<'_, FtpManager>,
    session_id: String,
) -> Result<FtpSyncEditsResult, CommandError> {
    manager.sync_edits(&session_id).map_err(command_error)
}

#[tauri::command]
pub fn ftp_close(manager: State<'_, FtpManager>, session_id: String) -> Result<(), CommandError> {
    manager.close(&session_id).map_err(command_error)
}
