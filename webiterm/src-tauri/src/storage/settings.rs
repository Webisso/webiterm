use crate::error::AppError;
use crate::storage::Database;

pub fn inspector_collapsed(db: &Database) -> Result<bool, AppError> {
    db.read(|document| document.inspector_collapsed)
}

pub fn set_inspector_collapsed(db: &Database, collapsed: bool) -> Result<(), AppError> {
    db.update(|document| {
        document.inspector_collapsed = collapsed;
        Ok(())
    })
}
