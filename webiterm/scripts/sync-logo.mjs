import { copyFileSync, existsSync, utimesSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webitermRoot = join(scriptDir, "..");
const repoLogo = join(webitermRoot, "..", "logo.png");
const assetsLogo = join(webitermRoot, "assets", "logo.png");

if (!existsSync(repoLogo)) {
  console.error(`Missing ${repoLogo}. Add logo.png at the repository root.`);
  process.exit(1);
}

copyFileSync(repoLogo, assetsLogo);
console.log(`Copied logo → ${assetsLogo}`);

const icon = spawnSync("npx", ["tauri", "icon", "assets/logo.png"], {
  cwd: webitermRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (icon.status !== 0) {
  process.exit(icon.status ?? 1);
}

const iconsDir = join(webitermRoot, "src-tauri", "icons");
const srcAssets = join(webitermRoot, "src", "assets");
const publicDir = join(webitermRoot, "public");

copyFileSync(join(iconsDir, "128x128@2x.png"), join(srcAssets, "logo.png"));
copyFileSync(join(iconsDir, "32x32.png"), join(publicDir, "favicon.png"));
copyFileSync(join(iconsDir, "128x128@2x.png"), join(publicDir, "logo.png"));
console.log("Synced UI assets (src/assets/logo.png, public/favicon.png).");

// Icon bytes are baked in at compile time; touching icons alone does not always rerun the build script.
const buildRs = join(webitermRoot, "src-tauri", "build.rs");
utimesSync(buildRs, new Date(), new Date());
console.log("Rebuilding Rust so Dock icon updates in tauri dev…");
const build = spawnSync("cargo", ["build"], {
  cwd: join(webitermRoot, "src-tauri"),
  stdio: "inherit",
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}
console.log("Done. Restart npm run tauri dev if it is already running.");
