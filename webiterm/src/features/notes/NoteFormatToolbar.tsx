import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

type FormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  list: boolean;
  checklist: boolean;
};

type NoteFormatToolbarProps = {
  bodyRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onBulletList: () => void;
  onChecklist: () => void;
};

function readFormatState(root: HTMLElement | null): FormatState {
  if (!root) {
    return { bold: false, italic: false, underline: false, list: false, checklist: false };
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode) {
    return { bold: false, italic: false, underline: false, list: false, checklist: false };
  }
  if (!root.contains(selection.anchorNode)) {
    return { bold: false, italic: false, underline: false, list: false, checklist: false };
  }
  const node = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement;
  const checklist = Boolean(node?.closest(".folder-note-checklist"));
  return {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    list: document.queryCommandState("insertUnorderedList"),
    checklist,
  };
}

function useFormatState(bodyRef: RefObject<HTMLDivElement | null>, disabled: boolean) {
  const [state, setState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    checklist: false,
  });

  const refresh = useCallback(() => {
    if (disabled) {
      return;
    }
    setState(readFormatState(bodyRef.current));
  }, [bodyRef, disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }
    document.addEventListener("selectionchange", refresh);
    const root = bodyRef.current;
    root?.addEventListener("keyup", refresh);
    root?.addEventListener("mouseup", refresh);
    root?.addEventListener("focus", refresh);
    refresh();
    return () => {
      document.removeEventListener("selectionchange", refresh);
      root?.removeEventListener("keyup", refresh);
      root?.removeEventListener("mouseup", refresh);
      root?.removeEventListener("focus", refresh);
    };
  }, [bodyRef, disabled, refresh]);

  return { state, refresh };
}

export function NoteFormatToolbar({
  bodyRef,
  disabled,
  onBold,
  onItalic,
  onUnderline,
  onBulletList,
  onChecklist,
}: NoteFormatToolbarProps) {
  const { state, refresh } = useFormatState(bodyRef, Boolean(disabled));

  function run(action: () => void) {
    action();
    requestAnimationFrame(() => refresh());
  }

  return (
    <div
      className="note-format-toolbar"
      role="toolbar"
      aria-label="Note formatting"
    >
      <ToolbarButton
        label="Bold"
        shortcut="⌘B"
        active={state.bold}
        onClick={() => run(onBold)}
      >
        <IconBold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut="⌘I"
        active={state.italic}
        onClick={() => run(onItalic)}
      >
        <IconItalic />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        shortcut="⌘U"
        active={state.underline}
        onClick={() => run(onUnderline)}
      >
        <IconUnderline />
      </ToolbarButton>
      <span className="note-format-divider" aria-hidden />
      <ToolbarButton
        label="Bullet list"
        active={state.list}
        onClick={() => run(onBulletList)}
      >
        <IconBulletList />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={state.checklist}
        onClick={() => run(onChecklist)}
      >
        <IconChecklist />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={active ?? false}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`note-format-btn ${active ? "note-format-btn-active" : ""}`}
    >
      {children}
    </button>
  );
}

function IconBold() {
  return (
    <svg viewBox="0 0 16 16" className="note-format-icon" aria-hidden>
      <path
        fill="currentColor"
        d="M4.5 2.5h3.6c1.55 0 2.65.95 2.65 2.35 0 .95-.5 1.65-1.25 2.05.95.35 1.6 1.2 1.6 2.3 0 1.55-1.15 2.5-2.95 2.5H4.5V2.5zm1.35 4.65h2.1c.75 0 1.2-.4 1.2-1.05s-.45-1.05-1.2-1.05h-2.1v2.1zm0 4.2h2.45c.85 0 1.35-.45 1.35-1.15s-.5-1.15-1.35-1.15H5.85v2.3z"
      />
    </svg>
  );
}

function IconItalic() {
  return (
    <svg viewBox="0 0 16 16" className="note-format-icon" aria-hidden>
      <path
        fill="currentColor"
        d="M9.5 3.25h-4v1.1h1.45l-2.1 7.3H3.5v1.1h4v-1.1H5.55l2.1-7.3H9.5v-1.1z"
      />
    </svg>
  );
}

function IconUnderline() {
  return (
    <svg viewBox="0 0 16 16" className="note-format-icon" aria-hidden>
      <path
        fill="currentColor"
        d="M4.25 2.75h1.35v4.6c0 1.85 1.05 2.9 2.55 2.9s2.55-1.05 2.55-2.9v-4.6h1.35v4.55c0 2.55-1.55 4.05-3.9 4.05s-3.9-1.5-3.9-4.05V2.75zm-.5 9.85h8.5v1.15H3.75v-1.15z"
      />
    </svg>
  );
}

function IconBulletList() {
  return (
    <svg viewBox="0 0 16 16" className="note-format-icon" aria-hidden>
      <circle cx="3.25" cy="4.25" r="1.1" fill="currentColor" />
      <circle cx="3.25" cy="8" r="1.1" fill="currentColor" />
      <circle cx="3.25" cy="11.75" r="1.1" fill="currentColor" />
      <path
        fill="currentColor"
        d="M6.25 3.5h7v1.5h-7V3.5zm0 3.75h7v1.5h-7v-1.5zm0 3.75h7v1.5h-7v-1.5z"
      />
    </svg>
  );
}

function IconChecklist() {
  return (
    <svg viewBox="0 0 16 16" className="note-format-icon" aria-hidden>
      <circle cx="3.35" cy="4.35" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3.35" cy="8" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3.35" cy="11.65" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        fill="currentColor"
        d="M6.25 3.5h7v1.5h-7V3.5zm0 3.75h7v1.5h-7v-1.5zm0 3.75h5.5v1.5h-5.5v-1.5z"
      />
    </svg>
  );
}
