export type TerminalInputState = {
  line: string;
  submitted: string | null;
};

export function applyTerminalInput(line: string, data: string): TerminalInputState {
  let next = line;
  let submitted: string | null = null;

  for (let index = 0; index < data.length; index += 1) {
    const char = data.charAt(index);
    if (!char) {
      continue;
    }
    if (char === "\x1b") {
      index = skipEscapeSequence(data, index);
      continue;
    }
    if (char === "\r" || char === "\n") {
      const command = next.trim();
      if (command) {
        submitted = command;
      }
      next = "";
      continue;
    }
    if (char === "\x7f" || char === "\b") {
      next = next.slice(0, -1);
      continue;
    }
    if (char === "\x03" || char === "\x15") {
      next = "";
      continue;
    }
    if (char >= " " || char === "\t") {
      next += char;
    }
  }

  return { line: next, submitted };
}

function skipEscapeSequence(data: string, start: number): number {
  if (data[start + 1] !== "[") {
    return start;
  }
  let index = start + 2;
  while (index < data.length) {
    const code = data.charCodeAt(index);
    if (code >= 0x40 && code <= 0x7e) {
      return index;
    }
    index += 1;
  }
  return data.length - 1;
}

/**
 * Pulls a `nanoo <path>` command out of the text of the line shown on screen.
 * Needed because tab completion / history recall are done by the remote shell,
 * so keystroke tracking never sees the final text.
 */
export function extractNanooFromScreenLine(screenLine: string): string | null {
  const line = screenLine.replace(/\u00a0/g, " ");
  const match = /(?:^|[#$%>❯»➜]\s*|\s)nanoo\s+(\S.*?)\s*$/.exec(line);
  if (!match) {
    return null;
  }
  // Reject `echo nanoo x`: whatever precedes `nanoo` must be empty or end with a prompt char.
  const prefix = line.slice(0, line.lastIndexOf("nanoo", match.index + match[0].length)).trimEnd();
  if (prefix !== "" && !/[#$%>❯»➜]$/.test(prefix)) {
    return null;
  }
  return `nanoo ${match[1]}`;
}

/** Text of the logical line under the cursor (joins soft-wrapped rows). */
export function readCursorLine(term: {
  buffer: {
    active: {
      baseY: number;
      cursorY: number;
      getLine(y: number): { isWrapped: boolean; translateToString(trim?: boolean): string } | undefined;
    };
  };
}): string {
  const buf = term.buffer.active;
  let row = buf.baseY + buf.cursorY;
  let text = "";
  for (;;) {
    const line = buf.getLine(row);
    if (!line) {
      break;
    }
    text = line.translateToString(true) + text;
    if (!line.isWrapped || row === 0) {
      break;
    }
    row -= 1;
  }
  return text;
}
