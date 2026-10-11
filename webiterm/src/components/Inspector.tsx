import type { StatusState } from "../hooks/useAppStatus";

type InspectorProps = {
  collapsed: boolean;
  state: StatusState;
  onRetry: () => void;
};

export function Inspector({ collapsed, state, onRetry }: InspectorProps) {
  return (
    <aside
      aria-label="Inspector"
      aria-hidden={collapsed}
      inert={collapsed}
      className={`flex shrink-0 flex-col overflow-hidden border-line bg-surface transition-[width,opacity,border-color] duration-150 ${
        collapsed ? "w-0 border-l-0 opacity-0" : "w-[300px] border-l opacity-100"
      }`}
    >
      <div className="flex h-10 shrink-0 items-center border-b border-line px-4 text-[12px] text-faint">
        Inspector
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <InspectorBody state={state} onRetry={onRetry} />
      </div>
    </aside>
  );
}

function InspectorBody({ state, onRetry }: { state: StatusState; onRetry: () => void }) {
  if (state.kind === "loading") {
    return (
      <div>
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-3 w-24 rounded bg-raised" />
          <div className="h-3 w-full rounded bg-raised" />
          <div className="h-3 w-4/5 rounded bg-raised" />
        </div>
        <p className="sr-only">Loading application status</p>
      </div>
    );
  }

  if (state.kind === "desktop-unavailable") {
    return (
      <p className="text-[13px] leading-relaxed text-muted">
        This window is not connected to the WebiTerm desktop runtime. Local JSON is used when
        the app is launched through Tauri.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        <p className="text-[13px] leading-relaxed text-danger">{state.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="h-8 rounded-md border border-line bg-raised px-3 text-[12px] text-ink"
        >
          Retry
        </button>
      </div>
    );
  }

  const { status } = state;
  return (
    <div className="space-y-5">
      <dl className="space-y-3">
        <Row label="Storage" value={status.databaseReady ? "Ready" : "Unavailable"} tone={status.databaseReady ? "ok" : "danger"} />
        <Row label="Format" value={`JSON v${status.schemaVersion}`} mono />
        <Row label="Version" value={status.appVersion} mono />
      </dl>
      <p className="break-all font-mono text-[11px] leading-relaxed text-muted">{status.storagePath}</p>
      <p className="text-[12px] leading-relaxed text-faint">
        Profiles, passwords, folders, favorites, and boards are stored in this JSON file. Export
        copies the whole file, including passwords in plain text.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  tone = "ink",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ink" | "muted" | "ok" | "danger" | "warning";
}) {
  const color = {
    ink: "text-ink",
    muted: "text-muted",
    ok: "text-ok",
    danger: "text-danger",
    warning: "text-warning",
  }[tone];
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-faint">{label}</dt>
      <dd className={`text-right text-[12px] ${mono ? "font-mono" : ""} ${color}`}>{value}</dd>
    </div>
  );
}
