export function isPlausibleRemoteDirectory(path: string | null | undefined): boolean {
  if (!path) {
    return false;
  }
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("%") || /\s/.test(trimmed)) {
    return false;
  }
  return trimmed.startsWith("/") || trimmed.startsWith("~");
}

/** Typical login home, e.g. /home/ubuntu — often wrong for SFTP fallback when the shell is elsewhere. */
export function isDefaultHomeDirectory(path: string): boolean {
  const trimmed = path.trim();
  return trimmed === "~" || trimmed === "~/" || /^\/home\/[^/]+\/?$/.test(trimmed);
}

function pathDepth(path: string): number {
  return path.split("/").filter(Boolean).length;
}

/** Prefer `cd`-tracked dir when live `pwd` still looks like a fresh login home. */
export function chooseRemoteWorkingDirectory(
  fromCd: string | null | undefined,
  fromShell: string | null | undefined,
): string | null {
  const cd = isPlausibleRemoteDirectory(fromCd) ? fromCd!.trim() : null;
  const shell = isPlausibleRemoteDirectory(fromShell) ? fromShell!.trim() : null;
  if (!cd) {
    return shell;
  }
  if (!shell) {
    return cd;
  }
  if (isDefaultHomeDirectory(shell) && !isDefaultHomeDirectory(cd)) {
    return cd;
  }
  if (isDefaultHomeDirectory(cd) && !isDefaultHomeDirectory(shell)) {
    return shell;
  }
  if (shell !== cd) {
    return pathDepth(shell) >= pathDepth(cd) ? shell : cd;
  }
  return shell;
}
