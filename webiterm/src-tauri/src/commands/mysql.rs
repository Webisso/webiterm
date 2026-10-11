use tauri::State;

use crate::error::{AppError, CommandError, command_error};
use crate::storage::{self, Database};
use crate::terminal::{MysqlQueryResult, run_mysql_query};

#[tauri::command]
pub async fn mysql_query(
    state: State<'_, Database>,
    connection_id: String,
    sql: String,
    database: Option<String>,
) -> Result<MysqlQueryResult, CommandError> {
    let connection = storage::get_connection(&state, &connection_id)
        .map_err(command_error)?
        .ok_or_else(|| command_error(AppError::NotFound))?;
    let password = storage::resolve_password(&state, &connection.id)
        .map_err(command_error)?
        .unwrap_or_default();
    run_mysql_query(&connection, &password, &sql, database.as_deref())
        .await
        .map_err(command_error)
}
