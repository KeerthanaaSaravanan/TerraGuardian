import React from "react";
import { useDemoScenario, DemoStep } from "../context/DemoScenarioContext";
import { IconShieldCheck, IconChevronRight, IconRotateCcw, IconActivity } from "./icons";

const STEPS: { num: DemoStep; name: string; tag: string }[] = [
  { num: 1, name: "Command Centre", tag: "NER Map" },
  { num: 2, name: "Workspace", tag: "TG-2048" },
  { num: 3, name: "Evidence", tag: "Risk ≠ Conf" },
  { num: 4, name: "Impact", tag: "Priority" },
  { num: 5, name: "Verification", tag: "Ground Truth" },
  { num: 6, name: "Decision", tag: "Human Auth" },
  { num: 7, name: "Tracking", tag: "Dispatched" },
  { num: 8, name: "Action Gap", tag: "Alert" },
  { num: 9, name: "Confirmation", tag: "Closed-Loop" },
  { num: 10, name: "Replay", tag: "Post-Audit" },
];

export const DemoHeader: React.FC = () => {
  const { currentStep, setStep, nextStep, prevStep, resetDemo, incidentStatus, riskLevel, confidenceLevel } =
    useDemoScenario();

  return (
    <header className="flex flex-col border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md sticky top-0 z-50">
      {/* Top Identity & Status Row */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-800/60">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 shadow-md shadow-emerald-950/40 text-white font-bold text-sm tracking-wider">
            TG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">TERRAGUARDIAN AI</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                DEMO PROTOTYPE
              </span>
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                SIH 2026 | CLOSED-LOOP INTELLIGENCE
              </span>
            </div>
            <div className="text-[11px] font-mono tracking-wider text-emerald-400 uppercase font-medium">
              FROM WARNING TO ACTION
            </div>
          </div>
        </div>

        {/* Central Operational Status Pill */}
        <div className="hidden lg:flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="text-neutral-400">INCIDENT:</span>
          <span className="text-white font-bold">TG-2048</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">STATE:</span>
          <span className="text-emerald-400 font-semibold">{incidentStatus}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">RISK:</span>
          <span className="text-red-400 font-semibold">{riskLevel}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">CONFIDENCE:</span>
          <span className="text-amber-400 font-semibold">{confidenceLevel}</span>
        </div>

        {/* Global Controls & Step Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetDemo}
            title="Reset to Step 1"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors border border-neutral-700"
          >
            <IconRotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                currentStep === 1
                  ? "text-neutral-600 cursor-not-allowed"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              ← Prev
            </button>
            <span className="px-2 text-xs font-mono text-emerald-400 font-bold">
              {currentStep}/10
            </span>
            <button
              onClick={nextStep}
              disabled={currentStep === 10}
              className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors flex items-center gap-1 ${
                currentStep === 10
                  ? "text-neutral-600 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow"
              }`}
            >
              <span>Next</span>
              <IconChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 10-Step Interactive Clickable Flow Bar */}
      <nav aria-label="Demo Flow Stepper" className="flex items-center overflow-x-auto py-1 px-4 gap-1.5 bg-neutral-950/60 scrollbar-none">
        {STEPS.map((s) => {
          const isActive = currentStep === s.num;
          const isPassed = currentStep > s.num;
          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/80 shadow-sm shadow-emerald-950 ring-1 ring-emerald-500/40 font-semibold"
                  : isPassed
                  ? "bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                  : "bg-neutral-900/30 text-neutral-500 border-neutral-800/40 hover:text-neutral-400"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-emerald-500 text-neutral-950"
                    : isPassed
                    ? "bg-neutral-700 text-neutral-200"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {s.num}
              </span>
              <span>{s.name}</span>
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                  isActive ? "bg-emerald-900/60 text-emerald-300" : "text-neutral-500"
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
