import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("homepage", () => {
  it("shows the brand, headline and subheadline", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Privora home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Powerful tools. Private by design." })).toBeInTheDocument();
    expect(screen.getByText(/Everything is processed directly on your device/)).toBeInTheDocument();
  });

  it("shows all four privacy indicators", () => {
    render(<App />);
    for (const label of [
      "100% On-Device Processing",
      "Zero File Uploads",
      "Zero Server-Side File Storage",
      "No Account Required",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("does not present unfinished tools as available", () => {
    render(<App />);
    const tools = screen.getByRole("region", { name: "Tools" });
    expect(within(tools).queryAllByRole("link")).toHaveLength(0);
    expect(within(tools).getAllByText("Coming soon").length).toBe(9);
  });

  it("shows the footer attribution", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Privora — Developed and maintained by Abraham Dan Alvarez.",
    );
  });
});
