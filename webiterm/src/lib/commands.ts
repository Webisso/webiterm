import type { CommandItem } from "../types/desktop";

export function filterCommands(commands: readonly CommandItem[], query: string): CommandItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [...commands];
  }
  return commands.filter((command) => {
    const haystack = [command.title, ...command.keywords].join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function moveSelection(current: number, delta: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return (current + delta + count) % count;
}
