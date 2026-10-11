use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::storage::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpFavorite {
    pub id: String,
    pub connection_id: String,
    pub remote_path: String,
    pub display_name: String,
    pub is_dir: bool,
    pub color: String,
    pub shortcut_key: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpFavoriteInput {
    pub connection_id: String,
    pub remote_path: String,
    pub display_name: String,
    pub is_dir: bool,
    pub color: Option<String>,
    pub shortcut_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpFavoriteUpdate {
    pub display_name: Option<String>,
    pub color: Option<String>,
    pub shortcut_key: Option<String>,
    pub sort_order: Option<i32>,
}

fn normalize_color(value: Option<String>) -> String {
    let raw = value.unwrap_or_else(|| "#6366f1".to_string());
    let trimmed = raw.trim();
    if trimmed.len() == 7 && trimmed.starts_with('#') {
        trimmed.to_string()
    } else {
        "#6366f1".to_string()
    }
}

fn normalize_shortcut(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_string())
        .filter(|trimmed| !trimmed.is_empty())
}

pub fn list_sftp_favorites(
    db: &Database,
    connection_id: &str,
) -> Result<Vec<SftpFavorite>, AppError> {
    db.read(|document| {
        let mut items: Vec<_> = document
            .sftp_favorites
            .iter()
            .filter(|item| item.connection_id == connection_id)
            .cloned()
            .collect();
        items.sort_by(|left, right| {
            left.sort_order
                .cmp(&right.sort_order)
                .then_with(|| left.display_name.cmp(&right.display_name))
        });
        items
    })
}

pub fn create_sftp_favorite(
    db: &Database,
    input: SftpFavoriteInput,
) -> Result<SftpFavorite, AppError> {
    let remote_path = input.remote_path.trim().to_string();
    let display_name = input.display_name.trim().to_string();
    if remote_path.is_empty() || display_name.is_empty() {
        return Err(AppError::InvalidInput);
    }
    let shortcut = normalize_shortcut(input.shortcut_key);
    db.update(|document| {
        if document.sftp_favorites.iter().any(|item| {
            item.connection_id == input.connection_id && item.remote_path == remote_path
        }) {
            return Err(AppError::UserFacing(
                "That path is already a favorite.".into(),
            ));
        }
        if let Some(key) = shortcut.as_deref() {
            if document.sftp_favorites.iter().any(|item| {
                item.connection_id == input.connection_id
                    && item.shortcut_key.as_deref() == Some(key)
            }) {
                return Err(AppError::UserFacing(
                    "That shortcut is already used.".into(),
                ));
            }
        }
        let sort_order = document
            .sftp_favorites
            .iter()
            .filter(|item| item.connection_id == input.connection_id)
            .map(|item| item.sort_order)
            .max()
            .unwrap_or(-1)
            + 1;
        let favorite = SftpFavorite {
            id: Uuid::new_v4().to_string(),
            connection_id: input.connection_id.clone(),
            remote_path,
            display_name,
            is_dir: input.is_dir,
            color: normalize_color(input.color),
            shortcut_key: shortcut,
            sort_order,
        };
        document.sftp_favorites.push(favorite.clone());
        Ok(favorite)
    })
}

pub fn update_sftp_favorite(
    db: &Database,
    id: &str,
    update: SftpFavoriteUpdate,
) -> Result<SftpFavorite, AppError> {
    db.update(|document| {
        let connection_id = document
            .sftp_favorites
            .iter()
            .find(|item| item.id == id)
            .map(|item| item.connection_id.clone())
            .ok_or(AppError::NotFound)?;
        if let Some(key) = update
            .shortcut_key
            .as_ref()
            .and_then(|value| normalize_shortcut(Some(value.clone())))
        {
            if document.sftp_favorites.iter().any(|item| {
                item.id != id
                    && item.connection_id == connection_id
                    && item.shortcut_key.as_deref() == Some(key.as_str())
            }) {
                return Err(AppError::UserFacing(
                    "That shortcut is already used.".into(),
                ));
            }
        }
        let existing = document
            .sftp_favorites
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or(AppError::NotFound)?;
        if let Some(name) = update
            .display_name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            existing.display_name = name;
        }
        if let Some(color) = update.color {
            existing.color = normalize_color(Some(color));
        }
        if update.shortcut_key.is_some() {
            existing.shortcut_key = normalize_shortcut(update.shortcut_key);
        }
        if let Some(sort_order) = update.sort_order {
            existing.sort_order = sort_order;
        }
        Ok(existing.clone())
    })
}

pub fn delete_sftp_favorite(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        let before = document.sftp_favorites.len();
        document.sftp_favorites.retain(|item| item.id != id);
        if document.sftp_favorites.len() == before {
            Err(AppError::NotFound)
        } else {
            Ok(())
        }
    })
}
