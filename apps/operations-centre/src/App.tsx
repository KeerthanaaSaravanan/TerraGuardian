import React from "react";
import { DemoScenarioProvider, useDemoScenario } from "./context/DemoScenarioContext";
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
import {
  IconRadar,
  IconMapPin,
  IconLayers,
  IconActivity,
  IconShieldCheck,
  IconClock,
  IconRadio,
  IconAlertTriangle,
} from "./components/icons";

const MainContent: React.FC = () => {
  const { currentStep, setStep } = useDemoScenario();

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Sleek Government-Grade Rail Sidebar */}
      <aside className="hidden md:flex w-16 flex-col items-center justify-between border-r border-neutral-800 bg-neutral-900/90 py-4 z-40">
        <div className="flex flex-col items-center gap-6">
          <div
            onClick={() => setStep(1)}
            title="Command Centre (Step 1)"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-lg shadow-emerald-950 transition-transform hover:scale-105"
          >
            TG
          </div>

          {/* Quick-Jump Nav Icons */}
          <nav className="flex flex-col items-center gap-3 text-neutral-400" aria-label="Operations Shortcuts">
            <button
              onClick={() => setStep(1)}
              title="Step 1: Regional Command Centre"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 1 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconRadar className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(2)}
              title="Step 2: Incident Workspace TG-2048"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 2 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconMapPin className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(3)}
              title="Step 3: Evidence Reconciliation"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 3 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconLayers className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(4)}
              title="Step 4: Impact & Priority Cascade"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 4 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconActivity className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(6)}
              title="Step 6: Authority Decision Gate"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 6 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(8)}
              title="Step 8: Action Gap Watchdog"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 8 ? "bg-red-950 text-red-400 border border-red-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconAlertTriangle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep(10)}
              title="Step 10: Complete Audit Replay"
              className={`p-2.5 rounded-lg transition-colors ${
                currentStep === 10 ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60" : "hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <IconClock className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Radio Link Status indicator */}
        <div className="flex flex-col items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[9px] font-mono text-emerald-400 font-bold">ONLINE</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col h-screen overflow-y-auto">
        <DemoHeader />

        <main className="flex-1 pb-10">
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
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DemoScenarioProvider>
      <MainContent />
    </DemoScenarioProvider>
  );
};
