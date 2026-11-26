import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { readThemePreference, THEME_STORAGE_KEY } from "./theme";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to system and stores nothing", () => {
    mockSystemDark(true);
    render(<ThemeToggle />);
    expect(readThemePreference()).toBe("system");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.length).toBe(0);
  });

  it("stores only the theme key when the user toggles", async () => {
    mockSystemDark(false);
    render(<ThemeToggle />);
    await act(() => userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" })));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(Object.keys(localStorage)).toEqual([THEME_STORAGE_KEY]);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(readThemePreference()).toBe("system");
  });
});
