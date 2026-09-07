import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  DemoIncident,
  OTHER_NER_INCIDENTS,
  EvidenceItem,
  INITIAL_EVIDENCE,
  HAZARD_PROPAGATION_CHAIN,
  SIMULATED_FIELD_REPORT,
  FieldReport,
  OperationalTask,
  INITIAL_OPERATIONAL_TASKS,
  REPLAY_TIMELINE_STEPS,
  TimelineMilestone,
} from "../data/deterministicScenario";

export type DemoStep =
  | 1 // Command Centre
  | 2 // Incident Workspace
  | 3 // Evidence Reconciliation
  | 4 // Impact & Priority
  | 5 // Field Verification
  | 6 // Authority Decision
  | 7 // Action Tracking
  | 8 // Action Gap
  | 9 // Confirmation
  | 10; // Incident Replay

export interface DemoState {
  currentStep: DemoStep;
  setStep: (step: DemoStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetDemo: () => void;

  // Selected incident
  selectedIncidentCode: string;
  selectIncident: (code: string) => void;

  // TG-2048 dynamic state
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

  // Dynamic incident state
  const [incidentStatus, setIncidentStatus] = useState<DemoState["incidentStatus"]>("ASSESSING");
  const [riskLevel, setRiskLevel] = useState<DemoState["riskLevel"]>("HIGH");
  const [riskScore, setRiskScore] = useState<number>(86);
  const [confidenceLevel, setConfidenceLevel] = useState<DemoState["confidenceLevel"]>("MODERATE");
  const [confidenceScore, setConfidenceScore] = useState<number>(54);
  const [priorityLevel, setPriorityLevel] = useState<DemoState["priorityLevel"]>("CRITICAL (P1)");

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
    setIncidentStatus("VERIFYING");

    // Simulate instant patrol arrival with ground evidence
    setTimeout(() => {
      setIsFieldReportReceived(true);
      setFieldReport(SIMULATED_FIELD_REPORT);
      setIncidentStatus("VERIFIED");
      // Confidence surges from MODERATE to HIGH upon ground truth
      setConfidenceLevel("HIGH");
      setConfidenceScore(94);
    }, 400);
  };

  const approveDecision = () => {
    setAuthorityDecision("APPROVED");
    setDecisionSigner("Magistrate & DC West Kameng (DDMA-WK-884)");
    setIncidentStatus("AUTHORIZED");
    // After approval, response phase begins
    setTimeout(() => {
      setIncidentStatus("RESPONDING");
      setIsActionGapActive(true);
    }, 300);
  };

  const modifyDecision = () => {
    setAuthorityDecision("MODIFIED");
    setDecisionSigner("Magistrate West Kameng (Conditional Diversion)");
    setIncidentStatus("AUTHORIZED");
    setIsActionGapActive(true);
  };

  const rejectDecision = () => {
    setAuthorityDecision("REJECTED");
    setDecisionSigner("Magistrate West Kameng (Stand Down)");
    setIncidentStatus("MONITORING");
  };

  const escalateActionGap = () => {
    alert("ESCALATION BROADCAST: High-priority TETRA radio emergency override transmitted to West Kameng SP Office & Bhalukpong Thana.");
  };

  const confirmActionGap = () => {
    setIsActionConfirmed(true);
    setIsActionGapActive(false);

    // Update the task list
    setOperationalTasks((prev) =>
      prev.map((t) =>
        t.isActionGapTrigger
          ? {
              ...t,
              status: "COMPLETED",
              description: "Physical roadblock established at KM-38. Heavy traffic held. Confirmed by ASI D. Sonam via TETRA Radio.",
              timestamp: "Just now (Verified)",
            }
          : t,
      ),
    );

    setIncidentStatus("MONITORING");
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
    if (step >= 5 && !isFieldReportReceived) {
      setIsVerificationRequested(true);
      setIsFieldReportReceived(true);
      setFieldReport(SIMULATED_FIELD_REPORT);
      setConfidenceLevel("HIGH");
      setConfidenceScore(94);
      setIncidentStatus("VERIFIED");
    }
    if (step >= 6 && authorityDecision === "PENDING") {
      setIncidentStatus("DECISION_REQUIRED");
    }
    if (step >= 7 && authorityDecision === "PENDING") {
      setAuthorityDecision("APPROVED");
      setDecisionSigner("Magistrate & DC West Kameng (DDMA-WK-884)");
      setIncidentStatus("RESPONDING");
      setIsActionGapActive(true);
    }
    if (step >= 8) {
      setIsActionGapActive(true);
    }
    if (step >= 9 && !isActionConfirmed) {
      confirmActionGap();
    }
    if (step === 10) {
      setIncidentStatus("RESOLVED");
      setReplayStepIndex(9);
    }
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setSelectedIncidentCode("TG-2048");
    setIncidentStatus("ASSESSING");
    setRiskLevel("HIGH");
    setRiskScore(86);
    setConfidenceLevel("MODERATE");
    setConfidenceScore(54);
    setPriorityLevel("CRITICAL (P1)");
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
        incidentStatus,
        riskLevel,
        riskScore,
        confidenceLevel,
        confidenceScore,
        priorityLevel,
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
