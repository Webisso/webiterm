import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionSummary } from "../../types/connections";

export const FOLDER_DROP_ATTR = "data-folder-drop";

/** Drop target key for the Ungrouped section */
export const UNGROUPED_DROP_KEY = "ungrouped";

const DRAG_THRESHOLD_PX = 6;

/** Hover duration before a collapsed folder auto-expands (ms). */
export const FOLDER_AUTO_EXPAND_MS = 1000;

export const FOLDER_DROP_HIGHLIGHT_CLASS =
  "bg-accent/35 shadow-[0_0_14px_3px] shadow-accent/45 ring-2 ring-accent ring-inset scale-[1.02] transition-[box-shadow,transform,background-color] duration-150";

type DragSession = {
  connection: ConnectionSummary;
  startX: number;
  startY: number;
  dragging: boolean;
};

export function useConnectionFolderDrag(
  onDropOnFolder: (connection: ConnectionSummary, groupId: string | null) => void,
) {
  const [draggingConnectionId, setDraggingConnectionId] = useState<string | null>(null);
  const [hoverFolderKey, setHoverFolderKey] = useState<string | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const hoverKeyRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  const resolveFolderKeyAt = useCallback((clientX: number, clientY: number) => {
    const hit = document
      .elementFromPoint(clientX, clientY)
      ?.closest(`[${FOLDER_DROP_ATTR}]`) as HTMLElement | null;
    return hit?.getAttribute(FOLDER_DROP_ATTR) ?? null;
  }, []);

  useEffect(() => {
    const clearBodyDragStyle = () => {
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }
      if (!session.dragging) {
        const distance = Math.hypot(
          event.clientX - session.startX,
          event.clientY - session.startY,
        );
        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }
        session.dragging = true;
        setDraggingConnectionId(session.connection.id);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      const key = resolveFolderKeyAt(event.clientX, event.clientY);
      if (hoverKeyRef.current !== key) {
        hoverKeyRef.current = key;
        setHoverFolderKey(key);
      }
    };

    const endSession = () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      clearBodyDragStyle();

      if (!session) {
        return;
      }

      if (session.dragging) {
        suppressClickRef.current = true;
        const folderKey = hoverKeyRef.current;
        setDraggingConnectionId(null);
        setHoverFolderKey(null);
        hoverKeyRef.current = null;

        if (folderKey) {
          const groupId = folderKey === UNGROUPED_DROP_KEY ? null : folderKey;
          onDropOnFolder(session.connection, groupId);
        }
        return;
      }

      setDraggingConnectionId(null);
      setHoverFolderKey(null);
      hoverKeyRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endSession);
    window.addEventListener("pointercancel", endSession);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endSession);
      window.removeEventListener("pointercancel", endSession);
      clearBodyDragStyle();
    };
  }, [onDropOnFolder, resolveFolderKeyAt]);

  const onConnectionPointerDown = useCallback(
    (connection: ConnectionSummary, event: React.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("[data-connection-action]")) {
        return;
      }
      sessionRef.current = {
        connection,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
      };
    },
    [],
  );

  const folderDropHighlightClass = useCallback(
    (folderKey: string) => {
      if (!draggingConnectionId || hoverFolderKey !== folderKey) {
        return "";
      }
      return FOLDER_DROP_HIGHLIGHT_CLASS;
    },
    [draggingConnectionId, hoverFolderKey],
  );

  const consumeClickAfterDrag = useCallback(() => {
    if (!suppressClickRef.current) {
      return false;
    }
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    draggingConnectionId,
    hoverFolderKey,
    onConnectionPointerDown,
    folderDropHighlightClass,
    consumeClickAfterDrag,
  };
}
