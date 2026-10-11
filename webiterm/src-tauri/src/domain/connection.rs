use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionKind {
    Ssh,
    Ftp,
    Mysql,
    Postgresql,
}

impl ConnectionKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ssh => "ssh",
            Self::Ftp => "ftp",
            Self::Mysql => "mysql",
            Self::Postgresql => "postgresql",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "ssh" => Some(Self::Ssh),
            "ftp" => Some(Self::Ftp),
            "mysql" => Some(Self::Mysql),
            "postgresql" => Some(Self::Postgresql),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthMethod {
    Password,
    PrivateKey,
    Agent,
    None,
}

impl AuthMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Password => "password",
            Self::PrivateKey => "private_key",
            Self::Agent => "agent",
            Self::None => "none",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "password" => Some(Self::Password),
            "private_key" => Some(Self::PrivateKey),
            "agent" => Some(Self::Agent),
            "none" => Some(Self::None),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LastStatus {
    Unknown,
    Ok,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummary {
    pub id: String,
    pub kind: ConnectionKind,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub database_name: Option<String>,
    pub auth_method: AuthMethod,
    pub private_key_path: Option<String>,
    pub startup_command: Option<String>,
    pub sftp_initial_path: Option<String>,
    pub group_id: Option<String>,
    pub favorite: bool,
    pub tags: Vec<String>,
    pub ssh_tunnel_profile_id: Option<String>,
    pub last_status: LastStatus,
    pub last_error: Option<String>,
    pub last_connected_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    pub kind: ConnectionKind,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub database_name: Option<String>,
    pub auth_method: AuthMethod,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub startup_command: Option<String>,
    pub sftp_initial_path: Option<String>,
    pub group_id: Option<String>,
    pub favorite: bool,
    pub tags: Vec<String>,
    pub ssh_tunnel_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub ok: bool,
    pub message: String,
    pub duration_ms: u64,
}
