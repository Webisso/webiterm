import type { AuthMethod, ConnectionKind } from "../../types/connections";

export type AuthOption = { value: AuthMethod; label: string };

export function authOptionsForKind(kind: ConnectionKind): AuthOption[] {
  if (kind === "mysql" || kind === "postgresql") {
    return [
      { value: "none", label: "No password" },
      { value: "password", label: "Password" },
    ];
  }
  return [
    { value: "password", label: "Password" },
    { value: "private_key", label: "Private key file" },
    { value: "agent", label: "SSH agent" },
    { value: "none", label: "No password" },
  ];
}

export function normalizeAuthMethod(kind: ConnectionKind, authMethod: AuthMethod): AuthMethod {
  const allowed = authOptionsForKind(kind).map((option) => option.value);
  if (allowed.includes(authMethod)) {
    return authMethod;
  }
  return allowed[0] ?? "password";
}
