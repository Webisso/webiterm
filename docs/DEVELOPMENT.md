# Development

The desktop UI talks only to its own Rust process. Application data is a local JSON file.

## Prerequisites

- macOS with Xcode command line tools (`clang` is required to build the Tauri webview)
- Rust 1.99.0, pinned by the repository `rust-toolchain.toml`
- Node.js 24 and npm 11 (verified with Node `v24.15.0`)
- No global `pnpm` or `cargo-tauri` install is required; the Tauri CLI is a local dev dependency

New shells need `$HOME/.cargo/bin` on `PATH`. `rustup` will also read `rust-toolchain.toml`.

## Desktop

```bash
cd webiterm
npm install
npm test
npm run typecheck
npm run build
cd src-tauri
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
```

Run the app:

```bash
cd webiterm
npm run tauri dev
```

The Vite server binds to `127.0.0.1:1420`. Opening that URL in a browser renders the shell without the desktop runtime. In that mode the inspector says the desktop runtime is unavailable, and the JSON file is not opened. That is expected. Local storage is active in the Tauri window.

The first launch creates `~/Library/Application Support/com.webiterm.desktop/webiterm.json`. Passwords are stored in that file in plain text. Export and import copy the whole document.

Keyboard shortcuts in the shell:

- `⌘K` or `Ctrl+K` — command palette
- `⌘\` or `Ctrl+\` — toggle the inspector
- `⌘⇧U` or `Ctrl+Shift+U` — local data (export and import)

## Formatting and linting

- Rust: `cargo fmt` and `clippy` as above, from `webiterm/src-tauri`
- TypeScript: `npm run typecheck` uses `strict` and `noUncheckedIndexedAccess`
- Frontend tests: Vitest and Testing Library in `webiterm/tests`

## Troubleshooting

- `rustc: command not found`: add `$HOME/.cargo/bin` to `PATH`, then retry. The toolchain file selects 1.99.0.
- Tauri icon or bundle errors: from `webiterm/`, run `node scripts/sync-logo.mjs` (uses `logo.png` at the repository root).
- Port 1420 in use: stop the other Vite process. The dev server uses a strict port so Tauri can find it.
- `cargo test` for the desktop crate compiles the WebKit bindings. The first build is slow.
- If the JSON file is corrupt, the app refuses to open it rather than replacing it. Move the file aside only when the data can be discarded.
