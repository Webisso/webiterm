use tauri::State;

use crate::error::{CommandError, command_error};
use crate::storage::{
    Database, NewTask, NewTaskBoard, NewTaskComment, NewTaskImage, TaskBoardDetail,
    TaskBoardSummary, TaskUpdate, add_task_comment, add_task_image, create_task, create_task_board,
    delete_task, delete_task_board, delete_task_boards_for_group, delete_task_comment,
    delete_task_image, get_task_board, list_task_boards, move_task, rename_task_board, update_task,
};

#[tauri::command]
pub async fn list_task_boards_cmd(
    state: State<'_, Database>,
) -> Result<Vec<TaskBoardSummary>, CommandError> {
    list_task_boards(&state).map_err(command_error)
}

#[tauri::command]
pub async fn create_task_board_cmd(
    state: State<'_, Database>,
    input: NewTaskBoard,
) -> Result<TaskBoardSummary, CommandError> {
    create_task_board(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn rename_task_board_cmd(
    state: State<'_, Database>,
    id: String,
    name: String,
) -> Result<TaskBoardSummary, CommandError> {
    rename_task_board(&state, &id, &name).map_err(command_error)
}

#[tauri::command]
pub async fn delete_task_board_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<(), CommandError> {
    delete_task_board(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn delete_task_boards_for_group_cmd(
    state: State<'_, Database>,
    group_id: String,
) -> Result<(), CommandError> {
    delete_task_boards_for_group(&state, &group_id).map_err(command_error)
}

#[tauri::command]
pub async fn get_task_board_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<TaskBoardDetail, CommandError> {
    get_task_board(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn create_task_cmd(
    state: State<'_, Database>,
    input: NewTask,
) -> Result<TaskBoardDetail, CommandError> {
    create_task(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn update_task_cmd(
    state: State<'_, Database>,
    id: String,
    update: TaskUpdate,
) -> Result<TaskBoardDetail, CommandError> {
    update_task(&state, &id, update).map_err(command_error)
}

#[tauri::command]
pub async fn move_task_cmd(
    state: State<'_, Database>,
    task_id: String,
    column_key: String,
    before_id: Option<String>,
) -> Result<TaskBoardDetail, CommandError> {
    move_task(&state, &task_id, &column_key, before_id).map_err(command_error)
}

#[tauri::command]
pub async fn delete_task_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<TaskBoardDetail, CommandError> {
    delete_task(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn add_task_image_cmd(
    state: State<'_, Database>,
    input: NewTaskImage,
) -> Result<TaskBoardDetail, CommandError> {
    add_task_image(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn delete_task_image_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<TaskBoardDetail, CommandError> {
    delete_task_image(&state, &id).map_err(command_error)
}

#[tauri::command]
pub async fn add_task_comment_cmd(
    state: State<'_, Database>,
    input: NewTaskComment,
) -> Result<TaskBoardDetail, CommandError> {
    add_task_comment(&state, input).map_err(command_error)
}

#[tauri::command]
pub async fn delete_task_comment_cmd(
    state: State<'_, Database>,
    id: String,
) -> Result<TaskBoardDetail, CommandError> {
    delete_task_comment(&state, &id).map_err(command_error)
}
