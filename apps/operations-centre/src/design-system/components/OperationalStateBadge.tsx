import React from "react";
import { operationalStateTokens, alertLifecycleTokens } from "../tokens";

interface OperationalStateBadgeProps {
  state: string;
  size?: "xs" | "sm";
  className?: string;
}

export const OperationalStateBadge: React.FC<OperationalStateBadgeProps> = ({
  state,
  size = "xs",
  className = "",
}) => {
  const normState = state?.toUpperCase().replace(/\s+/g, "_") || "PENDING";
  const token = (operationalStateTokens as Record<string, { label: string; badge: string }>)[normState] || {
    label: state,
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-semibold border ${token.badge} ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      } ${className}`}
    >
      {token.label}
    </span>
  );
};

interface AlertLifecycleBadgeProps {
  stage: "ALERT_GENERATED" | "ALERT_AUTHORIZED" | "ALERT_SENT" | "ALERT_DELIVERED" | "ALERT_ACKNOWLEDGED" | string;
  size?: "xs" | "sm";
  className?: string;
}

export const AlertLifecycleBadge: React.FC<AlertLifecycleBadgeProps> = ({
  stage,
  size = "xs",
  className = "",
}) => {
  const normStage = stage?.toUpperCase() || "ALERT_GENERATED";
  const token = alertLifecycleTokens[normStage as keyof typeof alertLifecycleTokens] || {
    label: stage,
    code: stage.slice(0, 4),
    description: "",
  };

  const colorClasses =
    normStage === "ALERT_ACKNOWLEDGED" || normStage === "ACKNOWLEDGED"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400"
      : normStage === "ALERT_DELIVERED" || normStage === "DELIVERED"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-400"
      : normStage === "ALERT_SENT" || normStage === "SENT"
      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-400"
      : normStage === "ALERT_AUTHORIZED" || normStage === "AUTHORIZED"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-400"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400";

  return (
    <span
      title={token.description}
      className={`inline-flex items-center gap-1 rounded font-mono font-bold border ${colorClasses} ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      } ${className}`}
    >
      <span className="font-extrabold">{token.code}</span>
      <span className="opacity-90">• {token.label}</span>
    </span>
  );
};
