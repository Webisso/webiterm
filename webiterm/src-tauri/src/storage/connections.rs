use std::time::Instant;

use uuid::Uuid;

use crate::domain::connection::{
    AuthMethod, ConnectionInput, ConnectionKind, ConnectionSummary, ConnectionTestResult,
    LastStatus,
};
use crate::error::AppError;
use crate::storage::Database;
use crate::storage::document::{StoredConnection, now_iso};
use crate::terminal::test_ftp_login;

pub fn list_connections(db: &Database, query: &str) -> Result<Vec<ConnectionSummary>, AppError> {
    let trimmed = query.trim().to_ascii_lowercase();
    db.read(|document| {
        let mut items: Vec<ConnectionSummary> = document
            .connections
            .iter()
            .filter(|item| {
                if trimmed.is_empty() {
                    return true;
                }
                let tags = item.profile.tags.join(" ");
                [
                    item.profile.name.as_str(),
                    item.profile.host.as_str(),
                    item.profile.username.as_str(),
                    tags.as_str(),
                ]
                .iter()
                .any(|field| field.to_ascii_lowercase().contains(&trimmed))
            })
            .map(|item| item.profile.clone())
            .collect();
        items.sort_by(|left, right| {
            right
                .favorite
                .cmp(&left.favorite)
                .then_with(|| right.updated_at.cmp(&left.updated_at))
                .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        });
        items
    })
}

pub fn get_connection(db: &Database, id: &str) -> Result<Option<ConnectionSummary>, AppError> {
    db.read(|document| {
        document
            .connections
            .iter()
            .find(|item| item.profile.id == id)
            .map(|item| item.profile.clone())
    })
}

pub fn create_connection(
    db: &Database,
    input: ConnectionInput,
) -> Result<ConnectionSummary, AppError> {
    validate_input(&input)?;
    let id = Uuid::new_v4().to_string();
    let profile = summary_from_input(&id, &input, LastStatus::Unknown, None, None);
    let password = stored_password(input.password.as_deref());
    db.update(|document| {
        document.connections.push(StoredConnection {
            profile: profile.clone(),
            password,
        });
        Ok(profile)
    })
}

pub fn update_connection(
    db: &Database,
    id: &str,
    input: ConnectionInput,
) -> Result<ConnectionSummary, AppError> {
    validate_input(&input)?;
    db.update(|document| {
        let existing = document
            .connections
            .iter_mut()
            .find(|item| item.profile.id == id)
            .ok_or(AppError::NotFound)?;
        let last_status = existing.profile.last_status;
        let last_error = existing.profile.last_error.clone();
        let last_connected_at = existing.profile.last_connected_at.clone();
        match input.password.as_deref() {
            Some(password) if !password.is_empty() => {
                existing.password = Some(password.to_string())
            }
            Some(_) => existing.password = None,
            None => {}
        }
        existing.profile =
            summary_from_input(id, &input, last_status, last_error, last_connected_at);
        Ok(existing.profile.clone())
    })
}

pub fn assign_connection_group(
    db: &Database,
    id: &str,
    group_id: Option<String>,
) -> Result<ConnectionSummary, AppError> {
    db.update(|document| {
        let existing = document
            .connections
            .iter_mut()
            .find(|item| item.profile.id == id)
            .ok_or(AppError::NotFound)?;
        existing.profile.group_id = group_id.filter(|value| !value.is_empty());
        existing.profile.updated_at = now_iso();
        Ok(existing.profile.clone())
    })
}

pub fn delete_connection(db: &Database, id: &str) -> Result<(), AppError> {
    db.update(|document| {
        let before = document.connections.len();
        document.connections.retain(|item| item.profile.id != id);
        if document.connections.len() == before {
            return Err(AppError::NotFound);
        }
        document
            .sftp_favorites
            .retain(|item| item.connection_id != id);
        document
            .ssh_command_favorites
            .retain(|item| item.connection_id != id);
        Ok(())
    })
}

pub async fn test_connection(db: &Database, id: &str) -> Result<ConnectionTestResult, AppError> {
    let summary = get_connection(db, id)?.ok_or(AppError::NotFound)?;
    let started = Instant::now();
    let result = match summary.kind {
        ConnectionKind::Mysql => test_mysql(db, &summary).await,
        ConnectionKind::Ssh => test_ssh_tcp(&summary).await,
        ConnectionKind::Ftp => test_ftp(db, &summary).await,
        ConnectionKind::Postgresql => Ok(ConnectionTestResult {
            ok: false,
            message: "PostgreSQL connections are not implemented yet.".to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        }),
    }?;
    db.update(|document| {
        let Some(existing) = document
            .connections
            .iter_mut()
            .find(|item| item.profile.id == id)
        else {
            return Ok(());
        };
        existing.profile.last_status = if result.ok {
            LastStatus::Ok
        } else {
            LastStatus::Failed
        };
        existing.profile.last_error = if result.ok {
            None
        } else {
            Some(result.message.clone())
        };
        if result.ok {
            existing.profile.last_connected_at = Some(now_iso());
        }
        existing.profile.updated_at = now_iso();
        Ok(())
    })?;
    Ok(result)
}

pub fn resolve_password(db: &Database, profile_id: &str) -> Result<Option<String>, AppError> {
    db.read(|document| {
        document
            .connections
            .iter()
            .find(|item| item.profile.id == profile_id)
            .and_then(|item| item.password.clone())
    })
}

async fn test_mysql(
    db: &Database,
    summary: &ConnectionSummary,
) -> Result<ConnectionTestResult, AppError> {
    let started = Instant::now();
    let password = resolve_password(db, &summary.id)?.unwrap_or_default();
    let database = summary
        .database_name
        .as_deref()
        .filter(|name| !name.is_empty());
    let url = build_mysql_url(
        &summary.username,
        &password,
        &summary.host,
        summary.port,
        database,
    );
    let connect = sqlx::mysql::MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url);
    let connected = match tokio::time::timeout(std::time::Duration::from_secs(8), connect).await {
        Ok(Ok(pool)) => {
            pool.close().await;
            Ok(())
        }
        Ok(Err(_)) => {
            Err("Could not connect to MySQL. Check host, port, credentials, and database name.")
        }
        Err(_) => Err("MySQL connection timed out."),
    };
    Ok(match connected {
        Ok(()) => ConnectionTestResult {
            ok: true,
            message: "MySQL connection succeeded.".to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        },
        Err(message) => ConnectionTestResult {
            ok: false,
            message: message.to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        },
    })
}

async fn test_ftp(
    db: &Database,
    summary: &ConnectionSummary,
) -> Result<ConnectionTestResult, AppError> {
    let started = Instant::now();
    let password = resolve_password(db, &summary.id)?.unwrap_or_default();
    match test_ftp_login(&password, summary).await {
        Ok(()) => Ok(ConnectionTestResult {
            ok: true,
            message: "SFTP login succeeded.".to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        }),
        Err(err) => Ok(ConnectionTestResult {
            ok: false,
            message: err.public_message(),
            duration_ms: started.elapsed().as_millis() as u64,
        }),
    }
}

async fn test_ssh_tcp(summary: &ConnectionSummary) -> Result<ConnectionTestResult, AppError> {
    let started = Instant::now();
    let address = format!("{}:{}", summary.host, summary.port);
    let reached = match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        tokio::net::TcpStream::connect(address),
    )
    .await
    {
        Ok(Ok(_)) => Some(true),
        Ok(Err(_)) => Some(false),
        Err(_) => None,
    };
    Ok(match reached {
        Some(true) => ConnectionTestResult {
            ok: true,
            message: "SSH port is open (TCP only). Use Open to verify login and the terminal."
                .to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        },
        Some(false) => ConnectionTestResult {
            ok: false,
            message: "Could not reach the SSH host on the configured port.".to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        },
        None => ConnectionTestResult {
            ok: false,
            message: "SSH connection timed out.".to_string(),
            duration_ms: started.elapsed().as_millis() as u64,
        },
    })
}

pub fn build_mysql_url(
    username: &str,
    password: &str,
    host: &str,
    port: u16,
    database: Option<&str>,
) -> String {
    let user = urlencoding::encode(username);
    let credentials = if password.is_empty() {
        user.to_string()
    } else {
        format!("{}:{}", user, urlencoding::encode(password))
    };
    let db_path = match database.filter(|name| !name.is_empty()) {
        Some(name) => format!("/{}", urlencoding::encode(name)),
        None => String::new(),
    };
    format!("mysql://{credentials}@{host}:{port}{db_path}?ssl-mode=DISABLED")
}

fn stored_password(password: Option<&str>) -> Option<String> {
    password
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn summary_from_input(
    id: &str,
    input: &ConnectionInput,
    last_status: LastStatus,
    last_error: Option<String>,
    last_connected_at: Option<String>,
) -> ConnectionSummary {
    ConnectionSummary {
        id: id.to_string(),
        kind: input.kind,
        name: trim_field(&input.name),
        host: trim_field(&input.host),
        port: input.port,
        username: trim_field(&input.username),
        database_name: input
            .database_name
            .as_deref()
            .map(trim_field)
            .filter(|value| !value.is_empty()),
        auth_method: input.auth_method,
        private_key_path: input
            .private_key_path
            .as_deref()
            .map(trim_field)
            .filter(|value| !value.is_empty()),
        startup_command: normalize_startup_command(input.kind, input.startup_command.as_deref()),
        sftp_initial_path: normalize_sftp_initial_path(
            input.kind,
            input.sftp_initial_path.as_deref(),
        ),
        group_id: input.group_id.clone().filter(|value| !value.is_empty()),
        favorite: input.favorite,
        tags: input.tags.clone(),
        ssh_tunnel_profile_id: input
            .ssh_tunnel_profile_id
            .clone()
            .filter(|value| !value.is_empty()),
        last_status,
        last_error,
        last_connected_at,
        updated_at: now_iso(),
    }
}

fn normalize_sftp_initial_path(kind: ConnectionKind, value: Option<&str>) -> Option<String> {
    if kind != ConnectionKind::Ssh && kind != ConnectionKind::Ftp {
        return None;
    }
    value.map(trim_field).filter(|path| !path.is_empty())
}

fn normalize_startup_command(kind: ConnectionKind, value: Option<&str>) -> Option<String> {
    if kind != ConnectionKind::Ssh {
        return None;
    }
    value.map(trim_field).filter(|command| !command.is_empty())
}

fn validate_input(input: &ConnectionInput) -> Result<(), AppError> {
    if trim_field(&input.name).is_empty() || trim_field(&input.host).is_empty() {
        return Err(AppError::InvalidInput);
    }
    if trim_field(&input.username).is_empty() || input.port == 0 {
        return Err(AppError::InvalidInput);
    }
    if input.kind == ConnectionKind::Mysql && input.auth_method == AuthMethod::PrivateKey {
        return Err(AppError::InvalidInput);
    }
    Ok(())
}

fn trim_field(value: &str) -> String {
    value.trim().to_string()
}
