import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the brand and tagline", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Privora" })).toBeInTheDocument();
    expect(screen.getByText("Powerful tools. Private by design.")).toBeInTheDocument();
  });
});
