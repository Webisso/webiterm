import { describe, expect, test, vi } from "vitest";
import {
  isTerminalViewportMeasurable,
  readTerminalDimensions,
} from "../src/features/terminal/terminalGeometry";

describe("terminalGeometry", () => {
  test("readTerminalDimensions returns null when too small", () => {
    const fit = { fit: vi.fn() };
    const term = { cols: 1, rows: 24 };
    expect(readTerminalDimensions(fit as never, term as never)).toBeNull();
    expect(fit.fit).toHaveBeenCalled();
  });

  test("readTerminalDimensions returns cols and rows", () => {
    const fit = { fit: vi.fn() };
    const term = { cols: 120, rows: 40 };
    expect(readTerminalDimensions(fit as never, term as never)).toEqual({
      cols: 120,
      rows: 40,
    });
  });

  test("hidden pane is not measurable and does not refit", () => {
    const fit = { fit: vi.fn() };
    const term = { cols: 120, rows: 40 };
    const hidden = { clientWidth: 0, clientHeight: 0 } as HTMLElement;
    expect(isTerminalViewportMeasurable(hidden)).toBe(false);
    expect(readTerminalDimensions(fit as never, term as never, hidden)).toBeNull();
    expect(fit.fit).not.toHaveBeenCalled();
  });
});
