/** Only `nanoo` opens the in-app editor; real `nano` / `vim` still run on the server. */
const IN_APP_EDITOR_COMMANDS = new Set(["nanoo"]);

/** Minimal shell-like split: handles '..', "..", and backslash-escaped characters. */
function splitShellWords(input: string): string[] {
  const words: string[] = [];
  let current = "";
  let has = false;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
    } else if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === "\\" && i + 1 < input.length) current += input.charAt(++i);
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      has = true;
    } else if (ch === "\\" && i + 1 < input.length) {
      current += input.charAt(++i);
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || current) words.push(current);
      current = "";
      has = false;
    } else {
      current += ch;
      has = true;
    }
  }
  if (has || current) words.push(current);
  return words;
}

/** Path from `nanoo .env`, etc. */
export function parseRemoteEditorPath(command: string): string | null {
  const parts = splitShellWords(command.trim());
  const verb = parts[0]?.toLowerCase();
  if (!verb || !IN_APP_EDITOR_COMMANDS.has(verb)) {
    return null;
  }
  const pathTokens = parts.slice(1).filter((part) => !part.startsWith("-"));
  const raw = pathTokens[pathTokens.length - 1];
  return raw ? raw : null;
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
