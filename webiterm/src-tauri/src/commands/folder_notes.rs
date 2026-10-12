use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{
    Database, FolderNoteDetail, FolderNoteSummary, FolderNoteUpdate, NewFolderNote,
    create_folder_note, delete_folder_note, delete_folder_notes_for_group, get_folder_note,
    list_folder_notes, rename_folder_note, update_folder_note,
};

#[tauri::command]
pub async fn list_folder_notes_cmd(
    state: State<'_, Database>,
) -> Result<Vec<FolderNoteSummary>, CommandError> {
    list_folder_notes(&state).map_err(command_error)
}

#[tauri::command]
pub async fn get_folder_note_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<FolderNoteDetail, CommandError> {
    get_folder_note(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn create_folder_note_cmd(
    state: State<'_, Database>,
    input: NewFolderNote,
) -> Result<FolderNoteDetail, CommandError> {
    create_folder_note(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_folder_note_cmd(
    state: State<'_, Database>,
    id: String,
    update: FolderNoteUpdate,
) -> Result<FolderNoteDetail, CommandError> {
    update_folder_note(&state, &id, update).map_err(command_error)
}

#[tauri::command]
pub async fn rename_folder_note_cmd(
    state: State<'_, Database>,
    id: String,
    name: String,
) -> Result<FolderNoteSummary, CommandError> {
    rename_folder_note(&state, &id, &name).map_err(command_error)
}

#[tauri::command]
pub async fn delete_folder_note_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<(), CommandError> {
    delete_folder_note(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn delete_folder_notes_for_group_cmd(
    state: State<'_, Database>,
    group_id: String,
) -> Result<(), CommandError> {
    delete_folder_notes_for_group(&state, &group_id).map_err(command_error)
}
