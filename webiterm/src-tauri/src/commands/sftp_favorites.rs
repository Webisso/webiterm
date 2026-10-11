use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{
    Database, SftpFavorite, SftpFavoriteInput, SftpFavoriteUpdate, create_sftp_favorite,
    delete_sftp_favorite, list_sftp_favorites, update_sftp_favorite,
};

#[tauri::command]
pub async fn list_sftp_favorites_cmd(
    state: State<'_, Database>,
    connection_id: String,
) -> Result<Vec<SftpFavorite>, CommandError> {
    list_sftp_favorites(&state, &connection_id).map_err(command_error)
}

#[tauri::command]
pub async fn create_sftp_favorite_cmd(
    state: State<'_, Database>,
    input: SftpFavoriteInput,
) -> Result<SftpFavorite, CommandError> {
    create_sftp_favorite(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_sftp_favorite_cmd(
    state: State<'_, Database>,
    id: String,
    update: SftpFavoriteUpdate,
) -> Result<SftpFavorite, CommandError> {
    update_sftp_favorite(&state, &id, update).map_err(command_error)
}

#[tauri::command]
pub async fn delete_sftp_favorite_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<(), CommandError> {
    delete_sftp_favorite(&state, &id).map_err(command_error)
}
