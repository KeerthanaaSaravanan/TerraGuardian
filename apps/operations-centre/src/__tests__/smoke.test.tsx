import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "../App";

describe("Operations Centre", () => {
  it("renders the application shell without crashing", () => {
    render(<App />);
    expect(screen.getByText(/TerraGuardian/)).toBeInTheDocument();
    expect(screen.getByText(/Operations Centre/)).toBeInTheDocument();
  });

  it("contains the primary navigation landmark", () => {
    render(<App />);
    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
  });
});
