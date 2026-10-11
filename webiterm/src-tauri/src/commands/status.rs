use tauri::State;

use crate::domain::{AppStatus, LocalPreferences};
use crate::error::{CommandError, command_error};
use crate::storage::{self, Database};

#[tauri::command]
pub async fn get_app_status(state: State<'_, Database>) -> Result<AppStatus, CommandError> {
    state.status().map_err(command_error)
}

#[tauri::command]
pub async fn get_local_preferences(
    state: State<'_, Database>,
) -> Result<LocalPreferences, CommandError> {
    state.preferences().map_err(command_error)
}

#[tauri::command]
pub async fn set_inspector_collapsed(
    state: State<'_, Database>,
    collapsed: bool,
) -> Result<LocalPreferences, CommandError> {
    storage::set_inspector_collapsed(&state, collapsed).map_err(command_error)?;
    Ok(LocalPreferences {
        inspector_collapsed: collapsed,
    })
}
