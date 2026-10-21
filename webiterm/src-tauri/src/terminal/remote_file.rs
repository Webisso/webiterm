use std::io::{Read, Write};
use std::path::Path;

use serde::Serialize;
use ssh2::Session;

use crate::domain::ConnectionSummary;
use crate::domain::connection::ConnectionKind;
use crate::error::AppError;
use crate::terminal::ftp::{resolve_sftp_path, sftp_port_for};
use crate::terminal::ssh::{
    connect_ssh_session, is_plausible_shell_pwd, normalize_remote_path,
};

const MAX_REMOTE_FILE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFileContent {
    pub resolved_path: String,
    pub content: String,
    pub truncated: bool,
}

pub fn read_connection_remote_file(
    connection: &ConnectionSummary,
    password: &str,
    remote_path: &str,
    working_directory: Option<&str>,
) -> Result<RemoteFileContent, AppError> {
    if !matches!(connection.kind, ConnectionKind::Ssh | ConnectionKind::Ftp) {
        return Err(AppError::InvalidInput);
    }
    let port = sftp_port_for(connection)?;
    let session = connect_ssh_session(
        &connection.host,
        port,
        &connection.username,
        connection.auth_method,
        password,
        connection.private_key_path.as_deref(),
    )?;
    let resolved = resolve_remote_path(&session, working_directory, remote_path)?;
    let bytes = read_remote_bytes(&session, &resolved)?;
    let truncated = bytes.len() > MAX_REMOTE_FILE_BYTES;
    let slice = if truncated {
        &bytes[..MAX_REMOTE_FILE_BYTES]
    } else {
        &bytes
    };
    let content = String::from_utf8_lossy(slice).into_owned();
    let _ = session.disconnect(None, "done", None);
    Ok(RemoteFileContent {
        resolved_path: resolved,
        content,
        truncated,
    })
}

pub fn write_connection_remote_file(
    connection: &ConnectionSummary,
    password: &str,
    remote_path: &str,
    working_directory: Option<&str>,
    content: &str,
) -> Result<String, AppError> {
    if !matches!(connection.kind, ConnectionKind::Ssh | ConnectionKind::Ftp) {
        return Err(AppError::InvalidInput);
    }
    if content.len() > MAX_REMOTE_FILE_BYTES {
        return Err(AppError::InvalidInput);
    }
    let port = sftp_port_for(connection)?;
    let session = connect_ssh_session(
        &connection.host,
        port,
        &connection.username,
        connection.auth_method,
        password,
        connection.private_key_path.as_deref(),
    )?;
    let resolved = resolve_remote_path(&session, working_directory, remote_path)?;
    write_remote_bytes(&session, &resolved, content.as_bytes())?;
    let _ = session.disconnect(None, "done", None);
    Ok(resolved)
}

fn resolve_remote_path(
    session: &Session,
    working_directory: Option<&str>,
    remote_path: &str,
) -> Result<String, AppError> {
    let trimmed = normalize_remote_path(remote_path.trim());
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput);
    }
    let cwd = working_directory
        .map(str::trim)
        .map(normalize_remote_path)
        .filter(|value| !value.is_empty())
        .filter(|value| is_plausible_shell_pwd(value))
        .unwrap_or_else(|| default_remote_cwd(session));

    if trimmed.starts_with('~') || cwd.starts_with('~') {
        return exec_realpath(session, &cwd, &trimmed);
    }
    if trimmed.starts_with('/') {
        return Ok(trimmed);
    }
    if cwd.starts_with('/') {
        return resolve_sftp_path(&cwd, &trimmed);
    }
    exec_realpath(session, &cwd, &trimmed)
}

fn default_remote_cwd(session: &Session) -> String {
    exec_capture(session, "sh -lc 'pwd'")
        .or_else(|_| exec_capture(session, "pwd"))
        .ok()
        .map(|value| normalize_remote_path(value.trim()))
        .filter(|value| !value.is_empty())
        .filter(|value| is_plausible_shell_pwd(value))
        .or_else(|| {
            session
                .sftp()
                .ok()
                .and_then(|sftp| sftp.realpath(Path::new(".")).ok())
                .map(|path| path.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| "/".to_string())
}

fn exec_realpath(session: &Session, cwd: &str, path: &str) -> Result<String, AppError> {
    let cwd_esc = shell_single_quote(cwd);
    let path_esc = shell_single_quote(path);
    let script = format!(
        "sh -lc 'd={cwd_esc}; p={path_esc}; case \"$d\" in \"~\"|\"~/*\") d=\"$HOME${{d#~}}\";; esac; case \"$p\" in \"~\"|\"~/*\") p=\"$HOME${{p#~}}\";; esac; cd \"$d\" 2>/dev/null || cd \"$HOME\" || exit 1; if command -v realpath >/dev/null 2>&1; then realpath -m -- \"$p\"; else f=\"$p\"; case \"$f\" in /*) ;; *) f=\"$PWD/$f\";; esac; printf \"%s\\n\" \"$f\"; fi'"
    );
    let output = exec_capture(session, &script)?;
    let resolved = output.lines().next().unwrap_or("").trim();
    if resolved.is_empty() {
        return Err(AppError::ConnectionFailed(format!(
            "Remote path could not be resolved (cwd: {}, path: {}).",
            cwd, path
        )));
    }
    Ok(resolved.to_string())
}

fn exec_capture(session: &Session, command: &str) -> Result<String, AppError> {
    let mut channel = session
        .channel_session()
        .map_err(|_| AppError::ConnectionFailed("Could not open SSH channel.".to_string()))?;
    channel
        .exec(command)
        .map_err(|_| AppError::ConnectionFailed("Could not run remote command.".to_string()))?;
    let mut output = String::new();
    let mut buffer = [0_u8; 8192];
    loop {
        match channel.read(&mut buffer) {
            Ok(0) => break,
            Ok(count) => output.push_str(&String::from_utf8_lossy(&buffer[..count])),
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => break,
        }
    }
    let _ = channel.wait_close();
    Ok(output)
}

fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn read_remote_bytes(session: &Session, path: &str) -> Result<Vec<u8>, AppError> {
    let sftp = session
        .sftp()
        .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
    let remote_path = Path::new(path);
    match sftp.open(remote_path) {
        Ok(mut remote) => {
            let mut buffer = Vec::new();
            remote.read_to_end(&mut buffer).map_err(|error| {
                AppError::ConnectionFailed(format!(
                    "Could not read remote file at {} ({})",
                    path,
                    error
                ))
            })?;
            Ok(buffer)
        }
        Err(_) if remote_file_may_be_new(&sftp, remote_path) => Ok(Vec::new()),
        Err(error) => Err(sftp_open_error(path, &error)),
    }
}

fn remote_file_may_be_new(sftp: &ssh2::Sftp, path: &Path) -> bool {
    match sftp.stat(path) {
        Ok(stat) => stat.is_dir(),
        Err(_) => parent_directory_exists(sftp, path),
    }
}

fn parent_directory_exists(sftp: &ssh2::Sftp, path: &Path) -> bool {
    let Some(parent) = path.parent() else {
        return false;
    };
    if parent.as_os_str().is_empty() {
        return sftp.stat(Path::new("/")).map(|stat| stat.is_dir()).unwrap_or(false);
    }
    sftp.stat(parent)
        .map(|stat| stat.is_dir())
        .unwrap_or(false)
}

fn sftp_open_error(path: &str, error: &ssh2::Error) -> AppError {
    AppError::ConnectionFailed(format!(
        "Could not open remote file at {} ({})",
        path,
        error
    ))
}

fn write_remote_bytes(session: &Session, path: &str, bytes: &[u8]) -> Result<(), AppError> {
    let sftp = session
        .sftp()
        .map_err(|_| AppError::ConnectionFailed("Could not open SFTP channel.".to_string()))?;
    let remote_path = Path::new(path);
    if let Some(parent) = remote_path.parent() {
        if !parent.as_os_str().is_empty() {
            let _ = sftp.mkdir(parent, 0o755);
        }
    }
    let mut remote = sftp
        .create(remote_path)
        .map_err(|error| {
            AppError::ConnectionFailed(format!(
                "Could not open remote file for writing at {} ({})",
                path,
                error
            ))
        })?;
    remote
        .write_all(bytes)
        .map_err(|_| AppError::ConnectionFailed("Could not write remote file.".to_string()))?;
    Ok(())
}
