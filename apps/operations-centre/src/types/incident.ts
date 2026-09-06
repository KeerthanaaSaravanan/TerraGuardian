/**
 * TypeScript domain types mirroring the backend Pydantic models.
 *
 * These types define the contract between frontend and backend.
 * They must stay synchronized with services/api/app/domain/.
 */

// ── Incident Status ──

export const INCIDENT_STATUSES = [
  "DETECTED",
  "ASSESSING",
  "VERIFYING",
  "VERIFIED",
  "DECISION_REQUIRED",
  "AUTHORIZED",
  "RESPONDING",
  "MONITORING",
  "RESOLVED",
  "REVIEWED",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

// Valid transitions (mirrors backend VALID_TRANSITIONS)
export const VALID_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  DETECTED: ["ASSESSING"],
  ASSESSING: ["VERIFYING"],
  VERIFYING: ["VERIFIED"],
  VERIFIED: ["DECISION_REQUIRED"],
  DECISION_REQUIRED: ["AUTHORIZED"],
  AUTHORIZED: ["RESPONDING"],
  RESPONDING: ["MONITORING"],
  MONITORING: ["RESOLVED"],
  RESOLVED: ["REVIEWED"],
  REVIEWED: [],
};

// ── Incident Twin ──

export interface IncidentTwin {
  id: string; // UUID
  title: string;
  description?: string;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  locationName?: string;
  incidentType: string;
  detectedAt: string; // ISO 8601
  updatedAt: string;
}

// ── Risk (RISK ≠ CONFIDENCE) ──

export const RISK_LEVELS = ["CRITICAL", "HIGH", "MODERATE", "LOW", "NEGLIGIBLE", "UNKNOWN"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface RiskAssessment {
  id: string;
  incidentId: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  riskFactors: string[];
  assessedAt: string;
  assessedBy: string;
  methodology?: string;
}

// ── Confidence ──

export const CONFIDENCE_LEVELS = ["VERY_HIGH", "HIGH", "MODERATE", "LOW", "VERY_LOW", "UNASSESSED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface ConfidenceAssessment {
  id: string;
  incidentId: string;
  confidenceLevel: ConfidenceLevel;
  confidenceScore?: number;
  evidenceCount: number;
  agreeingSources: number;
  conflictingSources: number;
  missingSourceTypes: string[];
  oldestEvidenceAgeSeconds?: number;
  assessedAt: string;
  rationale?: string;
}

// ── Evidence ──

export const EVIDENCE_SOURCES = [
  "AUTHORITATIVE", "WEATHER", "SATELLITE", "TERRAIN",
  "SENSOR", "CITIZEN", "FIELD", "HISTORICAL", "MODEL",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export interface Evidence {
  id: string;
  incidentId?: string;
  source: EvidenceSource;
  sourceName: string;
  evidenceType: string;
  observedAt: string;
  receivedAt: string;
  latitude?: number;
  longitude?: number;
  provenance?: string;
  originalReference?: string;
  freshnessSeconds?: number;
  confidenceContribution?: number;
  processingStatus: string;
  summary?: string;
}
