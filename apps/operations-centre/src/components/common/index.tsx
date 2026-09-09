import React, { type ReactNode } from "react";
import { useTheme } from "../../context/ThemeContext";
import { riskTokens, confidenceTokens, priorityTokens, lifecycleTokens } from "../../design-system/tokens";
import { IconCheckCircle2, IconAlertTriangle, IconShieldCheck, IconClock, IconActivity } from "../icons";

// ── StatusBadge Component ──
interface StatusBadgeProps {
  status: keyof typeof lifecycleTokens | string;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md", showDot = true }) => {
  const meta = (lifecycleTokens as Record<string, { label: string; color: string }>)[status] || {
    label: status,
    color: "#64748b",
  };

  const sizeClasses =
    size === "sm" ? "text-[10px] px-2 py-0.5" : size === "lg" ? "text-xs px-3 py-1 font-bold" : "text-xs px-2.5 py-0.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono tracking-wider uppercase border ${sizeClasses}`}
      style={{
        backgroundColor: `${meta.color}15`,
        borderColor: `${meta.color}40`,
        color: meta.color,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: meta.color }}
          aria-hidden="true"
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
};

// ── RiskIndicator Component (RISK ≠ CONFIDENCE) ──
interface RiskIndicatorProps {
  level: keyof typeof riskTokens | "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  score?: number;
  showExplanation?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  score,
  showExplanation = false,
  size = "md",
}) => {
  const { theme } = useTheme();
  const token = riskTokens[level as keyof typeof riskTokens] || riskTokens.HIGH;
  const current = theme === "dark" ? token.dark : token.light;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-bold uppercase border ${
            size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
          }`}
          style={{
            backgroundColor: current.bg,
            borderColor: current.border,
            color: current.text,
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current.badge }} />
          <span>{level} RISK</span>
          {score !== undefined && <span className="opacity-80">({score}/100)</span>}
        </span>
      </div>
      {showExplanation && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
          Physical Hazard Magnitude (Slope pore pressure × cumulative rainfall)
        </span>
      )}
    </div>
  );
};

// ── ConfidenceMeter Component (RISK ≠ CONFIDENCE) ──
interface ConfidenceMeterProps {
  level: keyof typeof confidenceTokens | "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";
  score?: number;
  showSegments?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  level,
  score,
  showSegments = true,
  size = "md",
}) => {
  const { theme } = useTheme();
  const token = confidenceTokens[level as keyof typeof confidenceTokens] || confidenceTokens.MODERATE;
  const current = theme === "dark" ? token.dark : token.light;

  const segmentsTotal = 5;
  const filled =
    level === "VERY_HIGH" ? 5 : level === "HIGH" ? 4 : level === "MODERATE" ? 3 : level === "LOW" ? 2 : 1;

  return (
    <div className="flex items-center gap-2">
      {showSegments && (
        <div className="flex gap-1 items-center" aria-label={`Confidence: ${level}`}>
          {Array.from({ length: segmentsTotal }, (_, i) => (
            <div
              key={i}
              className={`rounded-sm transition-all ${
                size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"
              }`}
              style={{
                backgroundColor: i < filled ? current.badge : theme === "dark" ? "#334155" : "#cbd5e1",
              }}
            />
          ))}
        </div>
      )}

      <span
        className={`inline-flex items-center gap-1 rounded-md font-mono font-bold uppercase border ${
          size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
        }`}
        style={{
          backgroundColor: current.bg,
          borderColor: current.border,
          color: current.text,
        }}
      >
        <span>{level} CONFIDENCE</span>
        {score !== undefined && <span className="opacity-80">({score}%)</span>}
      </span>
    </div>
  );
};

// ── PriorityIndicator Component (HAZARD ≠ PRIORITY) ──
interface PriorityIndicatorProps {
  level: keyof typeof priorityTokens | string;
  size?: "sm" | "md" | "lg";
}

export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({ level, size = "md" }) => {
  const { theme } = useTheme();
  const token = (priorityTokens as unknown as Record<string, { code: string; label: string; dark: { text: string; bg: string; border: string; badge: string }; light: { text: string; bg: string; border: string; badge: string } }>)[level] || priorityTokens["CRITICAL (P1)"];
  const current = theme === "dark" ? token.dark : token.light;


  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono font-black uppercase border ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
      }`}
      style={{
        backgroundColor: current.bg,
        borderColor: current.border,
        color: current.text,
      }}
    >
      <span className="bg-white/20 px-1 rounded text-[10px]">{token.code}</span>
      <span>{level}</span>
    </span>
  );
};

// ── OperationalCard Component ──
interface OperationalCardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerRight?: ReactNode;
  accentBorder?: "default" | "red" | "amber" | "emerald" | "cyan";
}

export const OperationalCard: React.FC<OperationalCardProps> = ({
  children,
  className = "",
  header,
  headerRight,
  accentBorder = "default",
}) => {
  const borderClass =
    accentBorder === "red"
      ? "border-red-500/80 dark:border-red-500/80"
      : accentBorder === "amber"
      ? "border-amber-500/80 dark:border-amber-500/80"
      : accentBorder === "emerald"
      ? "border-emerald-500/80 dark:border-emerald-500/80"
      : accentBorder === "cyan"
      ? "border-cyan-500/80 dark:border-cyan-500/80"
      : "border-slate-300 dark:border-slate-800";

  return (
    <div
      className={`bg-white dark:bg-slate-900 border ${borderClass} rounded-xl shadow-sm dark:shadow-md transition-all flex flex-col ${className}`}
    >
      {(header || headerRight) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 rounded-t-xl">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
            {header}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">{children}</div>
    </div>
  );
};

// ── PrincipleBanner Component (Visualizing Core Rules) ──
interface PrincipleBannerProps {
  principle:
    | "RISK ≠ CONFIDENCE"
    | "HIGHEST HAZARD ≠ HIGHEST PRIORITY"
    | "AI RECOMMENDS → HUMAN AUTHORIZES"
    | "APPROVED ACTION ≠ COMPLETED ACTION"
    | "ACTION CONFIRMED ≠ HAZARD RESOLVED";
  title: string;
  explanation: string;
  variant?: "amber" | "red" | "emerald" | "cyan";
}

export const PrincipleBanner: React.FC<PrincipleBannerProps> = ({
  principle,
  title,
  explanation,
  variant = "amber",
}) => {
  const { theme } = useTheme();

  const styles = {
    amber: {
      darkBg: "from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/70 text-amber-300",
      lightBg: "from-amber-50 via-white to-white border-amber-300 text-amber-900",
      badgeDark: "bg-amber-400 text-slate-950",
      badgeLight: "bg-amber-500 text-white",
      icon: <IconAlertTriangle className="w-5 h-5 text-amber-500" />,
    },
    red: {
      darkBg: "from-red-950/70 via-slate-900 to-slate-900 border-red-500/70 text-red-300",
      lightBg: "from-red-50 via-white to-white border-red-300 text-red-900",
      badgeDark: "bg-red-500 text-white",
      badgeLight: "bg-red-600 text-white",
      icon: <IconAlertTriangle className="w-5 h-5 text-red-500" />,
    },
    emerald: {
      darkBg: "from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/70 text-emerald-300",
      lightBg: "from-emerald-50 via-white to-white border-emerald-300 text-emerald-900",
      badgeDark: "bg-emerald-500 text-slate-950",
      badgeLight: "bg-emerald-600 text-white",
      icon: <IconShieldCheck className="w-5 h-5 text-emerald-500" />,
    },
    cyan: {
      darkBg: "from-cyan-950/70 via-slate-900 to-slate-900 border-cyan-500/70 text-cyan-300",
      lightBg: "from-cyan-50 via-white to-white border-cyan-300 text-cyan-900",
      badgeDark: "bg-cyan-400 text-slate-950",
      badgeLight: "bg-cyan-600 text-white",
      icon: <IconActivity className="w-5 h-5 text-cyan-500" />,
    },
  }[variant];

  return (
    <div
      className={`bg-gradient-to-r border-2 rounded-xl p-4 shadow-md flex items-start gap-4 ${
        theme === "dark" ? styles.darkBg : styles.lightBg
      }`}
    >
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
        {styles.icon}
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
          <span className="text-slate-600 dark:text-slate-400">OPERATIONAL CONSTITUTION:</span>
          <span
            className={`px-2 py-0.5 rounded font-black text-[11px] ${
              theme === "dark" ? styles.badgeDark : styles.badgeLight
            }`}
          >
            {principle}
          </span>
        </div>
        <div className="text-sm font-bold text-slate-900 dark:text-white font-sans">{title}</div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
          {explanation}
        </p>
      </div>
    </div>
  );
};

// ── ThemeToggle Component ──
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-mono"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <>
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="hidden sm:inline">LIGHT</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span className="hidden sm:inline">DARK</span>
        </>
      )}
    </button>
  );
};
