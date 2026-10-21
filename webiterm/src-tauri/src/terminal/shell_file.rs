use base64::Engine;
use base64::engine::general_purpose::STANDARD;

use crate::error::AppError;

const MAX_SHELL_FILE_BYTES: usize = 2 * 1024 * 1024;

const MARKER_BEGIN: &str = "WEBITERM_FILE_BEGIN";
const MARKER_END_OK: &str = "WEBITERM_FILE_END:ok";
const MARKER_END_MISSING: &str = "WEBITERM_FILE_END:missing";
const MARKER_END_DIR: &str = "WEBITERM_FILE_END:dir";
const MARKER_PATH: &str = "WEBITERM_FILE_PATH:";
const MARKER_WRITE_OK: &str = "WEBITERM_WRITE_OK";
const MARKER_WRITE_FAIL: &str = "WEBITERM_WRITE_FAIL";
const MARKER_DONE: &str = "WEBITERM_SHELL_DONE";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CapturedShellFile {
    pub resolved_path: String,
    pub content: String,
    pub truncated: bool,
}

pub struct CaptureReady<T> {
    pub value: Result<T, AppError>,
    pub leftover: String,
}

pub fn build_read_script(path: &str) -> Result<String, AppError> {
    let path = validate_path(path)?;
    let quoted = shell_quote(path);
    let body = format!(
        "f={quoted}; rp=$(dirname -- \"$f\"); bn=$(basename -- \"$f\"); rp=$( (cd \"$rp\" 2>/dev/null && pwd -P) || pwd -P ); {path_printf} \"$rp/$bn\"; {begin}; if [ -d \"$f\" ]; then {end_dir}; elif [ -e \"$f\" ]; then (base64 -w0 -- \"$f\" 2>/dev/null || base64 \"$f\" 2>/dev/null || base64 < \"$f\"); printf '\\n'; {end_ok}; else {end_missing}; fi",
        path_printf = printf_path_prefix(),
        begin = printf_joined(MARKER_BEGIN),
        end_dir = printf_joined(MARKER_END_DIR),
        end_ok = printf_joined(MARKER_END_OK),
        end_missing = printf_joined(MARKER_END_MISSING),
    );
    Ok(wrap_hidden(&body))
}

pub fn build_write_script(path: &str, content: &str) -> Result<String, AppError> {
    let path = validate_path(path)?;
    if content.len() > MAX_SHELL_FILE_BYTES {
        return Err(AppError::ConnectionFailed(
            "File is too large to save from the app.".to_string(),
        ));
    }
    let quoted = shell_quote(path);
    let write_body = if content.is_empty() {
        ": > \"$f\"; status=0".to_string()
    } else {
        let encoded = wrap_base64(&STANDARD.encode(content.as_bytes()), 70);
        format!(
            "base64 -d > \"$f\" << 'WEBITERM_B64_EOF'\n{encoded}\nWEBITERM_B64_EOF\nstatus=$?"
        )
    };
    let body = format!(
        "f={quoted}; {write_body}; rp=$(dirname -- \"$f\"); bn=$(basename -- \"$f\"); rp=$( (cd \"$rp\" 2>/dev/null && pwd -P) || pwd -P ); {path_printf} \"$rp/$bn\"; if [ \"$status\" -eq 0 ]; then {ok}; else {fail}; fi",
        path_printf = printf_path_prefix(),
        ok = printf_joined(MARKER_WRITE_OK),
        fail = printf_joined(MARKER_WRITE_FAIL),
    );
    Ok(wrap_hidden(&body))
}

pub fn poll_read(buffer: &str) -> Option<CaptureReady<CapturedShellFile>> {
    let flat = flatten_terminal_text(buffer);
    let (status, end_at, marker_len) = if let Some(index) = flat.rfind(MARKER_END_OK) {
        ("ok", index, MARKER_END_OK.len())
    } else if let Some(index) = flat.rfind(MARKER_END_MISSING) {
        ("missing", index, MARKER_END_MISSING.len())
    } else if let Some(index) = flat.rfind(MARKER_END_DIR) {
        ("dir", index, MARKER_END_DIR.len())
    } else {
        return None;
    };
    if status == "ok" && flat[..end_at].rfind(MARKER_BEGIN).is_none() {
        return None;
    }
    let after_status = end_at + marker_len;
    let Some(done_rel) = flat[after_status..].find(MARKER_DONE) else {
        return None;
    };
    let leftover = leftover_after(&flat, after_status + done_rel + MARKER_DONE.len());
    let value = match status {
        "dir" => Err(AppError::ConnectionFailed(
            "That path is a directory.".to_string(),
        )),
        "missing" => Ok(CapturedShellFile {
            resolved_path: extract_path(&flat[..end_at]).unwrap_or_else(|| "?".to_string()),
            content: String::new(),
            truncated: false,
        }),
        "ok" => {
            let begin = flat[..end_at].rfind(MARKER_BEGIN).expect("begin marker");
            let body = &flat[begin + MARKER_BEGIN.len()..end_at];
            let resolved_path = extract_path(&flat[..begin]).unwrap_or_else(|| "?".to_string());
            match decode_base64_payload(body) {
                Ok(bytes) => {
                    let truncated = bytes.len() > MAX_SHELL_FILE_BYTES;
                    let slice = if truncated {
                        &bytes[..MAX_SHELL_FILE_BYTES]
                    } else {
                        &bytes[..]
                    };
                    Ok(CapturedShellFile {
                        resolved_path,
                        content: String::from_utf8_lossy(slice).into_owned(),
                        truncated,
                    })
                }
                Err(()) => Err(AppError::ConnectionFailed(
                    "Could not read that file.".to_string(),
                )),
            }
        }
        _ => unreachable!(),
    };
    Some(CaptureReady { value, leftover })
}

pub fn poll_write(buffer: &str) -> Option<CaptureReady<String>> {
    let flat = flatten_terminal_text(buffer);
    if let Some(index) = flat.rfind(MARKER_WRITE_OK) {
        let Some(done_rel) = flat[index + MARKER_WRITE_OK.len()..].find(MARKER_DONE) else {
            return None;
        };
        let resolved_path = extract_path(&flat[..index]).unwrap_or_else(|| "?".to_string());
        return Some(CaptureReady {
            value: Ok(resolved_path),
            leftover: leftover_after(
                &flat,
                index + MARKER_WRITE_OK.len() + done_rel + MARKER_DONE.len(),
            ),
        });
    }
    if let Some(index) = flat.rfind(MARKER_WRITE_FAIL) {
        let Some(done_rel) = flat[index + MARKER_WRITE_FAIL.len()..].find(MARKER_DONE) else {
            return None;
        };
        return Some(CaptureReady {
            value: Err(AppError::ConnectionFailed(
                "Could not save that file.".to_string(),
            )),
            leftover: leftover_after(
                &flat,
                index + MARKER_WRITE_FAIL.len() + done_rel + MARKER_DONE.len(),
            ),
        });
    }
    None
}

/// Runs `body` with terminal echo and shell history disabled, then marks completion.
fn wrap_hidden(body: &str) -> String {
    let done = printf_joined(MARKER_DONE);
    format!(
        "set +o history\n\
stty -echo\n\
if [ -n \"${{ZSH_VERSION-}}\" ]; then setopt HIST_IGNORE_SPACE 2>/dev/null; fi\n\
{body}\n\
stty echo\n\
if [ -n \"${{BASH_VERSION-}}\" ]; then h=$(history 1); case \"$h\" in *'set +o history'*) set -- $h; history -d \"$1\" 2>/dev/null;; esac; case \":${{HISTCONTROL-}}:\" in *:ignorespace:*|*:ignoreboth:*) ;; *) HISTCONTROL=\"ignorespace${{HISTCONTROL:+:$HISTCONTROL}}\";; esac; fi\n\
 set -o history\n\
{done}\n"
    )
}

fn validate_path(path: &str) -> Result<&str, AppError> {
    let path = path.trim();
    if path.is_empty() || path.contains('\n') || path.contains('\r') || path.contains('\0') {
        return Err(AppError::ConnectionFailed(
            "Enter a file path.".to_string(),
        ));
    }
    Ok(path)
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

/// Print `marker` without placing the whole marker in the script source (PTY echo).
fn printf_joined(marker: &str) -> String {
    let mid = marker.len() / 2;
    let (left, right) = marker.split_at(mid);
    format!("printf '%s%s\\n' '{left}' '{right}'")
}

fn printf_path_prefix() -> String {
    let mid = MARKER_PATH.len() / 2;
    let (left, right) = MARKER_PATH.split_at(mid);
    format!("printf '%s%s%s\\n' '{left}' '{right}'")
}

fn wrap_base64(encoded: &str, width: usize) -> String {
    let mut out = String::new();
    for (index, ch) in encoded.chars().enumerate() {
        if index > 0 && index % width == 0 {
            out.push('\n');
        }
        out.push(ch);
    }
    out
}

fn decode_base64_payload(body: &str) -> Result<Vec<u8>, ()> {
    let filtered: String = body
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '+' || *ch == '/' || *ch == '=')
        .collect();
    if filtered.is_empty() {
        return Ok(Vec::new());
    }
    STANDARD.decode(filtered).map_err(|_| ())
}

fn extract_path(head: &str) -> Option<String> {
    let index = head.rfind(MARKER_PATH)?;
    let rest = &head[index + MARKER_PATH.len()..];
    let line = rest.lines().next()?.trim();
    if line.is_empty() {
        None
    } else {
        Some(line.to_string())
    }
}

fn leftover_after(flat: &str, from: usize) -> String {
    flat.get(from..)
        .unwrap_or("")
        .trim_start_matches(['\n', '\r'])
        .to_string()
}

fn flatten_terminal_text(value: &str) -> String {
    let mut out = String::new();
    let mut chars = value.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            while let Some(&next) = chars.peek() {
                chars.next();
                if next.is_ascii_alphabetic() || next == '@' {
                    break;
                }
            }
            continue;
        }
        if ch != '\r' {
            out.push(ch);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scripts_do_not_contain_assembled_markers() {
        let read = build_read_script(".env").unwrap();
        assert!(!read.contains(MARKER_BEGIN));
        assert!(!read.contains(MARKER_END_OK));
        assert!(!read.contains(MARKER_PATH));
        assert!(!read.contains(MARKER_DONE));
        assert!(read.contains("set +o history"));
        assert!(read.contains("stty -echo"));
        let write = build_write_script(".env", "A=1\n").unwrap();
        assert!(!write.contains(MARKER_WRITE_OK));
        assert!(!write.contains(MARKER_WRITE_FAIL));
        assert!(!write.contains(MARKER_DONE));
        assert!(write.contains("base64 -d"));
    }

    #[test]
    fn parses_read_output_ignoring_script_echo() {
        let encoded = STANDARD.encode(b"hello");
        let buffer = format!(
            "printf '%s%s\\n' 'WEBITERM_FILE_BEG' 'IN'\nWEBITERM_FILE_PATH:/var/www/.env\nWEBITERM_FILE_BEGIN\n{encoded}\nWEBITERM_FILE_END:ok\nWEBITERM_SHELL_DONE\nubuntu@host$ "
        );
        let ready = poll_read(&buffer).unwrap();
        let file = ready.value.unwrap();
        assert_eq!(file.content, "hello");
        assert_eq!(file.resolved_path, "/var/www/.env");
        assert!(ready.leftover.contains("ubuntu@host$"));
    }

    #[test]
    fn parses_missing_file_as_empty() {
        let buffer = "WEBITERM_FILE_PATH:/var/www/.env\nWEBITERM_FILE_BEGIN\nWEBITERM_FILE_END:missing\nWEBITERM_SHELL_DONE\n";
        let file = poll_read(buffer).unwrap().value.unwrap();
        assert_eq!(file.content, "");
        assert_eq!(file.resolved_path, "/var/www/.env");
    }

    #[test]
    fn parses_write_ok() {
        let buffer = "WEBITERM_FILE_PATH:/var/www/.env\nWEBITERM_WRITE_OK\nWEBITERM_SHELL_DONE\n$ ";
        let ready = poll_write(buffer).unwrap();
        assert_eq!(ready.value.unwrap(), "/var/www/.env");
    }
}
