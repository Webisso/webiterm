import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeIpcError } from "../../lib/ipc";
import { sshTerminalReadFile, sshTerminalWriteFile } from "../../lib/connections";
import { remoteFileTabTitle } from "./remoteEditorCommand";
import { UnsavedRemoteFileDialog } from "./UnsavedRemoteFileDialog";

type RemoteFileEditorPaneProps = {
  connectionId: string;
  remotePath: string;
  sourceTerminalSessionId: string;
  tabCloseRequestId: string | null;
  editorSessionId: string;
  onTabCloseRequestHandled: () => void;
  onClose: () => void;
  onSavedPath?: (resolvedPath: string) => void;
};

export function RemoteFileEditorPane({
  connectionId,
  remotePath,
  sourceTerminalSessionId,
  tabCloseRequestId,
  editorSessionId,
  onTabCloseRequestHandled,
  onClose,
  onSavedPath,
}: RemoteFileEditorPaneProps) {
  const [content, setContent] = useState("");
  const [resolvedPath, setResolvedPath] = useState(remotePath);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [unsavedPrompt, setUnsavedPrompt] = useState<"close" | "tab" | null>(null);
  const initialRef = useRef("");
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const file = await sshTerminalReadFile(
          connectionId,
          sourceTerminalSessionId,
          remotePath,
        );
        if (cancelled) {
          return;
        }
        setResolvedPath(file.resolvedPath);
        setContent(file.content);
        initialRef.current = file.content;
        setTruncated(file.truncated);
        setDirty(false);
      } catch (err) {
        if (!cancelled) {
          setError(normalizeIpcError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectionId, remotePath, sourceTerminalSessionId]);

  const persistToServer = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const path = await sshTerminalWriteFile(
        connectionId,
        sourceTerminalSessionId,
        remotePath,
        content,
      );
      setResolvedPath(path);
      initialRef.current = content;
      setDirty(false);
      onSavedPath?.(path);
      return true;
    } catch (err) {
      setError(normalizeIpcError(err));
      return false;
    } finally {
      setSaving(false);
    }
  }, [connectionId, content, onSavedPath, remotePath, sourceTerminalSessionId]);

  const finishClose = useCallback(() => {
    setUnsavedPrompt(null);
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) {
      setUnsavedPrompt("close");
      return;
    }
    finishClose();
  }, [finishClose]);

  useEffect(() => {
    if (tabCloseRequestId !== editorSessionId) {
      return;
    }
    if (!dirtyRef.current) {
      onTabCloseRequestHandled();
      finishClose();
      return;
    }
    setUnsavedPrompt("tab");
  }, [editorSessionId, finishClose, onTabCloseRequestHandled, tabCloseRequestId]);

  const handleUnsavedSave = useCallback(async () => {
    const ok = await persistToServer();
    if (!ok) {
      return;
    }
    if (unsavedPrompt === "tab") {
      onTabCloseRequestHandled();
    }
    finishClose();
  }, [finishClose, onTabCloseRequestHandled, persistToServer, unsavedPrompt]);

  const handleUnsavedDiscard = useCallback(() => {
    if (unsavedPrompt === "tab") {
      onTabCloseRequestHandled();
    }
    finishClose();
  }, [finishClose, onTabCloseRequestHandled, unsavedPrompt]);

  const handleUnsavedCancel = useCallback(() => {
    setUnsavedPrompt(null);
    if (unsavedPrompt === "tab") {
      onTabCloseRequestHandled();
    }
  }, [onTabCloseRequestHandled, unsavedPrompt]);

  const saveOnly = useCallback(async () => {
    await persistToServer();
  }, [persistToServer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveOnly();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveOnly]);

  const fileLabel = remoteFileTabTitle(remotePath);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-[13px] text-ink">
      {unsavedPrompt ? (
        <UnsavedRemoteFileDialog
          fileLabel={fileLabel}
          saving={saving}
          onSave={() => void handleUnsavedSave()}
          onDiscard={handleUnsavedDiscard}
          onCancel={handleUnsavedCancel}
        />
      ) : null}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={() => void saveOnly()}
          disabled={loading || saving || !dirty}
          className="h-7 rounded-md border border-line bg-surface px-2.5 text-[12px] font-medium hover:bg-raised disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={requestClose}
          disabled={saving}
          className="h-7 rounded-md border border-line px-2 text-[12px] text-muted hover:text-ink disabled:opacity-50"
        >
          Close
        </button>
        <span className="min-w-0 truncate font-mono text-[11px] text-faint" title={resolvedPath}>
          {resolvedPath}
          {dirty ? " •" : ""}
        </span>
        <span className="ml-auto text-[11px] text-faint">⌘S save</span>
      </div>
      {truncated ? (
        <div className="border-b border-warning/30 bg-warning/10 px-3 py-1.5 text-[12px] text-warning">
          File was truncated to 2&nbsp;MB for editing in the app.
        </div>
      ) : null}
      {error ? (
        <div className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
          {error}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-faint">Loading file…</div>
        ) : (
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setDirty(event.target.value !== initialRef.current);
            }}
            spellCheck={false}
            className="h-full w-full resize-none bg-[#0d0f12] p-3 font-mono text-[12px] leading-relaxed text-ink outline-none"
            aria-label="Remote file editor"
          />
        )}
      </div>
    </div>
  );
}
