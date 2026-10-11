use serde::Serialize;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub app_version: String,
    pub schema_version: i64,
    pub database_ready: bool,
    pub storage_path: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalPreferences {
    pub inspector_collapsed: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_json_uses_camel_case() {
        let status = AppStatus {
            app_version: "0.1.0".to_string(),
            schema_version: 1,
            database_ready: true,
            storage_path: "/tmp/webiterm.json".to_string(),
        };
        let value = serde_json::to_value(&status).unwrap();
        assert_eq!(value["appVersion"], "0.1.0");
        assert_eq!(value["schemaVersion"], 1);
        assert_eq!(value["databaseReady"], true);
        assert_eq!(value["storagePath"], "/tmp/webiterm.json");
        assert!(value.get("storage_path").is_none());
    }
}
