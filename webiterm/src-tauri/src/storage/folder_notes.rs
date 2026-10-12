use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Database;
use super::document::now_iso;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNoteSummary {
    pub id: String,
    pub group_id: String,
    pub title: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNoteDetail {
    pub note: FolderNoteSummary,
    pub body: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewFolderNote {
    pub group_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNoteUpdate {
    pub title: String,
    pub body: String,
}

pub fn list_folder_notes(db: &Database) -> Result<Vec<FolderNoteSummary>, AppError> {
    db.read(|document| {
        document
            .notes
            .iter()
            .map(|item| item.note.clone())
            .collect()
    })
}

pub fn get_folder_note(db: &Database, id: &str) -> Result<FolderNoteDetail, AppError> {
    db.read(|document| {
        document
            .notes
            .iter()
            .find(|item| item.note.id == id)
            .cloned()
            .ok_or(AppError::NotFound)
    })?
}

pub fn create_folder_note(db: &Database, input: NewFolderNote) -> Result<FolderNoteDetail, AppError> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(AppError::InvalidInput);
    }
    db.update(|document| {
        if !document.groups.iter().any(|group| group.id == input.group_id) {
            return Err(AppError::NotFound);
        }
        let detail = FolderNoteDetail {
            note: FolderNoteSummary {
                id: Uuid::new_v4().to_string(),
                group_id: input.group_id,
                title: title.to_string(),
                updated_at: now_iso(),
            },
            body: String::new(),
        };
        document.notes.push(detail.clone());
        Ok(detail)
    })
}

pub fn update_folder_note(
    db: &Database,
    id: &str,
    update: FolderNoteUpdate,
) -> Result<FolderNoteDetail, AppError> {
    let title = update.title.trim();
    if title.is_empty() {
        return Err(AppError::InvalidInput);
    }
    db.update(|document| {
        let item = document
            .notes
            .iter_mut()
            .find(|entry| entry.note.id == id)
            .ok_or(AppError::NotFound)?;
        item.note.title = title.to_string();
        item.note.updated_at = now_iso();
        item.body = update.body;
        Ok(item.clone())
    })
}

pub fn rename_folder_note(db: &Database, id: &str, name: &str) -> Result<FolderNoteSummary, AppError> {
    let title = name.trim();
    if title.is_empty() {
        return Err(AppError::InvalidInput);
    }
    db.update(|document| {
        let item = document
            .notes
            .iter_mut()
            .find(|entry| entry.note.id == id)
            .ok_or(AppError::NotFound)?;
        item.note.title = title.to_string();
        item.note.updated_at = now_iso();
        Ok(item.note.clone())
    })
}

pub fn delete_folder_note(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        let before = document.notes.len();
        document.notes.retain(|item| item.note.id != id);
        if document.notes.len() == before {
            return Err(AppError::NotFound);
        }
        Ok(())
    })
}

pub fn delete_folder_notes_for_group(db: &Database, group_id: &str) -> Result<(), AppError> {
    db.update(|document| {
        document
            .notes
            .retain(|item| item.note.group_id != group_id);
        Ok(())
    })
}
