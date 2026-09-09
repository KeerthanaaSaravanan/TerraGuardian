/**
 * TerraGuardian Design System — Foundational Semantic Tokens
 *
 * Designed for emergency/disaster-management command & response applications.
 * Supports dual-theme (Dark / Light) with high-contrast accessibility,
 * precise operational hierarchy, and clear semantic states.
 */

export const brandTokens = {
  name: "TerraGuardian AI",
  tagline: "FROM WARNING TO ACTION",
  coreThesis: "MONITORING WATCHES THE HAZARD. TERRAGUARDIAN MANAGES THE INCIDENT.",
  lifecycleChain: [
    "SENSE",
    "RECONCILE",
    "VERIFY",
    "UNDERSTAND",
    "PRIORITIZE",
    "DECIDE",
    "ACT",
    "CONFIRM",
    "LEARN",
  ] as const,
};

// ── Semantic Risk Colours ──
// RISK represents PHYSICAL DANGER / HAZARD MAGNITUDE (RISK ≠ CONFIDENCE)
export const riskTokens = {
  CRITICAL: {
    label: "Critical Risk",
    dark: { text: "#ef4444", bg: "#450a0a", border: "#991b1b", badge: "#ef4444" },
    light: { text: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", badge: "#dc2626" },
  },
  HIGH: {
    label: "High Risk",
    dark: { text: "#f97316", bg: "#431407", border: "#9a3412", badge: "#f97316" },
    light: { text: "#c2410c", bg: "#fff7ed", border: "#fdba74", badge: "#ea580c" },
  },
  MODERATE: {
    label: "Moderate Risk",
    dark: { text: "#eab308", bg: "#422006", border: "#854d0e", badge: "#eab308" },
    light: { text: "#a16207", bg: "#fefce8", border: "#fde047", badge: "#ca8a04" },
  },
  LOW: {
    label: "Low Risk",
    dark: { text: "#22c55e", bg: "#052e16", border: "#166534", badge: "#22c55e" },
    light: { text: "#15803d", bg: "#f0fdf4", border: "#86efac", badge: "#16a34a" },
  },
} as const;

// ── Confidence Colours ──
// CONFIDENCE represents EVIDENCE CERTAINTY & OBSERVATIONAL AGREEMENT (NOT DANGER)
export const confidenceTokens = {
  VERY_HIGH: {
    label: "Very High Confidence",
    dark: { text: "#38bdf8", bg: "#082f49", border: "#075985", badge: "#0284c7" },
    light: { text: "#0369a1", bg: "#f0f9ff", border: "#7dd3fc", badge: "#0284c7" },
  },
  HIGH: {
    label: "High Confidence",
    dark: { text: "#60a5fa", bg: "#172554", border: "#1e40af", badge: "#3b82f6" },
    light: { text: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd", badge: "#2563eb" },
  },
  MODERATE: {
    label: "Moderate Confidence",
    dark: { text: "#fbbf24", bg: "#451a03", border: "#92400e", badge: "#f59e0b" },
    light: { text: "#b45309", bg: "#fffbeb", border: "#fcd34d", badge: "#d97706" },
  },
  LOW: {
    label: "Low Confidence",
    dark: { text: "#f87171", bg: "#450a0a", border: "#991b1b", badge: "#ef4444" },
    light: { text: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", badge: "#dc2626" },
  },
  VERY_LOW: {
    label: "Very Low Confidence",
    dark: { text: "#f43f5e", bg: "#4c0519", border: "#9f1239", badge: "#e11d48" },
    light: { text: "#be123c", bg: "#fff1f2", border: "#fda4af", badge: "#e11d48" },
  },
} as const;

// ── Priority Scale ──
// PRIORITY represents OPERATIONAL URGENCY & LIFELINE CONSEQUENCE (HAZARD ≠ PRIORITY)
export const priorityTokens = {
  "CRITICAL (P1)": {
    label: "Priority 1 (Critical Lifeline)",
    code: "P1",
    dark: { text: "#ef4444", bg: "#450a0a", border: "#ef4444", badge: "#dc2626" },
    light: { text: "#991b1b", bg: "#fee2e2", border: "#f87171", badge: "#b91c1c" },
  },
  "HIGH (P2)": {
    label: "Priority 2 (Major Corridor)",
    code: "P2",
    dark: { text: "#fb923c", bg: "#431407", border: "#f97316", badge: "#ea580c" },
    light: { text: "#9a3412", bg: "#ffedd5", border: "#fb923c", badge: "#c2410c" },
  },
  "MODERATE (P3)": {
    label: "Priority 3 (Secondary Route)",
    code: "P3",
    dark: { text: "#fde047", bg: "#422006", border: "#eab308", badge: "#ca8a04" },
    light: { text: "#854d0e", bg: "#fef9c3", border: "#facc15", badge: "#a16207" },
  },
  "LOW (P4)": {
    label: "Priority 4 (Uninhabited / Isolated)",
    code: "P4",
    dark: { text: "#4ade80", bg: "#052e16", border: "#22c55e", badge: "#16a34a" },
    light: { text: "#166534", bg: "#dcfce7", border: "#4ade80", badge: "#15803d" },
  },
} as const;

// ── Lifecycle Status Tokens ──
export const lifecycleTokens = {
  DETECTED: { label: "Detected", color: "#f97316" },
  ASSESSING: { label: "Assessing", color: "#fbbf24" },
  VERIFYING: { label: "Verifying", color: "#a78bfa" },
  VERIFIED: { label: "Verified", color: "#38bdf8" },
  DECISION_REQUIRED: { label: "Decision Required", color: "#ef4444" },
  AUTHORIZED: { label: "Authorized", color: "#10b981" },
  RESPONDING: { label: "Responding", color: "#14b8a6" },
  MONITORING: { label: "Monitoring", color: "#06b6d4" },
  RESOLVED: { label: "Resolved", color: "#22c55e" },
  REVIEWED: { label: "Reviewed", color: "#94a3b8" },
} as const;

// ── Legacy Token Exports (for backwards compatibility) ──
export const brand = {
  primary: "#10B981",
  primaryDark: "#059669",
  primaryLight: "#34D399",
  surface: "#0A0A0A",
  surfaceRaised: "#171717",
  surfaceOverlay: "#262626",
  border: "#404040",
  borderSubtle: "#262626",
  textPrimary: "#F5F5F5",
  textSecondary: "#A3A3A3",
  textMuted: "#737373",
} as const;

export const risk = {
  critical: "#EF4444",
  high: "#F97316",
  moderate: "#EAB308",
  low: "#22C55E",
  negligible: "#6B7280",
  unknown: "#9CA3AF",
} as const;

export const confidence = {
  veryHigh: "#3B82F6",
  high: "#60A5FA",
  moderate: "#FBBF24",
  low: "#F97316",
  veryLow: "#EF4444",
  unassessed: "#6B7280",
} as const;

export const status = {
  detected: "#F97316",
  assessing: "#FBBF24",
  verifying: "#A78BFA",
  verified: "#3B82F6",
  decisionRequired: "#EF4444",
  authorized: "#10B981",
  responding: "#14B8A6",
  monitoring: "#06B6D4",
  resolved: "#22C55E",
  reviewed: "#6B7280",
} as const;

