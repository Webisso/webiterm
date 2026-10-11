export function joinRemotePath(cwd: string, name: string): string {
  const base = cwd === "" ? "/" : cwd;
  if (base === "/") {
    return `/${name}`;
  }
  return `${base.replace(/\/$/, "")}/${name}`;
}

export function parentRemotePath(path: string): string {
  if (path === "/" || path === "") {
    return "/";
  }
  const trimmed = path.replace(/\/$/, "");
  const index = trimmed.lastIndexOf("/");
  if (index <= 0) {
    return "/";
  }
  return trimmed.slice(0, index);
}
