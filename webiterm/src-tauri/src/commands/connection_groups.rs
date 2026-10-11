use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{
    ConnectionGroup, ConnectionGroupInput, ConnectionGroupUpdate, Database,
    create_connection_group, delete_connection_group, list_connection_groups,
    update_connection_group,
};

#[tauri::command]
pub async fn list_connection_groups_cmd(
    state: State<'_, Database>,
) -> Result<Vec<ConnectionGroup>, CommandError> {
    list_connection_groups(&state).map_err(command_error)
}

#[tauri::command]
pub async fn create_connection_group_cmd(
    state: State<'_, Database>,
    input: ConnectionGroupInput,
) -> Result<ConnectionGroup, CommandError> {
    create_connection_group(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_connection_group_cmd(
    state: State<'_, Database>,
    id: String,
    update: ConnectionGroupUpdate,
) -> Result<ConnectionGroup, CommandError> {
    update_connection_group(&state, &id, update).map_err(command_error)
}

#[tauri::command]
pub async fn delete_connection_group_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<(), CommandError> {
    delete_connection_group(&state, &id).map_err(command_error)
}
