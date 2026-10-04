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
  AuthTokenResponse,
  EvidenceConflictStatus,
  EvidenceInterpretation,
  EvidenceItem,
  EvidenceProcessingStatus,
  EvidenceSource,
  IncidentStatus,
  IncidentTwin,
  DecisionSupportAssessment,
  LoginPayload,
  OperationalAction,
  OutcomeAssessment,
  OutcomeEvaluationPayload,
  PredictiveRiskAssessment,
  ReconciliationSummary,
  UserProfile,
  CitizenScreeningResult,
  CitizenGeocodingResult,
  CitizenReportItem,
  CitizenReviewPayload,
} from "../types/incident";

function normalizeApiBaseUrl(raw?: string): string {
  if (!raw || !raw.trim()) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/v1`;
    }
    return "/api/v1";
  }
  let clean = raw.trim().replace(/\/+$/, "");
  if (!clean.endsWith("/api/v1")) {
    clean = `${clean}/api/v1`;
  }
  return clean;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export function getApiBaseDisplayUrl(): string {
  return API_BASE_URL;
}



let currentAuthToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem("tg_auth_token") : null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("tg_auth_token", token);
    } else {
      localStorage.removeItem("tg_auth_token");
    }
  }
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

function authHeaders(custom: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...custom };
  if (currentAuthToken) {
    headers["Authorization"] = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

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
  authority_order_code?: string;
  authorization_reason?: string;
  dispatch_reference?: string;
  dispatch_channel?: string;
  target_agency?: string;
  acknowledged_by?: string;
  acknowledgement_status?: string;
  acknowledgement_reason?: string;
  execution_actor?: string;
  execution_notes?: string;
  execution_location?: string;
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
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      if (contentType.includes("application/json")) {
        const errJson = await res.json();
        if (errJson && errJson.detail) {
          errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } else {
        errorDetail = `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch {
      // JSON parse error, use default statusText
    }
    throw new ApiError(res.status, errorDetail);
  }

  // Detect accidental SPA HTML response when JSON is expected
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      res.status,
      `Expected JSON from backend, but received '${contentType || "non-json"}'. VITE_API_URL may be missing or routing to frontend index.html.`
    );
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  /** Health check against configured backend with bounded 5s timeout */
  async checkHealth(): Promise<{ status: string; service: string; database?: string; version: string; environment?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const healthUrl = `${API_BASE_URL}/health`;
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      return handleResponse(res);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },



  /** Return the existing authenticated token without attempting implicit sign-in. */
  async ensureAuthenticatedSession(): Promise<string | null> {
    return currentAuthToken;
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

  /** Generate recommended multi-agency actions for incident */
  async recommendIncidentActions(id: string): Promise<OperationalAction[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/recommend-actions`, {
      method: "POST",
    });
    return handleResponse<OperationalAction[]>(res);
  },

  /** Get recommended multi-agency actions for incident without creating */
  async getRecommendedIncidentActions(id: string): Promise<OperationalAction[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/recommend-actions`);
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
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<IncidentTwin>(res);
  },

  /** Execute and audit an operational action state transition */
  async transitionActionState(actionId: string, payload: ActionTransitionPayload): Promise<OperationalAction> {
    const res = await fetch(`${API_BASE_URL}/actions/${actionId}/transitions`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<OperationalAction>(res);
  },

  /** Record accepted confirmation evidence and advance task to PHYSICALLY_CONFIRMED */
  async confirmAction(actionId: string, payload: ActionConfirmationPayload): Promise<ActionConfirmation> {
    const res = await fetch(`${API_BASE_URL}/actions/${actionId}/confirmations`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
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

  // ── Hazard Evolution & Bounded Reassessment ──

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

  // ── Impact Intelligence & Operational Priority ──

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
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/priority/history`, {
      headers: authHeaders(),
    });
    return handleResponse<import("../types/incident").PriorityHistoryItem[]>(res);
  },

  /** Retrieve authoritative geographic exposure and infrastructure nodes */
  async getIncidentExposure(id: string): Promise<import("../types/incident").ImpactAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/exposure`);
    return handleResponse<import("../types/incident").ImpactAssessment>(res);
  },

  /** Retrieve authoritative decision support, governing rules, and Next-Best-Information (NBI) */
  async getIncidentDecisionSupport(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/decision-support`);
    return handleResponse<any>(res);
  },

  // ── Authentication Endpoints ──

  /** Authenticate user with username/email and password */
  async login(payload: LoginPayload): Promise<AuthTokenResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthTokenResponse>(res);
  },

  /** Authenticate one of the fixed server-side demonstration presets. */
  async demoLogin(account: string): Promise<AuthTokenResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account }),
    });
    return handleResponse<AuthTokenResponse>(res);
  },

  /** Fetch current authenticated user's server-derived profile */
  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: authHeaders(),
    });
    return handleResponse<UserProfile>(res);
  },

  /** Seed deterministic demo accounts (LOCAL / DEMO ONLY) */
  async seedDemoUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE_URL}/auth/seed-demo-users`, {
      method: "POST",
      headers: authHeaders(),
    });
    return handleResponse<UserProfile[]>(res);
  },

  // ── Outcome Engine Endpoints ──

  /** Evaluate authoritative intervention-conditioned outcome */
  async evaluateOutcome(id: string, payload?: OutcomeEvaluationPayload): Promise<OutcomeAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/outcome/evaluate`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload || {}),
    });
    return handleResponse<OutcomeAssessment>(res);
  },

  /** Retrieve current or latest evaluated outcome */
  async getIncidentOutcome(id: string): Promise<OutcomeAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/outcome`, {
      headers: authHeaders(),
    });
    return handleResponse<OutcomeAssessment>(res);
  },

  /** Retrieve full history of bounded reassessments */
  async getIncidentReassessments(id: string): Promise<Record<string, unknown>[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/reassessments`, {
      headers: authHeaders(),
    });
    return handleResponse<Record<string, unknown>[]>(res);
  },

  // ── Decision Intelligence & Next-Best-Information ──

  /** Retrieve authoritative decision support, governing rules, and Next-Best-Information */
  async getDecisionSupport(id: string): Promise<DecisionSupportAssessment> {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/decision-support`, {
      headers: authHeaders(),
    });
    return handleResponse<DecisionSupportAssessment>(res);
  },

  // ── Phase 4 / 4R: Authoritative Geospatial Intelligence & GIS Layers ──

  /** Retrieve authoritative administrative boundary polygons (WGS 84 GeoJSON) */
  async getGISBoundaries(): Promise<import("../types/gis").AdminBoundaryFeature[]> {
    const res = await fetch(`${API_BASE_URL}/gis/layers/boundaries`);
    return handleResponse<import("../types/gis").AdminBoundaryFeature[]>(res);
  },

  /** Retrieve strategic transport corridors and highway segments (WGS 84 GeoJSON) */
  async getGISRoads(): Promise<import("../types/gis").RoadSegmentFeature[]> {
    const res = await fetch(`${API_BASE_URL}/gis/layers/roads`);
    return handleResponse<import("../types/gis").RoadSegmentFeature[]>(res);
  },

  /** Retrieve settlements with population exposure metrics (WGS 84 GeoJSON) */
  async getGISSettlements(): Promise<import("../types/gis").SettlementFeature[]> {
    const res = await fetch(`${API_BASE_URL}/gis/layers/settlements`);
    return handleResponse<import("../types/gis").SettlementFeature[]>(res);
  },

  /** Retrieve critical infrastructure facilities (hospitals, bridges, staging bases) */
  async getGISInfrastructure(): Promise<import("../types/gis").CriticalInfrastructureFeature[]> {
    const res = await fetch(`${API_BASE_URL}/gis/layers/infrastructure`);
    return handleResponse<import("../types/gis").CriticalInfrastructureFeature[]>(res);
  },

  /** Retrieve all spatial incident twins with backend coordinates and operational metrics */
  async getGISSpatialIncidents(): Promise<import("../types/gis").SpatialIncidentFeature[]> {
    const res = await fetch(`${API_BASE_URL}/gis/incidents/spatial`);
    return handleResponse<import("../types/gis").SpatialIncidentFeature[]>(res);
  },

  /** Evaluate geodetic spatial association between an observation and an incident twin */
  async getGISSpatialAssociation(
    arg1: number | { latitude: number; longitude: number; incident_id?: string },
    arg2?: number,
    arg3?: string
  ): Promise<import("../types/gis").SpatialAssociationResponse> {
    let lat: number;
    let lng: number;
    let incId: string | undefined;

    if (typeof arg1 === "object") {
      lat = arg1.latitude;
      lng = arg1.longitude;
      incId = arg1.incident_id;
    } else {
      lat = arg1;
      lng = arg2!;
      incId = arg3;
    }
    const res = await fetch(`${API_BASE_URL}/gis/spatial-association`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, incident_id: incId || undefined }),
    });
    return handleResponse<import("../types/gis").SpatialAssociationResponse>(res);
  },

  /** Seed or reseed authoritative baseline GIS layers */
  async seedGISBaseline(forceReset = false): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/gis/seed-baseline?force_reset=${forceReset}`, {
      method: "POST",
    });
    return handleResponse<Record<string, unknown>>(res);
  },

  /** Retrieve truthful system model metadata and sensor provenance */
  async getSystemModelMetadata(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/system/model-metadata`);
    return handleResponse<Record<string, unknown>>(res);
  },

  /** Retrieve authoritative historical landslides GeoJSON layer */
  async getGISHistoricalLandslides(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/layers/historical-landslides`);
    return handleResponse<any>(res);
  },

  /** Query real Copernicus DEM terrain derivatives (elevation, Horn slope, aspect) */
  async getGISTerrainQuery(lat: number, lng: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/terrain/query?latitude=${lat}&longitude=${lng}`);
    return handleResponse<any>(res);
  },

  /** Reassess incident using real Copernicus DEM and ERA5/GPM rainfall observables */
  async reassessWithRealEnvironmentalData(incidentId?: string, targetDate = "2024-06-25"): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/environmental/reassess-with-real-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incidentId, target_date: targetDate }),
    });
    return handleResponse<any>(res);
  },

  /** Retrieve Before vs Current assessment history and what-changed transition */
  async getIncidentAssessmentHistory(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/incidents/${incidentId}/assessment-history`);
    return handleResponse<any>(res);
  },

  /** Retrieve structured dimensional What Changed report from domain service */
  async getIncidentWhatChanged(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/what-changed`);
    return handleResponse<any>(res);
  },

  /** Retrieve 500m experimental susceptibility grid along NH-13 KM-30 to KM-60 */
  async getGISSusceptibilityGrid(spacingMeters = 500.0): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/models/susceptibility/grid?spacing_meters=${spacingMeters}`);
    return handleResponse<any>(res);
  },

  /** Retrieve empirical susceptibility baseline model definition and training statistics */
  async getGISSusceptibilityBaseline(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/models/susceptibility/baseline`);
    return handleResponse<any>(res);
  },

  /** Retrieve authoritative whole-NER administrative and coverage hierarchy */
  async getNERHierarchy(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/ner/hierarchy`);
    return handleResponse<any>(res);
  },

  /** Retrieve authoritative whole-NER landslide events with filtering */
  async getNERLandslideEvents(params?: {
    time_window?: string;
    state?: string;
    event_status?: string;
    data_maturity?: string;
  }): Promise<import("../types/gis").NERLandslidesGeoJSON> {
    const query = new URLSearchParams();
    if (params?.time_window) query.set("time_window", params.time_window);
    if (params?.state) query.set("state", params.state);
    if (params?.event_status) query.set("event_status", params.event_status);
    if (params?.data_maturity) query.set("data_maturity", params.data_maturity);
    const qs = query.toString();
    const res = await fetch(`${API_BASE_URL}/gis/ner/events${qs ? `?${qs}` : ""}`);
    return handleResponse<import("../types/gis").NERLandslidesGeoJSON>(res);
  },

  /** Retrieve compact NER regional landslide intelligence summary */
  async getNERRegionalSummary(): Promise<import("../types/gis").NERRegionalSummary> {
    const res = await fetch(`${API_BASE_URL}/gis/ner/summary`);
    return handleResponse<import("../types/gis").NERRegionalSummary>(res);
  },

  /** Retrieve unified scientific hazard & susceptibility assessment with feature lineage */
  async getIncidentScientificAssessment(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/gis/incidents/${incidentId}/scientific-assessment`);
    return handleResponse<any>(res);
  },

  /** ── Phase 4: Governed Disaster Alerts ── */
  async getAllAlerts(statusFilter?: string): Promise<any[]> {
    const url = statusFilter
      ? `${API_BASE_URL}/alerts?status=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/alerts`;
    const res = await fetch(url, {
      headers: authHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getIncidentAlerts(incidentId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/alerts`, {
      headers: authHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createIncidentAlert(incidentId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/alerts`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async authorizeIncidentAlert(alertId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/authorize`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async updateAlertLifecycle(alertId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/lifecycle`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async evaluateAlertsForIncident(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/alerts/evaluate?incident_id=${incidentId}`, {
      method: "POST",
      headers: authHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getDataSourcesHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/system/data-sources/health`, {
      headers: authHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getRoadStatuses(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/roads/status`, {
      headers: authHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  /** ── Phase 4: Road / Transport Corridor Status ── */
  async getIncidentRoadStatus(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/road-status`, {
      headers: authHeaders(),
    });
    return handleResponse<any>(res);
  },


  async updateIncidentRoadStatus(incidentId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/road-status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  /** ── Phase 4: Closure Gate Evaluation ── */
  async getIncidentClosureGate(incidentId: string, actorRole?: string, orderCode?: string): Promise<any> {
    let url = `${API_BASE_URL}/incidents/${incidentId}/closure-gate`;
    const params = new URLSearchParams();
    if (actorRole) params.append("actor_role", actorRole);
    if (orderCode) params.append("authority_order_code", orderCode);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await fetch(url, { headers: authHeaders() });
    return handleResponse<any>(res);
  },

  /** ── Phase 4: Governed Escalation ── */
  async escalateIncident(incidentId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/escalate`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  /** ── Phase 5: Authoritative Consequence Priority Queue ── */
  async getPriorityQueue(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/incidents/priority-queue`, {
      headers: authHeaders(),
    });
    return handleResponse<any>(res);
  },

  /** ── Phase 5 / Prompt 2: Operational Copilot ── */
  async queryCopilot(query: string, currentIncidentCode?: string, currentView?: string, context?: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/copilot/query`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        query,
        current_incident_code: currentIncidentCode || "TG-2048",
        current_view: currentView || "situational-overview",
        context: context || {},
      }),
    });
    return handleResponse<any>(res);
  },

  async getCopilotCapabilities(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/copilot/capabilities`, {
      headers: authHeaders(),
    });
    return handleResponse<any>(res);
  },

  /** ── Citizen Safe & Public Evidence Pipeline ── */
  async screenCitizenImage(imageBase64: string, filename?: string): Promise<CitizenScreeningResult> {
    const res = await fetch(`${API_BASE_URL}/citizen/screen-image`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        image_base64: imageBase64,
        filename: filename || "observation.jpg",
      }),
    });
    return handleResponse<CitizenScreeningResult>(res);
  },

  async reverseGeocode(lat: number, lng: number): Promise<CitizenGeocodingResult> {
    const res = await fetch(`${API_BASE_URL}/citizen/reverse-geocode?lat=${lat}&lng=${lng}`, {
      headers: authHeaders(),
    });
    return handleResponse<CitizenGeocodingResult>(res);
  },

  async submitCitizenReport(payload: {
    image_base64?: string;
    image_url?: string;
    latitude: number;
    longitude: number;
    gps_accuracy?: number;
    state?: string;
    district?: string;
    locality?: string;
    road_corridor?: string;
    citizen_notes?: string;
    ai_observation?: string;
    ai_screening_result?: any;
    reporter_contact?: string;
    client_submission_id?: string;
  }): Promise<CitizenReportItem> {
    const res = await fetch(`${API_BASE_URL}/citizen/report`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<CitizenReportItem>(res);
  },

  async getCitizenReports(
    statusFilter?: string,
    nerOnly?: boolean,
    limit: number = 50
  ): Promise<CitizenReportItem[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
    if (nerOnly) params.append("ner_only", "true");
    params.append("limit", limit.toString());

    const res = await fetch(`${API_BASE_URL}/citizen/reports?${params.toString()}`, {
      headers: authHeaders(),
    });
    return handleResponse<CitizenReportItem[]>(res);
  },

  async getCitizenReport(reportId: string): Promise<CitizenReportItem> {
    const res = await fetch(`${API_BASE_URL}/citizen/reports/${reportId}`, {
      headers: authHeaders(),
    });
    return handleResponse<CitizenReportItem>(res);
  },

  async reviewCitizenReport(
    reportId: string,
    payload: CitizenReviewPayload
  ): Promise<CitizenReportItem> {
    const res = await fetch(`${API_BASE_URL}/citizen/reports/${reportId}/review`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return handleResponse<CitizenReportItem>(res);
  },
};


