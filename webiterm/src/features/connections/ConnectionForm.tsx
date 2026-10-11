import { useEffect, useState } from "react";
import { pickPrivateKeyFile } from "../../lib/pickPrivateKeyFile";
import type {
  AuthMethod,
  ConnectionGroup,
  ConnectionInput,
  ConnectionKind,
  ConnectionSummary,
} from "../../types/connections";
import { authOptionsForKind, normalizeAuthMethod } from "./connectionAuthOptions";

type ConnectionFormProps = {
  initial?: ConnectionSummary | null;
  groups: ConnectionGroup[];
  onSave: (input: ConnectionInput) => Promise<void>;
  onCancel: () => void;
};

const defaults: Record<ConnectionKind, Partial<ConnectionInput>> = {
  ssh: { port: 22, authMethod: "password", username: "" },
  ftp: { port: 22, authMethod: "password", username: "" },
  mysql: { port: 3306, authMethod: "password", username: "root" },
  postgresql: { port: 5432, authMethod: "password", username: "postgres" },
};

export function ConnectionForm({ initial, groups, onSave, onCancel }: ConnectionFormProps) {
  const [kind, setKind] = useState<ConnectionKind>(initial?.kind ?? "ssh");
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "127.0.0.1");
  const [port, setPort] = useState(initial?.port ?? 22);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [databaseName, setDatabaseName] = useState(initial?.databaseName ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(initial?.authMethod ?? "password");
  const [privateKeyPath, setPrivateKeyPath] = useState(initial?.privateKeyPath ?? "");
  const [startupCommand, setStartupCommand] = useState(initial?.startupCommand ?? "");
  const [sftpInitialPath, setSftpInitialPath] = useState(initial?.sftpInitialPath ?? "");
  const [password, setPassword] = useState("");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [groupId, setGroupId] = useState(initial?.groupId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      return;
    }
    const preset = defaults[kind];
    setPort(preset.port ?? 22);
    setAuthMethod(preset.authMethod ?? "password");
    setUsername(preset.username ?? "");
    setDatabaseName(preset.databaseName ?? "");
    setAuthMethod((current) => normalizeAuthMethod(kind, current));
  }, [kind, initial]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        kind,
        name,
        host,
        port,
        username,
        databaseName:
          kind === "mysql" || kind === "postgresql"
            ? databaseName.trim() || undefined
            : undefined,
        authMethod,
        password:
          (authMethod === "password" || authMethod === "private_key") && password
            ? password
            : undefined,
        privateKeyPath:
          (kind === "ssh" || kind === "ftp") && authMethod === "private_key"
            ? privateKeyPath.trim() || undefined
            : undefined,
        startupCommand:
          kind === "ssh" ? startupCommand.trim() || undefined : undefined,
        sftpInitialPath:
          kind === "ssh" || kind === "ftp"
            ? sftpInitialPath.trim() || undefined
            : undefined,
        favorite,
        tags: initial?.tags ?? [],
        groupId: groupId || undefined,
        sshTunnelProfileId: initial?.sshTunnelProfileId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex max-h-[80vh] flex-col" onSubmit={(event) => void submit(event)}>
      <div className="space-y-3 overflow-auto px-4 py-4">
        <h2 className="text-[15px] font-medium text-ink">
          {initial ? "Edit connection" : "New connection"}
        </h2>
        <Field label="Type">
          <select
            value={kind}
            disabled={!!initial}
            onChange={(event) => setKind(event.target.value as ConnectionKind)}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
          >
            <option value="ssh">SSH</option>
            <option value="ftp">SFTP</option>
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL (profile only)</option>
          </select>
        </Field>
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Host" className="col-span-2">
            <input
              required
              value={host}
              onChange={(event) => setHost(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
            />
          </Field>
          <Field label="Port">
            <input
              required
              type="number"
              value={port}
              onChange={(event) => setPort(Number(event.target.value))}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
            />
          </Field>
        </div>
        <Field label="Username">
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
          />
        </Field>
        {(kind === "mysql" || kind === "postgresql") && (
          <Field label="Default database (optional)">
            <input
              value={databaseName}
              onChange={(event) => setDatabaseName(event.target.value)}
              placeholder="Leave empty — browse all in SQL workspace"
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
            />
            <p className="text-[11px] text-faint">
              MySQL workspace lists every database your user can access; this field only sets the
              initial selection.
            </p>
          </Field>
        )}
        <Field label="Authentication">
          <select
            value={authMethod}
            onChange={(event) => setAuthMethod(event.target.value as AuthMethod)}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
          >
            {authOptionsForKind(kind).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {(kind === "ssh" || kind === "ftp") && authMethod === "private_key" && (
          <Field label="Private key file">
            <div className="flex gap-2">
              <input
                value={privateKeyPath}
                onChange={(event) => setPrivateKeyPath(event.target.value)}
                placeholder="~/.ssh/id_ed25519 (empty = try default keys)"
                className="h-8 min-w-0 flex-1 rounded-md border border-line bg-canvas px-2 font-mono text-[12px]"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void browsePrivateKey(setPrivateKeyPath, setError)}
                className="h-8 shrink-0 rounded-md border border-accent/50 bg-accent/10 px-3 text-[12px] font-medium text-ink hover:bg-accent/20"
              >
                Browse…
              </button>
            </div>
          </Field>
        )}
        {authMethod === "password" && (
          <Field label={initial ? "New password (optional)" : "Password"}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
              autoComplete="new-password"
            />
          </Field>
        )}
        {(kind === "ssh" || kind === "ftp") && authMethod === "private_key" && (
          <Field label={initial ? "Key passphrase (optional)" : "Key passphrase"}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
              autoComplete="new-password"
            />
          </Field>
        )}
        {(kind === "ssh" || kind === "ftp") && (
          <Field label="Default SFTP path (optional)">
            <input
              value={sftpInitialPath}
              onChange={(event) => setSftpInitialPath(event.target.value)}
              placeholder="/var/www"
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 font-mono text-[13px]"
              spellCheck={false}
            />
            <p className="text-[11px] text-faint">
              When you open SFTP for this profile, start in this remote folder.
            </p>
          </Field>
        )}
        {kind === "ssh" && (
          <Field label="Startup command (optional)">
            <input
              value={startupCommand}
              onChange={(event) => setStartupCommand(event.target.value)}
              placeholder="cd /var/www && ls"
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
              spellCheck={false}
            />
            <p className="text-[11px] text-faint">
              Runs once in the shell right after the SSH session opens.
            </p>
          </Field>
        )}
        {groups.length > 0 ? (
          <Field label="Folder">
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-[13px]"
            >
              <option value="">Ungrouped</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
          />
          Favorite
        </label>
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
  );
}

async function browsePrivateKey(
  setPath: (value: string) => void,
  setError: (value: string | null) => void,
) {
  try {
    const selected = await pickPrivateKeyFile();
    if (selected) {
      setPath(selected);
      setError(null);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Could not open file picker.");
  }
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[12px] text-faint">{label}</span>
      {children}
    </label>
  );
}
