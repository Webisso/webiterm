use std::fs;

use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::Database;

#[tauri::command]
pub fn export_local_data(state: State<'_, Database>, path: String) -> Result<(), CommandError> {
    let json = state.export_json().map_err(command_error)?;
    fs::write(path, json).map_err(|err| command_error(err.into()))
}

#[tauri::command]
pub fn import_local_data(state: State<'_, Database>, path: String) -> Result<(), CommandError> {
    let raw = fs::read_to_string(path).map_err(|err| command_error(err.into()))?;
    state.import_json(&raw).map_err(command_error)
}
