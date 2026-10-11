# WebiTerm — Çalıştırma kılavuzu

Bu belge, projeyi macOS üzerinde geliştirme modunda çalıştırmak için gereken adımları özetler. Uygulama yalnızca yerelde çalışır; hesap veya ayrı bir sunucu yoktur.

## Gereksinimler

| Araç | Not |
|------|-----|
| macOS | Xcode Command Line Tools (`xcode-select --install`) |
| Rust 1.99 | Depodaki `rust-toolchain.toml` sürümü; `rustup` kurulu olmalı |
| Node.js 24 + npm | Örnek: `v24.15.0` / npm 11 |

Rust yeni kurulduysa kabuğa şunu ekleyin (veya terminali yeniden açın):

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Kontrol:

```bash
rustc --version
node --version
npm --version
```

## İlk kurulum (bir kez)

Depo kökünden:

```bash
cd webiterm
npm install
```

Rust bağımlılıkları ilk `tauri dev` veya `cargo build` sırasında indirilir; ilk derleme birkaç dakika sürebilir.

## Masaüstü uygulamasını çalıştırma (önerilen)

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd webiterm
npm run tauri dev
```

Ne olur:

1. Vite `http://127.0.0.1:1420/` adresinde arka planda açılır.
2. Tauri, Rust tarafını derleyip **WebiTerm** penceresini açar.
3. İlk açılışta yerel veri dosyası oluşturulur:  
   `~/Library/Application Support/com.webiterm.desktop/webiterm.json`

Bu dosyada profiller, düz metin şifreler, klasörler, favoriler ve panolar durur. Dışa ve içe aktarma dosyanın tamamını kopyalar.

Durdurmak: terminalde `Ctrl+C`.

**Önemli:** Uygulamayı Cursor sandbox içindeki derlenmiş binary yolundan (`/var/folders/.../webiterm`) doğrudan çalıştırmayın. Her zaman `npm run tauri dev` kullanın.

### Klavye kısayolları

- `⌘K` / `Ctrl+K` — komut paleti
- `⌘\` / `Ctrl+\` — inspector paneli aç/kapa
- `⌘⇧U` / `Ctrl+Shift+U` — yerel veri (dışa ve içe aktarma)

## Sadece arayüz (tarayıcı)

Tam işlevsellik için Tauri penceresi gerekir. Yine de CSS/JS denemek için:

```bash
cd webiterm
npm run dev
```

Tarayıcıda `http://127.0.0.1:1420/` açın. Bu modda JSON dosyası ve IPC çalışmaz; inspector “desktop runtime unavailable” gösterebilir — beklenen davranış.

## Doğrulama komutları (isteğe bağlı)

```bash
cd webiterm
npm test
npm run typecheck
npm run build

cd src-tauri
cargo test --locked
```

## Sorun giderme

### `rustc: command not found`

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Kalıcı yapmak için `~/.zshrc` dosyanıza aynı satırı ekleyin.

### `Local storage is unavailable` / uygulama açılmıyor

JSON dosyası bozuksa uygulama onu silmez. Yerel veri önemli değilse klasörü sıfırlayın:

```bash
rm -rf "$HOME/Library/Application Support/com.webiterm.desktop"
```

Sonra tekrar `npm run tauri dev`.

### Port 1420 kullanımda

Başka bir Vite sürecini kapatın veya o portu kullanan uygulamayı durdurun.

### İlk derleme çok uzun

Tauri + WebKit bağlamaları ilk seferde uzun sürebilir; sonraki `tauri dev` çalıştırmaları daha hızlıdır.

## İlgili belgeler

- [DEVELOPMENT.md](DEVELOPMENT.md) — İngilizce geliştirici notları, lint ve test
