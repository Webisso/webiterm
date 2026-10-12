import { createChecklistItem, findChecklistContext, focusCheckText } from "./noteChecklist";

function getCaretNode(): Node | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  return selection.anchorNode;
}

function isEmptyElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }
  const text = element.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  return text.length === 0;
}

function findBulletListContext(node: Node | null): {
  item: HTMLLIElement;
  list: HTMLUListElement;
} | null {
  if (!node) {
    return null;
  }
  const element = node instanceof Element ? node : node.parentElement;
  const item = element?.closest("li");
  const list = item?.closest("ul, ol");
  if (!(item instanceof HTMLLIElement) || !(list instanceof HTMLUListElement)) {
    return null;
  }
  if (list.classList.contains("folder-note-checklist")) {
    return null;
  }
  return { item, list };
}

function focusParagraphEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function exitListAtItem(list: HTMLUListElement, item: HTMLLIElement) {
  item.remove();
  const paragraph = document.createElement("div");
  paragraph.innerHTML = "<br>";
  if (list.children.length === 0) {
    list.replaceWith(paragraph);
  } else {
    list.after(paragraph);
  }
  focusParagraphEnd(paragraph);
}

function insertBulletAfter(item: HTMLLIElement, list: HTMLUListElement) {
  const newItem = document.createElement("li");
  newItem.innerHTML = "<br>";
  list.insertBefore(newItem, item.nextSibling);
  focusParagraphEnd(newItem);
}

export function handleNoteEditorKeyDown(
  event: KeyboardEvent,
  _root: HTMLElement,
  onChange: () => void,
): boolean {
  if (event.key !== "Enter" && event.key !== "Backspace") {
    return false;
  }

  const checklist = findChecklistContext(getCaretNode());
  const bullet = checklist ? null : findBulletListContext(getCaretNode());

  if (event.key === "Enter") {
    if (checklist) {
      if (event.shiftKey) {
        event.preventDefault();
        document.execCommand("insertLineBreak");
        onChange();
        return true;
      }
      event.preventDefault();
      if (isEmptyElement(checklist.text)) {
        exitListAtItem(checklist.list, checklist.item);
        onChange();
        return true;
      }
      const newItem = createChecklistItem();
      checklist.list.insertBefore(newItem, checklist.item.nextSibling);
      const textSpan = newItem.querySelector(".folder-note-check-text");
      if (textSpan) {
        focusCheckText(textSpan);
      }
      onChange();
      return true;
    }

    if (bullet) {
      event.preventDefault();
      if (isEmptyElement(bullet.item)) {
        exitListAtItem(bullet.list, bullet.item);
        onChange();
        return true;
      }
      insertBulletAfter(bullet.item, bullet.list);
      onChange();
      return true;
    }

    return false;
  }

  if (checklist) {
    if (!isEmptyElement(checklist.text)) {
      return false;
    }
    event.preventDefault();
    exitListAtItem(checklist.list, checklist.item);
    onChange();
    return true;
  }

  if (bullet) {
    if (!isEmptyElement(bullet.item)) {
      return false;
    }
    event.preventDefault();
    exitListAtItem(bullet.list, bullet.item);
    onChange();
    return true;
  }

  return false;
}
