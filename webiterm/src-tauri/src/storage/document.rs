use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::domain::ConnectionSummary;
use crate::error::AppError;

use super::connection_groups::ConnectionGroup;
use super::sftp_editor::SftpEditorPrefs;
use super::sftp_favorites::SftpFavorite;
use super::ssh_command_favorites::SshCommandFavorite;
use super::folder_notes::FolderNoteDetail;
use super::task_boards::TaskBoardDetail;

pub const DOCUMENT_KIND: &str = "webiterm";
pub const DOCUMENT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredConnection {
    #[serde(flatten)]
    pub profile: ConnectionSummary,
    #[serde(default)]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDocument {
    pub kind: String,
    pub version: u32,
    #[serde(default = "default_true")]
    pub onboarding_completed: bool,
    #[serde(default)]
    pub inspector_collapsed: bool,
    #[serde(default)]
    pub groups: Vec<ConnectionGroup>,
    #[serde(default)]
    pub connections: Vec<StoredConnection>,
    #[serde(default)]
    pub sftp_favorites: Vec<SftpFavorite>,
    #[serde(default)]
    pub ssh_command_favorites: Vec<SshCommandFavorite>,
    #[serde(default)]
    pub sftp_editor: SftpEditorPrefs,
    #[serde(default)]
    pub boards: Vec<TaskBoardDetail>,
    #[serde(default)]
    pub notes: Vec<FolderNoteDetail>,
}

fn default_true() -> bool {
    true
}

impl Default for LocalDocument {
    fn default() -> Self {
        Self {
            kind: DOCUMENT_KIND.to_string(),
            version: DOCUMENT_VERSION,
            onboarding_completed: true,
            inspector_collapsed: false,
            groups: Vec::new(),
            connections: Vec::new(),
            sftp_favorites: Vec::new(),
            ssh_command_favorites: Vec::new(),
            sftp_editor: SftpEditorPrefs::default(),
            boards: Vec::new(),
            notes: Vec::new(),
        }
    }
}

impl LocalDocument {
    pub fn load(path: &Path) -> Result<Self, AppError> {
        if !path.exists() {
            let document = Self::default();
            document.save(path)?;
            return Ok(document);
        }
        let raw = fs::read_to_string(path)?;
        let document: Self =
            serde_json::from_str(&raw).map_err(|_| AppError::InvalidStoredValue {
                key: "webiterm.json",
            })?;
        document.validate()?;
        Ok(document)
    }

    pub fn save(&self, path: &Path) -> Result<(), AppError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
            restrict_dir(parent)?;
        }
        let json =
            serde_json::to_string_pretty(self).map_err(|_| AppError::InvalidStoredValue {
                key: "webiterm.json",
            })?;
        let tmp = temp_path(path);
        fs::write(&tmp, json)?;
        restrict_file(&tmp)?;
        fs::rename(&tmp, path)?;
        restrict_file(path)?;
        Ok(())
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if self.kind != DOCUMENT_KIND || self.version != DOCUMENT_VERSION {
            return Err(AppError::UserFacing(
                "This file is not a WebiTerm data export.".into(),
            ));
        }
        Ok(())
    }
}

pub fn now_iso() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let hour = rem / 3_600;
    let minute = (rem % 3_600) / 60;
    let second = rem % 60;
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

fn temp_path(path: &Path) -> PathBuf {
    let mut tmp = path.as_os_str().to_os_string();
    tmp.push(".tmp");
    PathBuf::from(tmp)
}

fn restrict_dir(path: &Path) -> Result<(), AppError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    #[cfg(not(unix))]
    {
        let _ = path;
    }
    Ok(())
}

fn restrict_file(path: &Path) -> Result<(), AppError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    }
    #[cfg(not(unix))]
    {
        let _ = path;
    }
    Ok(())
}

fn civil_from_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    (year as i32, month as u32, day as u32)
}
