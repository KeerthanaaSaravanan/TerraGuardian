import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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

    // Verify canonical operational aphorisms and core thesis
    expect(screen.getByText(/EVENT ABSENCE ≠ HAZARD RESOLUTION/i)).toBeInTheDocument();
    expect(screen.getByText(/SAME INCIDENT\. NEW EVIDENCE\. REASSESS\./i)).toBeInTheDocument();
    expect(screen.getByText(/THE HARD CASE: WARNING → INTERVENTION → NO OBSERVED EVENT/i)).toBeInTheDocument();
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

    expect(screen.getByText(/T0: Prediction & Intervention/i)).toBeInTheDocument();
    expect(screen.getByText(/T1: Observation Window/i)).toBeInTheDocument();
    expect(screen.getByText(/T2: Divergent Evidence Arrival/i)).toBeInTheDocument();
    expect(screen.getByText(/T3: Continuous Reassessment/i)).toBeInTheDocument();
    expect(screen.getByText(/T4: Evidentiary Closure Gate/i)).toBeInTheDocument();
  });

  it("renders the spatial divergence tolerance notice and safety invariant", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <DemoScenarioProvider>
            <GoldenDemoView />
          </DemoScenarioProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/Spatial Divergence Detected: KM-42\.0 vs KM-43\.2/i)).toBeInTheDocument();
    expect(screen.getByText(/Safety Invariant: Intervention \+ No Landslide ≠ Success/i)).toBeInTheDocument();
  });
});
