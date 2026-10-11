use std::sync::LazyLock;

use regex::Regex;

const MAX_INPUT_CHARS: usize = 16_000;
const MAX_OUTPUT_CHARS: usize = 8_000;

static PEM: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?is)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----")
        .expect("pem redaction pattern")
});

static BEARER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\b(bearer\s+)\S+").expect("bearer redaction pattern"));

static URL_USERINFO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-z][a-z0-9+.-]*://[^/\s:@]+):[^@\s/]+@").expect("url redaction pattern")
});

static ASSIGNMENTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?i)\b(password|passwd|pwd|secret|token|authorization|api[_-]?key|database_url|private[_-]?key|master_password|recovery_(?:code|secret))\b("?\s*[:=]\s*"?)([^"\s,;&]+)"#,
    )
    .expect("assignment redaction pattern")
});

/// Redacts credential-shaped substrings before they are written to logs.
///
/// The same rules are implemented in the cloud backend. Keep the tests aligned.
pub fn redact_for_log(input: &str) -> String {
    let bounded = truncate_chars(input, MAX_INPUT_CHARS);
    let without_keys = PEM.replace_all(&bounded, "[redacted private key]");
    let without_bearer = BEARER.replace_all(&without_keys, "${1}***");
    let without_urls = URL_USERINFO.replace_all(&without_bearer, "$1:***@");
    let redacted = ASSIGNMENTS.replace_all(&without_urls, "$1$2***");
    truncate_chars(&redacted, MAX_OUTPUT_CHARS)
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
    for (count, (index, _)) in input.char_indices().enumerate() {
        if count == max_chars {
            let mut truncated = input[..index].to_string();
            truncated.push('…');
            return truncated;
        }
    }
    input.to_string()
}

pub fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_urls_assignments_bearer_tokens_and_private_keys() {
        let pem =
            "-----BEGIN OPENSSH PRIVATE KEY-----\nZmFrZS1rZXk=\n-----END OPENSSH PRIVATE KEY-----";
        let input = format!(
            "postgres://app:s3cret-value@db.internal:5432/webiterm password=hunter2 Authorization: Bearer eyJabc.def token: another-secret {pem} schema_version=1"
        );
        let redacted = redact_for_log(&input);
        assert!(!redacted.contains("s3cret-value"));
        assert!(!redacted.contains("hunter2"));
        assert!(!redacted.contains("eyJabc.def"));
        assert!(!redacted.contains("another-secret"));
        assert!(!redacted.contains("ZmFrZS1rZXk="));
        assert!(redacted.contains("schema_version=1"));
        assert!(redacted.contains("[redacted private key]"));
        assert!(redacted.contains("postgres://app:***@db.internal:5432/webiterm"));
    }

    #[test]
    fn leaves_ordinary_prose_in_place() {
        let input = "the password policy is strict and the host is 10.0.0.8";
        assert_eq!(redact_for_log(input), input);
    }
}
