import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { visibleCategories } from "@/registry/registry";
import { footerLinks } from "@/site";
import { App } from "./App";

describe("homepage", () => {
  it("shows the brand, headline, subheadline and search", () => {
    render(<App pathname="/" />);
    expect(screen.getByRole("link", { name: "Privora home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1, name: "Powerful tools. Private by design." })).toBeInTheDocument();
    expect(screen.getByText(/Everything is processed directly on your device/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find a tool...")).toBeInTheDocument();
  });

  it("shows popular tools, how it works and all four privacy indicators", () => {
    render(<App pathname="/" />);
    expect(within(screen.getByRole("region", { name: "Popular tools" })).getByRole("link", { name: /Image Converter/ })).toHaveAttribute("href", "/image-converter/");
    const how = screen.getByRole("region", { name: "How it works" });
    for (const step of ["Choose a tool.", "Select a local file.", "Process privately in your browser.", "Download the result."]) {
      expect(within(how).getByText(step)).toBeInTheDocument();
    }
    for (const label of ["100% On-Device Processing", "Zero File Uploads", "Zero Server-Side File Storage", "No Account Required"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("shows only categories with working tools", () => {
    render(<App pathname="/" />);
    const section = screen.getByRole("region", { name: "Tool categories" });
    for (const c of visibleCategories()) expect(within(section).getAllByText(c.name).length).toBeGreaterThan(0);
    expect(within(section).queryByText("AI Tools")).not.toBeInTheDocument();
    expect(within(section).queryByText("Coming soon")).not.toBeInTheDocument();
  });

  it("searches locally and links to results", async () => {
    render(<App pathname="/" />);
    await userEvent.type(screen.getByPlaceholderText("Find a tool..."), "picture converter");
    expect(screen.getByText("1 tool found")).toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText("Find a tool..."));
    await userEvent.type(screen.getByPlaceholderText("Find a tool..."), "ocr");
    expect(screen.getByText(/No tools match/)).toBeInTheDocument();
  });

  it("footer has the attribution and only real links", () => {
    render(<App pathname="/" />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Privora — Developed and maintained by Abraham Dan Alvarez.");
    const links = within(footer).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(footerLinks.filter((l) => l.href).map((l) => l.label));
    for (const l of links) expect(l.getAttribute("href")).toBeTruthy();
  });
});

describe("tool page", () => {
  it("renders the shared layout for a verified tool", async () => {
    render(<App pathname="/image-converter/" />);
    expect(screen.getByRole("heading", { level: 1, name: "Image Converter" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("HomeImage ToolsImage Converter");
    expect(screen.getByText(/never uploaded to our servers/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Choose file" })).toBeInTheDocument();
    expect(screen.queryByText(/upload file/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to use" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supported formats" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument();
  });

  it("shows not found for planned tools and unknown pages", () => {
    render(<App pathname="/ocr-pdf/" />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });
});
