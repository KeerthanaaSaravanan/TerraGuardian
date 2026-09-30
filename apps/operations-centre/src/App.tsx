import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { DemoScenarioProvider, useDemoScenario } from "./context/DemoScenarioContext";
import { PublicReportProvider, usePublicReport } from "./context/PublicReportContext";
import { CommandHeader } from "./components/CommandHeader";
import { CommandSidebar } from "./components/CommandSidebar";
import { CommandCentreView } from "./components/views/CommandCentreView";
import { IncidentWorkspaceView } from "./components/views/IncidentWorkspaceView";
import { EvidenceReconciliationView } from "./components/views/EvidenceReconciliationView";
import { ImpactPriorityView } from "./components/views/ImpactPriorityView";
import { FieldVerificationView } from "./components/views/FieldVerificationView";
import { AuthorityDecisionView } from "./components/views/AuthorityDecisionView";
import { ActionTrackingView } from "./components/views/ActionTrackingView";
import { ActionGapView } from "./components/views/ActionGapView";
import { ConfirmationView } from "./components/views/ConfirmationView";
import { IncidentReplayView } from "./components/views/IncidentReplayView";
import { GoldenDemoView } from "./components/views/GoldenDemoView";
import { TacticalMapView } from "./components/views/TacticalMapView";
import { PriorityQueueView } from "./components/views/PriorityQueueView";
import { ReviewWorkspaceView } from "./components/views/ReviewWorkspaceView";
import { AlertsWorkspaceView } from "./components/views/AlertsWorkspaceView";
import { FieldWorkspaceView } from "./components/views/FieldWorkspaceView";
import { OutcomesWorkspaceView } from "./components/views/OutcomesWorkspaceView";
import { AdminWorkspaceView } from "./components/views/AdminWorkspaceView";
import { LoginView } from "./components/auth/LoginView";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OperationalCopilot } from "./components/common/OperationalCopilot";
import { IconSparkles } from "./components/icons";
import {
  PublicLandingView,
  PublicAccessView,
  PhotoCaptureStep,
  LocationCaptureStep,
  ObservationReviewStep,
  AnalysisProgressStep,
  PreliminaryResultStep,
} from "./components/public";
import {
  IconRadar,
  IconMapPin,
  IconLayers,
  IconActivity,
  IconShieldCheck,
  IconClock,
  IconAlertTriangle,
  IconRadio,
  IconFileText,
} from "./components/icons";

type AppMode = "public" | "operator";

const OperatorWorkflow: React.FC<{ onSwitchToPublic: () => void }> = ({ onSwitchToPublic }) => {
  const {
    currentStep,
    setStep,
    activeNavTab,
    setActiveNavTab,
    navigationMode,
    incidentViewMode,
    openIncident,
    closeIncident,
    incidentCode,
  } = useDemoScenario();
  const [showCitizenModal, setShowCitizenModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  const handleCopilotNavigate = (view: string, payload?: any) => {
    if (view === "priority-queue") {
      setActiveNavTab("QUEUE");
    } else if (view === "tactical-map") {
      setActiveNavTab("MAP");
    } else if (view === "incident-twin") {
      setActiveNavTab("INCIDENTS");
    } else if (view === "evidence-reconciliation") {
      setActiveNavTab("EVIDENCE");
    } else if (view === "review-workspace" || view === "replay") {
      setActiveNavTab("REVIEW");
    } else if (view === "field-operations") {
      setActiveNavTab("FIELD");
    } else if (view === "alerts") {
      setActiveNavTab("ALERTS");
    }
  };

  return (
    <div className="flex h-screen w-full max-w-full bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 overflow-hidden font-sans">
      {/* Government-Grade Command Sidebar */}
      <CommandSidebar
        onSwitchToPublic={onSwitchToPublic}
        onOpenReportModal={() => setShowReportModal(true)}
      />

      {/* Main Container */}
      <div className="flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden min-w-0 relative">
        <CommandHeader
          onToggleCopilot={() => setShowCopilot((prev) => !prev)}
          isCopilotOpen={showCopilot}
        />

        <main className="flex-1 pb-10 min-w-0 w-full overflow-x-hidden">
          {navigationMode === "OPERATIONAL" ? (
            <>
              {activeNavTab === "OPERATIONS" && <CommandCentreView />}
              {activeNavTab === "QUEUE" && <PriorityQueueView />}
              {activeNavTab === "MAP" && <TacticalMapView />}
              {activeNavTab === "INCIDENTS" && <IncidentWorkspaceView />}
              {activeNavTab === "EVIDENCE" && <EvidenceReconciliationView />}
              {activeNavTab === "ALERTS" && <AlertsWorkspaceView />}
              {activeNavTab === "FIELD" && <FieldWorkspaceView />}
              {activeNavTab === "OUTCOMES" && <OutcomesWorkspaceView />}
              {activeNavTab === "REVIEW" && <ReviewWorkspaceView />}
              {activeNavTab === "ADMIN" && <AdminWorkspaceView />}
              {activeNavTab === "REPLAY" && <GoldenDemoView />}
            </>
          ) : (
            <>
              {currentStep === 1 && <CommandCentreView />}
              {currentStep === 2 && <IncidentWorkspaceView />}
              {currentStep === 3 && <EvidenceReconciliationView />}
              {currentStep === 4 && <ImpactPriorityView />}
              {currentStep === 5 && <FieldVerificationView />}
              {currentStep === 6 && <AuthorityDecisionView />}
              {currentStep === 7 && <ActionTrackingView />}
              {currentStep === 8 && <ActionGapView />}
              {currentStep === 9 && <ConfirmationView />}
              {currentStep === 10 && <IncidentReplayView />}
              {currentStep === 11 && <GoldenDemoView />}
            </>
          )}
        </main>
      </div>

      {/* Citizen PWA Modal */}
      {showCitizenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">TerraGuardian Safe</h3>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">Citizen Observation & Alert Companion</div>
                </div>
              </div>
              <button
                onClick={() => setShowCitizenModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed space-y-2">
              <p>
                <strong>TerraGuardian Safe</strong> is the mobile-first citizen PWA companion. While the Operations Centre handles multi-agency command, Safe provides localized alerts, camera-based hazard reporting, and offline-oriented architecture.
              </p>
              <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800 font-mono text-[11px] space-y-1">
                <div>• Offline-oriented PWA architecture with service worker caching</div>
                <div>• Geo-tagged citizen observation submission interface</div>
                <div>• Direct feed into Incident Twin evidence pipeline (REST)</div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowCitizenModal(false);
                onSwitchToPublic();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
            >
              Launch Public Reporter Flow
            </button>
          </div>
        </div>
      )}

      {/* Executive Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Executive Incident Briefing: TG-2048</h3>
                <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">DDMA West Kameng • Disaster Management Division</div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-neutral-300 space-y-2 font-mono">
              <div className="p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg border border-slate-200 dark:border-neutral-800 space-y-1">
                <div><strong>CORRIDOR:</strong> NH-13 KM-42 (Bhalukpong-Tenga)</div>
                <div><strong>HAZARD RISK:</strong> HIGH (86/100) — Slope Saturation 184mm</div>
                <div><strong>CONFIDENCE:</strong> HIGH (94%) — Ground Verified by SDRF</div>
                <div><strong>PRIORITY:</strong> CRITICAL (P1) — Sole Arterial Lifeline</div>
                <div><strong>DECISION:</strong> Enacted by DC/DM West Kameng (#DDMA-WK-884)</div>
                <div><strong>RESPONSE:</strong> Roadblock Confirmed at KM-38 (ASI Sonam)</div>
              </div>
            </div>

            <button
              onClick={() => setShowReportModal(false)}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
            >
              Close Briefing
            </button>
          </div>
        </div>
      )}

      {/* Operational Copilot Drawer */}
      <OperationalCopilot
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        currentIncidentCode={incidentCode || "TG-2048"}
        currentView={activeNavTab.toLowerCase()}
        onNavigateView={handleCopilotNavigate}
      />

      {/* Floating Copilot Quick Launcher Button */}
      {!showCopilot && (
        <button
          onClick={() => setShowCopilot(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-3.5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-2xl border border-indigo-400/40 transition-all hover:scale-105 group cursor-pointer"
          title="Open Operational Copilot (Command & Dialogue Layer)"
          aria-label="Open Operational Copilot"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <IconSparkles className="w-4 h-4 text-indigo-200" />
          <span className="text-xs font-mono font-bold tracking-wide">OPERATIONAL COPILOT</span>
        </button>
      )}
    </div>
  );
};

const PublicWorkflow: React.FC<{ onSwitchToOperator: () => void; onGoToEvidenceReconciliation: () => void }> = ({
  onSwitchToOperator,
  onGoToEvidenceReconciliation,
}) => {
  const { currentPublicStep } = usePublicReport();

  return (
    <div className="min-h-screen w-full">
      {currentPublicStep === "LANDING" && (
        <PublicLandingView onSelectOperatorLogin={onSwitchToOperator} />
      )}
      {currentPublicStep === "ACCESS" && (
        <PublicAccessView onSelectOperatorLogin={onSwitchToOperator} />
      )}
      {currentPublicStep === "CAPTURE_PHOTO" && <PhotoCaptureStep />}
      {currentPublicStep === "LOCATION_CONTEXT" && <LocationCaptureStep />}
      {currentPublicStep === "REVIEW" && <ObservationReviewStep />}
      {currentPublicStep === "PROCESSING" && <AnalysisProgressStep />}
      {currentPublicStep === "RESULT" && (
        <PreliminaryResultStep onGoToOperationsCentre={onGoToEvidenceReconciliation} />
      )}
    </div>
  );
};

const AppCore: React.FC = () => {
  const { isAuthorityUser } = useAuth();
  const { setStep } = useDemoScenario();
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("tg_app_mode");
      if (savedMode === "operator" || savedMode === "public") {
        return savedMode;
      }
      if (localStorage.getItem("tg_current_user") || localStorage.getItem("tg_auth_token")) {
        return "operator";
      }
    }
    return "public";
  });
  const [pendingStep, setPendingStep] = useState<number | null>(null);

  const handleSetAppMode = (mode: AppMode) => {
    setAppMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("tg_app_mode", mode);
    }
  };

  const handleGoToEvidenceReconciliation = () => {
    if (isAuthorityUser) {
      handleSetAppMode("operator");
      setStep(3); // Jump right into Step 3: Evidence Reconciliation to see the fused citizen report
    } else {
      setPendingStep(3);
      handleSetAppMode("operator");
    }
  };

  const handleSwitchToOperator = () => {
    handleSetAppMode("operator");
  };

  return (
    <>
      {appMode === "public" ? (
        <PublicWorkflow
          onSwitchToOperator={handleSwitchToOperator}
          onGoToEvidenceReconciliation={handleGoToEvidenceReconciliation}
        />
      ) : isAuthorityUser ? (
        <OperatorWorkflow onSwitchToPublic={() => handleSetAppMode("public")} />
      ) : (
        <LoginView
          onSuccess={() => {
            handleSetAppMode("operator");
            if (pendingStep) {
              setStep(pendingStep as any);
              setPendingStep(null);
            }
          }}
          onCancel={() => {
            setPendingStep(null);
            handleSetAppMode("public");
          }}
        />
      )}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DemoScenarioProvider>
          <PublicReportProvider>
            <AppCore />
          </PublicReportProvider>
        </DemoScenarioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
