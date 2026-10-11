export const FAVORITE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#71717a",
] as const;

export const SHORTCUT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No shortcut" },
  { value: "meta+1", label: "⌘1" },
  { value: "meta+2", label: "⌘2" },
  { value: "meta+3", label: "⌘3" },
  { value: "meta+4", label: "⌘4" },
  { value: "meta+5", label: "⌘5" },
  { value: "meta+6", label: "⌘6" },
  { value: "meta+7", label: "⌘7" },
  { value: "meta+8", label: "⌘8" },
  { value: "meta+9", label: "⌘9" },
];

export function keyboardShortcutFromEvent(event: KeyboardEvent): string | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return null;
  }
  if (!/^[1-9]$/.test(event.key)) {
    return null;
  }
  return `meta+${event.key}`;
}
