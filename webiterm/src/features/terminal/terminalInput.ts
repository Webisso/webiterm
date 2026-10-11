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
