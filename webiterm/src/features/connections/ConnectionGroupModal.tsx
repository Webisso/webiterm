import { useEffect, useMemo, useState } from "react";
import type { ConnectionGroup } from "../../types/connections";
import { FAVORITE_COLORS } from "../favorites/constants";
import { GROUP_ICONS } from "./groupIconCatalog";
import { groupPathLabel } from "./connectionTree";
import { GroupIcon } from "./GroupIcon";

type ConnectionGroupModalProps = {
  initial?: ConnectionGroup | null;
  parentId?: string | null;
  groups: ConnectionGroup[];
  onSave: (input: {
    name: string;
    color: string;
    iconId: string;
    parentId?: string;
  }) => Promise<void>;
  onCancel: () => void;
};

export function ConnectionGroupModal({
  initial,
  parentId,
  groups,
  onSave,
  onCancel,
}: ConnectionGroupModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [iconId, setIconId] = useState(initial?.iconId ?? "folder");
  const [parentFolderId, setParentFolderId] = useState<string>(
    initial?.parentId ?? parentId ?? "",
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setColor(initial.color);
      setIconId(initial.iconId);
      setParentFolderId(initial.parentId ?? "");
    } else {
      setParentFolderId(parentId ?? "");
    }
  }, [initial, parentId]);

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return GROUP_ICONS;
    }
    return GROUP_ICONS.filter(
      (icon) => icon.label.toLowerCase().includes(q) || icon.id.includes(q),
    );
  }, [query]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resolvedParent =
        parentFolderId.trim() ||
        (typeof parentId === "string" ? parentId.trim() : "");
      await onSave({
        name: name.trim(),
        color,
        iconId,
        parentId: resolvedParent || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save folder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <form
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-line bg-surface shadow-panel"
        onSubmit={(event) => void submit(event)}
      >
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-medium text-ink">
            {initial ? "Edit folder" : "New folder"}
          </h2>
          <p className="mt-1 text-[12px] text-faint">
            {parentFolderId && !initial
              ? `Subfolder inside “${groups.find((g) => g.id === parentFolderId)?.name ?? "parent"}”.`
              : `Organize connections like VS Code. Pick a color and one of ${GROUP_ICONS.length} icons.`}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
          {groups.length > 0 ? (
            <label className="block space-y-1">
              <span className="text-[12px] text-faint">Parent folder</span>
              <select
                value={parentFolderId}
                onChange={(event) => setParentFolderId(event.target.value)}
                className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
              >
                <option value="">Top level (no parent)</option>
                {groups
                  .filter((group) => group.id !== initial?.id)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {groupPathLabel(group.id, groups) ?? group.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-[12px] text-faint">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
              autoFocus
            />
          </label>
          <div>
            <span className="text-[12px] text-faint">Color</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {FAVORITE_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setColor(value)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    color === value ? "border-ink" : "border-transparent"
                  }`}
                  style={{ backgroundColor: value }}
                  aria-label={value}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[12px] text-faint">Icon</span>
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                Preview <GroupIcon iconId={iconId} color={color} size={18} />
              </span>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons…"
              className="mb-2 h-8 w-full rounded-md border border-line bg-canvas px-2 text-[12px]"
            />
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-auto rounded-md border border-line bg-canvas/50 p-2">
              {filteredIcons.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.label}
                  onClick={() => setIconId(icon.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    iconId === icon.id ? "bg-accent-soft ring-1 ring-accent/40" : "hover:bg-raised/80"
                  }`}
                >
                  <GroupIcon iconId={icon.id} color={iconId === icon.id ? color : "#94a3b8"} size={16} />
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-canvas disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
