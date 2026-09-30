import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { App } from "../App";
import { apiClient, setAuthToken } from "../services/apiClient";

describe("Operations Centre", () => {
  it("renders the public landing shell without crashing", () => {
    localStorage.clear();
    render(<App />);
    expect(screen.getAllByText(/TerraGuardian/i)[0]).toBeInTheDocument();
  });

  it("contains the navigation landmark when authenticated in operator mode", async () => {
    vi.spyOn(apiClient, "getCurrentUser").mockResolvedValue({
      id: "usr_op_1",
      username: "operator",
      role: "OPERATOR",
      full_name: "Control Room Operator",
      agency: "DDMA West Kameng",
      badge_number: "DDMA-OP-04",
      status: "ACTIVE",
      permissions: ["READ", "PROPOSE_ACTION", "EXECUTE_ACTION"],
    });

    localStorage.setItem("tg_app_mode", "operator");
    setAuthToken("valid-test-token");
    localStorage.setItem(
      "tg_current_user",
      JSON.stringify({
        id: "usr_op_1",
        username: "operator",
        role: "OPERATOR",
        full_name: "Control Room Operator",
        agency: "DDMA West Kameng",
        badge_number: "DDMA-OP-04",
        status: "ACTIVE",
        permissions: ["READ", "PROPOSE_ACTION", "EXECUTE_ACTION"],
      })
    );

    render(<App />);
    expect(await screen.findByRole("navigation", { name: /Operations Shortcuts/i })).toBeInTheDocument();
  });
});
