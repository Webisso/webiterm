import type { StatusState } from "../hooks/useAppStatus";

export function StatusBar({ state }: { state: StatusState }) {
  return (
    <footer
      aria-live="polite"
      className="flex h-7 shrink-0 items-center gap-3 border-t border-line px-3 text-[11px] text-faint"
    >
      <StatusText state={state} />
    </footer>
  );
}

function StatusText({ state }: { state: StatusState }) {
  if (state.kind === "loading") {
    return <span>Checking local storage…</span>;
  }
  if (state.kind === "desktop-unavailable") {
    return <span>Desktop runtime unavailable</span>;
  }
  if (state.kind === "error") {
    return <span className="text-danger">Local storage unavailable</span>;
  }
  return (
    <>
      <span className="text-ok">Local data ready</span>
      <span>JSON v{state.status.schemaVersion}</span>
      <span className="min-w-0 truncate" title={state.status.storagePath}>
        {state.status.storagePath}
      </span>
      <span className="ml-auto font-mono">{state.status.appVersion}</span>
    </>
  );
}
