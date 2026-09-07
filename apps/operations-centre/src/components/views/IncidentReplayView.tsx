import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { REPLAY_TIMELINE_STEPS, TimelineMilestone } from "../../data/deterministicScenario";
import {
  IconPlay,
  IconCheckCircle2,
  IconClock,
  IconRotateCcw,
  IconFileText,
  IconShieldCheck,
  IconActivity,
  IconRadio,
} from "../icons";

export const IncidentReplayView: React.FC = () => {
  const { replayActiveStepIndex, setReplayStepIndex, resetDemo } = useDemoScenario();
  const currentMilestone: TimelineMilestone =
    REPLAY_TIMELINE_STEPS[replayActiveStepIndex] ?? (REPLAY_TIMELINE_STEPS[0] as TimelineMilestone);

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span>STEP 10 OF 10</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">END-TO-END INCIDENT REPLAY & AUDIT TRAIL</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            Deterministic Post-Incident Audit: TG-2048
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Full cryptographic timeline tracing the closed-loop progression from initial sensor detection to verified human resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
            <IconCheckCircle2 className="w-4 h-4 text-emerald-400" />
            STATUS: RESOLVED / READY FOR REVIEW
          </span>

          <button
            onClick={resetDemo}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-xs border border-neutral-700 transition-all"
          >
            <IconRotateCcw className="w-3.5 h-3.5" />
            <span>Restart Demo</span>
          </button>
        </div>
      </div>

      {/* Interactive Timeline Scrubber Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-2">
            <IconClock className="w-4 h-4 text-emerald-400" />
            CHRONOLOGICAL MILESTONE SCRUBBER (CLICK ANY EVENT TO INSPECT)
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            10 VERIFIED PROVENANCE EVENTS
          </span>
        </div>

        {/* Milestone Buttons Scrubber */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {REPLAY_TIMELINE_STEPS.map((step, idx) => {
            const isSelected = replayActiveStepIndex === idx;
            return (
              <button
                key={step.step}
                onClick={() => setReplayStepIndex(idx)}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? "bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg"
                    : "bg-neutral-950/80 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">
                    #{step.step}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500">{step.time}</span>
                </div>
                <div className="text-xs font-bold text-white truncate w-full mt-1">
                  {step.title}
                </div>
                <span
                  className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 uppercase"
                  style={{
                    backgroundColor: `${step.badgeColor}20`,
                    color: step.badgeColor,
                    border: `1px solid ${step.badgeColor}40`,
                  }}
                >
                  {step.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Milestone Inspection Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <span
              className="p-3 rounded-xl font-bold font-mono text-base"
              style={{
                backgroundColor: `${currentMilestone.badgeColor}25`,
                color: currentMilestone.badgeColor,
                border: `1px solid ${currentMilestone.badgeColor}60`,
              }}
            >
              EVENT #{currentMilestone.step}
            </span>
            <div>
              <div className="text-xs font-mono text-neutral-400">
                TIMESTAMP: <strong className="text-white">{currentMilestone.time}</strong> | ACTOR:{" "}
                <strong className="text-emerald-400">{currentMilestone.actor}</strong>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">{currentMilestone.title}</h2>
            </div>
          </div>

          <span
            className="font-mono text-xs font-bold px-3 py-1 rounded-full border uppercase"
            style={{
              backgroundColor: `${currentMilestone.badgeColor}20`,
              color: currentMilestone.badgeColor,
              borderColor: currentMilestone.badgeColor,
            }}
          >
            PHASE: {currentMilestone.badge}
          </span>
        </div>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-200 leading-relaxed font-sans">
          {currentMilestone.description}
        </div>

        {/* Closed-Loop Architectural Audit Summary */}
        <div className="mt-2 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">INNOVATION PROVEN:</span>
            <span className="text-white font-bold">Risk ≠ Confidence</span>
            <span className="text-neutral-400 block text-[10px] mt-1">Satellite cloud cover isolated</span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">PRIORITY PRINCIPLE:</span>
            <span className="text-white font-bold">Highest Hazard ≠ Priority</span>
            <span className="text-neutral-400 block text-[10px] mt-1">Lifeline vulnerability factor</span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">SAFETY BOUNDARY:</span>
            <span className="text-white font-bold">AI Recommends → Human Decides</span>
            <span className="text-neutral-400 block text-[10px] mt-1">Mandatory Magistrate signature</span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">ACTION CONFORMANCE:</span>
            <span className="text-white font-bold">Action Gap Catch & Close</span>
            <span className="text-neutral-400 block text-[10px] mt-1">Confirmed ground roadblock</span>
          </div>
        </div>
      </div>
    </div>
  );
};
