use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{
    Database, SshCommandFavorite, SshCommandFavoriteInput, SshCommandFavoriteUpdate,
    create_ssh_command_favorite, delete_ssh_command_favorite, list_ssh_command_favorites,
    update_ssh_command_favorite,
};

#[tauri::command]
pub async fn list_ssh_command_favorites_cmd(
    state: State<'_, Database>,
    connection_id: String,
) -> Result<Vec<SshCommandFavorite>, CommandError> {
    list_ssh_command_favorites(&state, &connection_id).map_err(command_error)
}

#[tauri::command]
pub async fn create_ssh_command_favorite_cmd(
    state: State<'_, Database>,
    input: SshCommandFavoriteInput,
) -> Result<SshCommandFavorite, CommandError> {
    create_ssh_command_favorite(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_ssh_command_favorite_cmd(
    state: State<'_, Database>,
    id: String,
    update: SshCommandFavoriteUpdate,
) -> Result<SshCommandFavorite, CommandError> {
    update_ssh_command_favorite(&state, &id, update).map_err(command_error)
}

#[tauri::command]
pub async fn delete_ssh_command_favorite_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<(), CommandError> {
    delete_ssh_command_favorite(&state, &id).map_err(command_error)
}
