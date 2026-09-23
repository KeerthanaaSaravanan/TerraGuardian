import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { DemoScenarioProvider, useDemoScenario } from "./context/DemoScenarioContext";
import { PublicReportProvider, usePublicReport } from "./context/PublicReportContext";
import { DemoHeader } from "./components/DemoHeader";
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
import { LoginView } from "./components/auth/LoginView";
import { AuthProvider, useAuth } from "./context/AuthContext";
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
  const { currentStep, setStep } = useDemoScenario();
  const [showCitizenModal, setShowCitizenModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div className="flex h-screen w-full max-w-full bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 overflow-hidden font-sans">
      {/* Sleek Government-Grade Rail Sidebar */}
      <aside className="hidden md:flex w-16 flex-col items-center justify-between border-r border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 py-4 z-40 transition-colors">
        <div className="flex flex-col items-center gap-6">
          <div
            onClick={() => setStep(1)}
            title="Command Centre (Step 1)"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-lg shadow-emerald-950/20 transition-transform hover:scale-105"
          >
            TG
          </div>

          {/* Quick-Jump Nav Icons */}
          <nav className="flex flex-col items-center gap-2.5 text-slate-500 dark:text-neutral-400" aria-label="Operations Shortcuts">
            <button
              onClick={() => setStep(1)}
              title="Step 1: Regional Command Centre"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 1
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconRadar className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(2)}
              title="Step 2: Incident Workspace TG-2048"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 2
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconMapPin className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(3)}
              title="Step 3: Evidence Reconciliation"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 3
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconLayers className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(4)}
              title="Step 4: Impact & Priority Cascade"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 4
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconActivity className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(6)}
              title="Step 6: Authority Decision Gate"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 6
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(8)}
              title="Step 8: Action Gap Watchdog"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 8
                  ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700/60 shadow-sm animate-pulse"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconAlertTriangle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(10)}
              title="Step 10: Complete Audit Replay"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 10
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconClock className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(11)}
              title="Step 11: Living Incident & Reassessment (Golden Demo)"
              className={`p-2.5 rounded-lg transition-all ${
                currentStep === 11
                  ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 shadow-sm animate-pulse"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <IconShieldCheck className="w-5 h-5 text-amber-500" />
            </button>
          </nav>
        </div>

        {/* Secondary utilities & Switch to Public mode */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onSwitchToPublic}
            title="Switch to Public Citizen Portal (TerraGuardian Safe)"
            className="p-2 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <IconRadio className="w-5 h-5 text-emerald-500" />
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            title="Executive Incident Briefing Report"
            className="p-2 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <IconFileText className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-1 pt-2 border-t border-slate-200 dark:border-neutral-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">ONLINE</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden min-w-0">
        <DemoHeader />

        <main className="flex-1 pb-10 min-w-0 w-full overflow-x-hidden">
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
        </main>
      </div>

      {/* Citizen PWA Modal */}
      {showCitizenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  TG
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
  const [appMode, setAppMode] = useState<AppMode>("public");
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const { isAuthorityUser } = useAuth();
  const { setStep } = useDemoScenario();

  const handleGoToEvidenceReconciliation = () => {
    if (isAuthorityUser) {
      setAppMode("operator");
      setStep(3); // Jump right into Step 3: Evidence Reconciliation to see the fused citizen report
    } else {
      setPendingStep(3);
      setAppMode("operator");
    }
  };

  const handleSwitchToOperator = () => {
    setAppMode("operator");
  };

  return (
    <>
      {appMode === "public" ? (
        <PublicWorkflow
          onSwitchToOperator={handleSwitchToOperator}
          onGoToEvidenceReconciliation={handleGoToEvidenceReconciliation}
        />
      ) : isAuthorityUser ? (
        <OperatorWorkflow onSwitchToPublic={() => setAppMode("public")} />
      ) : (
        <LoginView
          onSuccess={() => {
            setAppMode("operator");
            if (pendingStep) {
              setStep(pendingStep as any);
              setPendingStep(null);
            }
          }}
          onCancel={() => {
            setPendingStep(null);
            setAppMode("public");
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
