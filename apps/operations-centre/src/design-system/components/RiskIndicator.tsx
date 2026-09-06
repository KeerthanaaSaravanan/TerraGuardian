import type { FC } from "react";
import { risk } from "../tokens";

type RiskLevelKey = keyof typeof risk;

interface RiskIndicatorProps {
  /** The risk level to display. */
  level: RiskLevelKey;
  /** Show the label text. Defaults to true. */
  showLabel?: boolean;
}

const riskLabels: Record<RiskLevelKey, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  negligible: "Negligible",
  unknown: "Unknown",
};

/**
 * Visual indicator for risk level.
 * Displays a coloured bar with an optional text label.
 *
 * RISK ≠ CONFIDENCE — this component shows RISK only.
 */
export const RiskIndicator: FC<RiskIndicatorProps> = ({ level, showLabel = true }) => {
  const colour = risk[level];
  const label = riskLabels[level];

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 w-16 rounded-full"
        style={{ backgroundColor: `${colour}30` }}
        role="meter"
        aria-label={`Risk level: ${label}`}
        aria-valuenow={level === "critical" ? 100 : level === "high" ? 80 : level === "moderate" ? 50 : level === "low" ? 20 : 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: colour,
            width:
              level === "critical" ? "100%"
              : level === "high" ? "80%"
              : level === "moderate" ? "50%"
              : level === "low" ? "25%"
              : level === "negligible" ? "10%"
              : "0%",
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: colour }}>
          {label}
        </span>
      )}
    </div>
  );
};
