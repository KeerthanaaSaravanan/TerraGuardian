/**
 * Review Workspace View for TerraGuardian Operations Centre.
 *
 * Dedicated Forensic, Conformance & Outcome Review Hub integrating:
 * - Append-Only Audit Timeline & Event Replay (IncidentReplayView).
 * - Action Gap Watchdog & Conformance Monitoring (ActionGapView).
 * - Outcome Engine Evaluation & Living Reassessment (GoldenDemoView).
 */

import React, { useState } from "react";
import { IncidentReplayView } from "./IncidentReplayView";
import { ActionGapView } from "./ActionGapView";
import { GoldenDemoView } from "./GoldenDemoView";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import {
  IconClock,
  IconAlertTriangle,
  IconShieldCheck,
  IconActivity,
} from "../icons";

export type ReviewSubTab = "TIMELINE" | "ACTION_GAP" | "OUTCOME";

export const ReviewWorkspaceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<ReviewSubTab>("TIMELINE");
  const { incidentStatus, isActionGapActive } = useDemoScenario();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-[1700px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Review Hub Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <IconShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>POST-INCIDENT FORENSICS, CONFORMANCE & OUTCOME REVIEW</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 font-bold">
                AUDIT READY
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              Incident TG-2048 • Append-Oriented Operational Audit Log • Statutory Conformance Verification
            </p>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg p-1 font-mono text-xs">
          <button
            onClick={() => setActiveSubTab("TIMELINE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "TIMELINE"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconClock className="w-3.5 h-3.5 text-blue-500" />
            <span>Audit Timeline</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ACTION_GAP")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "ACTION_GAP"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconAlertTriangle
              className={`w-3.5 h-3.5 ${isActionGapActive ? "text-red-500 animate-pulse" : "text-amber-500"}`}
            />
            <span>Action Gap Watchdog</span>
            {isActionGapActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("OUTCOME")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "OUTCOME"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconActivity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Outcome & Reassessment</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div className="flex-1">
        {activeSubTab === "TIMELINE" && <IncidentReplayView />}
        {activeSubTab === "ACTION_GAP" && <ActionGapView />}
        {activeSubTab === "OUTCOME" && <GoldenDemoView />}
      </div>
    </div>
  );
};
