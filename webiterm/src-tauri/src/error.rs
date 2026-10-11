use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("local storage is unavailable")]
    Io(#[from] std::io::Error),
    #[error("stored application data is invalid")]
    InvalidStoredValue { key: &'static str },
    #[error("connection was not found")]
    NotFound,
    #[error("invalid input")]
    InvalidInput,
    #[error("connection failed")]
    ConnectionFailed(String),
    #[error("session was not found")]
    SessionNotFound,
    #[error("{0}")]
    UserFacing(String),
}

impl AppError {
    pub fn public_message(&self) -> String {
        match self {
            Self::InvalidStoredValue { .. } => "Stored application data is invalid.".to_string(),
            Self::Io(_) => "Local storage is unavailable.".to_string(),
            Self::NotFound => "That item was not found.".to_string(),
            Self::InvalidInput => "Check the fields and try again.".to_string(),
            Self::ConnectionFailed(message) => message.clone(),
            Self::SessionNotFound => "Session was not found.".to_string(),
            Self::UserFacing(message) => message.clone(),
        }
    }

    pub fn code(&self) -> ErrorCode {
        match self {
            Self::Io(_) | Self::InvalidStoredValue { .. } => ErrorCode::LocalStorage,
            Self::NotFound | Self::SessionNotFound => ErrorCode::NotFound,
            Self::InvalidInput | Self::UserFacing(_) => ErrorCode::InvalidInput,
            Self::ConnectionFailed(_) => ErrorCode::ConnectionFailed,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    LocalStorage,
    NotFound,
    InvalidInput,
    ConnectionFailed,
}

pub fn command_error(err: AppError) -> CommandError {
    tracing::error!(
        category = "app",
        code = ?err.code(),
        detail = %crate::security::redact_for_log(&format!("{err:#}")),
        "operation failed"
    );
    CommandError {
        code: err.code(),
        message: err.public_message(),
    }
}
