import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getFolderNote, updateFolderNote } from "../../lib/notes";
import { normalizeIpcError } from "../../lib/ipc";
import type { FolderNoteSummary } from "../../types/notes";
import { handleChecklistClick, insertChecklist } from "./noteChecklist";
import { handleNoteEditorKeyDown } from "./noteEditorKeys";
import {
  applyFormatCommand,
  restoreEditorSelection,
  saveEditorSelection,
} from "./noteSelection";
import { NoteFormatToolbar } from "./NoteFormatToolbar";
import { registerNoteSaver, unregisterNoteSaver } from "./noteSaveRegistry";
import "./folderNote.css";

type FolderNotePaneProps = {
  noteId: string;
  folderName: string;
  onSaved: (note: FolderNoteSummary) => void;
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FolderNotePane({ noteId, folderName, onSaved }: FolderNotePaneProps) {
  const [title, setTitle] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ title: "", body: "" });
  const lastPersistedRef = useRef({ title: "", body: "" });
  const loadedRef = useRef(false);
  const savingRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const savedRangeRef = useRef<Range | null>(null);
  const hydratedNoteIdRef = useRef<string | null>(null);

  const pullEditorIntoLatest = useCallback(() => {
    if (titleInputRef.current) {
      latestRef.current.title = titleInputRef.current.value;
    }
    if (bodyRef.current) {
      latestRef.current.body = bodyRef.current.innerHTML;
    }
  }, []);

  const flushSave = useCallback(async (options?: { force?: boolean }) => {
    pullEditorIntoLatest();
    if ((!loadedRef.current && !options?.force) || savingRef.current) {
      return;
    }
    const { title: nextTitle, body } = latestRef.current;
    const trimmedTitle =
      nextTitle.trim() || lastPersistedRef.current.title.trim() || "Untitled";
    if (
      trimmedTitle === lastPersistedRef.current.title &&
      body === lastPersistedRef.current.body
    ) {
      return;
    }

    savingRef.current = true;
    if (savedLabelTimerRef.current) {
      clearTimeout(savedLabelTimerRef.current);
      savedLabelTimerRef.current = null;
    }
    setSaveState("saving");
    setError(null);
    try {
      const detail = await updateFolderNote(noteId, trimmedTitle, body);
      lastPersistedRef.current = { title: detail.note.title, body: detail.body };
      setUpdatedAt(detail.note.updatedAt);
      latestRef.current = { title: detail.note.title, body: detail.body };
      onSavedRef.current(detail.note);
      setSaveState("saved");
      savedLabelTimerRef.current = window.setTimeout(() => {
        setSaveState("idle");
        savedLabelTimerRef.current = null;
      }, 1500);
    } catch (err) {
      setError(normalizeIpcError(err));
      setSaveState("idle");
    } finally {
      savingRef.current = false;
    }
  }, [noteId, pullEditorIntoLatest]);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = useCallback(() => {
    if (!loadedRef.current) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave();
    }, 800);
  }, [flushSave]);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    hydratedNoteIdRef.current = null;
    setLoading(true);
    setError(null);
    setSaveState("idle");
    void getFolderNote(noteId)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        setTitle(detail.note.title);
        setUpdatedAt(detail.note.updatedAt);
        latestRef.current = { title: detail.note.title, body: detail.body };
        lastPersistedRef.current = { title: detail.note.title, body: detail.body };
        loadedRef.current = true;
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeIpcError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (savedLabelTimerRef.current) {
        clearTimeout(savedLabelTimerRef.current);
        savedLabelTimerRef.current = null;
      }
      loadedRef.current = false;
      hydratedNoteIdRef.current = null;
    };
  }, [noteId]);

  useEffect(() => {
    registerNoteSaver(noteId, async () => {
      await flushSaveRef.current({ force: true });
    });
    return () => unregisterNoteSaver(noteId);
  }, [noteId]);

  useLayoutEffect(() => {
    if (loading) {
      return;
    }
    const editor = bodyRef.current;
    if (!editor || hydratedNoteIdRef.current === noteId) {
      return;
    }
    editor.innerHTML = latestRef.current.body || "";
    hydratedNoteIdRef.current = noteId;
  }, [loading, noteId]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    function onSelectionChange() {
      const saved = saveEditorSelection(root);
      if (saved) {
        savedRangeRef.current = saved;
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [loading]);

  function syncBodyFromEditor() {
    pullEditorIntoLatest();
    scheduleSave();
  }

  function applyFormat(command: string) {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    applyFormatCommand(root, command, savedRangeRef.current);
    savedRangeRef.current = saveEditorSelection(root);
    syncBodyFromEditor();
  }

  function insertBulletList() {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    root.focus();
    restoreSelectionBeforeCommand(root);
    document.execCommand("insertUnorderedList", false);
    savedRangeRef.current = saveEditorSelection(root);
    syncBodyFromEditor();
  }

  function restoreSelectionBeforeCommand(root: HTMLElement) {
    const selection = window.getSelection();
    if (savedRangeRef.current) {
      restoreEditorSelection(savedRangeRef.current);
      return;
    }
    if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  function insertChecklistBlock() {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    root.focus();
    restoreSelectionBeforeCommand(root);
    insertChecklist(root);
    savedRangeRef.current = saveEditorSelection(root);
    syncBodyFromEditor();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted">
        Loading note…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#14161b]">
      <div className="flex shrink-0 items-center justify-between border-b border-line/80 px-4 py-2">
        <p className="truncate text-[11px] text-faint">
          {folderName}
          {updatedAt ? ` · ${formatUpdatedAt(updatedAt)}` : null}
        </p>
        <span className="min-w-[4.5rem] text-right text-[11px] text-faint">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-6 py-8">
          <input
            ref={titleInputRef}
            value={title}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                bodyRef.current?.focus();
              }
            }}
            onChange={(event) => {
              const next = event.target.value;
              setTitle(next);
              latestRef.current.title = next;
              scheduleSave();
            }}
            placeholder="Title"
            className="w-full border-0 bg-transparent text-[28px] font-semibold tracking-tight text-ink outline-none placeholder:text-faint"
          />
          <div className="mt-4 border-b border-line/60 pb-3">
            <NoteFormatToolbar
              bodyRef={bodyRef}
              onBold={() => applyFormat("bold")}
              onItalic={() => applyFormat("italic")}
              onUnderline={() => applyFormat("underline")}
              onBulletList={insertBulletList}
              onChecklist={insertChecklistBlock}
            />
          </div>
          {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder="Start writing…"
            onClick={(event) => {
              handleChecklistClick(event.nativeEvent, syncBodyFromEditor);
            }}
            onKeyDown={(event) => {
              const root = bodyRef.current;
              if (!root) {
                return;
              }
              if (handleNoteEditorKeyDown(event.nativeEvent, root, syncBodyFromEditor)) {
                event.preventDefault();
                return;
              }
            }}
            onInput={syncBodyFromEditor}
            className="folder-note-body mt-4 min-h-[50vh] text-[15px] leading-[1.65] text-ink outline-none"
          />
        </div>
      </div>
    </div>
  );
}
