use base64::Engine;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Database;
use super::document::now_iso;
use crate::error::AppError;

const MAX_IMAGE_BYTES: usize = 1_400_000;
const MAX_TASK_IMAGES: usize = 8;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskBoardSummary {
    pub id: String,
    pub group_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardImage {
    pub id: String,
    pub mime: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardComment {
    pub id: String,
    pub body: String,
    pub created_at: String,
    pub image: Option<BoardImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardTask {
    pub id: String,
    pub column_key: String,
    pub title: String,
    pub body: String,
    pub sort_order: i32,
    pub images: Vec<BoardImage>,
    pub comments: Vec<BoardComment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskBoardDetail {
    pub board: TaskBoardSummary,
    pub tasks: Vec<BoardTask>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTaskBoard {
    pub group_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTask {
    pub board_id: String,
    pub title: String,
    pub column_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdate {
    pub title: String,
    pub body: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTaskImage {
    pub task_id: String,
    pub mime: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTaskComment {
    pub task_id: String,
    pub body: String,
    pub image_mime: Option<String>,
    pub image_base64: Option<String>,
}

pub fn column_key(value: &str) -> Result<String, AppError> {
    let key = value.trim();
    if matches!(key, "planning" | "doing" | "on_test" | "done" | "cancelled") {
        Ok(key.to_string())
    } else {
        Err(AppError::UserFacing("Unknown board column.".into()))
    }
}

pub fn decode_image_payload(mime: &str, data_base64: &str) -> Result<(String, Vec<u8>), AppError> {
    let normalized = mime.trim().to_ascii_lowercase();
    if !matches!(
        normalized.as_str(),
        "image/png" | "image/jpeg" | "image/jpg" | "image/gif" | "image/webp"
    ) {
        return Err(AppError::UserFacing(
            "Use a PNG, JPEG, GIF, or WebP image.".into(),
        ));
    }
    let mime = if normalized == "image/jpg" {
        "image/jpeg".to_string()
    } else {
        normalized
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|_| AppError::UserFacing("Image data is invalid.".into()))?;
    if bytes.is_empty() || bytes.len() > MAX_IMAGE_BYTES {
        return Err(AppError::UserFacing("Image must be under 1.4 MB.".into()));
    }
    Ok((mime, bytes))
}

fn board_name(value: &str) -> Result<String, AppError> {
    let name = value.trim();
    let len = name.chars().count();
    if name.is_empty() || len > 80 {
        return Err(AppError::UserFacing(
            "Board name must be 1–80 characters.".into(),
        ));
    }
    Ok(name.to_string())
}

fn task_title(value: &str) -> Result<String, AppError> {
    let title = value.trim();
    let len = title.chars().count();
    if title.is_empty() || len > 200 {
        return Err(AppError::UserFacing(
            "Task title must be 1–200 characters.".into(),
        ));
    }
    Ok(title.to_string())
}

fn task_body(value: &str) -> Result<String, AppError> {
    let body = value.trim();
    if body.chars().count() > 8_000 {
        return Err(AppError::UserFacing(
            "Description must be under 8,000 characters.".into(),
        ));
    }
    Ok(body.to_string())
}

fn sort_tasks(tasks: &mut [BoardTask]) {
    tasks.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.id.cmp(&right.id))
    });
}

pub fn list_task_boards(db: &Database) -> Result<Vec<TaskBoardSummary>, AppError> {
    db.read(|document| {
        let mut boards: Vec<_> = document
            .boards
            .iter()
            .map(|item| item.board.clone())
            .collect();
        boards.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
        boards
    })
}

pub fn create_task_board(db: &Database, input: NewTaskBoard) -> Result<TaskBoardSummary, AppError> {
    let name = board_name(&input.name)?;
    let group_id = input.group_id.trim().to_string();
    if group_id.is_empty() {
        return Err(AppError::UserFacing(
            "Choose a folder for this board.".into(),
        ));
    }
    let board = TaskBoardSummary {
        id: Uuid::new_v4().to_string(),
        group_id,
        name,
    };
    db.update(|document| {
        document.boards.push(TaskBoardDetail {
            board: board.clone(),
            tasks: Vec::new(),
        });
        Ok(board)
    })
}

pub fn rename_task_board(
    db: &Database,
    id: &str,
    name: &str,
) -> Result<TaskBoardSummary, AppError> {
    let name = board_name(name)?;
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.board.id == id)
            .ok_or_else(|| AppError::UserFacing("Board was not found.".into()))?;
        board.board.name = name;
        Ok(board.board.clone())
    })
}

pub fn delete_task_board(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        document.boards.retain(|item| item.board.id != id);
        Ok(())
    })
}

pub fn delete_task_boards_for_group(db: &Database, group_id: &str) -> Result<(), AppError> {
    db.update(|document| {
        document
            .boards
            .retain(|item| item.board.group_id != group_id);
        Ok(())
    })
}

pub fn get_task_board(db: &Database, id: &str) -> Result<TaskBoardDetail, AppError> {
    db.read(|document| {
        document
            .boards
            .iter()
            .find(|item| item.board.id == id)
            .cloned()
            .ok_or_else(|| AppError::UserFacing("Board was not found.".into()))
    })?
}

pub fn create_task(db: &Database, input: NewTask) -> Result<TaskBoardDetail, AppError> {
    let title = task_title(&input.title)?;
    let column = column_key(input.column_key.as_deref().unwrap_or("planning"))?;
    let board_id = input.board_id.trim().to_string();
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.board.id == board_id)
            .ok_or_else(|| AppError::UserFacing("Board was not found.".into()))?;
        let sort_order = board
            .tasks
            .iter()
            .filter(|task| task.column_key == column)
            .map(|task| task.sort_order)
            .max()
            .unwrap_or(-1)
            + 1;
        board.tasks.push(BoardTask {
            id: Uuid::new_v4().to_string(),
            column_key: column,
            title,
            body: String::new(),
            sort_order,
            images: Vec::new(),
            comments: Vec::new(),
        });
        sort_tasks(&mut board.tasks);
        Ok(board.clone())
    })
}

pub fn update_task(
    db: &Database,
    id: &str,
    update: TaskUpdate,
) -> Result<TaskBoardDetail, AppError> {
    let title = task_title(&update.title)?;
    let body = task_body(&update.body)?;
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.tasks.iter().any(|task| task.id == id))
            .ok_or_else(|| AppError::UserFacing("Task was not found.".into()))?;
        let task = board.tasks.iter_mut().find(|task| task.id == id).unwrap();
        task.title = title;
        task.body = body;
        Ok(board.clone())
    })
}

pub fn move_task(
    db: &Database,
    task_id: &str,
    column: &str,
    before_id: Option<String>,
) -> Result<TaskBoardDetail, AppError> {
    let column = column_key(column)?;
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.tasks.iter().any(|task| task.id == task_id))
            .ok_or_else(|| AppError::UserFacing("Task was not found.".into()))?;
        let mut ids: Vec<String> = board
            .tasks
            .iter()
            .filter(|task| task.column_key == column && task.id != task_id)
            .map(|task| task.id.clone())
            .collect();
        if let Some(before) = before_id.as_deref() {
            if let Some(index) = ids.iter().position(|item| item == before) {
                ids.insert(index, task_id.to_string());
            } else {
                ids.push(task_id.to_string());
            }
        } else {
            ids.push(task_id.to_string());
        }
        for (index, id) in ids.iter().enumerate() {
            if let Some(task) = board.tasks.iter_mut().find(|task| &task.id == id) {
                task.column_key = column.clone();
                task.sort_order = index as i32;
            }
        }
        sort_tasks(&mut board.tasks);
        Ok(board.clone())
    })
}

pub fn delete_task(db: &Database, id: &str) -> Result<TaskBoardDetail, AppError> {
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.tasks.iter().any(|task| task.id == id))
            .ok_or_else(|| AppError::UserFacing("Task was not found.".into()))?;
        board.tasks.retain(|task| task.id != id);
        Ok(board.clone())
    })
}

pub fn add_task_image(db: &Database, input: NewTaskImage) -> Result<TaskBoardDetail, AppError> {
    let (mime, bytes) = decode_image_payload(&input.mime, &input.data_base64)?;
    let data_base64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.tasks.iter().any(|task| task.id == input.task_id))
            .ok_or_else(|| AppError::UserFacing("Task was not found.".into()))?;
        let task = board
            .tasks
            .iter_mut()
            .find(|task| task.id == input.task_id)
            .unwrap();
        if task.images.len() >= MAX_TASK_IMAGES {
            return Err(AppError::UserFacing(
                "A task can have up to 8 images.".into(),
            ));
        }
        task.images.push(BoardImage {
            id: Uuid::new_v4().to_string(),
            mime,
            data_base64,
        });
        Ok(board.clone())
    })
}

pub fn delete_task_image(db: &Database, id: &str) -> Result<TaskBoardDetail, AppError> {
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| {
                item.tasks
                    .iter()
                    .any(|task| task.images.iter().any(|image| image.id == id))
            })
            .ok_or_else(|| AppError::UserFacing("Image was not found.".into()))?;
        for task in &mut board.tasks {
            task.images.retain(|image| image.id != id);
        }
        Ok(board.clone())
    })
}

pub fn add_task_comment(db: &Database, input: NewTaskComment) -> Result<TaskBoardDetail, AppError> {
    let body = task_body(&input.body)?;
    let image = match (input.image_mime.as_deref(), input.image_base64.as_deref()) {
        (Some(mime), Some(data)) if !data.trim().is_empty() => {
            let (mime, bytes) = decode_image_payload(mime, data)?;
            Some(BoardImage {
                id: Uuid::new_v4().to_string(),
                mime,
                data_base64: base64::engine::general_purpose::STANDARD.encode(bytes),
            })
        }
        _ => None,
    };
    if body.is_empty() && image.is_none() {
        return Err(AppError::UserFacing(
            "Write a comment or attach an image.".into(),
        ));
    }
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| item.tasks.iter().any(|task| task.id == input.task_id))
            .ok_or_else(|| AppError::UserFacing("Task was not found.".into()))?;
        let task = board
            .tasks
            .iter_mut()
            .find(|task| task.id == input.task_id)
            .unwrap();
        task.comments.push(BoardComment {
            id: Uuid::new_v4().to_string(),
            body,
            created_at: now_iso(),
            image,
        });
        Ok(board.clone())
    })
}

pub fn delete_task_comment(db: &Database, id: &str) -> Result<TaskBoardDetail, AppError> {
    db.update(|document| {
        let board = document
            .boards
            .iter_mut()
            .find(|item| {
                item.tasks
                    .iter()
                    .any(|task| task.comments.iter().any(|comment| comment.id == id))
            })
            .ok_or_else(|| AppError::UserFacing("Comment was not found.".into()))?;
        for task in &mut board.tasks {
            task.comments.retain(|comment| comment.id != id);
        }
        Ok(board.clone())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_board_columns() {
        assert_eq!(column_key("on_test").unwrap(), "on_test");
        assert!(column_key("later").is_err());
    }

    #[test]
    fn rejects_oversized_or_unknown_images() {
        let tiny = base64::engine::general_purpose::STANDARD.encode([0x89, 0x50, 0x4e, 0x47]);
        let (mime, bytes) = decode_image_payload("image/png", &tiny).unwrap();
        assert_eq!(mime, "image/png");
        assert_eq!(bytes.len(), 4);
        assert!(decode_image_payload("image/svg+xml", &tiny).is_err());
        let huge = "A".repeat(MAX_IMAGE_BYTES * 2);
        assert!(decode_image_payload("image/png", &huge).is_err());
    }
}
