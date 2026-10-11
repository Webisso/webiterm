use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::storage::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionGroup {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon_id: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionGroupInput {
    pub name: String,
    pub color: Option<String>,
    pub icon_id: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionGroupUpdate {
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon_id: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
}

fn normalize_color(value: Option<String>) -> String {
    let raw = value.unwrap_or_else(|| "#6366f1".to_string());
    let trimmed = raw.trim();
    if trimmed.len() == 7 && trimmed.starts_with('#') {
        return trimmed.to_string();
    }
    "#6366f1".to_string()
}

fn normalize_icon_id(value: Option<String>) -> String {
    let raw = value.unwrap_or_else(|| "folder".to_string());
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        "folder".to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn list_connection_groups(db: &Database) -> Result<Vec<ConnectionGroup>, AppError> {
    db.read(|document| {
        let mut groups = document.groups.clone();
        groups.sort_by(|left, right| {
            left.sort_order
                .cmp(&right.sort_order)
                .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        });
        groups
    })
}

pub fn create_connection_group(
    db: &Database,
    input: ConnectionGroupInput,
) -> Result<ConnectionGroup, AppError> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(AppError::ConnectionFailed(
            "Folder name is required.".to_string(),
        ));
    }
    let group = ConnectionGroup {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        color: normalize_color(input.color),
        icon_id: normalize_icon_id(input.icon_id),
        parent_id: input.parent_id.filter(|value| !value.is_empty()),
        sort_order: 0,
    };
    db.update(|document| {
        let next = document
            .groups
            .iter()
            .map(|item| item.sort_order)
            .max()
            .unwrap_or(-1)
            + 1;
        let mut created = group.clone();
        created.sort_order = next;
        document.groups.push(created.clone());
        Ok(created)
    })
}

pub fn update_connection_group(
    db: &Database,
    id: &str,
    update: ConnectionGroupUpdate,
) -> Result<ConnectionGroup, AppError> {
    db.update(|document| {
        let existing = document
            .groups
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or(AppError::NotFound)?;
        if let Some(name) = update
            .name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            existing.name = name;
        }
        if let Some(color) = update.color {
            existing.color = normalize_color(Some(color));
        }
        if let Some(icon_id) = update.icon_id {
            existing.icon_id = normalize_icon_id(Some(icon_id));
        }
        if let Some(parent_id) = update.parent_id {
            let parent = if parent_id.is_empty() {
                None
            } else {
                Some(parent_id)
            };
            if parent.as_deref() == Some(id) {
                return Err(AppError::ConnectionFailed(
                    "A folder cannot be its own parent.".to_string(),
                ));
            }
            existing.parent_id = parent;
        }
        if let Some(sort_order) = update.sort_order {
            existing.sort_order = sort_order;
        }
        Ok(existing.clone())
    })
}

pub fn delete_connection_group(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        let before = document.groups.len();
        document.groups.retain(|item| item.id != id);
        if document.groups.len() == before {
            return Err(AppError::NotFound);
        }
        for connection in &mut document.connections {
            if connection.profile.group_id.as_deref() == Some(id) {
                connection.profile.group_id = None;
            }
        }
        for group in &mut document.groups {
            if group.parent_id.as_deref() == Some(id) {
                group.parent_id = None;
            }
        }
        Ok(())
    })
}

#[cfg(test)]
mod input_deserialize_tests {
    use super::ConnectionGroupInput;

    #[test]
    fn accepts_camel_case_parent_id_from_ipc_payload() {
        let json = r##"{
            "name": "Production",
            "color": "#6366f1",
            "iconId": "folder",
            "parentId": "parent-uuid"
        }"##;
        let input: ConnectionGroupInput = serde_json::from_str(json).expect("deserialize");
        assert_eq!(input.parent_id.as_deref(), Some("parent-uuid"));
    }
}
