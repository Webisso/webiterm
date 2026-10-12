import type { ITheme } from "@xterm/xterm";

/** 16–255 ANSI indices (xterm 256-color cube + grayscale). */
function buildExtendedAnsiPalette(): string[] {
  const palette: string[] = [];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const rv = r === 0 ? 0 : 55 + (r - 1) * 40;
        const gv = g === 0 ? 0 : 55 + (g - 1) * 40;
        const bv = b === 0 ? 0 : 55 + (b - 1) * 40;
        palette.push(
          `#${rv.toString(16).padStart(2, "0")}${gv.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`,
        );
      }
    }
  }
  for (let gray = 0; gray < 24; gray++) {
    const c = 8 + gray * 10;
    const hex = c.toString(16).padStart(2, "0");
    palette.push(`#${hex}${hex}${hex}`);
  }
  return palette;
}

/** Matches app tokens in `styles/tokens.css` with a full terminal palette. */
export const webitermTerminalTheme: ITheme = {
  background: "#101114",
  foreground: "#e8eaee",
  cursor: "#8eabff",
  cursorAccent: "#101114",
  selectionBackground: "#3d4f7a",
  selectionForeground: "#f4f6fa",
  selectionInactiveBackground: "#2a3140",
  black: "#181b20",
  red: "#e08b84",
  green: "#7dbe9b",
  yellow: "#d6b072",
  blue: "#8eabff",
  magenta: "#c9a0dc",
  cyan: "#7ec4e8",
  white: "#c5cad3",
  brightBlack: "#6c7380",
  brightRed: "#f0a8a2",
  brightGreen: "#9ad4b6",
  brightYellow: "#e8c894",
  brightBlue: "#b3c7ff",
  brightMagenta: "#ddb8f0",
  brightCyan: "#a8ddf4",
  brightWhite: "#f4f6fa",
  extendedAnsi: buildExtendedAnsiPalette(),
};

export const webitermTerminalOptions = {
  cursorBlink: true,
  cursorStyle: "bar" as const,
  cursorWidth: 2,
  cursorInactiveStyle: "outline" as const,
  fontFamily: 'var(--font-mono), "SF Mono", ui-monospace, Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.2,
  letterSpacing: 0,
  fontWeight: "400" as const,
  fontWeightBold: "600" as const,
  scrollback: 5000,
  drawBoldTextInBrightColors: true,
  minimumContrastRatio: 1,
  customGlyphs: true,
  theme: webitermTerminalTheme,
};
