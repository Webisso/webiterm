use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::storage::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpEditorPrefs {
    pub default_application: Option<String>,
    pub extension_apps: BTreeMap<String, String>,
}

impl Default for SftpEditorPrefs {
    fn default() -> Self {
        Self {
            default_application: None,
            extension_apps: BTreeMap::new(),
        }
    }
}

pub fn get_sftp_editor_prefs(db: &Database) -> Result<SftpEditorPrefs, AppError> {
    db.read(|document| document.sftp_editor.clone())
}

pub fn set_sftp_editor_prefs(
    db: &Database,
    prefs: SftpEditorPrefs,
) -> Result<SftpEditorPrefs, AppError> {
    db.update(|document| {
        document.sftp_editor = prefs.clone();
        Ok(prefs)
    })
}
