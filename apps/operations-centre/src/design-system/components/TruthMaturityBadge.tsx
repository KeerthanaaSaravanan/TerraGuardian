import React from "react";
import { dataTruthTokens, maturityTokens, DataTruthClass } from "../tokens";

interface TruthBadgeProps {
  truthClass: DataTruthClass | string;
  size?: "xs" | "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export const TruthBadge: React.FC<TruthBadgeProps> = ({
  truthClass,
  size = "xs",
  showDot = true,
  className = "",
}) => {
  const token = dataTruthTokens[truthClass as DataTruthClass] || dataTruthTokens.NO_LIVE_FEED;
  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  }[size];

  return (
    <span
      title={token.description}
      className={`inline-flex items-center gap-1.5 rounded font-mono font-bold border transition-colors ${token.badge} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${token.dot}`} />}
      <span>{token.label}</span>
    </span>
  );
};

interface MaturityBadgeProps {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  size?: "xs" | "sm";
  className?: string;
}

export const MaturityBadge: React.FC<MaturityBadgeProps> = ({
  level,
  size = "xs",
  className = "",
}) => {
  const key = `LEVEL_${level}` as keyof typeof maturityTokens;
  const token = maturityTokens[key] || maturityTokens.LEVEL_0;

  const colorClasses =
    level >= 5
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400"
      : level >= 3
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-400"
      : level >= 1
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-400"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400";

  return (
    <span
      title={`Scientific Maturity Level ${level}: ${token.description}`}
      className={`inline-flex items-center gap-1 rounded font-mono font-bold border ${colorClasses} ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      } ${className}`}
    >
      <span className="font-extrabold">{token.code}</span>
      <span className="opacity-80">({token.label})</span>
    </span>
  );
};
