use crate::error::{CommandError, command_error};

const PROJECT_WEBSITE: &str = "https://github.com/Webisso/webiterm";

#[tauri::command]
pub fn open_project_website() -> Result<(), CommandError> {
    open_path_with_application(PROJECT_WEBSITE.to_string(), None)
}

#[tauri::command]
pub fn open_path_with_application(
    path: String,
    application: Option<String>,
) -> Result<(), CommandError> {
    #[cfg(target_os = "macos")]
    {
        let mut command = std::process::Command::new("open");
        if let Some(app) = application.filter(|value| !value.trim().is_empty()) {
            command.args(["-a", app.trim()]);
        }
        command.arg(path).spawn().map_err(|_| {
            command_error(crate::error::AppError::ConnectionFailed(
                "Could not open file.".to_string(),
            ))
        })?;
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|_| {
                command_error(crate::error::AppError::ConnectionFailed(
                    "Could not open file.".to_string(),
                ))
            })?;
        Ok(())
    }
}
