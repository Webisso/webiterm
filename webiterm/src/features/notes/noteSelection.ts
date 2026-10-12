export function saveEditorSelection(root: HTMLElement | null): Range | null {
  if (!root) {
    return null;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range.cloneRange();
}

export function restoreEditorSelection(range: Range | null) {
  if (!range) {
    return;
  }
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function applyFormatCommand(
  root: HTMLElement,
  command: string,
  savedRange: Range | null,
) {
  root.focus();
  restoreEditorSelection(savedRange);
  document.execCommand(command, false);
}
