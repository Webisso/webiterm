/**
 * @deprecated Use `node scripts/sync-logo.mjs` (repository root `logo.png`).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [join(scriptDir, "sync-logo.mjs")], {
  cwd: join(scriptDir, ".."),
  stdio: "inherit",
});
process.exit(result.status ?? 1);
