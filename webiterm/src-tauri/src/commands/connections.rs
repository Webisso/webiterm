use tauri::State;

use crate::domain::{ConnectionInput, ConnectionSummary, ConnectionTestResult};
use crate::error::{CommandError, command_error};
use crate::storage::{self, Database};

#[tauri::command]
pub async fn list_connections(
    state: State<'_, Database>,
    query: Option<String>,
) -> Result<Vec<ConnectionSummary>, CommandError> {
    storage::list_connections(&state, query.as_deref().unwrap_or("")).map_err(command_error)
}

#[tauri::command]
pub async fn create_connection(
    state: State<'_, Database>,
    input: ConnectionInput,
) -> Result<ConnectionSummary, CommandError> {
    storage::create_connection(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, Database>,
    id: String,
    input: ConnectionInput,
) -> Result<ConnectionSummary, CommandError> {
    storage::update_connection(&state, &id, input).map_err(command_error)
}

#[tauri::command]
pub async fn delete_connection(state: State<'_, Database>, id: String) -> Result<(), CommandError> {
    storage::delete_connection(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn assign_connection_group_cmd(
    state: State<'_, Database>,
    id: String,
    group_id: Option<String>,
) -> Result<ConnectionSummary, CommandError> {
    storage::assign_connection_group(&state, &id, group_id).map_err(command_error)
}

#[tauri::command]
pub async fn test_connection(
    state: State<'_, Database>,
    id: String,
) -> Result<ConnectionTestResult, CommandError> {
    storage::test_connection(&state, &id)
        .await
        .map_err(command_error)
}
