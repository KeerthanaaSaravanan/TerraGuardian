/**
 * Authoritative Backend API Client for TerraGuardian Operations Centre.
 *
 * Implements typed HTTP communication to FastAPI domain endpoints.
 * Pattern: UI -> API Client -> FastAPI Backend -> Domain Service -> Database & Audit -> UI Projection.
 */

import {
  ActionConfirmation,
  ActionState,
  ActorRole,
  AuditEvent,
  EvidenceConflictStatus,
  EvidenceInterpretation,
  EvidenceItem,
  EvidenceProcessingStatus,
  EvidenceSource,
  IncidentStatus,
  IncidentTwin,
  OperationalAction,
  PredictiveRiskAssessment,
  ReconciliationSummary,
} from "../types/incident";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export interface TransitionRequestPayload {
  target_status: IncidentStatus;
  actor_role: ActorRole;
  actor_name: string;
  reason?: string;
  authority_order_code?: string;
  context_payload?: Record<string, unknown>;
}

export interface ActionTransitionPayload {
  target_state: ActionState;
  actor_role: ActorRole;
  actor_name: string;
  reason?: string;
}

export interface ActionConfirmationPayload {
  confirming_officer: string;
  confirming_agency: string;
  location_confirmed: string;
  confirmation_notes: string;
  communication_channel?: string;
  evidence_photo_url?: string;
  is_simulated?: boolean;
}

export interface EvidenceCreatePayload {
  source: EvidenceSource | string;
  source_name: string;
  evidence_type: string;
  observation: string;
  metric: string;
  reliability?: string;
  latitude?: number;
  longitude?: number;
  provenance?: string;
  original_reference?: string;
  is_simulated?: boolean;
  freshness_seconds?: number;
  confidence_contribution?: number;
  processing_status?: EvidenceProcessingStatus | string;
  interpretation?: EvidenceInterpretation | string;
  conflict_status?: EvidenceConflictStatus | string;
  conflict_details?: string;
  details?: string;
  raw_data?: Record<string, unknown>;
}

export interface EvidenceUpdatePayload {
  actor_role: ActorRole;
  actor_name: string;
  processing_status?: EvidenceProcessingStatus | string;
  interpretation?: EvidenceInterpretation | string;
  conflict_status?: EvidenceConflictStatus | string;
  conflict_details?: string;
  reason?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API Error [${status}]: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // JSON parse error, use default statusText
    }
    throw new ApiError(res.status, errorDetail);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  /** Health check */
  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    const res = await fetch("/health");
    return handleResponse(res);
  },

  /** Seed or reset deterministic incident TG-2048 */
  async seedTG2048(forceReset = false): Promise<IncidentTwin> {
    const res = await fetch(`${API_BASE_URL}/incidents/seed/tg-2048?force_reset=${forceReset}`, {
      method: "POST",
    });
    return handleResponse<IncidentTwin>(res);
  },

  /** Fetch incident twin by operational code (e.g. TG-2048) */
  async getIncidentByCode(code: string): Promise<IncidentTwin> {
    const res = await fetch(`${API_BASE_URL}/incidents/code/${encodeURIComponent(code)}`);
    return handleResponse<IncidentTwin>(res);
  },

  /** Fetch incident twin by UUID */
  async getIncidentById(id: string): Promise<IncidentTwin> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}`);
    return handleResponse<IncidentTwin>(res);
  },

  /** Fetch reconciled multi-source evidence */
  async getIncidentEvidence(id: string): Promise<EvidenceItem[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/evidence`);
    return handleResponse<EvidenceItem[]>(res);
  },

  /** Submit a discrete piece of evidence to an incident */
  async createIncidentEvidence(id: string, payload: EvidenceCreatePayload): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<EvidenceItem>(res);
  },

  /** Fetch latest deterministic cross-source reconciliation summary */
  async getIncidentReconciliation(id: string): Promise<ReconciliationSummary> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/reconciliation`);
    return handleResponse<ReconciliationSummary>(res);
  },

  /** Execute deterministic cross-source reconciliation and audit evaluation */
  async reconcileIncidentEvidence(
    id: string,
    actorRole: ActorRole = "OPERATOR",
    actorName = "Control Room Operator"
  ): Promise<ReconciliationSummary> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_role: actorRole, actor_name: actorName }),
    });
    return handleResponse<ReconciliationSummary>(res);
  },

  /** Update evidence status (e.g. verification by human field verifier) */
  async updateEvidence(evidenceId: string, payload: EvidenceUpdatePayload): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE_URL}/evidence/${evidenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<EvidenceItem>(res);
  },

  /** Fetch operational actions / tasks */
  async getIncidentActions(id: string): Promise<OperationalAction[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/actions`);
    return handleResponse<OperationalAction[]>(res);
  },

  /** Fetch chronological audit event timeline */
  async getIncidentTimeline(id: string): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/timeline`);
    return handleResponse<AuditEvent[]>(res);
  },

  /** Execute and audit an authoritative lifecycle state transition */
  async transitionIncidentState(id: string, payload: TransitionRequestPayload): Promise<IncidentTwin> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<IncidentTwin>(res);
  },

  /** Execute and audit an operational action state transition */
  async transitionActionState(actionId: string, payload: ActionTransitionPayload): Promise<OperationalAction> {
    const res = await fetch(`${API_BASE_URL}/actions/${actionId}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<OperationalAction>(res);
  },

  /** Record accepted confirmation evidence and advance task to PHYSICALLY_CONFIRMED */
  async confirmAction(actionId: string, payload: ActionConfirmationPayload): Promise<ActionConfirmation> {
    const res = await fetch(`${API_BASE_URL}/actions/${actionId}/confirmations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<ActionConfirmation>(res);
  },

  /** Execute backend predictive intelligence inference */
  async predictIncidentRisk(id: string): Promise<PredictiveRiskAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/predict`, {
      method: "POST",
    });
    return handleResponse<PredictiveRiskAssessment>(res);
  },

  /** Get latest predictive risk & confidence assessment */
  async getIncidentPrediction(id: string): Promise<PredictiveRiskAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/prediction`);
    return handleResponse<PredictiveRiskAssessment>(res);
  },

  /** Get active predictive model metadata and benchmark metrics */
  async getModelMetadata(): Promise<{ active_model: Record<string, unknown>; benchmark_validation: Record<string, unknown> }> {
    const res = await fetch(`${API_BASE_URL}/models/metadata`);
    return handleResponse<{ active_model: Record<string, unknown>; benchmark_validation: Record<string, unknown> }>(res);
  },

  // ── Prompt 06: Hazard Evolution & Bounded Reassessment ──

  /** Retrieve the living hazard hypothesis and expected envelope for an incident */
  async getHazardHypothesis(id: string): Promise<import("../types/incident").HazardHypothesis> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/hypothesis`);
    return handleResponse<import("../types/incident").HazardHypothesis>(res);
  },

  /** Retrieve detected divergences between expected hypothesis and observed reality */
  async getHazardDivergences(id: string): Promise<import("../types/incident").DivergenceRecord[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/divergences`);
    return handleResponse<import("../types/incident").DivergenceRecord[]>(res);
  },

  /** Execute a deterministic bounded hazard reassessment */
  async reassessHazard(
    id: string,
    payload: import("../types/incident").BoundedReassessmentPayload
  ): Promise<import("../types/incident").BoundedReassessmentResult> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/reassess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<import("../types/incident").BoundedReassessmentResult>(res);
  },

  /** Execute a validated physical hazard state transition */
  async transitionHazardState(
    id: string,
    payload: import("../types/incident").HazardStateTransitionPayload
  ): Promise<IncidentTwin> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/hazard-transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<IncidentTwin>(res);
  },

  /** Retrieve full hazard evolution history and lineage continuity tree */
  async getHazardLineage(id: string): Promise<import("../types/incident").HazardLineageSummary> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/lineage`);
    return handleResponse<import("../types/incident").HazardLineageSummary>(res);
  },

  // ── PROMPT 07: Impact Intelligence & Operational Priority ──

  /** Retrieve the downstream consequence, infrastructure, and population exposure assessment */
  async getIncidentImpact(id: string): Promise<import("../types/incident").ImpactAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/impact`);
    return handleResponse<import("../types/incident").ImpactAssessment>(res);
  },

  /** Recalculate downstream impact vectors */
  async recalculateIncidentImpact(id: string): Promise<import("../types/incident").ImpactAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/impact/recalculate`, {
      method: "POST",
    });
    return handleResponse<import("../types/incident").ImpactAssessment>(res);
  },

  /** Retrieve the backend-authoritative operational response priority assessment */
  async getIncidentPriority(id: string): Promise<import("../types/incident").PriorityAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/priority`);
    return handleResponse<import("../types/incident").PriorityAssessment>(res);
  },

  /** Recalculate operational response priority based on current hazard and consequence context */
  async recalculateIncidentPriority(
    id: string,
    payload?: import("../types/incident").PriorityRecalculationPayload
  ): Promise<import("../types/incident").PriorityAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/priority/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return handleResponse<import("../types/incident").PriorityAssessment>(res);
  },

  /** Retrieve side-by-side comparative priority demonstration proving HAZARD ≠ PRIORITY */
  async getComparativePriority(): Promise<import("../types/incident").ComparativePriorityResult> {
    const res = await fetch(`${API_BASE_URL}/comparative-priority`);
    return handleResponse<import("../types/incident").ComparativePriorityResult>(res);
  },

  /** Retrieve chronological priority history from append-oriented audit logs */
  async getIncidentPriorityHistory(id: string): Promise<import("../types/incident").PriorityHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/priority/history`);
    return handleResponse<import("../types/incident").PriorityHistoryItem[]>(res);
  },
};



