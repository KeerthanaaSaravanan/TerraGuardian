import type { FC } from "react";
import { status } from "../tokens";

type IncidentStatusKey = keyof typeof status;

interface StatusBadgeProps {
  /** The incident status to display. */
  statusKey: IncidentStatusKey;
  /** Human-readable label. If omitted, derived from statusKey. */
  label?: string;
}

const formatLabel = (key: string): string =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();

/**
 * Displays an incident status as a coloured badge.
 */
export const StatusBadge: FC<StatusBadgeProps> = ({ statusKey, label }) => {
  const colour = status[statusKey];
  const displayLabel = label ?? formatLabel(String(statusKey));


  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${colour}20`, color: colour, border: `1px solid ${colour}40` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: colour }}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
};
