import { useEffect, useState } from "react";
import {
  addTaskComment,
  addTaskImage,
  createTask,
  deleteTask,
  deleteTaskComment,
  deleteTaskImage,
  getTaskBoard,
  moveTask,
  readImageFile,
  updateTask,
} from "../../lib/boards";
import { normalizeIpcError } from "../../lib/ipc";
import {
  TASK_COLUMNS,
  type BoardImage,
  type BoardTask,
  type TaskBoardDetail,
  type TaskColumnKey,
} from "../../types/boards";

type TaskBoardPaneProps = {
  boardId: string;
  folderName: string;
  accent: string;
};

export function TaskBoardPane({ boardId, folderName, accent }: TaskBoardPaneProps) {
  const [detail, setDetail] = useState<TaskBoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<TaskColumnKey | null>(null);
  const [ghost, setGhost] = useState<{
    task: BoardTask;
    x: number;
    y: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setSelectedId(null);
    setError(null);
    void getTaskBoard(boardId)
      .then((next) => {
        if (!cancelled) {
          setDetail(next);
        }
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
    };
  }, [boardId]);

  const selected = detail?.tasks.find((task) => task.id === selectedId) ?? null;

  async function run(action: () => Promise<TaskBoardDetail>) {
    setBusy(true);
    setError(null);
    try {
      setDetail(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : normalizeIpcError(err));
    } finally {
      setBusy(false);
    }
  }

  function beginDrag(task: BoardTask, event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    const width = rect.width;
    let moved = false;
    let column: TaskColumnKey | null = null;
    let beforeId: string | null = null;

    function readHit(clientX: number, clientY: number) {
      const hit = document.elementFromPoint(clientX, clientY);
      const nextColumn = hit?.closest("[data-board-column]")?.getAttribute("data-board-column");
      column = TASK_COLUMNS.some((item) => item.key === nextColumn)
        ? (nextColumn as TaskColumnKey)
        : null;
      const cardId = hit?.closest("[data-task-id]")?.getAttribute("data-task-id") ?? null;
      beforeId = cardId && cardId !== task.id ? cardId : null;
      setDropColumn(column);
    }

    function onMove(ev: PointerEvent) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 6) {
        moved = true;
        setDraggingId(task.id);
        document
          .querySelector(`[data-task-id="${CSS.escape(task.id)}"]`)
          ?.classList.add("pointer-events-none");
      }
      if (moved) {
        setGhost({
          task,
          x: ev.clientX - offsetX,
          y: ev.clientY - offsetY,
          width,
        });
        readHit(ev.clientX, ev.clientY);
      }
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document
        .querySelector(`[data-task-id="${CSS.escape(task.id)}"]`)
        ?.classList.remove("pointer-events-none");
      if (moved) {
        readHit(ev.clientX, ev.clientY);
        const target = column;
        const before = beforeId;
        if (target) {
          void run(() => moveTask(task.id, target, before));
        }
      } else {
        setSelectedId(task.id);
      }
      setDraggingId(null);
      setDropColumn(null);
      setGhost(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-2">
        <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{detail?.board.name ?? "Board"}</p>
          <p className="truncate text-[11px] text-faint">{folderName} · stored locally</p>
        </div>
        <form
          className="ml-auto flex min-w-0 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = title.trim();
            if (!next) {
              return;
            }
            setTitle("");
            void run(() => createTask(boardId, next, "planning"));
          }}
        >
          <input
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New task in Planning"
            className="h-8 w-56 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink"
          />
          <button
            type="submit"
            disabled={busy || title.trim().length === 0}
            className="h-8 rounded-md bg-accent px-3 text-[12px] font-medium text-canvas disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
      {error ? (
        <div className="border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-faint">
          Loading board…
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-3">
            {TASK_COLUMNS.map((column) => {
              const tasks = (detail?.tasks ?? []).filter((task) => task.columnKey === column.key);
              const hot = dropColumn === column.key;
              return (
                <section
                  key={column.key}
                  data-board-column={column.key}
                  className={`flex w-[240px] shrink-0 flex-col rounded-lg border bg-surface/70 ${
                    hot ? "border-accent" : "border-line"
                  }`}
                >
                  <header className="flex items-center justify-between px-2.5 py-2">
                    <h3 className="text-[12px] font-medium text-ink">{column.label}</h3>
                    <span className="text-[11px] text-faint">{tasks.length}</span>
                  </header>
                  <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        data-task-id={task.id}
                        onPointerDown={(event) => beginDrag(task, event)}
                        className={`cursor-grab rounded-md border border-line bg-canvas p-2 active:cursor-grabbing ${
                          draggingId === task.id ? "pointer-events-none opacity-40" : ""
                        } ${selectedId === task.id ? "ring-1 ring-accent" : ""}`}
                      >
                        <p className="text-[13px] font-medium text-ink">{task.title}</p>
                        {task.body ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted">{task.body}</p>
                        ) : null}
                        {task.images.length > 0 ? (
                          <div className="mt-2 flex gap-1">
                            {task.images.slice(0, 3).map((image) => (
                              <Thumb key={image.id} image={image} />
                            ))}
                          </div>
                        ) : null}
                        {task.comments.length > 0 ? (
                          <p className="mt-1.5 text-[10px] text-faint">
                            {task.comments.length} comment{task.comments.length === 1 ? "" : "s"}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {selected ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => setSelectedId(null)}
        >
          <TaskDetail
            task={selected}
            busy={busy}
            onClose={() => setSelectedId(null)}
            onSave={(body) => run(() => updateTask(selected.id, selected.title, body))}
            onDelete={async () => {
              await run(() => deleteTask(selected.id));
              setSelectedId(null);
            }}
            onAddImage={(file) =>
              run(async () => {
                const image = await readImageFile(file);
                return addTaskImage(selected.id, image.mime, image.dataBase64);
              })
            }
            onDeleteImage={(imageId) => run(() => deleteTaskImage(imageId))}
            onAddComment={(body, file) =>
              run(async () => {
                const image = file ? await readImageFile(file) : undefined;
                return addTaskComment(selected.id, body, image);
              })
            }
            onDeleteComment={(commentId) => run(() => deleteTaskComment(commentId))}
          />
        </div>
      ) : null}
      {ghost ? (
        <div
          className="pointer-events-none fixed z-50 cursor-grabbing rounded-md border border-accent bg-canvas p-2 shadow-panel"
          style={{ left: ghost.x, top: ghost.y, width: ghost.width }}
        >
          <p className="text-[13px] font-medium text-ink">{ghost.task.title}</p>
          {ghost.task.body ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted">{ghost.task.body}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ image, large = false }: { image: BoardImage; large?: boolean }) {
  return (
    <img
      src={`data:${image.mime};base64,${image.dataBase64}`}
      alt=""
      className={`rounded object-cover ${large ? "max-h-40 w-full" : "h-10 w-10"}`}
    />
  );
}

function TaskDetail({
  task,
  busy,
  onClose,
  onSave,
  onDelete,
  onAddImage,
  onDeleteImage,
  onAddComment,
  onDeleteComment,
}: {
  task: BoardTask;
  busy: boolean;
  onClose: () => void;
  onSave: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddImage: (file: File) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onAddComment: (body: string, file: File | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}) {
  const [body, setBody] = useState(task.body);
  const [comment, setComment] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);

  useEffect(() => {
    setBody(task.body);
  }, [task.id, task.body]);

  return (
    <div
      className="flex max-h-[min(720px,85vh)] w-full max-w-lg flex-col rounded-lg border border-line bg-surface shadow-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-dialog-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <h3 id="task-dialog-title" className="text-[15px] font-medium text-ink">
          {task.title}
        </h3>
        <button type="button" onClick={onClose} className="text-[18px] leading-none text-faint">
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-faint">Description</span>
          <textarea
            value={body}
            disabled={busy}
            rows={4}
            onChange={(event) => setBody(event.target.value)}
            className="w-full resize-y rounded-md border border-line bg-canvas px-2 py-1.5 text-[13px] text-ink"
          />
        </label>
        <button
          type="button"
          disabled={busy || body === task.body}
          onClick={() => void onSave(body)}
          className="h-8 rounded-md bg-accent px-3 text-[12px] font-medium text-canvas disabled:opacity-50"
        >
          Save
        </button>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-faint">Images</span>
            <label className="cursor-pointer text-[12px] text-accent">
              Add
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    void onAddImage(file);
                  }
                }}
              />
            </label>
          </div>
          <div className="space-y-2">
            {task.images.map((image) => (
              <div key={image.id} className="relative">
                <Thumb image={image} large />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDeleteImage(image.id)}
                  className="absolute right-1 top-1 rounded bg-canvas/80 px-1.5 text-[11px] text-danger"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-faint">Comments</p>
          <div className="space-y-2">
            {task.comments.map((item) => (
              <div key={item.id} className="rounded-md border border-line bg-canvas p-2">
                {item.body ? <p className="text-[12px] text-ink">{item.body}</p> : null}
                {item.image ? (
                  <div className="mt-1">
                    <Thumb image={item.image} large />
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDeleteComment(item.id)}
                  className="mt-1 text-[11px] text-danger"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <textarea
            value={comment}
            disabled={busy}
            rows={3}
            placeholder="Comment"
            onChange={(event) => setComment(event.target.value)}
            className="mt-2 w-full resize-y rounded-md border border-line bg-canvas px-2 py-1.5 text-[12px] text-ink"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="cursor-pointer truncate text-[12px] text-muted">
              {commentFile ? commentFile.name : "Add image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                  setCommentFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy || (comment.trim().length === 0 && !commentFile)}
              onClick={() => {
                const next = comment;
                const file = commentFile;
                setComment("");
                setCommentFile(null);
                void onAddComment(next, file);
              }}
              className="h-7 rounded-md border border-line px-2 text-[12px] text-ink disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-line p-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete “${task.title}”?`)) {
              void onDelete();
            }
          }}
          className="text-[12px] text-danger"
        >
          Delete task
        </button>
      </div>
    </div>
  );
}
