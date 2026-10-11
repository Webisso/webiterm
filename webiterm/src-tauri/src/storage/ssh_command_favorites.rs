use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::storage::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshCommandFavorite {
    pub id: String,
    pub connection_id: String,
    pub label: String,
    pub command: String,
    pub color: String,
    pub shortcut_key: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshCommandFavoriteInput {
    pub connection_id: String,
    pub label: String,
    pub command: String,
    pub color: Option<String>,
    pub shortcut_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshCommandFavoriteUpdate {
    pub label: Option<String>,
    pub command: Option<String>,
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

pub fn list_ssh_command_favorites(
    db: &Database,
    connection_id: &str,
) -> Result<Vec<SshCommandFavorite>, AppError> {
    db.read(|document| {
        let mut items: Vec<_> = document
            .ssh_command_favorites
            .iter()
            .filter(|item| item.connection_id == connection_id)
            .cloned()
            .collect();
        items.sort_by(|left, right| {
            left.sort_order
                .cmp(&right.sort_order)
                .then_with(|| left.label.cmp(&right.label))
        });
        items
    })
}

pub fn create_ssh_command_favorite(
    db: &Database,
    input: SshCommandFavoriteInput,
) -> Result<SshCommandFavorite, AppError> {
    let label = input.label.trim().to_string();
    let command = input.command.trim().to_string();
    if label.is_empty() || command.is_empty() {
        return Err(AppError::InvalidInput);
    }
    let shortcut = normalize_shortcut(input.shortcut_key);
    db.update(|document| {
        if let Some(key) = shortcut.as_deref() {
            if document.ssh_command_favorites.iter().any(|item| {
                item.connection_id == input.connection_id
                    && item.shortcut_key.as_deref() == Some(key)
            }) {
                return Err(AppError::UserFacing(
                    "That shortcut is already used.".into(),
                ));
            }
        }
        let sort_order = document
            .ssh_command_favorites
            .iter()
            .filter(|item| item.connection_id == input.connection_id)
            .map(|item| item.sort_order)
            .max()
            .unwrap_or(-1)
            + 1;
        let favorite = SshCommandFavorite {
            id: Uuid::new_v4().to_string(),
            connection_id: input.connection_id.clone(),
            label,
            command,
            color: normalize_color(input.color),
            shortcut_key: shortcut,
            sort_order,
        };
        document.ssh_command_favorites.push(favorite.clone());
        Ok(favorite)
    })
}

pub fn update_ssh_command_favorite(
    db: &Database,
    id: &str,
    update: SshCommandFavoriteUpdate,
) -> Result<SshCommandFavorite, AppError> {
    db.update(|document| {
        let connection_id = document
            .ssh_command_favorites
            .iter()
            .find(|item| item.id == id)
            .map(|item| item.connection_id.clone())
            .ok_or(AppError::NotFound)?;
        if let Some(key) = update
            .shortcut_key
            .as_ref()
            .and_then(|value| normalize_shortcut(Some(value.clone())))
        {
            if document.ssh_command_favorites.iter().any(|item| {
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
            .ssh_command_favorites
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or(AppError::NotFound)?;
        if let Some(label) = update
            .label
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            existing.label = label;
        }
        if let Some(command) = update
            .command
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            existing.command = command;
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

pub fn delete_ssh_command_favorite(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        let before = document.ssh_command_favorites.len();
        document.ssh_command_favorites.retain(|item| item.id != id);
        if document.ssh_command_favorites.len() == before {
            Err(AppError::NotFound)
        } else {
            Ok(())
        }
    })
}
