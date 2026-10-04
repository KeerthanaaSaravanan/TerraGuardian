import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, COMMAND_DEMO_ACCOUNTS } from "../context/AuthContext";
import { apiClient, setAuthToken } from "../services/apiClient";
import { UserProfile } from "../types/incident";

vi.mock("../services/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/apiClient")>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      demoLogin: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  };
});

const AuthProbe: React.FC<{ username: string }> = ({ username }) => {
  const { user, quickLoginAs } = useAuth();
  return (
    <div>
      <span data-testid="role">{user?.role ?? "ANONYMOUS"}</span>
      <button onClick={() => void quickLoginAs(username)}>Sign in as preset</button>
    </div>
  );
};

const profileFor = (username: string, role: UserProfile["role"]): UserProfile => ({
  id: `server-user-${username}`,
  username,
  email: `${username}@terraguardian.gov.in`,
  full_name: username,
  role,
  agency: "Evaluation",
  badge_number: "TEST",
  is_active: true,
  permissions: [],
});

beforeEach(() => {
  localStorage.clear();
  setAuthToken(null);
  vi.clearAllMocks();
  vi.mocked(apiClient.getCurrentUser).mockRejectedValue(new Error("No stored session"));
  vi.mocked(apiClient.demoLogin).mockImplementation(async (account) => {
    const preset = COMMAND_DEMO_ACCOUNTS.find(({ username }) => username === account);
    if (!preset) throw new Error("Unexpected preset account");
    return {
      access_token: `verified-server-token-${account}`,
      token_type: "bearer",
      user: profileFor(preset.username, preset.role),
    };
  });
  vi.mocked(apiClient.login).mockImplementation(async (payload) => {
    const preset = COMMAND_DEMO_ACCOUNTS.find(({ username }) => username === payload.username);
    if (!preset) throw new Error("Unexpected normal login account");
    return {
      access_token: `verified-server-token-${preset.username}`,
      token_type: "bearer",
      user: profileFor(preset.username, preset.role),
    };
  });
});

describe("server-backed demo role presets", () => {
  it.each(COMMAND_DEMO_ACCOUNTS)("$role is established only from its server response", async (account) => {
    render(
      <AuthProvider>
        <AuthProbe username={account.username} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in as preset" }));
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent(account.role));
    expect(apiClient.demoLogin).toHaveBeenCalledWith(account.username);
    expect(apiClient.login).not.toHaveBeenCalled();
  });

  it("does not authenticate an arbitrary role identifier", async () => {
    render(
      <AuthProvider>
        <AuthProbe username="administrator" />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in as preset" }));
    expect(screen.getByTestId("role")).toHaveTextContent("ANONYMOUS");
    expect(apiClient.demoLogin).not.toHaveBeenCalled();
  });

  it("continues normal username/password authentication through the backend login endpoint", async () => {
    const profile = profileFor("operator", "OPERATOR");
    vi.mocked(apiClient.login).mockResolvedValue({
      access_token: "server-issued-normal-test-token",
      token_type: "bearer",
      user: profile,
    });
    const LoginProbe: React.FC = () => {
      const { user, login } = useAuth();
      return (
        <div>
          <span data-testid="role">{user?.role ?? "ANONYMOUS"}</span>
          <button
            onClick={() => void login({ username: "operator", password: "test-only-password" })}
          >
            Normal login
          </button>
        </div>
      );
    };
    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Normal login" }));
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("OPERATOR"));
    expect(apiClient.login).toHaveBeenCalledWith({
      username: "operator",
      password: "test-only-password",
    });
    expect(apiClient.demoLogin).not.toHaveBeenCalled();
  });
});
