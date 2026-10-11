# WebiTerm releases (macOS)

WebiTerm uses [Tauri’s updater](https://v2.tauri.app/plugin/updater/) with [GitHub Releases](https://github.com/Webisso/webiterm/releases). Each tag build uploads a signed `.tar.gz` updater bundle, a `.dmg`, and `latest.json`.

## One-time setup

### 1. Signing keypair (updates)

Generate once on your Mac (keep the private key safe):

```bash
cd webiterm
npx tauri signer generate -w "$HOME/.tauri/webiterm.key" --password ""
```

The **public** key is already in `webiterm/src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). If you regenerate keys, update that field with the contents of `~/.tauri/webiterm.key.pub`.

Add GitHub repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `~/.tauri/webiterm.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Empty string or your key password |

**Never commit the private key.** Losing it means you cannot ship updates to users who already installed the app.

### 2. Private vs public repository

The updater downloads `latest.json` and release assets over HTTPS **without** a GitHub token. That works when release files are publicly reachable.

- **Public repo** — in-app updates work for everyone.
- **Private repo** — CI can still publish releases, but **installed apps cannot download updates** until the repository is public (or you mirror `latest.json` + `.tar.gz` on a public HTTPS host). Plan to switch [Webisso/webiterm](https://github.com/Webisso/webiterm) to public before distributing builds outside your machine.

### 3. macOS “damaged” DMG / Gatekeeper

CI builds **ad-hoc sign** the `.app` (`signingIdentity: "-"` in `tauri.conf.json`) so the bundle is sealed correctly. Without a **Developer ID** certificate, macOS may still show *“is damaged”* or block the app when the download has quarantine (`com.apple.quarantine`). Fixes:

```bash
xattr -cr /Applications/WebiTerm.app
```

For normal double-click install from the browser, add Apple secrets below so CI **signs and notarizes** the app.

Export **Developer ID Application** certificate as `.p12`, then:

```bash
base64 -i YourCert.p12 | pbcopy   # paste into GitHub secret APPLE_CERTIFICATE
```

| Secret | Value |
|--------|--------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Export password for the `.p12` |
| `KEYCHAIN_PASSWORD` | Any strong random string (CI keychain only) |
| `APPLE_SIGNING_IDENTITY` | Optional; CI auto-detects from cert if omitted |
| `APPLE_ID` | Apple ID email (notarization) |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID from developer.apple.com |

When you add the Apple secrets, also add them to the `env` block of the **Build and release** step in `.github/workflows/release-macos.yml` (see comments there). Empty `APPLE_CERTIFICATE` in env breaks the build.

## Ship a version

1. Bump version in all three places (same semver):
   - `webiterm/package.json`
   - `webiterm/src-tauri/Cargo.toml`
   - `webiterm/src-tauri/tauri.conf.json`
2. Commit and push.
3. Create and push a tag:

```bash
git tag v0.1.1
git push origin v0.1.1
```

The [Release macOS](../.github/workflows/release-macos.yml) workflow builds on `macos-latest` (Apple Silicon), signs update artifacts, and publishes the GitHub release.

## Local signed build

```bash
cd webiterm
export TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/webiterm.key"
npm run tauri build -- --target aarch64-apple-darwin
```

Updater artifacts: `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/*.tar.gz` (+ `.sig`).

## In the app

- Automatic check ~4s after launch (at most once every 12 hours).
- **WebiTerm → Check for Updates…** (macOS app menu).
- **About → Check for updates**.

When a newer signed build is on GitHub, the user can install and relaunch from the update dialog.
