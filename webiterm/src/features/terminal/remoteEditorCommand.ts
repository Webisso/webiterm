/** Only `nanoo` opens the in-app editor; real `nano` / `vim` still run on the server. */
const IN_APP_EDITOR_COMMANDS = new Set(["nanoo"]);

/** Path from `nanoo .env`, etc. */
export function parseRemoteEditorPath(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(/\s+/);
  const verb = parts[0]?.toLowerCase();
  if (!verb || !IN_APP_EDITOR_COMMANDS.has(verb)) {
    return null;
  }
  const pathTokens = parts.slice(1).filter((part) => !part.startsWith("-"));
  if (pathTokens.length === 0) {
    return null;
  }
  const raw = pathTokens[pathTokens.length - 1];
  if (!raw) {
    return null;
  }
  return raw.replace(/^['"]|['"]$/g, "");
}

/** Updates tracked cwd after `cd` (best-effort, same as an interactive shell). */
export function applyCdCommand(currentCwd: string | null, command: string): string | null {
  const trimmed = command.trim();
  const match = /^cd(?:\s+(.+))?$/.exec(trimmed);
  if (!match) {
    return currentCwd;
  }
  const arg = match[1]?.trim();
  if (!arg) {
    return "~";
  }
  const unquoted = arg.replace(/^['"]|['"]$/g, "");
  if (unquoted === "-") {
    return currentCwd;
  }
  if (unquoted.startsWith("/") || unquoted.startsWith("~")) {
    return unquoted;
  }
  const base =
    currentCwd && (currentCwd.startsWith("/") || currentCwd.startsWith("~"))
      ? currentCwd
      : "~";
  if (base === "~" || base.startsWith("~/")) {
    return `${base.replace(/\/$/, "")}/${unquoted}`;
  }
  return `${base.replace(/\/$/, "")}/${unquoted}`;
}

export function remoteFileTabTitle(remotePath: string): string {
  const segment = remotePath.split("/").filter(Boolean).pop();
  return segment ?? remotePath;
}
