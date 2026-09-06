import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "../App";

describe("TerraGuardian Safe", () => {
  it("renders the citizen app shell without crashing", () => {
    render(<App />);
    expect(screen.getByText(/TerraGuardian Safe/)).toBeInTheDocument();
  });

  it("shows the report observation button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /report observation/i })).toBeInTheDocument();
  });

  it("has a main navigation landmark", () => {
    render(<App />);
    expect(screen.getByRole("navigation", { name: /main/i })).toBeInTheDocument();
  });
});
