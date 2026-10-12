mod commands;
mod domain;
mod error;
mod menu_shell;
mod security;
pub mod storage;
mod terminal;

use tauri::Manager;

use commands::{
    add_task_comment_cmd, add_task_image_cmd, assign_connection_group_cmd, create_connection,
    create_connection_group_cmd, create_sftp_favorite_cmd, create_ssh_command_favorite_cmd,
    create_task_board_cmd, create_task_cmd, delete_connection, delete_connection_group_cmd,
    create_folder_note_cmd, delete_folder_note_cmd, delete_folder_notes_for_group_cmd,
    delete_sftp_favorite_cmd, delete_ssh_command_favorite_cmd, delete_task_board_cmd,
    delete_task_boards_for_group_cmd, delete_task_cmd, delete_task_comment_cmd,
    delete_task_image_cmd, export_local_data, ftp_change_dir, ftp_close, ftp_delete, ftp_download,
    ftp_goto, ftp_list, ftp_open, ftp_parent_dir, ftp_prepare_edit, ftp_rename, ftp_sync_edits,
    get_app_status, get_folder_note_cmd, get_local_preferences, get_sftp_editor_prefs,
    get_task_board_cmd,
    import_local_data, list_connection_groups_cmd, list_connections, list_sftp_favorites_cmd,
    list_folder_notes_cmd, list_ssh_command_favorites_cmd, list_task_boards_cmd, move_task_cmd,
    mysql_query,
    open_path_with_application, open_project_website, rename_folder_note_cmd, rename_task_board_cmd,
    local_shell_close, local_shell_open, local_shell_resize, local_shell_write,
    set_inspector_collapsed, set_sftp_editor_prefs, ssh_close, ssh_open, ssh_resize, ssh_write,
    test_connection, update_connection, update_connection_group_cmd, update_sftp_favorite_cmd,
    update_folder_note_cmd, update_ssh_command_favorite_cmd, update_task_cmd,
};
use storage::Database;
use terminal::{FtpManager, LocalTerminalManager, SshTerminalManager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    security::init_tracing();
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .on_menu_event(|app, event| menu_shell::on_menu_event(app, &event))
        .setup(|app| {
            let directory = app
                .path()
                .app_data_dir()
                .map_err(|_| std::io::Error::other("application data directory is unavailable"))?;
            let database = Database::open(directory.join("webiterm.json")).map_err(|err| {
                tracing::error!(
                    detail = %security::redact_for_log(&format!("{err:#}")),
                    "failed to open local data file"
                );
                std::io::Error::other(err.public_message())
            })?;
            app.manage(database);
            app.manage(SshTerminalManager::new());
            app.manage(LocalTerminalManager::new());
            app.manage(FtpManager::new());
            menu_shell::install_from_setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_status,
            get_local_preferences,
            set_inspector_collapsed,
            export_local_data,
            import_local_data,
            list_connections,
            list_connection_groups_cmd,
            create_connection_group_cmd,
            update_connection_group_cmd,
            delete_connection_group_cmd,
            assign_connection_group_cmd,
            create_connection,
            update_connection,
            delete_connection,
            test_connection,
            ssh_open,
            ssh_write,
            ssh_resize,
            ssh_close,
            local_shell_open,
            local_shell_write,
            local_shell_resize,
            local_shell_close,
            ftp_open,
            ftp_list,
            ftp_change_dir,
            ftp_parent_dir,
            ftp_goto,
            ftp_download,
            ftp_delete,
            ftp_rename,
            ftp_prepare_edit,
            ftp_sync_edits,
            ftp_close,
            get_sftp_editor_prefs,
            set_sftp_editor_prefs,
            open_path_with_application,
            open_project_website,
            list_sftp_favorites_cmd,
            create_sftp_favorite_cmd,
            update_sftp_favorite_cmd,
            delete_sftp_favorite_cmd,
            list_ssh_command_favorites_cmd,
            create_ssh_command_favorite_cmd,
            update_ssh_command_favorite_cmd,
            delete_ssh_command_favorite_cmd,
            mysql_query,
            list_folder_notes_cmd,
            get_folder_note_cmd,
            create_folder_note_cmd,
            update_folder_note_cmd,
            rename_folder_note_cmd,
            delete_folder_note_cmd,
            delete_folder_notes_for_group_cmd,
            list_task_boards_cmd,
            create_task_board_cmd,
            rename_task_board_cmd,
            delete_task_board_cmd,
            delete_task_boards_for_group_cmd,
            get_task_board_cmd,
            create_task_cmd,
            update_task_cmd,
            move_task_cmd,
            delete_task_cmd,
            add_task_image_cmd,
            delete_task_image_cmd,
            add_task_comment_cmd,
            delete_task_comment_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running WebiTerm");
}
