/**
 * TypeScript domain types mirroring the backend Pydantic models.
 * Lean subset for the citizen app.
 */

export const INCIDENT_STATUSES = [
  "DETECTED", "ASSESSING", "VERIFYING", "VERIFIED",
  "DECISION_REQUIRED", "AUTHORIZED", "RESPONDING",
  "MONITORING", "RESOLVED", "REVIEWED",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const RISK_LEVELS = ["CRITICAL", "HIGH", "MODERATE", "LOW", "NEGLIGIBLE", "UNKNOWN"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["VERY_HIGH", "HIGH", "MODERATE", "LOW", "VERY_LOW", "UNASSESSED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface IncidentSummary {
  id: string;
  title: string;
  status: IncidentStatus;
  riskLevel: RiskLevel;
  latitude: number;
  longitude: number;
  locationName?: string;
  updatedAt: string;
}

export interface CitizenReport {
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  imageFile?: File;
  observedAt: string;
}
