import React from "react";
import { useDemoScenario, DemoStep } from "../context/DemoScenarioContext";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./common";
import { IconChevronRight, IconRotateCcw, IconShieldCheck } from "./icons";

const STEPS: { num: DemoStep; name: string; tag: string }[] = [
  { num: 1, name: "Predict", tag: "NER Grid" },
  { num: 2, name: "Observe", tag: "TG-2048" },
  { num: 3, name: "Reconcile", tag: "Risk ≠ Conf" },
  { num: 4, name: "Prioritize", tag: "Impact Cascade" },
  { num: 5, name: "Ground Truth", tag: "Field Verification" },
  { num: 6, name: "Authorize", tag: "Human Auth" },
  { num: 7, name: "Act", tag: "Action Dispatch" },
  { num: 8, name: "Conformance", tag: "Approved ≠ Done" },
  { num: 9, name: "Confirm", tag: "Closed-Loop" },
  { num: 10, name: "Forensics", tag: "Audit Replay" },
  { num: 11, name: "Golden Demo", tag: "Living Incident" },
];

export const DemoHeader: React.FC = () => {
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    resetDemo,
    incidentStatus,
    hazardState,
    riskLevel,
    confidenceLevel,
    confidenceScore,
    priorityLevel,
    backendStatus,
  } = useDemoScenario();

  const { user, logout, isAuthorityUser, isPublicUser } = useAuth();

  return (
    <header className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 transition-colors w-full min-w-0">
      {/* Top Identity & Operational Status Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-slate-200/80 dark:border-slate-800/80 min-w-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo Mark */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-md shadow-emerald-900/20 text-white font-black text-xs sm:text-sm tracking-wider">
            TG
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white shrink-0">
                TERRAGUARDIAN AI
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-semibold shrink-0">
                DEMONSTRATION SYSTEM
              </span>
              {backendStatus === "CONNECTED" ? (
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 font-semibold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API SYNCED
                </span>
              ) : backendStatus === "CONNECTING" ? (
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold shrink-0">
                  ... SYNCING
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-400 font-semibold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  DEMO ENGINE
                </span>
              )}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden 2xl:inline truncate">
                CLOSED-LOOP LANDSLIDE INTELLIGENCE (NER)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono tracking-wider text-emerald-700 dark:text-emerald-400 font-medium truncate">
              FROM WARNING TO ACTION • <span className="opacity-80">MONITORING WATCHES THE HAZARD. TERRAGUARDIAN MANAGES THE INCIDENT.</span>
            </div>
          </div>
        </div>

        {/* Central Operational State Strip */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3 py-1 rounded-lg text-xs font-mono shrink-0">
          <span className="text-slate-500 dark:text-slate-400">INCIDENT:</span>
          <span className="text-slate-900 dark:text-white font-bold">TG-2048</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400">STATE:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">{incidentStatus}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400">RISK:</span>
          <span className="text-orange-600 dark:text-orange-400 font-bold">{riskLevel}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400">CONF:</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{confidenceLevel} ({confidenceScore}%)</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400">PRIORITY:</span>
          <span className="text-red-600 dark:text-red-400 font-bold">{priorityLevel}</span>
        </div>

        {/* Global Controls, User Session & Theme Switcher */}
        <div className="flex items-center gap-2">
          {/* User Session Pill */}
          {user && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isAuthorityUser ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                {user.role}
              </span>
              <button
                onClick={logout}
                title="Sign out of Operations Session"
                className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 underline ml-1"
              >
                Sign Out
              </button>
            </div>
          )}

          <ThemeToggle />

          <button
            onClick={resetDemo}
            title="Reset to Step 1 Initial State"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition-colors border border-slate-300 dark:border-slate-700"
          >
            <IconRotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-0.5 font-mono">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                currentStep === 1
                  ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              ← Prev
            </button>
            <span className="px-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              {currentStep}/11
            </span>
            <button
              onClick={nextStep}
              disabled={currentStep === 11}
              className={`px-2.5 py-1 text-xs rounded font-bold transition-colors flex items-center gap-1 ${
                currentStep === 11
                  ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
              }`}
            >
              <span>Next</span>
              <IconChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 11-Step Interactive Clickable Flow Stepper */}
      <nav
        aria-label="Demo Flow Stepper"
        className="flex items-center overflow-x-auto py-1.5 px-4 gap-1.5 bg-slate-50 dark:bg-slate-950/70 scrollbar-none transition-colors border-t border-slate-200/50 dark:border-slate-800/50"
      >
        {STEPS.map((s) => {
          const isActive = currentStep === s.num;
          const isPassed = currentStep > s.num;
          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all border font-sans ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500/40 font-bold shadow-sm"
                  : isPassed
                  ? "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 font-medium"
                  : "bg-transparent text-slate-500 dark:text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-400"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isPassed
                    ? "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {s.num}
              </span>
              <span>{s.name}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {s.tag}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
