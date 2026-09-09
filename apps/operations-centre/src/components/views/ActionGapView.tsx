import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { PrincipleBanner } from "../common";
import {
  IconAlertTriangle,
  IconShieldAlert,
  IconRadio,
  IconCheckCircle2,
  IconTruck,
  IconClock,
  IconArrowRight,
  IconSend,
} from "../icons";

export const ActionGapView: React.FC = () => {
  const { setStep, escalateActionGap, confirmActionGap, isActionConfirmed } = useDemoScenario();
  const [escalated, setEscalated] = useState(false);

  const handleEscalate = () => {
    setEscalated(true);
    escalateActionGap();
  };

  const handleConfirm = () => {
    confirmActionGap();
    setStep(9);
  };

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 8 OF 10</span>
            <span>•</span>
            <span className="text-red-600 dark:text-red-400 font-bold">AUTONOMOUS CONFORMANCE & GAP WATCHDOG</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Operational Response Conformance Monitoring
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Continuous background audit ensuring authorized safety orders are translated into confirmed physical barricades.
          </p>
        </div>

        {isActionConfirmed && (
          <button
            onClick={() => setStep(9)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
          >
            <span>Proceed to Confirmation View</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* PROMINENT OPERATIONAL ALERT: ACTION GAP DETECTED */}
      <div className="bg-gradient-to-b from-red-50 to-white dark:from-red-950/90 dark:to-neutral-900 border-2 border-red-500 rounded-xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden">
        {/* Pulsing hazard glow in dark mode */}
        <div className="hidden dark:block absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-200 dark:border-red-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-red-600 text-white animate-bounce shadow-md">
              <IconAlertTriangle className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded tracking-wider uppercase">
                  OPERATIONAL ALERT
                </span>
                <span className="text-red-700 dark:text-red-300 font-mono text-xs font-bold">
                  CONFORMANCE VIOLATION #AG-429
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                ACTION GAP DETECTED
              </h2>
            </div>
          </div>

          <div className="bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700/80 px-4 py-2 rounded-lg text-right font-mono">
            <div className="text-[10px] text-red-800 dark:text-red-300 font-bold">TIME ELAPSED SINCE SIGN-OFF</div>
            <div className="text-xl font-bold text-red-950 dark:text-white">14 min 28 sec</div>
          </div>
        </div>

        {/* Gap Description & Operational Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-2">
          <div className="lg:col-span-8 space-y-3">
            <div className="text-sm font-bold text-red-900 dark:text-red-200">
              "Approved road restriction has NOT yet been confirmed on the ground by West Kameng Traffic Police Checkpoint (KM-38)."
            </div>
            <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
              <strong>OPERATIONAL VULNERABILITY:</strong> Although the District Magistrate signed Disaster Order #DDMA-WK-884 at 04:56 IST, the field unit at KM-38 has not verified the placement of physical barricades or stoppage of uphill traffic.
              Debris slurry at KM-42 is actively expanding. <strong>Loaded civilian vehicles may still be entering the hazardous runout corridor.</strong>
            </p>
            <div className="bg-white dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-mono text-slate-800 dark:text-neutral-300">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">CORE PRINCIPLE:</span> "Approved action ≠ Completed action. The incident remains LIVE until physical response confirmation is verified."
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-500 uppercase font-bold">
                AFFECTED CORRIDOR NODE
              </span>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                KM-38 Checkpost (Bhalukpong Gate)
              </div>
              <div className="text-[11px] text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
                Target: Physical roadblock & freight diversion
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-[11px] font-mono">
              <span className="text-slate-500 dark:text-neutral-500">Unconfirmed Unit:</span>
              <div className="text-amber-600 dark:text-amber-400 font-semibold">ASI D. Sonam (Thana Wireless)</div>
            </div>
          </div>
        </div>

        {/* Action Controls: ESCALATE vs MARK CONFIRMED */}
        <div className="pt-4 border-t border-red-200 dark:border-red-900/60 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono text-red-800 dark:text-red-300 font-medium">
            Immediate supervisor intervention required to avoid catastrophic vehicle engulfment.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleEscalate}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
                escalated
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-600"
                  : "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-sm"
              }`}
            >
              <IconRadio className="w-4 h-4 animate-pulse" />
              <span>{escalated ? "ESCALATED (TETRA BROADCAST ACTIVE)" : "ESCALATE TO DISTRICT SP"}</span>
            </button>

            <button
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <IconCheckCircle2 className="w-4 h-4" />
              <span>MARK CONFIRMED (Field Barrier Verified)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

