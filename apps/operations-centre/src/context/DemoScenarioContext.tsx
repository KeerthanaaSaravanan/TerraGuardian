import React, { createContext, useContext, useState, type ReactNode } from "react";
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

export type DemoStep =
  | 1 // Command Centre ("What is happening?")
  | 2 // Incident Workspace ("What is happening to this incident?")
  | 3 // Evidence Reconciliation ("What do we actually know?")
  | 4 // Impact Analysis & Priority ("What is affected? Why does this matter most?")
  | 5 // Field Verification ("Can we verify it?")
  | 6 // Authority Decision ("What should the authorized human decide?")
  | 7 // Action Tracking ("Was the decision executed?")
  | 8 // Action Gap ("Action Gap Detected: Approved action ≠ Completed action")
  | 9 // Confirmation ("Response Closed-Loop Confirmed")
  | 10; // Incident Replay ("What actually happened?")

export interface DemoState {
  currentStep: DemoStep;
  setStep: (step: DemoStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetDemo: () => void;

  // Selected incident
  selectedIncidentCode: string;
  selectIncident: (code: string) => void;

  // TG-2048 canonical dynamic state
  incidentCode: "TG-2048";
  incidentLocation: "NH-13 Corridor, West Kameng, Arunachal Pradesh";
  incidentStatus:
    | "DETECTED"
    | "ASSESSING"
    | "VERIFYING"
    | "VERIFIED"
    | "DECISION_REQUIRED"
    | "AUTHORIZED"
    | "RESPONDING"
    | "MONITORING"
    | "RESOLVED"
    | "REVIEWED";
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
  approveDecision: () => void;
  modifyDecision: () => void;
  rejectDecision: () => void;

  // Operational actions & gap
  operationalTasks: OperationalTask[];
  isActionGapActive: boolean;
  isActionConfirmed: boolean;
  escalateActionGap: () => void;
  confirmActionGap: () => void;

  // Replay
  replayActiveStepIndex: number;
  setReplayStepIndex: (index: number) => void;

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

  // Canonical initial state for TG-2048 per specification
  const [incidentStatus, setIncidentStatus] = useState<DemoState["incidentStatus"]>("VERIFYING");
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
    }, 400);
  };

  const approveDecision = () => {
    setAuthorityDecision("APPROVED");
    setDecisionSigner("Magistrate & DC West Kameng (DDMA-WK-884)");
    setAuthorizationStatus("AUTHORIZED");
    setDecisionStatus("AUTHORIZED");
    setIncidentStatus("AUTHORIZED");
    setActionStatus("DISPATCHED");

    // After approval, response phase begins with action gap tracking
    setTimeout(() => {
      setIncidentStatus("RESPONDING");
      setIsActionGapActive(true);
      setActionStatus("UNCONFIRMED_GAP");
    }, 300);
  };

  const modifyDecision = () => {
    setAuthorityDecision("MODIFIED");
    setDecisionSigner("Magistrate West Kameng (Conditional Diversion)");
    setAuthorizationStatus("AUTHORIZED");
    setDecisionStatus("AUTHORIZED");
    setIncidentStatus("AUTHORIZED");
    setIsActionGapActive(true);
    setActionStatus("UNCONFIRMED_GAP");
  };

  const rejectDecision = () => {
    setAuthorityDecision("REJECTED");
    setDecisionSigner("Magistrate West Kameng (Stand Down)");
    setAuthorizationStatus("STAND_DOWN");
    setDecisionStatus("REJECTED");
    setIncidentStatus("MONITORING");
    setOverallStatus("MONITORING");
  };

  const escalateActionGap = () => {
    alert("DEMO ESCALATION BROADCAST: High-priority TETRA radio emergency override simulated to West Kameng SP Office & Bhalukpong Thana.");
  };

  const confirmActionGap = () => {
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
  };

  return (
    <DemoScenarioContext.Provider
      value={{
        currentStep,
        setStep,
        nextStep,
        prevStep,
        resetDemo,
        selectedIncidentCode,
        selectIncident,
        incidentCode: "TG-2048",
        incidentLocation: "NH-13 Corridor, West Kameng, Arunachal Pradesh",
        incidentStatus,
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
