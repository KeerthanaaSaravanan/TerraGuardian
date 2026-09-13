import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { PrincipleBanner } from "../common";
import {
  IconTruck,
  IconRadio,
  IconCheckCircle2,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
  IconBuilding,
  IconActivity,
} from "../icons";

export const ActionTrackingView: React.FC = () => {
  const { setStep, operationalTasks } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 7 OF 10</span>
            <span>•</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">MULTI-AGENCY ACTION DISPATCH & EXECUTION</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Coordinated Response Matrix for NH-13 Corridor
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Operational dispatch tracking across Border Roads Organisation, State Police, PWD, and DDMA.
          </p>
        </div>

        <button
          onClick={() => setStep(8)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
        >
          <span>Simulate Elapsed Time & Detect Action Gap (Step 8)</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* CORE OPERATIONAL CALLOUT: APPROVED ACTION ≠ COMPLETED ACTION */}
      <PrincipleBanner
        principle="APPROVED ACTION ≠ COMPLETED ACTION"
        title="Operational Reality: An authorized action is only an order, not safety."
        explanation="In paper disaster management, issuing an order is often mistaken for completing it. In TerraGuardian, an authorized action remains LIVE and UNCONFIRMED until the responding agency provides cryptographic or wireless confirmation of ground execution."
        variant="cyan"
      />

      {/* Dispatched Tasks Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-950/50">
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
            ACTIVE TASK DISPATCH QUEUE (4 ASSIGNMENTS)
          </span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-500">
            CHANNELS: TETRA RADIO + ERSS-112 + PWD NET
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-neutral-800">
          {operationalTasks.map((task) => {
            const isGap = task.isActionGapTrigger;
            return (
              <div
                key={task.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isGap
                    ? "bg-amber-50/60 dark:bg-amber-950/15 border-l-4 border-amber-500"
                    : "hover:bg-slate-50/60 dark:hover:bg-neutral-950/40"
                }`}
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-neutral-400">{task.id}</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-neutral-950 border border-emerald-300 dark:border-neutral-800">
                      {task.agency}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-500">
                      Assigned: {task.assignedTo}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{task.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">{task.description}</p>
                </div>

                <div className="flex flex-col md:items-end gap-2 shrink-0 font-mono">
                  <div className="flex items-center gap-2">
                    {task.status === "COMPLETED" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800">
                        <IconCheckCircle2 className="w-3.5 h-3.5" />
                        COMPLETED
                      </span>
                    )}
                    {task.status === "ACKNOWLEDGED" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-300 dark:border-cyan-800">
                        <IconClock className="w-3.5 h-3.5" />
                        ACKNOWLEDGED
                      </span>
                    )}
                    {task.status === "IN_PROGRESS" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-800">
                        <IconActivity className="w-3.5 h-3.5" />
                        IN PROGRESS
                      </span>
                    )}
                    {task.status === "UNCONFIRMED_GAP" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 animate-pulse">
                        <IconAlertTriangle className="w-3.5 h-3.5" />
                        UNCONFIRMED (14m)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-500">Issued: {task.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

