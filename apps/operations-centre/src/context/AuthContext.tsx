import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, ActorRole, LoginPayload } from "../types/incident";
import { apiClient, setAuthToken, getAuthToken, ApiError } from "../services/apiClient";

export interface DemoAccount {
  username: string;
  role: ActorRole;
  passwordHint: string;
  roleLabel: string;
  fullName: string;
  agency: string;
  badgeNumber: string;
  description: string;
}

/**
 * Deterministic demonstration accounts seeded in backend (Prompt 02).
 * STRICTLY DEMO / LOCAL ONLY.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "citizen",
    role: "PUBLIC_CITIZEN",
    passwordHint: "Citizen#2026",
    roleLabel: "Public Citizen Observer",
    fullName: "Citizen Observer (West Kameng)",
    agency: "Citizen Community Watch",
    badgeNumber: "CIT-WK-09",
    description: "Public view only: localized alerts, safety advisories, and citizen hazard reporting.",
  },
  {
    username: "operator",
    role: "OPERATOR",
    passwordHint: "Terra#Op2026",
    roleLabel: "Operations Duty Officer",
    fullName: "Operations Duty Officer",
    agency: "State Disaster Operations Centre",
    badgeNumber: "SDOC-WK-102",
    description: "Operational coordination: evidence reconciliation, action dispatch, reassessment, and telemetry.",
  },
  {
    username: "patrol",
    role: "FIELD_VERIFIER",
    passwordHint: "Patrol#2026",
    roleLabel: "Ground Patrol Officer",
    fullName: "ASI D. Sonam",
    agency: "West Kameng Traffic Police",
    badgeNumber: "WKTP-38",
    description: "Field truth: ground patrol inspection reports and physical response action confirmation.",
  },
  {
    username: "magistrate",
    role: "AUTHORIZED_DECISION_MAKER",
    passwordHint: "Terra#Admin2026",
    roleLabel: "District Magistrate / DDMA",
    fullName: "P. Tsering, IAS (District Magistrate)",
    agency: "District Disaster Management Authority",
    badgeNumber: "DM-WK-01",
    description: "Statutory authority: emergency orders (#DDMA-WK), decision authorization, and final incident closure.",
  },
];

interface AuthContextType {
  currentUser: UserProfile | null;
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
  quickLoginAs: (username: string) => Promise<boolean>;
  isPublicUser: boolean;
  isAuthorityUser: boolean;
  canAuthorizeDecisions: boolean;
  canConfirmActions: boolean;
  canCoordinateOperations: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tg_current_user");
      if (saved) {
        try {
          return JSON.parse(saved) as UserProfile;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restore or verify authenticated session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const profile = await apiClient.getCurrentUser();
          setCurrentUser(profile);
          if (typeof window !== "undefined") {
            localStorage.setItem("tg_current_user", JSON.stringify(profile));
          }
        } catch {
          // Token invalid or expired — clear
          setAuthToken(null);
          setTokenState(null);
          setCurrentUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("tg_current_user");
          }
        }
      }
    };
    initAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<boolean> => {
    setIsLoading(true);
    setLoginError(null);

    try {
      // 1. Attempt authoritative backend login
      const response = await apiClient.login(payload);
      setAuthToken(response.access_token);
      setTokenState(response.access_token);
      setCurrentUser(response.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("tg_current_user", JSON.stringify(response.user));
      }
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      // Check if backend unreachable or error
      if (err instanceof ApiError && (err.status === 401 || err.status === 400 || err.status === 403)) {
        setLoginError(err.detail || "Invalid credentials provided.");
        setIsLoading(false);
        return false;
      }

      // 2. Offline / local fallback against seeded deterministic DEMO accounts
      const match = DEMO_ACCOUNTS.find(
        (a) =>
          (a.username.toLowerCase() === payload.username.toLowerCase() ||
           `${a.username}@terraguardian.gov.in`.toLowerCase() === payload.username.toLowerCase()) &&
          payload.password === a.passwordHint
      );

      if (match) {
        const syntheticProfile: UserProfile = {
          id: `demo-${match.username}-uuid`,
          username: match.username,
          email: `${match.username}@terraguardian.gov.in`,
          full_name: match.fullName,
          role: match.role,
          agency: match.agency,
          badge_number: match.badgeNumber,
          is_active: true,
        };
        const syntheticToken = `demo_bearer_token_${match.username}`;
        setAuthToken(syntheticToken);
        setTokenState(syntheticToken);
        setCurrentUser(syntheticProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("tg_current_user", JSON.stringify(syntheticProfile));
        }
        setIsLoading(false);
        return true;
      }

      setLoginError("Invalid credentials or server unavailable.");
      setIsLoading(false);
      return false;
    }
  };

  const quickLoginAs = async (username: string): Promise<boolean> => {
    const acc = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!acc) return false;
    return login({ username: acc.username, password: acc.passwordHint });
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setCurrentUser(null);
    setLoginError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("tg_current_user");
    }
  };

  const isAuthenticated = !!currentUser && !!token;
  const isPublicUser = !isAuthenticated || currentUser?.role === "PUBLIC_CITIZEN";
  const isAuthorityUser = isAuthenticated && currentUser?.role !== "PUBLIC_CITIZEN";
  const canAuthorizeDecisions = currentUser?.role === "AUTHORIZED_DECISION_MAKER";
  const canConfirmActions = currentUser?.role === "FIELD_VERIFIER" || currentUser?.role === "OPERATOR" || currentUser?.role === "AUTHORIZED_DECISION_MAKER";
  const canCoordinateOperations = currentUser?.role === "OPERATOR" || currentUser?.role === "AUTHORIZED_DECISION_MAKER";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        token,
        isAuthenticated,
        isLoading,
        loginError,
        login,
        logout,
        quickLoginAs,
        isPublicUser,
        isAuthorityUser,
        canAuthorizeDecisions,
        canConfirmActions,
        canCoordinateOperations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
