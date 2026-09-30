import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { DemoScenarioProvider } from "../context/DemoScenarioContext";
import { AuthorityDecisionView } from "../components/views/AuthorityDecisionView";

function renderWithUser(userProfile: Record<string, unknown> | null) {
  localStorage.clear();
  if (userProfile) {
    localStorage.setItem("tg_current_user", JSON.stringify(userProfile));
  }
  return render(
    <ThemeProvider>
      <AuthProvider>
        <DemoScenarioProvider>
          <AuthorityDecisionView />
        </DemoScenarioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe("AuthorityDecisionView RBAC Enforcement", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("FIELD_RESPONDER cannot see actionable authorization controls (APPROVE, MODIFY, REJECT)", () => {
    renderWithUser({
      id: "patrol-uuid",
      username: "patrol",
      email: "patrol@terraguardian.gov.in",
      full_name: "ASI D. Sonam",
      role: "FIELD_RESPONDER",
      agency: "West Kameng Traffic Police",
      badge_number: "WKTP-38",
      is_active: true,
      permissions: ["READ", "RECONCILE_EVIDENCE", "EXECUTE_ACTION", "CONFIRM_PHYSICAL_COMPLETION"],
    });

    // 1. Must NOT render actionable buttons
    expect(screen.queryByText(/APPROVE RESTRICTION/i)).toBeNull();
    expect(screen.queryByText(/^MODIFY$/i)).toBeNull();
    expect(screen.queryByText(/^REJECT$/i)).toBeNull();

    // 2. Must NOT render editable credential inputs
    expect(screen.queryByRole("textbox")).toBeNull();

    // 3. Must render role-specific read-only context explaining boundary
    expect(screen.getByText(/Read-Only Context: Field Responder Role/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory Controls Locked/i)).toBeInTheDocument();
    expect(screen.getByText(/AUTHORIZATION_OFFICER ONLY/i)).toBeInTheDocument();
  });

  it("OPERATOR cannot see actionable authorization controls", () => {
    renderWithUser({
      id: "op-uuid",
      username: "operator",
      email: "operator@terraguardian.gov.in",
      full_name: "Operations Duty Officer",
      role: "OPERATOR",
      agency: "State Disaster Operations Centre",
      badge_number: "SDOC-WK-102",
      is_active: true,
      permissions: ["READ", "ASSESS", "RECONCILE_EVIDENCE", "PROPOSE_ACTION", "EXECUTE_ACTION", "RECORD_OUTCOME", "REVIEW"],
    });

    // 1. Must NOT render actionable buttons
    expect(screen.queryByText(/APPROVE RESTRICTION/i)).toBeNull();
    expect(screen.queryByText(/^MODIFY$/i)).toBeNull();
    expect(screen.queryByText(/^REJECT$/i)).toBeNull();

    // 2. Must render read-only operator governance notice
    expect(screen.getByText(/Read-Only Governance Gate: Operator Role/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory Controls Locked/i)).toBeInTheDocument();
  });

  it("ASSESSMENT_OFFICER cannot see actionable authorization controls", () => {
    renderWithUser({
      id: "assess-uuid",
      username: "assessment",
      email: "assessment@terraguardian.gov.in",
      full_name: "Dr. T. Norbu",
      role: "ASSESSMENT_OFFICER",
      agency: "State Hazard Assessment Cell / GSI NER",
      badge_number: "GSI-NER-88",
      is_active: true,
      permissions: ["READ", "ASSESS", "RECONCILE_EVIDENCE", "PROPOSE_ACTION", "RECORD_OUTCOME", "REVIEW"],
    });

    // 1. Must NOT render actionable buttons
    expect(screen.queryByText(/APPROVE RESTRICTION/i)).toBeNull();
    expect(screen.queryByText(/^MODIFY$/i)).toBeNull();
    expect(screen.queryByText(/^REJECT$/i)).toBeNull();

    // 2. Must render read-only assessment officer notice
    expect(screen.getByText(/Read-Only Governance Gate: Assessment Officer/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory Controls Locked/i)).toBeInTheDocument();
  });

  it("AUTHORIZATION_OFFICER can see authorization controls and editable fields", () => {
    renderWithUser({
      id: "mag-uuid",
      username: "magistrate",
      email: "magistrate@terraguardian.gov.in",
      full_name: "P. Tsering, IAS (District Magistrate)",
      role: "AUTHORIZATION_OFFICER",
      agency: "District Disaster Management Authority",
      badge_number: "DM-WK-01",
      is_active: true,
      permissions: [
        "READ",
        "ASSESS",
        "RECONCILE_EVIDENCE",
        "PROPOSE_ACTION",
        "AUTHORIZE_ACTION",
        "RECORD_OUTCOME",
        "REVIEW",
      ],
    });

    // 1. Must render actionable determination buttons
    expect(screen.getByText(/APPROVE RESTRICTION/i)).toBeInTheDocument();
    expect(screen.getByText(/^MODIFY$/i)).toBeInTheDocument();
    expect(screen.getByText(/^REJECT$/i)).toBeInTheDocument();

    // 2. Must render editable credential inputs
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    // 3. Must indicate statutory signatory badge
    expect(screen.getByText(/STATUTORY SIGNATORY/i)).toBeInTheDocument();
  });
});
