/**
 * TypeScript domain types mirroring the backend Pydantic models.
 *
 * These types define the authoritative contract between frontend and backend.
 * Synchronized with services/api/app/domain/.
 */

// ── 1. Incident Lifecycle (Operational State) ──

export const INCIDENT_STATUSES = [
  "DETECTED",
  "ASSESSING",
  "VERIFYING",
  "VERIFIED",
  "DECISION_REQUIRED",
  "AUTHORIZED",
  "RESPONDING",
  "MONITORING",
  "REASSESSING",
  "RESOLVED",
  "REVIEWED",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const VALID_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  DETECTED: ["ASSESSING"],
  ASSESSING: ["VERIFYING"],
  VERIFYING: ["VERIFIED"],
  VERIFIED: ["DECISION_REQUIRED"],
  DECISION_REQUIRED: ["AUTHORIZED"],
  AUTHORIZED: ["RESPONDING"],
  RESPONDING: ["MONITORING"],
  MONITORING: ["REASSESSING", "RESOLVED"],
  REASSESSING: ["RESPONDING", "MONITORING", "RESOLVED"],
  RESOLVED: ["REVIEWED"],
  REVIEWED: [],
};

// ── 2. Hazard State (Physical Reality) ──

export const HAZARD_STATES = [
  "EXPECTED",
  "ACTIVE",
  "DELAYED",
  "SHIFTED",
  "PARTIAL",
  "EVOLVED",
  "DISSIPATED",
  "RESOLVED",
  "FALSE_ALARM",
] as const;

export type HazardState = (typeof HAZARD_STATES)[number];

// ── 3. Evidence Fabric & Interpretation ──

export const EVIDENCE_SOURCES = [
  "AUTHORITATIVE",
  "WEATHER",
  "SATELLITE",
  "TERRAIN",
  "SENSOR",
  "CITIZEN",
  "FIELD",
  "HISTORICAL",
  "MODEL",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_PROCESSING_STATUSES = ["RECEIVED", "PROCESSED", "RECONCILED"] as const;
export type EvidenceProcessingStatus = (typeof EVIDENCE_PROCESSING_STATUSES)[number];

export const EVIDENCE_INTERPRETATIONS = ["VERIFIED", "UNVERIFIED", "REJECTED", "CONFLICTED"] as const;
export type EvidenceInterpretation = (typeof EVIDENCE_INTERPRETATIONS)[number];

export const EVIDENCE_CONFLICT_STATUSES = ["NONE", "CONFLICTED", "PARTIALLY_CONFLICTED", "RESOLVED"] as const;
export type EvidenceConflictStatus = (typeof EVIDENCE_CONFLICT_STATUSES)[number];

export interface EvidenceItem {
  id: string; // UUID
  incident_id?: string;
  source: EvidenceSource | string;
  source_name: string;
  evidence_type: string;
  observation: string;
  metric: string;
  reliability: string;
  observed_at: string;
  received_at: string;
  latitude?: number | null;
  longitude?: number | null;
  provenance?: string | null;
  original_reference?: string | null;
  is_simulated?: boolean;
  freshness_seconds?: number | null;
  confidence_contribution?: number | null;
  processing_status: EvidenceProcessingStatus | string;
  interpretation: EvidenceInterpretation | string;
  conflict_status: EvidenceConflictStatus | string;
  conflict_details?: string | null;
  details?: string | null;
  raw_data?: Record<string, unknown> | null;
}

export interface ReconciliationSummary {
  incident_id: string;
  total_evidence_count: number;
  source_distribution: Record<string, number>;
  verified_count: number;
  unverified_count: number;
  supporting_evidence_ids: string[];
  conflicting_evidence_ids: string[];
  stale_evidence_ids: string[];
  conflict_status: EvidenceConflictStatus | string;
  conflict_summary: string;
  dominant_signal: string;
  evidence_quality_score: number;
  confidence_contribution_aggregate: number;
  recommended_action: string;
  reconciled_at: string;
}

// ── 3B. Predictive Intelligence & Hazard ML Models (Prompt 05) ──

export interface FeatureContribution {
  feature_name: string;
  raw_value?: number | null;
  normalized_value: number;
  coefficient: number;
  contribution_pct: number;
  description: string;
}

export interface DataQualitySummary {
  total_expected_features: number;
  available_features: number;
  missing_features: string[];
  stale_features: string[];
  conflicted_features: string[];
  completeness_ratio: number;
  optical_obscuration_pct?: number | null;
}

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  model_type: string;
  feature_schema_version: string;
  training_data_status: string;
  is_demonstration_only: boolean;
  created_at: string;
  description: string;
}

export interface PredictiveRiskAssessment {
  id: string;
  incident_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  dominant_risk_factors: string[];
  feature_contributions: FeatureContribution[];
  explanation_narrative: string;
  data_quality: DataQualitySummary;
  model_metadata: ModelMetadata;
  recommended_operational_action: string;
  assessed_at: string;
  assessed_by: string;
}

// ── 4. Action State & Confirmation (Operational Execution) ──

export const ACTION_STATES = [
  "PROPOSED",
  "APPROVED",
  "DISPATCHED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "PHYSICALLY_CONFIRMED",
] as const;
export type ActionState = (typeof ACTION_STATES)[number];

export const VALID_ACTION_TRANSITIONS: Record<ActionState, readonly ActionState[]> = {
  PROPOSED: ["APPROVED"],
  APPROVED: ["DISPATCHED"],
  DISPATCHED: ["ACKNOWLEDGED", "IN_PROGRESS", "COMPLETED", "PHYSICALLY_CONFIRMED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "COMPLETED", "PHYSICALLY_CONFIRMED"],
  IN_PROGRESS: ["COMPLETED", "PHYSICALLY_CONFIRMED"],
  COMPLETED: ["PHYSICALLY_CONFIRMED"],
  PHYSICALLY_CONFIRMED: [],
};

export interface OperationalAction {
  id: string; // UUID
  incident_id: string;
  task_code: string;
  agency: string;
  title: string;
  description: string;
  state: ActionState;
  assigned_to: string;
  is_action_gap_trigger: boolean;
  dispatched_at?: string | null;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
}

export interface ActionConfirmation {
  id: string;
  action_id: string;
  incident_id: string;
  confirming_officer: string;
  confirming_agency: string;
  communication_channel: string;
  location_confirmed: string;
  confirmed_at: string;
  confirmation_notes: string;
  evidence_photo_url?: string | null;
  is_simulated?: boolean;
}

// ── Risk, Confidence, Priority, and Actor Classifications ──

export const RISK_LEVELS = ["CRITICAL", "HIGH", "MODERATE", "LOW", "NEGLIGIBLE", "UNKNOWN"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["VERY_HIGH", "HIGH", "MODERATE", "LOW", "VERY_LOW", "UNASSESSED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const PRIORITY_LEVELS = ["P1_CRITICAL", "P2_HIGH", "P3_MODERATE", "P4_LOW"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const ACTOR_ROLES = [
  "PUBLIC_CITIZEN",
  "SYSTEM_AI",
  "FIELD_VERIFIER",
  "OPERATOR",
  "AUTHORIZED_DECISION_MAKER",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export interface AuditEvent {
  id: string;
  incident_id: string;
  event_type: string;
  actor_role: string;
  actor_name: string;
  actor_id?: string | null;
  previous_state?: string | null;
  new_state?: string | null;
  reason?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ── Incident Digital Twin (Authoritative Record) ──

export interface IncidentTwin {
  id: string; // UUID
  code: string; // e.g. "TG-2048"
  title: string;
  description?: string | null;
  incident_type: string;
  status: IncidentStatus;
  hazard_state: HazardState;
  risk_level: RiskLevel;
  risk_score: number;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  priority_level: PriorityLevel;
  priority_score: number;
  latitude: number;
  longitude: number;
  location_name?: string | null;
  corridor_name?: string | null;
  state: string;
  district: string;
  detected_at: string;
  updated_at: string;
  is_primary_demo: boolean;
  is_simulated: boolean;
  metadata_json: Record<string, unknown>;
}

export interface PublicIncidentSummary {
  id: string;
  code: string;
  title: string;
  general_location?: string | null;
  district: string;
  state: string;
  status: IncidentStatus;
  advisory_summary: string;
  updated_at: string;
}

// ── 5. Hazard Evolution, Divergence & Bounded Reassessment (Prompt 06) ──

export const DIVERGENCE_TYPES = ["TEMPORAL", "SPATIAL", "MAGNITUDE", "EVIDENCE"] as const;
export type DivergenceType = (typeof DIVERGENCE_TYPES)[number];

export const DIVERGENCE_SEVERITIES = ["CRITICAL", "SIGNIFICANT", "MODERATE", "LOW"] as const;
export type DivergenceSeverity = (typeof DIVERGENCE_SEVERITIES)[number];

export interface DivergenceRecord {
  id: string;
  incident_id: string;
  divergence_type: DivergenceType;
  severity: DivergenceSeverity;
  detected_at: string;
  expected_context: string;
  observed_context: string;
  evidence_references: string[];
  explanation: string;
  requires_reassessment: boolean;
  is_resolved: boolean;
}

export interface SpatialEnvelope {
  latitude: number;
  longitude: number;
  radius_meters: number;
  corridor_chainage?: string;
  elevation_m?: number;
  slope_gradient_deg?: number;
}

export interface TemporalWindow {
  window_start: string;
  window_end: string;
  peak_intensity_expected_at?: string;
  window_elapsed: boolean;
}

export interface HazardHypothesis {
  id: string;
  incident_id: string;
  lineage_id: string;
  parent_lineage_id?: string | null;
  current_state: HazardState;
  spatial_envelope: SpatialEnvelope;
  temporal_window: TemporalWindow;
  initiating_evidence_ids: string[];
  initial_risk_score: number;
  current_risk_score: number;
  initial_confidence_score: number;
  current_confidence_score: number;
  divergences: DivergenceRecord[];
  evolution_history: Array<Record<string, unknown>>;
  residual_uncertainty: string;
  created_at: string;
  updated_at: string;
}

export interface BoundedReassessmentPayload {
  actor_role: ActorRole;
  actor_name: string;
  trigger_divergence_id?: string | null;
  target_hazard_state?: HazardState | null;
  notes?: string | null;
}

export interface BoundedReassessmentResult {
  id: string;
  incident_id: string;
  hypothesis_id: string;
  lineage_id: string;
  previous_hazard_state: HazardState;
  updated_hazard_state: HazardState;
  updated_risk_score: number;
  updated_risk_level: RiskLevel;
  updated_confidence_score: number;
  updated_confidence_level: ConfidenceLevel;
  divergence_evaluated?: DivergenceRecord | null;
  continuity_supported: boolean;
  lineage_decision: string;
  rationale: string;
  operational_guidance: string;
  reassessed_at: string;
  reassessed_by: string;
}

export interface HazardStateTransitionPayload {
  target_state: HazardState;
  actor_role: ActorRole;
  actor_name: string;
  reason: string;
  resolution_evidence_id?: string | null;
}

export interface HazardLineageSummary {
  lineage_id: string;
  incident_id: string;
  root_detected_at: string;
  active_hazard_state: HazardState;
  states_traversed: string[];
  total_divergences_detected: number;
  total_reassessments_performed: number;
  continuity_intact: boolean;
  lineage_tree: Array<{
    timestamp?: string | null;
    state: string;
    event: string;
    risk_score?: number;
    confidence_score?: number;
    actor?: string;
    rationale?: string;
  }>;
}

// ── PROMPT 07: Impact Intelligence & Operational Priority Types ──

export type CriticalFacilityType =
  | "HOSPITAL"
  | "EMERGENCY_DEPOT"
  | "STRATEGIC_CORRIDOR"
  | "BRIDGE_VIADUCT"
  | "COMMUNICATIONS"
  | "POWER_WATER_GRID"
  | "RESIDENTIAL_COMMUNITY";

export type CorridorConnectivity =
  | "SOLE_LIFELINE_NO_DETOUR"
  | "LONG_UNPAVED_DETOUR"
  | "PARTIAL_BYPASS_AVAILABLE"
  | "MULTIPLE_PAVED_ALTERNATIVES";

export type ResponseAccessibility =
  | "HIGH_DIFFICULTY_STEEP_ISOLATED"
  | "MODERATE_DIFFICULTY_WEATHER_CONSTRAINED"
  | "NORMAL_ACCESSIBLE";

export type ImpactDataQuality =
  | "COMPLETE"
  | "PARTIAL_DEMOGRAPHIC_MISSING"
  | "PARTIAL_CONNECTIVITY_UNCONFIRMED"
  | "INCOMPLETE";

export interface ImpactNode {
  stage_order: number;
  stage_name: string;
  node_name: string;
  category: string;
  severity: RiskLevel;
  description: string;
  vulnerability_factor: string;
  population_count?: number;
  facility_type?: CriticalFacilityType | null;
}

export interface ImpactAssessment {
  id: string;
  incident_id: string;
  corridor_name: string;
  population_exposed?: number | null;
  is_population_known: boolean;
  vulnerable_population_count?: number | null;
  critical_facilities: string[];
  is_critical_facilities_known: boolean;
  connectivity_status: CorridorConnectivity;
  is_connectivity_known: boolean;
  has_alternative_detour: boolean;
  detour_penalty_km: number;
  detour_travel_time_hours: number;
  response_difficulty: ResponseAccessibility;
  is_response_difficulty_known: boolean;
  cascading_consequences: string[];
  impact_data_quality: ImpactDataQuality;
  impact_confidence_score: number;
  impact_confidence_level: ConfidenceLevel;
  impact_chain: ImpactNode[];
  assessed_at: string;
  assessed_by: string;
}

export interface PriorityAssessment {
  id: string;
  incident_id: string;
  priority_level: PriorityLevel;
  priority_score: number;
  previous_priority_level?: PriorityLevel | null;
  priority_change_reason?: string | null;
  hazard_risk_input: number;
  hazard_confidence_input: number;
  exposure_score: number;
  criticality_score: number;
  connectivity_penalty_score: number;
  response_difficulty_score: number;
  primary_drivers: string[];
  counterfactors: string[];
  operational_rationale: string;
  recommended_human_action: string;
  is_stale: boolean;
  stale_reason?: string | null;
  is_operator_override_applied?: boolean;
  override_provenance?: string | null;
  impact_data_quality?: ImpactDataQuality;
  assessed_at: string;
  assessed_by: string;
}

export interface PriorityRecalculationPayload {
  actor_role: ActorRole;
  actor_name: string;
  reason?: string | null;
  override_exposure?: number | null;
  override_connectivity?: CorridorConnectivity | null;
}

export interface PriorityHistoryItem {
  id: string;
  incident_id: string;
  event_type: string;
  actor_role: string;
  actor_name: string;
  previous_state?: string | null;
  new_state: string;
  priority_level?: string | null;
  priority_score?: number | null;
  change_reason?: string | null;
  is_operator_override: boolean;
  override_provenance?: string | null;
  created_at?: string | null;
}

export interface ComparativePriorityResult {
  primary_incident: {
    incident_code: string;
    title: string;
    location: string;
    hazard_risk_score: number;
    hazard_risk_level: string;
    hazard_confidence_score: number;
    exposed_population: number;
    critical_infrastructure: string;
    connectivity: string;
    response_difficulty: string;
    calculated_priority_score: number;
    operational_priority: string;
    operational_implication: string;
  };
  comparative_incident: {
    incident_code: string;
    title: string;
    location: string;
    hazard_risk_score: number;
    hazard_risk_level: string;
    hazard_confidence_score: number;
    exposed_population: number;
    critical_infrastructure: string;
    connectivity: string;
    response_difficulty: string;
    calculated_priority_score: number;
    operational_priority: string;
    operational_implication: string;
  };
  principle_verified: string;
  demonstration_summary: string;
  data_classification?: string;
}

// ── 7. Authentication & User Profile Types (Prompt 02) ──

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: ActorRole;
  agency?: string | null;
  badge_number?: string | null;
  is_active: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface LoginPayload {
  username: string;
  password: string;
}

// ── 8. Outcome Engine & Living Incident Types (Prompt 03) ──

export const OUTCOME_TYPES = [
  "EVENT_OBSERVED",
  "NON_EVENT_OBSERVED",
  "INTERVENTION_CONDITIONED_NON_EVENT",
  "OBSERVATION_GAP",
  "RESIDUAL_HAZARD",
  "CONFLICTED",
  "UNRESOLVED",
] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const INTERVENTION_CONTEXT_STATES = [
  "NO_INTERVENTION",
  "INTERVENTION_PROPOSED",
  "INTERVENTION_DISPATCHED_UNCONFIRMED",
  "INTERVENTION_CONFIRMED",
] as const;
export type InterventionContextState = (typeof INTERVENTION_CONTEXT_STATES)[number];

export const OBSERVATION_ADEQUACIES = [
  "ADEQUATE",
  "INADEQUATE_OBSCURATION",
  "INADEQUATE_WINDOW",
  "INADEQUATE_COVERAGE",
  "INADEQUATE_CONFLICTED",
] as const;
export type ObservationAdequacy = (typeof OBSERVATION_ADEQUACIES)[number];

export interface SpatialDivergenceContext {
  original_latitude: number;
  original_longitude: number;
  observed_latitude?: number | null;
  observed_longitude?: number | null;
  distance_meters?: number | null;
  within_supported_scope: boolean;
  spatial_scope_threshold_meters: number;
  corridor_alignment_notes?: string | null;
}

export interface OutcomeAssessment {
  id: string;
  incident_id: string;
  outcome_type: OutcomeType;
  intervention_state: InterventionContextState;
  observation_adequacy: ObservationAdequacy;
  causal_claim_established: boolean;
  closure_permitted: boolean;
  reassessment_required: boolean;
  recommended_hazard_state: HazardState;
  spatial_divergence?: SpatialDivergenceContext | null;
  explanation: string;
  evidence_summary: Record<string, unknown>;
  evaluated_at: string;
  evaluated_by: string;
}

export interface OutcomeEvaluationPayload {
  actor_role?: ActorRole;
  actor_name?: string;
  observed_latitude?: number | null;
  observed_longitude?: number | null;
  observation_notes?: string | null;
}

// ── 9. Decision Intelligence & Next-Best-Information Types (Prompt 05) ──

export interface NextBestInformationItem {
  id: string;
  action_type: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  target_modality: string;
  title: string;
  rationale: string;
  expected_confidence_delta: number;
  authority_required: boolean;
  status: string;
}

export interface DecisionSupportAssessment {
  id: string;
  incident_id: string;
  current_status: IncidentStatus | string;
  current_hazard_state: HazardState | string;
  risk_score: number;
  confidence_score: number;
  priority_level: PriorityLevel | string;
  governing_safety_rules: string[];
  recommended_operational_options: Array<{
    option_id: string;
    title: string;
    action_type: string;
    authority_required: boolean;
    statutory_authority: string;
    rationale: string;
    status: string;
  }>;
  next_best_information: NextBestInformationItem[];
  active_divergences: string[];
  outcome_summary?: string | null;
  closure_readiness: boolean;
  closure_blockers: string[];
  assessed_at: string;
  assessed_by: string;
}

