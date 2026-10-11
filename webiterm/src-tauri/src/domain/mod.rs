pub mod connection;
mod status;

pub use connection::{ConnectionInput, ConnectionKind, ConnectionSummary, ConnectionTestResult};
pub use status::{AppStatus, LocalPreferences};
