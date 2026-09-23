import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { LoginView } from "../components/auth/LoginView";
import { GoldenDemoView } from "../components/views/GoldenDemoView";
import { ThemeProvider } from "../context/ThemeContext";
import { DemoScenarioProvider } from "../context/DemoScenarioContext";

// Simple consumer component to inspect AuthContext
const AuthStatusDisplay: React.FC = () => {
  const { user, isAuthorityUser, isPublicUser, logout, login } = useAuth();
  return (
    <div>
      <span data-testid="user-role">{user ? user.role : "ANONYMOUS"}</span>
      <span data-testid="is-authority">{isAuthorityUser ? "YES" : "NO"}</span>
      <span data-testid="is-citizen">{isPublicUser ? "YES" : "NO"}</span>
      <button onClick={() => login("operator", "Terra#Op2026")}>Login Op</button>
      <button onClick={() => login("citizen", "Citizen#2026")}>Login Citizen</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("Authentication & RBAC Context", () => {
  it("defaults to anonymous/unauthenticated when local storage is empty", () => {
    localStorage.clear();
    render(
      <AuthProvider>
        <AuthStatusDisplay />
      </AuthProvider>
    );

    expect(screen.getByTestId("user-role").textContent).toBe("ANONYMOUS");
    expect(screen.getByTestId("is-authority").textContent).toBe("NO");
  });

  it("authenticates operator with authority privileges", async () => {
    localStorage.clear();
    render(
      <AuthProvider>
        <AuthStatusDisplay />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Login Op"));

    await waitFor(() => {
      expect(screen.getByTestId("user-role").textContent).toBe("OPERATOR");
      expect(screen.getByTestId("is-authority").textContent).toBe("YES");
      expect(screen.getByTestId("is-citizen").textContent).toBe("NO");
    });
  });

  it("authenticates citizen with restricted public privileges", async () => {
    localStorage.clear();
    render(
      <AuthProvider>
        <AuthStatusDisplay />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Login Citizen"));

    await waitFor(() => {
      expect(screen.getByTestId("user-role").textContent).toBe("PUBLIC_CITIZEN");
      expect(screen.getByTestId("is-authority").textContent).toBe("NO");
      expect(screen.getByTestId("is-citizen").textContent).toBe("YES");
    });
  });
});

describe("LoginView Component", () => {
  it("renders authorized personnel branding and demo preset accounts", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <LoginView />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/Operations Command Sign-In/i)).toBeInTheDocument();
    expect(screen.getByText(/DEMO \/ LOCAL ONLY PRESETS/i)).toBeInTheDocument();
    expect(screen.getByText(/Operator /i)).toBeInTheDocument();
    expect(screen.getByText(/Magistrate /i)).toBeInTheDocument();
    expect(screen.getByText(/Patrol /i)).toBeInTheDocument();
  });
});

describe("Living Incident GoldenDemoView Component", () => {
  it("renders the canonical operational centerpiece 'EVENT ABSENCE ≠ HAZARD RESOLUTION'", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/EVENT ABSENCE ≠ HAZARD RESOLUTION/i)).toBeInTheDocument();
    expect(screen.getByText(/THE HARD CASE: WARNING → INTERVENTION → NO OBSERVED EVENT/i)).toBeInTheDocument();
    expect(screen.getByText(/SAME INCIDENT REASSESSMENT/i)).toBeInTheDocument();
  });

  it("renders the timeline stages T0 through T4 for continuous living incident reassessment", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/T0: Prediction at KM-42/i)).toBeInTheDocument();
    expect(screen.getByText(/T1: The Hard Case \(No Event\)/i)).toBeInTheDocument();
    expect(screen.getByText(/T2: Later Evidence at KM-43\.2/i)).toBeInTheDocument();
    expect(screen.getByText(/T3: Reassess SAME Incident/i)).toBeInTheDocument();
    expect(screen.getByText(/T4: Evidentiary Closure Gate/i)).toBeInTheDocument();
  });

  it("renders Scenarios A through G in the scenario matrix inspector", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/SCENARIO A/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO B/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO C/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO D/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO E/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO F/i)).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO G/i)).toBeInTheDocument();
  });

  it("renders the 7 competing hypotheses H1 through H7 distinctly", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/H1 – H7 COMPETING OPERATIONAL HYPOTHESES/i)).toBeInTheDocument();
    expect(screen.getByText(/H1: False Alarm/i)).toBeInTheDocument();
    expect(screen.getByText(/H2: Intervention Non-Event/i)).toBeInTheDocument();
    expect(screen.getByText(/H3: Delayed Failure/i)).toBeInTheDocument();
    expect(screen.getByText(/H4: Shifted Hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/H5: Observation Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/H6: Residual Hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/H7: Conflicted Evidence/i)).toBeInTheDocument();
  });

  it("renders the 3-tier spatial intelligence hierarchy", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/1\. INPUT REJECTION BOUNDARY/i)).toBeInTheDocument();
    expect(screen.getByText(/> 10\.0 km/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. SUPPORTED INCIDENT CORRIDOR/i)).toBeInTheDocument();
    expect(screen.getByText(/≤ 5\.0 km/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LOCAL SPATIAL DIVERGENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/≤ 500 m/i)).toBeInTheDocument();
  });

  it("renders the 7 strict evidentiary closure preconditions", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/1\. Source State: REASSESSING/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Actor Role: AUTHORIZED_DECISION_MAKER/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Order Reference: Resolution Order Code/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Dispatched Tasks: ALL PHYSICALLY_CONFIRMED/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Evidence Conflicts: All Reconciled/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Ground Truth: Fresh Verified FIELD/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Outcome Engine: Clearance & Fresh Eval/i)).toBeInTheDocument();
  });

  it("enforces that NBI uses qualitative discrimination only without quantitative confidence gains", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    // Qualitative discrimination must be present
    expect(screen.getByText(/QUALITATIVE DISCRIMINATION ONLY/i)).toBeInTheDocument();

    // Quantitative confidence gains must NOT be present
    expect(screen.queryByText(/\+35% Conf\. Gain/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+15% Conf\. Gain/i)).not.toBeInTheDocument();
  });

  it("enforces causal safety invariant and blocks premature closure for Scenario D", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    // Scenario D is the default active hard case scenario
    expect(screen.getByText(/CAUSAL CLAIM:/i)).toBeInTheDocument();
    expect(screen.getByText(/UNPROVEN \(FALSE\)/i)).toBeInTheDocument();
    expect(screen.getByText(/CLOSURE PERMITTED:/i)).toBeInTheDocument();
    expect(screen.getByText(/NO \(STRICTLY BLOCKED\)/i)).toBeInTheDocument();
  });

  it("enforces spatial divergence precedence mapping to H4_SHIFTED_HAZARD for Scenario F", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    // Click Scenario F button in the matrix
    const scenarioFBtn = screen.getByRole("button", { name: /SCENARIO F/i });
    fireEvent.click(scenarioFBtn);

    // Primary hypothesis must show H4_SHIFTED_HAZARD
    expect(screen.getByText(/PRIMARY: H4_SHIFTED_HAZARD/i)).toBeInTheDocument();
  });
});
