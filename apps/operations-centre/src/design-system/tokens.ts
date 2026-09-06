/**
 * TerraGuardian Design System — Foundational Tokens
 *
 * These tokens define the visual language shared across
 * Operations Centre and TerraGuardian Safe.
 *
 * Derived from the product brand identity:
 * - Government-grade, professional, map-first
 * - Information-dense, high-contrast dark theme for operations
 * - Semantic risk, confidence, and status colours
 */

// ── Brand ──

export const brand = {
  primary: "#10B981",     // Emerald-500 — primary brand accent
  primaryDark: "#059669", // Emerald-600
  primaryLight: "#34D399",// Emerald-400
  surface: "#0A0A0A",     // Near-black background
  surfaceRaised: "#171717", // Neutral-900 — cards, sidebar
  surfaceOverlay: "#262626", // Neutral-800 — elevated panels
  border: "#404040",      // Neutral-700 — subtle borders
  borderSubtle: "#262626",// Neutral-800 — very subtle borders
  textPrimary: "#F5F5F5", // Neutral-100
  textSecondary: "#A3A3A3", // Neutral-400
  textMuted: "#737373",   // Neutral-500
} as const;

// ── Semantic Risk Colours ──
// RISK ≠ CONFIDENCE — these colours represent RISK LEVEL only.

export const risk = {
  critical: "#EF4444",    // Red-500
  high: "#F97316",        // Orange-500
  moderate: "#EAB308",    // Yellow-500
  low: "#22C55E",         // Green-500
  negligible: "#6B7280", // Gray-500
  unknown: "#9CA3AF",     // Gray-400
} as const;

// ── Confidence Colours ──
// Confidence represents evidence quality, NOT risk.

export const confidence = {
  veryHigh: "#3B82F6",   // Blue-500
  high: "#60A5FA",       // Blue-400
  moderate: "#FBBF24",   // Amber-400
  low: "#F97316",        // Orange-500
  veryLow: "#EF4444",    // Red-500
  unassessed: "#6B7280", // Gray-500
} as const;

// ── Incident Status Colours ──

export const status = {
  detected: "#F97316",         // Orange
  assessing: "#FBBF24",        // Amber
  verifying: "#A78BFA",        // Violet
  verified: "#3B82F6",         // Blue
  decisionRequired: "#EF4444", // Red — attention needed
  authorized: "#10B981",       // Emerald
  responding: "#14B8A6",       // Teal
  monitoring: "#06B6D4",       // Cyan
  resolved: "#22C55E",         // Green
  reviewed: "#6B7280",         // Gray
} as const;

// ── Typography Scale ──

export const typography = {
  fontFamily: {
    sans: '"Inter", "system-ui", "-apple-system", "sans-serif"',
    mono: '"JetBrains Mono", "Fira Code", "monospace"',
  },
  fontSize: {
    xs: "0.75rem",    // 12px — labels, metadata
    sm: "0.875rem",   // 14px — secondary text
    base: "1rem",     // 16px — body text
    lg: "1.125rem",   // 18px — section headers
    xl: "1.25rem",    // 20px — page headers
    "2xl": "1.5rem",  // 24px — major headings
    "3xl": "1.875rem",// 30px — hero/display
  },
} as const;

// ── Spacing Scale (px) ──

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
} as const;

// ── Elevation (box-shadow) ──

export const elevation = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.4)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.6)",
} as const;

// ── Z-Index Scale ──

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
} as const;
