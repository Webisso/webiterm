import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CommandPalette } from "../src/components/CommandPalette";
import { EmptyState } from "../src/components/EmptyState";
import type { CommandItem } from "../src/types/desktop";

const commands: CommandItem[] = [
  { id: "inspector", title: "Hide inspector", keywords: ["panel"] },
  { id: "status", title: "Reload application status", keywords: ["storage"] },
];

describe("application shell", () => {
  test("renders an empty state with its explanation", () => {
    render(
      <EmptyState
        title="No connections"
        description="SSH and database profiles you save will appear here, on this device."
      />,
    );
    expect(screen.getByRole("heading", { name: "No connections" })).toBeTruthy();
    expect(screen.getByText(/on this device/)).toBeTruthy();
  });

  test("filters palette commands as the query changes", () => {
    const onRun = vi.fn();
    render(<CommandPalette commands={commands} onRun={onRun} onClose={() => undefined} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "storage" } });
    expect(screen.getByRole("option", { name: "Reload application status" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Hide inspector" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Reload application status" }));
    expect(onRun).toHaveBeenCalledWith("status");
  });
});
