import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginView } from "../components/auth/LoginView";
import { PublicLandingView } from "../components/public/PublicLandingView";
import { COMMAND_DEMO_ACCOUNTS, useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../context/AuthContext")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("../context/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        login_header_badge: "OPERATIONS COMMAND GATEWAY",
        login_header_sub: "Govt. of India • North Eastern Region Disaster Operations Network",
        login_exit_btn: "Exit to Portal",
        login_card_badge: "SERVER-VERIFIED RBAC AUTHENTICATION",
        login_card_title: "Operations Command Sign-In",
        login_card_desc: "Enter your authorized service credentials.",
        login_user_label: "SERVICE USERNAME OR OFFICIAL EMAIL",
        login_pass_label: "ACCESS KEY / PASSWORD",
        login_btn_authenticating: "AUTHENTICATING",
        login_btn_submit: "Authenticate & Access Workspace",
        login_demo_badge: "DEMO ROLE ACCESS",
        login_demo_sub: "One-click authentication for evaluation & authority boundary verification.",
        login_citizen_prompt: "Looking for Public Citizen Hazard Reporting?",
        login_citizen_link: "Open Citizen Safe Portal →",
      })[key] ?? key,
  }),
}));

vi.mock("../components/common", () => ({
  ThemeToggle: () => null,
  LanguageSelector: () => null,
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("../context/PublicReportContext", () => ({
  usePublicReport: () => ({ setPublicStep: vi.fn() }),
}));

const mockLogin = vi.fn();
const mockQuickLoginAs = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockLogin.mockResolvedValue(true);
  mockQuickLoginAs.mockResolvedValue(true);
  vi.mocked(useAuth).mockReturnValue({
    currentUser: null,
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    loginError: null,
    login: mockLogin,
    quickLoginAs: mockQuickLoginAs,
    logout: vi.fn(),
    hasPermission: vi.fn(() => false),
    isPublicUser: true,
    isAuthorityUser: false,
    canAuthorizeDecisions: false,
    canConfirmActions: false,
    canCoordinateOperations: false,
    canProposeActions: false,
    canReconcileEvidence: false,
    canAssessHazard: false,
    canReview: false,
    canAdminister: false,
  });
});

describe("Operations Command login restoration", () => {
  it("renders the two-column authentication and demo role panels", () => {
    render(<LoginView />);

    expect(screen.getByText("Operations Command Sign-In")).toBeInTheDocument();
    expect(screen.getByText("DEMO ROLE ACCESS")).toBeInTheDocument();
    expect(screen.getByText("DEMO / LOCAL ONLY PRESETS")).toBeInTheDocument();
    expect(screen.getByLabelText("SERVICE USERNAME OR OFFICIAL EMAIL")).toBeInTheDocument();
    expect(screen.getByLabelText("SERVICE USERNAME OR OFFICIAL EMAIL")).toHaveValue("operator");
    expect(screen.getByLabelText("ACCESS KEY / PASSWORD")).toHaveValue("");
  });

  it("renders all five role cards and their badges", () => {
    render(<LoginView />);

    for (const account of COMMAND_DEMO_ACCOUNTS) {
      expect(screen.getByText(account.roleLabel)).toBeInTheDocument();
      expect(screen.getByText(account.role)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /Sign In/ })).toHaveLength(5);
  });

  it("routes demo role buttons through the existing server preset", async () => {
    const onSuccess = vi.fn();
    render(<LoginView onSuccess={onSuccess} />);

    for (const [index, account] of COMMAND_DEMO_ACCOUNTS.entries()) {
      fireEvent.click(screen.getAllByRole("button", { name: /Sign In/ })[index]);
      await waitFor(() => expect(mockQuickLoginAs).toHaveBeenLastCalledWith(account.username));
    }
    expect(onSuccess).toHaveBeenCalledTimes(5);
  });

  it("does not fake a session when production presets are unavailable", async () => {
    mockQuickLoginAs.mockResolvedValue(false);
    const onSuccess = vi.fn();
    render(<LoginView onSuccess={onSuccess} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Sign In/ })[0]);

    expect(await screen.findByText(/Demo sign-in is unavailable in this environment/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("continues to submit normal credentials to the existing login method", async () => {
    const onSuccess = vi.fn();
    render(<LoginView onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("SERVICE USERNAME OR OFFICIAL EMAIL"), {
      target: { value: "unit-test-officer" },
    });
    fireEvent.change(screen.getByLabelText("ACCESS KEY / PASSWORD"), {
      target: { value: "unit-test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Authenticate & Access Workspace/ }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        username: "unit-test-officer",
        password: "unit-test-password",
      })
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("retains the Citizen Safe Portal link", () => {
    const onNavigateCitizen = vi.fn();
    render(<LoginView onNavigateCitizen={onNavigateCitizen} />);

    fireEvent.click(screen.getByRole("button", { name: /Open Citizen Safe Portal/ }));
    expect(onNavigateCitizen).toHaveBeenCalledOnce();
  });

  it("keeps the landing-page product name and report message prominent", () => {
    render(
      <PublicLandingView onEnterCitizenSafe={vi.fn()} onSelectOperatorLogin={vi.fn()} />
    );

    expect(screen.getByText("TerraGuardian AI")).toBeInTheDocument();
    expect(screen.getByText("OPERATIONS")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /See a Landslide or Slope Hazard/ })).toBeInTheDocument();
    expect(screen.getByText("Report in 30 Seconds.")).toBeInTheDocument();
  });
});
