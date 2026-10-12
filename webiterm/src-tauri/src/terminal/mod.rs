mod ftp;
mod local;
mod ssh;

use tauri::{AppHandle, Emitter, Manager};

pub(crate) fn emit_terminal_output(app: &AppHandle, event_name: &str, payload: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event_name, payload);
        return;
    }
    let _ = app.emit(event_name, payload);
}

pub use ftp::{
    FtpListResult, FtpManager, FtpPrepareEditResult, FtpSessionInfo, FtpSyncEditsResult,
    test_ftp_login,
};
pub use local::{LocalShellSessionInfo, LocalTerminalManager};
pub use ssh::{MysqlQueryResult, SshTerminalManager, TerminalSessionInfo, run_mysql_query};
