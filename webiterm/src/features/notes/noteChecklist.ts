const CHECKLIST_ITEM_HTML =
  '<li data-checked="0"><span class="folder-note-check-toggle" contenteditable="false" role="checkbox" aria-checked="false" tabindex="-1"></span><div class="folder-note-check-text">\u00a0</div></li>';

export function createChecklistItem(): HTMLLIElement {
  const template = document.createElement("template");
  template.innerHTML = CHECKLIST_ITEM_HTML;
  return template.content.firstElementChild as HTMLLIElement;
}

export function insertChecklist(root: HTMLElement) {
  root.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    appendChecklist(root);
    return;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    appendChecklist(root);
    return;
  }

  const list = document.createElement("ul");
  list.className = "folder-note-checklist";
  list.appendChild(createChecklistItem());

  range.deleteContents();
  range.insertNode(list);
  range.setStartAfter(list);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  const textSpan = list.querySelector(".folder-note-check-text");
  if (textSpan) {
    focusCheckText(textSpan);
  }
}

function appendChecklist(root: HTMLElement) {
  const list = document.createElement("ul");
  list.className = "folder-note-checklist";
  list.appendChild(createChecklistItem());
  root.appendChild(list);
  const textSpan = list.querySelector(".folder-note-check-text");
  if (textSpan) {
    focusCheckText(textSpan);
  }
}

export function focusCheckText(node: Element) {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function findChecklistContext(node: Node | null): {
  item: HTMLLIElement;
  text: HTMLElement;
  list: HTMLUListElement;
} | null {
  if (!node) {
    return null;
  }
  const element = node instanceof Element ? node : node.parentElement;
  const text = element?.closest(".folder-note-check-text");
  if (!(text instanceof HTMLElement)) {
    return null;
  }
  const item = text.closest("li");
  const list = text.closest("ul.folder-note-checklist");
  if (!(item instanceof HTMLLIElement) || !(list instanceof HTMLUListElement)) {
    return null;
  }
  return { item, text, list };
}

export function handleChecklistClick(event: MouseEvent, onChange: () => void): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const toggle = target.closest(".folder-note-check-toggle");
  if (!toggle) {
    return;
  }
  event.preventDefault();
  const item = toggle.closest("li");
  if (!(item instanceof HTMLLIElement)) {
    return;
  }
  const checked = item.getAttribute("data-checked") === "1";
  item.setAttribute("data-checked", checked ? "0" : "1");
  toggle.setAttribute("aria-checked", checked ? "false" : "true");
  onChange();
}

