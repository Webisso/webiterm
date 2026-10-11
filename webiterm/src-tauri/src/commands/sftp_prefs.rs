use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{self, Database, SftpEditorPrefs};

#[tauri::command]
pub async fn get_sftp_editor_prefs(
    state: State<'_, Database>,
) -> Result<SftpEditorPrefs, CommandError> {
    storage::get_sftp_editor_prefs(&state).map_err(command_error)
}

#[tauri::command]
pub async fn set_sftp_editor_prefs(
    state: State<'_, Database>,
    prefs: SftpEditorPrefs,
) -> Result<SftpEditorPrefs, CommandError> {
    storage::set_sftp_editor_prefs(&state, prefs).map_err(command_error)
}
