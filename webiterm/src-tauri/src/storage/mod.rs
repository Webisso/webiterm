mod connection_groups;
mod connections;
mod document;
mod folder_notes;
mod legacy;
mod settings;
mod sftp_editor;
mod sftp_favorites;
mod ssh_command_favorites;
mod task_boards;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::domain::{AppStatus, LocalPreferences};
use crate::error::AppError;

pub use connection_groups::{
    ConnectionGroup, ConnectionGroupInput, ConnectionGroupUpdate, create_connection_group,
    delete_connection_group, list_connection_groups, update_connection_group,
};
pub use folder_notes::{
    FolderNoteDetail, FolderNoteSummary, FolderNoteUpdate, NewFolderNote, create_folder_note,
    delete_folder_note, delete_folder_notes_for_group, get_folder_note, list_folder_notes,
    rename_folder_note, update_folder_note,
};
pub use connections::{
    assign_connection_group, build_mysql_url, create_connection, delete_connection, get_connection,
    list_connections, resolve_password, test_connection, update_connection,
};
pub use document::{DOCUMENT_VERSION, LocalDocument, StoredConnection};
pub use settings::{inspector_collapsed, set_inspector_collapsed};
pub use sftp_editor::{SftpEditorPrefs, get_sftp_editor_prefs, set_sftp_editor_prefs};
pub use sftp_favorites::{
    SftpFavorite, SftpFavoriteInput, SftpFavoriteUpdate, create_sftp_favorite,
    delete_sftp_favorite, list_sftp_favorites, update_sftp_favorite,
};
pub use ssh_command_favorites::{
    SshCommandFavorite, SshCommandFavoriteInput, SshCommandFavoriteUpdate,
    create_ssh_command_favorite, delete_ssh_command_favorite, list_ssh_command_favorites,
    update_ssh_command_favorite,
};
pub use task_boards::{
    NewTask, NewTaskBoard, NewTaskComment, NewTaskImage, TaskBoardDetail, TaskBoardSummary,
    TaskUpdate, add_task_comment, add_task_image, create_task, create_task_board, delete_task,
    delete_task_board, delete_task_boards_for_group, delete_task_comment, delete_task_image,
    get_task_board, list_task_boards, move_task, rename_task_board, update_task,
};

pub struct Database {
    path: PathBuf,
    inner: Mutex<LocalDocument>,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let path = path.as_ref().to_path_buf();
        let mut document = LocalDocument::load(&path)?;
        if legacy::import_if_empty(&mut document, &path) {
            document.save(&path)?;
        }
        tracing::info!(path = %path.display(), "local json store opened");
        Ok(Self {
            path,
            inner: Mutex::new(document),
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn read<T>(&self, reader: impl FnOnce(&LocalDocument) -> T) -> Result<T, AppError> {
        let guard = self
            .inner
            .lock()
            .map_err(|_| AppError::UserFacing("Local data file is busy. Try again.".into()))?;
        Ok(reader(&guard))
    }

    pub fn update<T>(
        &self,
        updater: impl FnOnce(&mut LocalDocument) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| AppError::UserFacing("Local data file is busy. Try again.".into()))?;
        let value = updater(&mut guard)?;
        guard.save(&self.path)?;
        Ok(value)
    }

    pub fn export_json(&self) -> Result<String, AppError> {
        self.read(|document| {
            serde_json::to_string_pretty(document).map_err(|_| AppError::InvalidStoredValue {
                key: "webiterm.json",
            })
        })?
    }

    pub fn import_json(&self, raw: &str) -> Result<(), AppError> {
        let document: LocalDocument = serde_json::from_str(raw).map_err(|_| {
            AppError::UserFacing("Could not read that file as WebiTerm data.".into())
        })?;
        document.validate()?;
        self.update(|current| {
            *current = document.clone();
            Ok(())
        })
    }

    pub fn status(&self) -> Result<AppStatus, AppError> {
        Ok(AppStatus {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            schema_version: DOCUMENT_VERSION as i64,
            database_ready: true,
            storage_path: self.path.display().to_string(),
        })
    }

    pub fn preferences(&self) -> Result<LocalPreferences, AppError> {
        self.read(|document| LocalPreferences {
            inspector_collapsed: document.inspector_collapsed,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::connection::{AuthMethod, ConnectionInput, ConnectionKind};
    use std::sync::atomic::{AtomicU64, Ordering};

    fn temp_store() -> PathBuf {
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "webiterm-json-{}-{}-{}",
            std::process::id(),
            nanos,
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        dir.join("webiterm.json")
    }

    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn roundtrip_keeps_a_connection_password() {
        let path = temp_store();
        let database = Database::open(&path).unwrap();
        let created = create_connection(
            &database,
            ConnectionInput {
                kind: ConnectionKind::Ssh,
                name: "box".into(),
                host: "example.com".into(),
                port: 22,
                username: "root".into(),
                database_name: None,
                auth_method: AuthMethod::Password,
                password: Some("secret".into()),
                private_key_path: None,
                startup_command: None,
                sftp_initial_path: None,
                group_id: None,
                favorite: false,
                tags: vec![],
                ssh_tunnel_profile_id: None,
            },
        )
        .unwrap();
        drop(database);
        let reopened = Database::open(&path).unwrap();
        let password = resolve_password(&reopened, &created.id).unwrap();
        assert_eq!(password.as_deref(), Some("secret"));
        let exported = reopened.export_json().unwrap();
        assert!(exported.contains("\"password\": \"secret\""));
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }
}
