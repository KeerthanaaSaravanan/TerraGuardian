import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { HAZARD_PROPAGATION_CHAIN, ImpactNode } from "../../data/deterministicScenario";
import {
  IconArrowRight,
  IconAlertTriangle,
  IconTruck,
  IconBuilding,
  IconActivity,
  IconMountain,
  IconShieldAlert,
} from "../icons";

export const ImpactPriorityView: React.FC = () => {
  const { setStep, priorityLevel } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span>STEP 4 OF 10</span>
            <span>•</span>
            <span className="text-red-400 font-bold">HAZARD PROPAGATION & PRIORITY ANALYSIS</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            Downstream Vulnerability & Infrastructure Cascade
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Evaluating physical runout, transport corridor redundancy, community exposure, and regional lifeline dependencies.
          </p>
        </div>

        <button
          onClick={() => setStep(5)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
        >
          <span>Dispatch Field Verification Patrol</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* CORE OPERATIONAL CALLOUT: HIGHEST HAZARD ≠ HIGHEST PRIORITY */}
      <div className="bg-gradient-to-r from-red-950/70 via-neutral-900 to-amber-950/70 border-2 border-red-500/80 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="p-3 rounded-xl bg-red-900/60 text-red-300 border border-red-600/60 shadow">
            <IconShieldAlert className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold text-red-300">
              <span>CORE ARCHITECTURAL RULE:</span>
              <span className="bg-red-500 text-white px-2 py-0.2 rounded font-black text-xs">
                HIGHEST HAZARD ≠ HIGHEST PRIORITY
              </span>
            </div>
            <div className="text-base font-bold text-white">
              Why TG-2048 is Rated <span className="text-red-400 font-mono">{priorityLevel}</span>
            </div>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              In raw geological volume, a 50,000 m³ rock avalanche in the unpopulated Upper Dibang gorge has higher hazard magnitude. However, it threatens zero humans or lifelines (Priority: P3).
              <br />
              Conversely, TG-2048 represents a 450 m³ debris flow that <strong>directly severs NH-13</strong>—the <em>sole</em> heavy transport and oxygen lifeline into West Kameng and Tawang—while threatening 1,420 downstream villagers.
              <br />
              <span className="text-red-300 font-semibold font-mono">
                Formula: Priority = Hazard (86) × Exposure (92) × Criticality (98) × Isolation Penalty (1.5x) → CRITICAL (P1)
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 text-center min-w-[200px]">
          <span className="text-[11px] font-mono text-neutral-400">PRIORITY MATRIX</span>
          <span className="text-2xl font-black text-red-500 font-mono">P1 CRITICAL</span>
          <span className="text-[10px] text-neutral-500 font-mono">ZERO ROAD DETOURS</span>
        </div>
      </div>

      {/* Hazard Propagation Cascade Chain */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <IconActivity className="w-4 h-4 text-emerald-400" />
            DOWNSTREAM HAZARD PROPAGATION CASCADE
          </h3>
          <span className="text-xs font-mono text-neutral-400">4-STAGE DISASTER CONVERGENCE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {HAZARD_PROPAGATION_CHAIN.map((node, index) => (
            <div
              key={node.stage}
              className="relative bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3 group hover:border-neutral-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                    {node.stage}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                      node.severity === "CRITICAL"
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : "bg-orange-950 text-orange-300 border border-orange-800"
                    }`}
                  >
                    {node.severity}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="p-2 rounded-lg bg-neutral-900 text-white">
                    {node.category === "ORIGIN" && <IconMountain className="w-4 h-4 text-amber-400" />}
                    {node.category === "CORRIDOR" && <IconTruck className="w-4 h-4 text-red-400" />}
                    {node.category === "COMMUNITY" && <IconBuilding className="w-4 h-4 text-amber-400" />}
                    {node.category === "LIFELINE" && <IconActivity className="w-4 h-4 text-blue-400" />}
                  </span>
                  <h4 className="text-sm font-bold text-white leading-tight">{node.name}</h4>
                </div>

                <p className="text-xs text-neutral-300 mt-2 leading-relaxed">{node.description}</p>
              </div>

              <div className="mt-2 pt-2 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-400">
                <span className="text-neutral-500">Vulnerability: </span>
                <span className="text-neutral-300">{node.vulnerabilityFactor}</span>
              </div>

              {/* Arrow linking to next step */}
              {index < HAZARD_PROPAGATION_CHAIN.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-neutral-900 border border-neutral-700 rounded-full p-1 text-emerald-400 shadow">
                  <IconArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
