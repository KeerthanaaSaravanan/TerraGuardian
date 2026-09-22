import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  OTHER_NER_INCIDENTS,
  INITIAL_EVIDENCE,
  SIMULATED_FIELD_REPORT,
  FieldReport,
  OperationalTask,
  INITIAL_OPERATIONAL_TASKS,
  REPLAY_TIMELINE_STEPS,
  TimelineMilestone,
} from "../data/deterministicScenario";
import { apiClient, ApiError } from "../services/apiClient";
import type {
  IncidentStatus,
  HazardState,
  EvidenceItem as DomainEvidenceItem,
  OperationalAction,
  AuditEvent,
  IncidentTwin,
  ActorRole,
  PredictiveRiskAssessment,
  ReconciliationSummary,
} from "../types/incident";

export type DemoStep =
  | 1 // Predict / Command Centre ("What is happening?")
  | 2 // Observe / Incident Workspace ("What is happening to this incident?")
  | 3 // Reconcile / Evidence Reconciliation ("What do we actually know?")
  | 4 // Prioritize / Impact Analysis & Priority ("What is affected? Why does this matter most?")
  | 5 // Ground Truth / Field Verification ("Can we verify it?")
  | 6 // Authorize / Authority Decision ("What should the authorized human decide?")
  | 7 // Act / Action Tracking ("Was the decision executed?")
  | 8 // Conformance / Action Gap ("Action Gap Detected: Approved action ≠ Completed action")
  | 9 // Confirm / Closed-Loop ("Response Closed-Loop Confirmed")
  | 10 // Forensics / Incident Replay ("What actually happened?")
  | 11; // Living Incident / Golden Demo ("SAME INCIDENT. NEW EVIDENCE. REASSESS.")

export type BackendSyncStatus = "CONNECTING" | "CONNECTED" | "OFFLINE_FALLBACK";

export interface DemoState {
  currentStep: DemoStep;
  setStep: (step: DemoStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetDemo: () => void;

  // Backend synchronization
  backendStatus: BackendSyncStatus;
  backendIncidentId: string | null;
  backendSyncError: string | null;
  liveAuditEvents: AuditEvent[];

  // Selected incident
  selectedIncidentCode: string;
  selectIncident: (code: string) => void;

  // TG-2048 canonical dynamic state
  incidentCode: "TG-2048";
  incidentLocation: "NH-13 Corridor, West Kameng, Arunachal Pradesh";
  incidentStatus: IncidentStatus;
  hazardState: HazardState;
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  riskScore: number;
  confidenceLevel: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";
  confidenceScore: number;
  priorityLevel: "CRITICAL (P1)" | "HIGH (P2)" | "MODERATE (P3)" | "LOW (P4)";

  // Canonical state attributes as required by product spec
  verificationStatus: "PENDING" | "IN_PROGRESS" | "VERIFIED";
  decisionStatus: "REQUIRED" | "AUTHORIZED" | "REJECTED";
  authorizationStatus: "NOT AUTHORIZED" | "AUTHORIZED" | "STAND_DOWN";
  actionStatus: "PARTIALLY COMPLETE" | "DISPATCHED" | "UNCONFIRMED_GAP" | "CONFIRMED_COMPLETED";
  overallStatus: "ACTIVE" | "MONITORING" | "RESOLVED";

  // Field verification state
  isVerificationRequested: boolean;
  isFieldReportReceived: boolean;
  fieldReport: FieldReport | null;
  requestVerification: () => void;

  // Authority decision state
  authorityDecision: "PENDING" | "APPROVED" | "MODIFIED" | "REJECTED";
  decisionSigner: string;
  approveDecision: (signerName?: string, orderCode?: string) => void;
  modifyDecision: (signerName?: string, notes?: string) => void;
  rejectDecision: (signerName?: string, reason?: string) => void;

  // Operational actions & gap
  operationalTasks: OperationalTask[];
  isActionGapActive: boolean;
  isActionConfirmed: boolean;
  escalateActionGap: () => void;
  confirmActionGap: (confirmedBy?: string, notes?: string) => void;

  // Replay
  replayActiveStepIndex: number;
  setReplayStepIndex: (index: number) => void;

  // Reconciliation & Evidence
  reconciliationSummary: ReconciliationSummary | null;
  backendEvidence: DomainEvidenceItem[];
  reconcileEvidence: () => Promise<void>;
  verifyCitizenEvidence: (evidenceId: string, verifierName?: string) => Promise<void>;

  // Predictive Intelligence (Prompt 05)
  predictiveAssessment: PredictiveRiskAssessment | null;
  runPredictiveAssessment: () => Promise<void>;

  // Hazard Evolution, Divergence & Reassessment (Prompt 06)
  hazardHypothesis: import("../types/incident").HazardHypothesis | null;
  divergences: import("../types/incident").DivergenceRecord[];
  reassessmentResult: import("../types/incident").BoundedReassessmentResult | null;
  hazardLineage: import("../types/incident").HazardLineageSummary | null;
  runHazardReassessment: (targetState?: HazardState, notes?: string) => Promise<void>;
  transitionHazardState: (targetState: HazardState, reason: string) => Promise<void>;
  fetchHazardHypothesis: () => Promise<void>;

  // Impact Intelligence & Operational Priority (Prompt 07)
  impactAssessment: import("../types/incident").ImpactAssessment | null;
  priorityAssessment: import("../types/incident").PriorityAssessment | null;
  comparativePriority: import("../types/incident").ComparativePriorityResult | null;
  recalculatePriority: (payload?: import("../types/incident").PriorityRecalculationPayload) => Promise<void>;
  fetchImpactAndPriority: () => Promise<void>;

  // Map layer controls
  mapLayers: {
    rainfall: boolean;
    susceptibility: boolean;
    corridors: boolean;
    villages: boolean;
  };
  toggleMapLayer: (layer: "rainfall" | "susceptibility" | "corridors" | "villages") => void;
}

const DemoScenarioContext = createContext<DemoState | undefined>(undefined);

export const DemoScenarioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<DemoStep>(1);
  const [selectedIncidentCode, setSelectedIncidentCode] = useState<string>("TG-2048");

  // Backend state
  const [backendStatus, setBackendStatus] = useState<BackendSyncStatus>("CONNECTING");
  const [backendIncidentId, setBackendIncidentId] = useState<string | null>(null);
  const [backendSyncError, setBackendSyncError] = useState<string | null>(null);
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [backendEvidence, setBackendEvidence] = useState<DomainEvidenceItem[]>([]);
  const [liveAuditEvents, setLiveAuditEvents] = useState<AuditEvent[]>([]);
  const [predictiveAssessment, setPredictiveAssessment] = useState<PredictiveRiskAssessment | null>(null);
  const [hazardHypothesis, setHazardHypothesis] = useState<import("../types/incident").HazardHypothesis | null>(null);
  const [divergences, setDivergences] = useState<import("../types/incident").DivergenceRecord[]>([]);
  const [reassessmentResult, setReassessmentResult] = useState<import("../types/incident").BoundedReassessmentResult | null>(null);
  const [hazardLineage, setHazardLineage] = useState<import("../types/incident").HazardLineageSummary | null>(null);
  const [impactAssessment, setImpactAssessment] = useState<import("../types/incident").ImpactAssessment | null>(null);
  const [priorityAssessment, setPriorityAssessment] = useState<import("../types/incident").PriorityAssessment | null>(null);
  const [comparativePriority, setComparativePriority] = useState<import("../types/incident").ComparativePriorityResult | null>(null);

  // Canonical initial state for TG-2048 per specification
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>("VERIFYING");
  const [hazardState, setHazardState] = useState<HazardState>("EXPECTED");
  const [riskLevel, setRiskLevel] = useState<DemoState["riskLevel"]>("HIGH");
  const [riskScore, setRiskScore] = useState<number>(86);
  const [confidenceLevel, setConfidenceLevel] = useState<DemoState["confidenceLevel"]>("MODERATE");
  const [confidenceScore, setConfidenceScore] = useState<number>(54);
  const [priorityLevel, setPriorityLevel] = useState<DemoState["priorityLevel"]>("HIGH (P2)");


  const [verificationStatus, setVerificationStatus] = useState<DemoState["verificationStatus"]>("PENDING");
  const [decisionStatus, setDecisionStatus] = useState<DemoState["decisionStatus"]>("REQUIRED");
  const [authorizationStatus, setAuthorizationStatus] = useState<DemoState["authorizationStatus"]>("NOT AUTHORIZED");
  const [actionStatus, setActionStatus] = useState<DemoState["actionStatus"]>("PARTIALLY COMPLETE");
  const [overallStatus, setOverallStatus] = useState<DemoState["overallStatus"]>("ACTIVE");

  // Field verification state
  const [isVerificationRequested, setIsVerificationRequested] = useState<boolean>(false);
  const [isFieldReportReceived, setIsFieldReportReceived] = useState<boolean>(false);
  const [fieldReport, setFieldReport] = useState<FieldReport | null>(null);

  // Authority decision state
  const [authorityDecision, setAuthorityDecision] = useState<DemoState["authorityDecision"]>("PENDING");
  const [decisionSigner, setDecisionSigner] = useState<string>("");

  // Operational tasks state
  const [operationalTasks, setOperationalTasks] = useState<OperationalTask[]>(INITIAL_OPERATIONAL_TASKS);
  const [isActionGapActive, setIsActionGapActive] = useState<boolean>(false);
  const [isActionConfirmed, setIsActionConfirmed] = useState<boolean>(false);

  // Replay
  const [replayActiveStepIndex, setReplayStepIndex] = useState<number>(9); // latest step by default

  // Map layers
  const [mapLayers, setMapLayers] = useState({
    rainfall: true,
    susceptibility: true,
    corridors: true,
    villages: true,
  });

  // Initial Backend Discovery & Sync
  useEffect(() => {
    let isMounted = true;

    async function initializeBackend() {
      try {
        const health = await apiClient.checkHealth();
        if (health.status !== "ok") {
          throw new Error("Backend health check unsuccessful");
        }

        // Try getting TG-2048 by code
        let twin: IncidentTwin | null = null;
        try {
          twin = await apiClient.getIncidentByCode("TG-2048");
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            // Seed TG-2048 into database
            twin = await apiClient.seedTG2048();
          } else {
            throw err;
          }
        }

        if (twin && isMounted) {
          setBackendIncidentId(twin.id);
          setIncidentStatus(twin.status);
          setHazardState(twin.hazard_state);
          setBackendStatus("CONNECTED");
          setBackendSyncError(null);

          // Fetch live timeline/audit if available
          try {
            const timeline = await apiClient.getIncidentTimeline(twin.id);
            if (isMounted && timeline && timeline.length > 0) {
              setLiveAuditEvents(timeline);
            }
          } catch {
            // Non-fatal, audit fallback retained
          }

          // Fetch evidence and reconciliation summary
          try {
            const [evidence, reconciliation] = await Promise.all([
              apiClient.getIncidentEvidence(twin.id),
              apiClient.getIncidentReconciliation(twin.id),
            ]);
            if (isMounted) {
              if (evidence && evidence.length > 0) setBackendEvidence(evidence);
              if (reconciliation) setReconciliationSummary(reconciliation);
            }
          } catch {
            // Non-fatal, fallback to deterministic data
          }

          // Fetch predictive intelligence assessment (Prompt 05)
          try {
            const pred = await apiClient.getIncidentPrediction(twin.id);
            if (isMounted && pred) {
              setPredictiveAssessment(pred);
              setRiskScore(Math.round(pred.risk_score));
              setRiskLevel(pred.risk_level as DemoState["riskLevel"]);
              setConfidenceScore(Math.round(pred.confidence_score));
              setConfidenceLevel(pred.confidence_level as DemoState["confidenceLevel"]);
            }
          } catch {
            // Non-fatal, fallback retained
          }

          // Fetch living hazard hypothesis and divergences (Prompt 06)
          try {
            const [hyp, divs, lineage] = await Promise.all([
              apiClient.getHazardHypothesis(twin.id),
              apiClient.getHazardDivergences(twin.id),
              apiClient.getHazardLineage(twin.id),
            ]);
            if (isMounted) {
              if (hyp) setHazardHypothesis(hyp);
              if (divs) setDivergences(divs);
              if (lineage) setHazardLineage(lineage);
            }
          } catch {
            // Non-fatal, fallback retained
          }

          // Fetch impact assessment and priority assessment (Prompt 07)
          try {
            const [impact, priority, comp] = await Promise.all([
              apiClient.getIncidentImpact(twin.id),
              apiClient.getIncidentPriority(twin.id),
              apiClient.getComparativePriority(),
            ]);
            if (isMounted) {
              if (impact) setImpactAssessment(impact);
              if (priority) {
                setPriorityAssessment(priority);
                if (priority.priority_level === "P1_CRITICAL") setPriorityLevel("CRITICAL (P1)");
                else if (priority.priority_level === "P2_HIGH") setPriorityLevel("HIGH (P2)");
                else if (priority.priority_level === "P3_MODERATE") setPriorityLevel("MODERATE (P3)");
                else if (priority.priority_level === "P4_LOW") setPriorityLevel("LOW (P4)");
              }
              if (comp) setComparativePriority(comp);
            }
          } catch {
            // Non-fatal, fallback retained
          }
        }
      } catch (err) {
        if (isMounted) {
          setBackendStatus("OFFLINE_FALLBACK");
          setBackendSyncError(err instanceof Error ? err.message : "Backend unreachable");
        }
      }
    }

    initializeBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleMapLayer = (layer: "rainfall" | "susceptibility" | "corridors" | "villages") => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const selectIncident = (code: string) => {
    setSelectedIncidentCode(code);
    if (code === "TG-2048") {
      setCurrentStep(2);
    }
  };

  const requestVerification = () => {
    setIsVerificationRequested(true);
    setVerificationStatus("IN_PROGRESS");
    setIncidentStatus("VERIFYING");

    // Asynchronously update backend if connected
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      apiClient
        .transitionIncidentState(backendIncidentId, {
          target_status: "VERIFYING",
          actor_role: "DISPATCHER" as ActorRole,
          actor_name: "Operations Dispatcher",
          reason: "FIELD_PATROL_REQUESTED: SDRF Quick Response Team Bravo dispatched to KM-42",
        })
        .catch((e) => console.warn("Background transition failed:", e));
    }

    // Simulate verified ground patrol arrival with geo-tagged evidence
    setTimeout(() => {
      setIsFieldReportReceived(true);
      setFieldReport(SIMULATED_FIELD_REPORT);
      setIncidentStatus("VERIFIED");
      setVerificationStatus("VERIFIED");
      // Confidence increases from MODERATE to HIGH upon ground truth
      setConfidenceLevel("HIGH");
      setConfidenceScore(94);
      // Consequence analysis elevates priority to CRITICAL
      setPriorityLevel("CRITICAL (P1)");
      setDecisionStatus("REQUIRED");

      // Push ground truth evidence & verified transition to backend
      if (backendStatus === "CONNECTED" && backendIncidentId) {
        apiClient
          .createIncidentEvidence(backendIncidentId, {
            source: "FIELD",
            source_name: "SDRF Quick Response Team Bravo (Patrol #2)",
            evidence_type: "ground_photo_inspection",
            observation: "Active debris slide with mud slurry blocking 60% carriageway",
            metric: "Encroachment: 60% roadway (1.2m mud depth)",
            reliability: "HIGH",
            latitude: 27.0842,
            longitude: 92.5681,
            provenance: "SDRF-KAMENG-02 TETRA handheld terminal",
            processing_status: "RECONCILED",
            interpretation: "VERIFIED",
            details: "Sub-Inspector R. Thapa on-site visual confirmation.",
          })
          .then(() =>
            apiClient.transitionIncidentState(backendIncidentId, {
              target_status: "VERIFIED",
              actor_role: "RESPONDER" as ActorRole,
              actor_name: "Sub-Inspector R. Thapa (SDRF)",
              reason: "Physical scarp and culvert overflow verified",
            })
          )
          .catch((e) => console.warn("Background ground verification push failed:", e));
      }
    }, 400);
  };

  const approveDecision = (signerName = "P. Tsering, IAS (District Magistrate / Chairman DDMA)", orderCode = "DDMA-WK-2026/884-A") => {
    setAuthorityDecision("APPROVED");
    setDecisionSigner(`${signerName} [${orderCode}]`);
    setAuthorizationStatus("AUTHORIZED");
    setDecisionStatus("AUTHORIZED");
    setIncidentStatus("AUTHORIZED");
    setActionStatus("DISPATCHED");

    // Backend async sync
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      apiClient
        .transitionIncidentState(backendIncidentId, {
          target_status: "AUTHORIZED",
          actor_role: "MAGISTRATE" as ActorRole,
          actor_name: signerName,
          authority_order_code: orderCode,
          reason: `Statutory order issued: ${orderCode}`,
        })
        .then(() =>
          apiClient.transitionIncidentState(backendIncidentId, {
            target_status: "RESPONDING",
            actor_role: "OPERATOR" as ActorRole,
            actor_name: "State EOC / Operations Command",
            reason: "Multi-agency action dispatch underway",
          })
        )
        .catch((e) => console.warn("Background authorization transition failed:", e));
    }

    // After approval, response phase begins with action gap tracking
    setTimeout(() => {
      setIncidentStatus("RESPONDING");
      setIsActionGapActive(true);
      setActionStatus("UNCONFIRMED_GAP");
    }, 300);
  };

  const modifyDecision = (signerName = "Executive Magistrate West Kameng", notes = "Conditional light vehicle detour via Tenga") => {
    setAuthorityDecision("MODIFIED");
    setDecisionSigner(`${signerName} (${notes})`);
    setAuthorizationStatus("AUTHORIZED");
    setDecisionStatus("AUTHORIZED");
    setIncidentStatus("AUTHORIZED");
    setIsActionGapActive(true);
    setActionStatus("UNCONFIRMED_GAP");

    if (backendStatus === "CONNECTED" && backendIncidentId) {
      apiClient
        .transitionIncidentState(backendIncidentId, {
          target_status: "AUTHORIZED",
          actor_role: "MAGISTRATE" as ActorRole,
          actor_name: signerName,
          reason: `Conditional modification: ${notes}`,
        })
        .catch((e) => console.warn("Background modify transition failed:", e));
    }
  };

  const rejectDecision = (signerName = "District Magistrate West Kameng", reason = "Precautionary stand-down ordered") => {
    setAuthorityDecision("REJECTED");
    setDecisionSigner(`${signerName} (Stand Down)`);
    setAuthorizationStatus("STAND_DOWN");
    setDecisionStatus("REJECTED");
    setIncidentStatus("MONITORING");
    setOverallStatus("MONITORING");

    if (backendStatus === "CONNECTED" && backendIncidentId) {
      apiClient
        .transitionIncidentState(backendIncidentId, {
          target_status: "MONITORING",
          actor_role: "MAGISTRATE" as ActorRole,
          actor_name: signerName,
          reason: `Executive rejection: ${reason}`,
        })
        .catch((e) => console.warn("Background reject transition failed:", e));
    }
  };

  const escalateActionGap = () => {
    alert("DEMO ESCALATION BROADCAST: High-priority TETRA radio emergency override simulated to West Kameng SP Office & Bhalukpong Thana.");
  };

  const confirmActionGap = (confirmedBy = "ASI D. Sonam (Bhalukpong Police Checkpost)", notes = "Physical roadblock barrier deployed across both carriageways") => {
    setIsActionConfirmed(true);
    setIsActionGapActive(false);
    setActionStatus("CONFIRMED_COMPLETED");
    setOverallStatus("MONITORING");
    setIncidentStatus("MONITORING");

    // Update the task list to completed
    setOperationalTasks((prev) =>
      prev.map((t) =>
        t.isActionGapTrigger
          ? {
              ...t,
              status: "COMPLETED",
              description: "Physical roadblock established at KM-38. Heavy traffic halted. Confirmed by ASI D. Sonam via TETRA Radio.",
              timestamp: "05:18 IST (Simulated Field Verification)",
            }
          : t,
      ),
    );

    // Backend sync: transition incident to MONITORING and record confirmation
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      apiClient
        .transitionIncidentState(backendIncidentId, {
          target_status: "MONITORING",
          actor_role: "RESPONDER" as ActorRole,
          actor_name: confirmedBy,
          reason: `Physical closure confirmed: ${notes}`,
        })
        .catch((e) => console.warn("Background confirmation transition failed:", e));
    }
  };

  const reconcileEvidence = async () => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const summary = await apiClient.reconcileIncidentEvidence(backendIncidentId, "OPERATOR" as ActorRole, "Control Room Operator");
        setReconciliationSummary(summary);
        const evidence = await apiClient.getIncidentEvidence(backendIncidentId);
        setBackendEvidence(evidence);
        const timeline = await apiClient.getIncidentTimeline(backendIncidentId);
        setLiveAuditEvents(timeline);
      } catch (err) {
        console.warn("Reconciliation execution failed:", err);
      }
    }
  };

  const verifyCitizenEvidence = async (evidenceId: string, verifierName = "SI R. Thapa (SDRF Field Verifier)") => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        await apiClient.updateEvidence(evidenceId, {
          actor_role: "FIELD_VERIFIER" as ActorRole,
          actor_name: verifierName,
          interpretation: "VERIFIED",
          processing_status: "RECONCILED",
          conflict_status: "NONE",
          reason: "Field team visual inspection confirmed debris blockage on NH-13 KM-42.",
        });
        await reconcileEvidence();
      } catch (err) {
        console.warn("Citizen evidence verification failed:", err);
      }
    }
  };

  const runPredictiveAssessment = async () => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const pred = await apiClient.predictIncidentRisk(backendIncidentId);
        setPredictiveAssessment(pred);
        setRiskScore(Math.round(pred.risk_score));
        setRiskLevel(pred.risk_level as DemoState["riskLevel"]);
        setConfidenceScore(Math.round(pred.confidence_score));
        setConfidenceLevel(pred.confidence_level as DemoState["confidenceLevel"]);
        const timeline = await apiClient.getIncidentTimeline(backendIncidentId);
        setLiveAuditEvents(timeline);
      } catch (err) {
        console.warn("Predictive assessment failed:", err);
      }
    }
  };

  const fetchHazardHypothesis = async () => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const [hyp, divs, lineage] = await Promise.all([
          apiClient.getHazardHypothesis(backendIncidentId),
          apiClient.getHazardDivergences(backendIncidentId),
          apiClient.getHazardLineage(backendIncidentId),
        ]);
        setHazardHypothesis(hyp);
        setDivergences(divs);
        setHazardLineage(lineage);
      } catch (err) {
        console.warn("Fetch hazard hypothesis failed:", err);
      }
    }
  };

  const runHazardReassessment = async (targetState?: HazardState, notes?: string) => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const result = await apiClient.reassessHazard(backendIncidentId, {
          actor_role: "OPERATOR" as ActorRole,
          actor_name: "Control Room Shift Commander",
          target_hazard_state: targetState,
          notes: notes || "Bounded hazard evolution reassessment executed.",
        });
        setReassessmentResult(result);
        setHazardState(result.updated_hazard_state);
        setRiskScore(Math.round(result.updated_risk_score));
        setRiskLevel(result.updated_risk_level as DemoState["riskLevel"]);
        setConfidenceScore(Math.round(result.updated_confidence_score));
        setConfidenceLevel(result.updated_confidence_level as DemoState["confidenceLevel"]);
        await fetchHazardHypothesis();
        const timeline = await apiClient.getIncidentTimeline(backendIncidentId);
        setLiveAuditEvents(timeline);
      } catch (err) {
        console.warn("Hazard reassessment failed:", err);
      }
    } else {
      if (targetState) {
        setHazardState(targetState);
      }
    }
  };

  const transitionHazardState = async (targetState: HazardState, reason: string) => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const updated = await apiClient.transitionHazardState(backendIncidentId, {
          target_state: targetState,
          actor_role: "OPERATOR" as ActorRole,
          actor_name: "Control Room Operator",
          reason,
        });
        setHazardState(updated.hazard_state);
        await fetchHazardHypothesis();
        const timeline = await apiClient.getIncidentTimeline(backendIncidentId);
        setLiveAuditEvents(timeline);
      } catch (err) {
        console.warn("Hazard state transition failed:", err);
      }
    } else {
      setHazardState(targetState);
    }
  };

  const fetchImpactAndPriority = async () => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const [impact, priority, comp] = await Promise.all([
          apiClient.getIncidentImpact(backendIncidentId),
          apiClient.getIncidentPriority(backendIncidentId),
          apiClient.getComparativePriority(),
        ]);
        setImpactAssessment(impact);
        setPriorityAssessment(priority);
        setComparativePriority(comp);
      } catch (err) {
        console.warn("Fetch impact & priority failed:", err);
      }
    }
  };

  const recalculatePriority = async (payload?: import("../types/incident").PriorityRecalculationPayload) => {
    if (backendStatus === "CONNECTED" && backendIncidentId) {
      try {
        const res = await apiClient.recalculateIncidentPriority(backendIncidentId, payload || {
          actor_role: "OPERATOR",
          actor_name: "Operations Room Officer",
          reason: "Recalculating operational priority from live telemetry and consequence cascade",
        });
        setPriorityAssessment(res);
        if (res.priority_level === "P1_CRITICAL") setPriorityLevel("CRITICAL (P1)");
        else if (res.priority_level === "P2_HIGH") setPriorityLevel("HIGH (P2)");
        else if (res.priority_level === "P3_MODERATE") setPriorityLevel("MODERATE (P3)");
        else if (res.priority_level === "P4_LOW") setPriorityLevel("LOW (P4)");
        const timeline = await apiClient.getIncidentTimeline(backendIncidentId);
        setLiveAuditEvents(timeline);
      } catch (err) {
        console.warn("Recalculate priority failed:", err);
      }
    }
  };

  const nextStep = () => {
    if (currentStep < 10) {
      const next = (currentStep + 1) as DemoStep;
      setCurrentStep(next);
      syncStateToStep(next);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const prev = (currentStep - 1) as DemoStep;
      setCurrentStep(prev);
    }
  };

  const setStep = (step: DemoStep) => {
    setCurrentStep(step);
    syncStateToStep(step);
  };

  const syncStateToStep = (step: DemoStep) => {
    if (step === 1 || step === 2 || step === 3) {
      if (!isFieldReportReceived) {
        setPriorityLevel("HIGH (P2)");
        setConfidenceLevel("MODERATE");
        setConfidenceScore(54);
        setVerificationStatus("PENDING");
        setIncidentStatus("VERIFYING");
      }
    }
    if (step >= 4) {
      // Step 4 is Impact & Priority: Impact cascade elevates priority to CRITICAL
      setPriorityLevel("CRITICAL (P1)");
    }
    if (step >= 5 && !isFieldReportReceived) {
      // Step 5 is Field Verification
      setIsVerificationRequested(true);
      setIsFieldReportReceived(true);
      setFieldReport(SIMULATED_FIELD_REPORT);
      setHazardState("ACTIVE");
      setConfidenceLevel("HIGH");
      setConfidenceScore(94);
      setVerificationStatus("VERIFIED");
      setIncidentStatus("VERIFIED");
    }
    if (step >= 6 && authorityDecision === "PENDING") {
      setDecisionStatus("REQUIRED");
      setIncidentStatus("DECISION_REQUIRED");
    }
    if (step >= 7 && authorityDecision === "PENDING") {
      setAuthorityDecision("APPROVED");
      setDecisionSigner("Magistrate & DC West Kameng (DDMA-WK-884)");
      setAuthorizationStatus("AUTHORIZED");
      setIncidentStatus("RESPONDING");
      setActionStatus("UNCONFIRMED_GAP");
      setIsActionGapActive(true);
    }
    if (step >= 8) {
      setIsActionGapActive(true);
      setActionStatus("UNCONFIRMED_GAP");
    }
    if (step >= 9 && !isActionConfirmed) {
      confirmActionGap();
    }
    if (step === 10) {
      setIncidentStatus("RESOLVED");
      setOverallStatus("RESOLVED");
      setReplayStepIndex(9);
    }
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setSelectedIncidentCode("TG-2048");
    setIncidentStatus("VERIFYING");
    setHazardState("EXPECTED");
    setRiskLevel("HIGH");
    setRiskScore(86);
    setConfidenceLevel("MODERATE");
    setConfidenceScore(54);
    setPriorityLevel("HIGH (P2)");
    setVerificationStatus("PENDING");
    setDecisionStatus("REQUIRED");
    setAuthorizationStatus("NOT AUTHORIZED");
    setActionStatus("PARTIALLY COMPLETE");
    setOverallStatus("ACTIVE");

    setIsVerificationRequested(false);
    setIsFieldReportReceived(false);
    setFieldReport(null);
    setAuthorityDecision("PENDING");
    setDecisionSigner("");
    setOperationalTasks(INITIAL_OPERATIONAL_TASKS);
    setIsActionGapActive(false);
    setIsActionConfirmed(false);
    setReplayStepIndex(0);

    // Re-seed backend if connected
    if (backendStatus === "CONNECTED") {
      apiClient.seedTG2048(true).catch((e) => console.warn("Reset backend reseed failed:", e));
    }
  };

  return (
    <DemoScenarioContext.Provider
      value={{
        currentStep,
        setStep,
        nextStep,
        prevStep,
        resetDemo,
        backendStatus,
        backendIncidentId,
        backendSyncError,
        liveAuditEvents,
        reconciliationSummary,
        backendEvidence,
        reconcileEvidence,
        verifyCitizenEvidence,
        predictiveAssessment,
        runPredictiveAssessment,
        hazardHypothesis,
        divergences,
        reassessmentResult,
        hazardLineage,
        runHazardReassessment,
        transitionHazardState,
        fetchHazardHypothesis,
        impactAssessment,
        priorityAssessment,
        comparativePriority,
        recalculatePriority,
        fetchImpactAndPriority,
        selectedIncidentCode,
        selectIncident,
        incidentCode: "TG-2048",
        incidentLocation: "NH-13 Corridor, West Kameng, Arunachal Pradesh",
        incidentStatus,
        hazardState,
        riskLevel,
        riskScore,
        confidenceLevel,
        confidenceScore,
        priorityLevel,
        verificationStatus,
        decisionStatus,
        authorizationStatus,
        actionStatus,
        overallStatus,
        isVerificationRequested,
        isFieldReportReceived,
        fieldReport,
        requestVerification,
        authorityDecision,
        decisionSigner,
        approveDecision,
        modifyDecision,
        rejectDecision,
        operationalTasks,
        isActionGapActive,
        isActionConfirmed,
        escalateActionGap,
        confirmActionGap,
        replayActiveStepIndex,
        setReplayStepIndex,
        mapLayers,
        toggleMapLayer,
      }}
    >
      {children}
    </DemoScenarioContext.Provider>
  );
};

export const useDemoScenario = (): DemoState => {
  const context = useContext(DemoScenarioContext);
  if (!context) {
    throw new Error("useDemoScenario must be used within DemoScenarioProvider");
  }
  return context;
};
