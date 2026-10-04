import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, ActorRole, LoginPayload, OperationalPermission, PERMISSION_MATRIX } from "../types/incident";
import { apiClient, setAuthToken, getAuthToken, ApiError } from "../services/apiClient";

export interface DemoAccount {
  username: string;
  role: ActorRole;
  roleLabel: string;
  fullName: string;
  agency: string;
  badgeNumber: string;
  description: string;
}

/**
 * Curated command-centre demonstration accounts (Phase 4 / Pre-Phase 5).
 * Strictly for demonstrating the Operations Command Platform.
 * 
 * 1. OPERATOR (Operations Duty Officer)
 * 2. ASSESSMENT_OFFICER (Hazard Assessment)
 * 3. FIELD_RESPONDER (Field Response / Patrol)
 * 4. AUTHORIZATION_OFFICER (Statutory Authorization / DDMA)
 * 5. REVIEWER (Governance / Review)
 */
export const COMMAND_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "operator",
    role: "OPERATOR",
    roleLabel: "Operations Duty Officer",
    fullName: "Operations Duty Officer",
    agency: "State Disaster Operations Centre",
    badgeNumber: "SDOC-WK-102",
    description: "Operational triage & coordination",
  },
  {
    username: "assessment",
    role: "ASSESSMENT_OFFICER",
    roleLabel: "Hazard Assessment Officer",
    fullName: "Dr. T. Norbu (Geotechnical Assessment Officer)",
    agency: "State Hazard Assessment Cell / GSI NER",
    badgeNumber: "GSI-NER-88",
    description: "Hazard analysis & geotechnical models",
  },
  {
    username: "patrol",
    role: "FIELD_RESPONDER",
    roleLabel: "Field Response / Patrol",
    fullName: "ASI D. Sonam",
    agency: "West Kameng Traffic Police",
    badgeNumber: "WKTP-38",
    description: "On-site field verification & confirmation",
  },
  {
    username: "magistrate",
    role: "AUTHORIZATION_OFFICER",
    roleLabel: "Statutory Authorization Authority",
    fullName: "P. Tsering, IAS (District Magistrate)",
    agency: "District Disaster Management Authority",
    badgeNumber: "DM-WK-01",
    description: "Civil statutory disaster authorization",
  },
  {
    username: "reviewer",
    role: "REVIEWER",
    roleLabel: "Incident Review & Governance",
    fullName: "K. Sharma (Independent Statutory Reviewer)",
    agency: "NDMA State Oversight Division",
    badgeNumber: "NDMA-REV-14",
    description: "Governance review & compliance audit",
  },
];

// Re-export as DEMO_ACCOUNTS for backward compatibility
export const DEMO_ACCOUNTS: DemoAccount[] = COMMAND_DEMO_ACCOUNTS;

const isLocalDemoMode = () => {
  return import.meta.env.DEV;
};

const isHostedDemoMode = () => import.meta.env.VITE_DEMO_AUTH_ENABLED === "true";

export const isDemoAuthEnabled = () => isLocalDemoMode() || isHostedDemoMode();

const LOCAL_DEMO_PASSWORDS: Record<string, string> = import.meta.env.DEV
  ? {
      operator: "Terra#Op2026",
      assessment: "Terra#Assess2026",
      patrol: "Patrol#2026",
      magistrate: "Terra#Admin2026",
      reviewer: "Terra#Review2026",
      admin: "Terra#SuperAdmin2026",
      citizen: "Citizen#2026",
    }
  : import.meta.env.VITE_DEMO_AUTH_ENABLED === "true"
    ? {
        operator: "Terra#Op2026",
        assessment: "Terra#Assess2026",
        patrol: "Patrol#2026",
        magistrate: "Terra#Admin2026",
        reviewer: "Terra#Review2026",
      }
    : {};

const ALL_SUPPORTED_ACCOUNTS: DemoAccount[] = import.meta.env.DEV
  ? [
      ...COMMAND_DEMO_ACCOUNTS,
      {
        username: "admin",
        role: "ADMINISTRATOR",
        roleLabel: "System & Governance Administrator",
        fullName: "System & Model Governance Administrator",
        agency: "State IT & Disaster Systems Hub",
        badgeNumber: "SYS-ADM-01",
        description: "Infrastructure & model registry administration",
      },
      {
        username: "citizen",
        role: "CITIZEN",
        roleLabel: "Public Citizen Observer",
        fullName: "Citizen Observer (West Kameng)",
        agency: "Citizen Community Watch",
        badgeNumber: "CIT-WK-09",
        description: "Public tier: localized hazard reporting via TerraGuardian Safe",
      },
    ]
  : import.meta.env.VITE_DEMO_AUTH_ENABLED === "true"
    ? COMMAND_DEMO_ACCOUNTS
    : [];

interface AuthContextType {
  currentUser: UserProfile | null;
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (payloadOrUsername: LoginPayload | string, password?: string) => Promise<boolean>;
  logout: () => void;
  quickLoginAs: (username: string) => Promise<boolean>;
  hasPermission: (permission: OperationalPermission | string) => boolean;
  isPublicUser: boolean;
  isAuthorityUser: boolean;
  canAuthorizeDecisions: boolean;
  canConfirmActions: boolean;
  canCoordinateOperations: boolean;
  canProposeActions: boolean;
  canReconcileEvidence: boolean;
  canAssessHazard: boolean;
  canReview: boolean;
  canAdminister: boolean;
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

  const login = async (
    payloadOrUsername: LoginPayload | string,
    passwordArg?: string
  ): Promise<boolean> => {
    const payload: LoginPayload =
      typeof payloadOrUsername === "string"
        ? { username: payloadOrUsername, password: passwordArg || "" }
        : payloadOrUsername;

    setIsLoading(true);
    setLoginError(null);

    const safeUsername = (payload?.username || "").trim();
    const safePassword = payload?.password || "";

    try {
      // 1. Attempt authoritative backend login
      const response = await apiClient.login({ username: safeUsername, password: safePassword });
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

      // Offline demo identities are allowed only for local, non-production contexts.
      const match = isLocalDemoMode()
        ? ALL_SUPPORTED_ACCOUNTS.find(
            (account) =>
              (account.username.toLowerCase() === safeUsername.toLowerCase() ||
                `${account.username}@terraguardian.gov.in`.toLowerCase() === safeUsername.toLowerCase()) &&
              safePassword === LOCAL_DEMO_PASSWORDS[account.username]
          )
        : undefined;

      if (match) {
        const grantedPerms = (PERMISSION_MATRIX[match.role] || []).map((p) => p.toString());
        const syntheticProfile: UserProfile = {
          id: `demo-${match.username}-uuid`,
          username: match.username,
          email: `${match.username}@terraguardian.gov.in`,
          full_name: match.fullName,
          role: match.role,
          agency: match.agency,
          badge_number: match.badgeNumber,
          is_active: true,
          permissions: grantedPerms,
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
    if (!isDemoAuthEnabled()) return false;
    const acc = ALL_SUPPORTED_ACCOUNTS.find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!acc) return false;
    const password = LOCAL_DEMO_PASSWORDS[acc.username];
    if (!password) return false;
    return login({ username: acc.username, password });
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

  const hasPermission = (permission: OperationalPermission | string): boolean => {
    if (!currentUser) return permission === "READ";
    if (currentUser.permissions && currentUser.permissions.length > 0) {
      return currentUser.permissions.includes(permission);
    }
    const role = currentUser.role;
    const granted = PERMISSION_MATRIX[role] || [];
    return granted.includes(permission as OperationalPermission);
  };

  const isAuthenticated = !!currentUser && !!token;
  const isPublicUser = !isAuthenticated || currentUser?.role === "PUBLIC_CITIZEN" || currentUser?.role === "CITIZEN";
  const isAuthorityUser = isAuthenticated && !isPublicUser;
  
  // Explicit permission mappings respecting governance invariants:
  // Recommendation ≠ Authorization ≠ Execution ≠ Confirmation
  const canAuthorizeDecisions = hasPermission("AUTHORIZE_ACTION");
  const canConfirmActions = hasPermission("CONFIRM_PHYSICAL_COMPLETION");
  const canCoordinateOperations = hasPermission("PROPOSE_ACTION") || hasPermission("EXECUTE_ACTION");
  const canProposeActions = hasPermission("PROPOSE_ACTION");
  const canReconcileEvidence = hasPermission("RECONCILE_EVIDENCE");
  const canAssessHazard = hasPermission("ASSESS");
  const canReview = hasPermission("REVIEW");
  const canAdminister = hasPermission("ADMINISTER");

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
        hasPermission,
        isPublicUser,
        isAuthorityUser,
        canAuthorizeDecisions,
        canConfirmActions,
        canCoordinateOperations,
        canProposeActions,
        canReconcileEvidence,
        canAssessHazard,
        canReview,
        canAdminister,
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
