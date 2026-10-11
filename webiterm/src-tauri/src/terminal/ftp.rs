use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use serde::Serialize;
use ssh2::Session;
use uuid::Uuid;

use crate::domain::ConnectionSummary;
use crate::domain::connection::{AuthMethod, ConnectionKind};
use crate::error::AppError;
use crate::terminal::ssh::{connect_ssh_session, ssh_port_for};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FtpSessionInfo {
    pub id: String,
    pub connection_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FtpEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FtpListResult {
    pub path: String,
    pub entries: Vec<FtpEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FtpPrepareEditResult {
    pub local_path: String,
    pub remote_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FtpSyncEditsResult {
    pub uploaded: u32,
}

struct SftpSession {
    session: Mutex<Session>,
    cwd: Mutex<String>,
}

struct EditTrack {
    remote_path: String,
    local_path: PathBuf,
    synced_mtime: SystemTime,
}

pub struct FtpManager {
    sessions: Mutex<HashMap<String, SftpSession>>,
    edit_tracks: Mutex<HashMap<String, Vec<EditTrack>>>,
}

impl FtpManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            edit_tracks: Mutex::new(HashMap::new()),
        }
    }

    pub async fn open(
        &self,
        connection: ConnectionSummary,
        password: Option<String>,
        ftp_session_id: Option<String>,
    ) -> Result<FtpSessionInfo, AppError> {
        if !matches!(connection.kind, ConnectionKind::Ssh | ConnectionKind::Ftp) {
            return Err(AppError::InvalidInput);
        }
        let port = sftp_port_for(&connection)?;
        let session_id = ftp_session_id
            .filter(|id| !id.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let host = connection.host.clone();
        let username = connection.username.clone();
        let auth_method = connection.auth_method;
        let private_key_path = connection.private_key_path.clone();
        let secret = password.unwrap_or_default();
        let initial_path = connection.sftp_initial_path.clone();
        let (session, cwd) = tokio::time::timeout(
            Duration::from_secs(30),
            tokio::task::spawn_blocking(move || {
                connect_sftp_session(
                    &host,
                    port,
                    &username,
                    auth_method,
                    &secret,
                    private_key_path.as_deref(),
                )
            }),
        )
        .await
        .map_err(|_| AppError::ConnectionFailed("SFTP connection timed out.".to_string()))?
        .map_err(|_| AppError::ConnectionFailed("SFTP task failed.".to_string()))??;
        let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        sessions.insert(
            session_id.clone(),
            SftpSession {
                session: Mutex::new(session),
                cwd: Mutex::new(cwd),
            },
        );
        if let Some(path) = initial_path
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let _ = self.goto_path(&session_id, path);
        }
        Ok(FtpSessionInfo {
            id: session_id,
            connection_id: connection.id,
            title: connection.name,
        })
    }

    pub fn list(&self, session_id: &str) -> Result<FtpListResult, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        list_directory(&ssh, &cwd)
    }

    pub fn change_dir(&self, session_id: &str, path: &str) -> Result<FtpListResult, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let mut cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let next = resolve_sftp_path(&cwd, path)?;
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        sftp.readdir(Path::new(&next)).map_err(|_| {
            AppError::ConnectionFailed("Could not change SFTP directory.".to_string())
        })?;
        *cwd = next;
        list_directory(&ssh, &cwd)
    }

    pub fn parent_dir(&self, session_id: &str) -> Result<FtpListResult, AppError> {
        self.change_dir(session_id, "..")
    }

    pub fn goto_path(&self, session_id: &str, path: &str) -> Result<FtpListResult, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let mut cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let next = if path.starts_with('/') {
            normalize_absolute_path(path)
        } else {
            resolve_sftp_path(&cwd, path)?
        };
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        sftp.readdir(Path::new(&next)).map_err(|_| {
            AppError::ConnectionFailed("Could not open SFTP directory.".to_string())
        })?;
        *cwd = next;
        list_directory(&ssh, &cwd)
    }

    pub fn download(
        &self,
        session_id: &str,
        file_name: &str,
        local_path: &Path,
    ) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let remote = Path::new(cwd.as_str()).join(file_name);
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        let mut remote_file = sftp
            .open(&remote)
            .map_err(|_| AppError::ConnectionFailed("Could not open remote file.".to_string()))?;
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|_| {
                AppError::ConnectionFailed("Could not create the local folder.".to_string())
            })?;
        }
        let mut local_file = std::fs::File::create(local_path)
            .map_err(|_| AppError::ConnectionFailed("Could not create local file.".to_string()))?;
        std::io::copy(&mut remote_file, &mut local_file)
            .map_err(|_| AppError::ConnectionFailed("Could not download file.".to_string()))?;
        Ok(())
    }

    pub fn upload(
        &self,
        session_id: &str,
        remote_path: &str,
        local_path: &Path,
    ) -> Result<(), AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        let remote = Path::new(remote_path);
        let _ = sftp.unlink(remote);
        let mut remote_file = sftp
            .create(remote)
            .map_err(|_| AppError::ConnectionFailed("Could not create remote file.".to_string()))?;
        let mut local_file = std::fs::File::open(local_path)
            .map_err(|_| AppError::ConnectionFailed("Could not read local file.".to_string()))?;
        std::io::copy(&mut local_file, &mut remote_file)
            .map_err(|_| AppError::ConnectionFailed("Could not upload file.".to_string()))?;
        Ok(())
    }

    pub fn delete(
        &self,
        session_id: &str,
        name: &str,
        is_dir: bool,
    ) -> Result<FtpListResult, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let remote = Path::new(cwd.as_str()).join(name);
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        if is_dir {
            sftp.rmdir(&remote)
                .map_err(|_| AppError::ConnectionFailed("Could not delete folder.".to_string()))?;
        } else {
            sftp.unlink(&remote)
                .map_err(|_| AppError::ConnectionFailed("Could not delete file.".to_string()))?;
        }
        list_directory(&ssh, &cwd)
    }

    pub fn rename(
        &self,
        session_id: &str,
        from: &str,
        to: &str,
    ) -> Result<FtpListResult, AppError> {
        let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(sftp_session) = sessions.get(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        let ssh = sftp_session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let cwd = sftp_session
            .cwd
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let from_path = Path::new(cwd.as_str()).join(from);
        let to_path = Path::new(cwd.as_str()).join(to);
        let sftp = ssh
            .sftp()
            .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
        sftp.rename(&from_path, &to_path, None)
            .map_err(|_| AppError::ConnectionFailed("Could not rename remote item.".to_string()))?;
        list_directory(&ssh, &cwd)
    }

    pub fn prepare_edit(
        &self,
        session_id: &str,
        file_name: &str,
    ) -> Result<FtpPrepareEditResult, AppError> {
        let remote_path = {
            let sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
            let Some(sftp_session) = sessions.get(session_id) else {
                return Err(AppError::SessionNotFound);
            };
            let cwd = sftp_session
                .cwd
                .lock()
                .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
            Path::new(cwd.as_str())
                .join(file_name)
                .to_string_lossy()
                .into_owned()
        };
        let local_path = std::env::temp_dir()
            .join("webiterm-sftp")
            .join(session_id)
            .join(file_name);
        self.download(session_id, file_name, &local_path)?;
        let mtime = std::fs::metadata(&local_path)
            .and_then(|meta| meta.modified())
            .unwrap_or_else(|_| SystemTime::now());
        let mut tracks = self.edit_tracks.lock().unwrap_or_else(|p| p.into_inner());
        let list = tracks.entry(session_id.to_string()).or_default();
        if let Some(existing) = list
            .iter_mut()
            .find(|track| track.remote_path == remote_path)
        {
            existing.local_path = local_path.clone();
            existing.synced_mtime = mtime;
        } else {
            list.push(EditTrack {
                remote_path: remote_path.clone(),
                local_path: local_path.clone(),
                synced_mtime: mtime,
            });
        }
        Ok(FtpPrepareEditResult {
            local_path: local_path.to_string_lossy().into_owned(),
            remote_path,
        })
    }

    pub fn sync_edits(&self, session_id: &str) -> Result<FtpSyncEditsResult, AppError> {
        let mut guard = self.edit_tracks.lock().unwrap_or_else(|p| p.into_inner());
        let tracks = guard.remove(session_id).unwrap_or_default();
        let mut uploaded = 0_u32;
        let mut remaining = Vec::new();
        for track in tracks {
            let mtime = std::fs::metadata(&track.local_path)
                .and_then(|meta| meta.modified())
                .unwrap_or(SystemTime::UNIX_EPOCH);
            if mtime > track.synced_mtime {
                self.upload(session_id, &track.remote_path, &track.local_path)?;
                uploaded += 1;
                remaining.push(EditTrack {
                    remote_path: track.remote_path,
                    local_path: track.local_path,
                    synced_mtime: mtime,
                });
            } else {
                remaining.push(track);
            }
        }
        if !remaining.is_empty() {
            guard.insert(session_id.to_string(), remaining);
        }
        Ok(FtpSyncEditsResult { uploaded })
    }

    pub fn close(&self, session_id: &str) -> Result<(), AppError> {
        let _ = self.sync_edits(session_id);
        let mut sessions = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        let Some(session) = sessions.remove(session_id) else {
            return Err(AppError::SessionNotFound);
        };
        self.edit_tracks
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .remove(session_id);
        let ssh = session
            .session
            .lock()
            .map_err(|_| AppError::ConnectionFailed("SFTP session is busy.".to_string()))?;
        let _ = ssh.disconnect(None, "closed", None);
        Ok(())
    }
}

fn normalize_absolute_path(path: &str) -> String {
    resolve_sftp_path("/", path).unwrap_or_else(|_| "/".to_string())
}

pub fn sftp_port_for(connection: &ConnectionSummary) -> Result<u16, AppError> {
    match connection.kind {
        ConnectionKind::Ssh | ConnectionKind::Ftp => Ok(ssh_port_for(connection)),
        _ => Err(AppError::InvalidInput),
    }
}

fn connect_sftp_session(
    host: &str,
    port: u16,
    username: &str,
    auth_method: AuthMethod,
    secret: &str,
    private_key_path: Option<&str>,
) -> Result<(Session, String), AppError> {
    let session = connect_ssh_session(host, port, username, auth_method, secret, private_key_path)?;
    let sftp = session
        .sftp()
        .map_err(|_| AppError::ConnectionFailed("Could not open SFTP subsystem.".to_string()))?;
    let cwd = sftp
        .realpath(Path::new("."))
        .map(|path| path.to_string_lossy().into_owned())
        .or_else(|_| {
            sftp.realpath(Path::new("/"))
                .map(|path| path.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|_| "/".to_string());
    Ok((session, cwd))
}

fn list_directory(session: &Session, cwd: &str) -> Result<FtpListResult, AppError> {
    let sftp = session
        .sftp()
        .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
    let rows = sftp
        .readdir(Path::new(cwd))
        .map_err(|_| AppError::ConnectionFailed("Could not list SFTP directory.".to_string()))?;
    let mut entries = Vec::new();
    for (full_path, stat) in rows {
        let name = full_path
            .file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_default();
        if name.is_empty() {
            continue;
        }
        entries.push(FtpEntry {
            name,
            is_dir: stat.is_dir(),
            size: stat.size.unwrap_or(0),
        });
    }
    entries.sort_by(|left, right| match (left.is_dir, right.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => left.name.to_lowercase().cmp(&right.name.to_lowercase()),
    });
    Ok(FtpListResult {
        path: cwd.to_string(),
        entries,
    })
}

fn resolve_sftp_path(current: &str, target: &str) -> Result<String, AppError> {
    if target == ".." {
        let path = Path::new(current);
        let parent = path
            .parent()
            .map(|value| value.to_path_buf())
            .filter(|value| !value.as_os_str().is_empty())
            .unwrap_or_else(|| PathBuf::from("/"));
        return Ok(parent.to_string_lossy().into_owned());
    }
    let path = if target.starts_with('/') {
        PathBuf::from(target)
    } else {
        Path::new(current).join(target)
    };
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                normalized.pop();
            }
            Component::CurDir => {}
            Component::RootDir => normalized.push(component.as_os_str()),
            Component::Normal(part) => normalized.push(part),
            _ => {}
        }
    }
    if normalized.as_os_str().is_empty() {
        return Ok("/".to_string());
    }
    Ok(normalized.to_string_lossy().into_owned())
}

pub async fn test_ftp_login(password: &str, summary: &ConnectionSummary) -> Result<(), AppError> {
    let port = sftp_port_for(summary)?;
    let password = password.to_string();
    if summary.auth_method == AuthMethod::Password && password.is_empty() {
        return Err(AppError::ConnectionFailed(
            "No password saved for this SFTP profile.".to_string(),
        ));
    }
    let host = summary.host.clone();
    let username = summary.username.clone();
    let auth_method = summary.auth_method;
    let private_key_path = summary.private_key_path.clone();
    tokio::time::timeout(
        Duration::from_secs(15),
        tokio::task::spawn_blocking(move || -> Result<(), AppError> {
            let session = connect_ssh_session(
                &host,
                port,
                &username,
                auth_method,
                &password,
                private_key_path.as_deref(),
            )?;
            let sftp = session.sftp().map_err(|_| {
                AppError::ConnectionFailed("Could not open SFTP subsystem.".to_string())
            })?;
            let _ = sftp
                .readdir(Path::new("."))
                .or_else(|_| sftp.readdir(Path::new("/")));
            let _ = session.disconnect(None, "test complete", None);
            Ok(())
        }),
    )
    .await
    .map_err(|_| AppError::ConnectionFailed("SFTP connection timed out.".to_string()))?
    .map_err(|_| AppError::ConnectionFailed("SFTP task failed.".to_string()))?
}
