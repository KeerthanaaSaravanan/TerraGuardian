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

// ── Data Truth Model Tokens (Phase 0 North Star Section 0.18) ──
export const dataTruthTokens = {
  LIVE: {
    label: "LIVE FEED",
    description: "Real-time streaming telemetry from active sensors or web services",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400",
    dot: "bg-emerald-500 animate-pulse",
  },
  REAL_HISTORICAL: {
    label: "REAL HISTORICAL",
    description: "Authentic historical survey/satellite observations (e.g. GSI, ERA5, Copernicus DEM)",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-400",
    dot: "bg-blue-500",
  },
  REPLAY: {
    label: "HISTORICAL REPLAY",
    description: "Time-series replay of authenticated historical storm/landslide sequence",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-400",
    dot: "bg-indigo-500",
  },
  SYNTHETIC: {
    label: "SYNTHETIC FIXTURE",
    description: "Engineered synthetic benchmark dataset for offline stress testing",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-400",
    dot: "bg-purple-500",
  },
  CONTROLLED_DEMO: {
    label: "CONTROLLED DEMO",
    description: "Calibrated corridor test scenario (West Kameng NH-13 BCT baseline)",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-400",
    dot: "bg-amber-500",
  },
  EXPERIMENTAL: {
    label: "EXPERIMENTAL",
    description: "Unvalidated research prototype model (explicit scientific limitation)",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-400",
    dot: "bg-orange-500",
  },
  NO_LIVE_FEED: {
    label: "NO LIVE FEED",
    description: "Authoritative external source is not currently streaming real-time data",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400",
    dot: "bg-slate-400",
  },
} as const;

export type DataTruthClass = keyof typeof dataTruthTokens;

// ── Scientific Maturity Levels (Phase 0 North Star Section 0.19) ──
export const maturityTokens = {
  LEVEL_0: { level: 0, code: "L0", label: "Concept", description: "Theoretical framing or unvalidated formula" },
  LEVEL_1: { level: 1, code: "L1", label: "Implemented", description: "Code written and runnable in environment" },
  LEVEL_2: { level: 2, code: "L2", label: "Unit Tested", description: "Algorithmic correctness verified via automated unit tests" },
  LEVEL_3: { level: 3, code: "L3", label: "Integration Tested", description: "Connected to end-to-end incident & GIS pipeline" },
  LEVEL_4: { level: 4, code: "L4", label: "Controlled Demonstration", description: "Validated on demonstration scenarios" },
  LEVEL_5: { level: 5, code: "L5", label: "Real Historical Validation", description: "Validated on historical event records" },
  LEVEL_6: { level: 6, code: "L6", label: "Prospective / Operational Validation", description: "Evaluated in active field operations against ground-truth monitoring" },
} as const;

// ── Operational States (Phase 0 North Star Section 0.6) ──
export const operationalStateTokens = {
  UNVERIFIED: { label: "Unverified", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300" },
  VERIFIED: { label: "Verified", badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300" },
  CONFLICTED: { label: "Conflicted", badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300" },
  STALE: { label: "Stale", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300" },
  MISSING: { label: "Missing", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300" },
  PENDING: { label: "Pending", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-300" },
  AUTHORIZATION_REQUIRED: { label: "Authorization Required", badge: "bg-red-600 text-white border-red-700 font-bold" },
  COMPLETED: { label: "Completed", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300" },
  PHYSICALLY_CONFIRMED: { label: "Physically Confirmed", badge: "bg-emerald-600 text-white border-emerald-700 font-bold" },
} as const;

// ── Alert Lifecycle Stages (Phase 0 North Star Section 0.17 & Phase 4 Section 13) ──
// Semantic Invariant: Generated ≠ Authorized ≠ Sent ≠ Delivered ≠ Acknowledged
export const alertLifecycleTokens = {
  ALERT_GENERATED: { label: "Alert Generated", code: "GEN", description: "Algorithmically identified & drafted by hazard engine" },
  ALERT_AUTHORIZED: { label: "Alert Authorized", code: "AUTH", description: "Statutorily signed by District Magistrate / DDMA" },
  ALERT_SENT: { label: "Alert Sent", code: "SENT", description: "Dispatched over transmission gateway / VHF" },
  ALERT_DELIVERED: { label: "Alert Delivered", code: "DELV", description: "Received at field terminal or subscriber device" },
  ALERT_ACKNOWLEDGED: { label: "Alert Acknowledged", code: "ACK", description: "Explicit human/operator confirmation received" },
  // Direct enum compatibility
  GENERATED: { label: "Alert Generated", code: "GEN", description: "Algorithmically identified & drafted by hazard engine" },
  AUTHORIZED: { label: "Alert Authorized", code: "AUTH", description: "Statutorily signed by District Magistrate / DDMA" },
  SENT: { label: "Alert Sent", code: "SENT", description: "Dispatched over transmission gateway / VHF" },
  DELIVERED: { label: "Alert Delivered", code: "DELV", description: "Received at field terminal or subscriber device" },
  ACKNOWLEDGED: { label: "Alert Acknowledged", code: "ACK", description: "Explicit human/operator confirmation received" },
} as const;


