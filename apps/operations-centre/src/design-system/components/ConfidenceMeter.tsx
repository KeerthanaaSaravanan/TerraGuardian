import type { FC } from "react";
import { confidence } from "../tokens";

type ConfidenceLevelKey = keyof typeof confidence;

interface ConfidenceMeterProps {
  /** The confidence level to display. */
  level: ConfidenceLevelKey;
  /** Show the label text. Defaults to true. */
  showLabel?: boolean;
}

const confidenceLabels: Record<ConfidenceLevelKey, string> = {
  veryHigh: "Very High",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  veryLow: "Very Low",
  unassessed: "Unassessed",
};

/**
 * Visual indicator for confidence level.
 *
 * CONFIDENCE represents evidence quality, agreement, and freshness.
 * It is independent of RISK. Never conflate the two.
 */
export const ConfidenceMeter: FC<ConfidenceMeterProps> = ({ level, showLabel = true }) => {
  const colour = confidence[level];
  const label = confidenceLabels[level];

  // Confidence displayed as segmented dots
  const segments = 5;
  const filled =
    level === "veryHigh" ? 5
    : level === "high" ? 4
    : level === "moderate" ? 3
    : level === "low" ? 2
    : level === "veryLow" ? 1
    : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" role="meter" aria-label={`Confidence: ${label}`} aria-valuenow={filled} aria-valuemin={0} aria-valuemax={segments}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: i < filled ? colour : `${colour}25`,
            }}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: colour }}>
          {label}
        </span>
      )}
    </div>
  );
};
