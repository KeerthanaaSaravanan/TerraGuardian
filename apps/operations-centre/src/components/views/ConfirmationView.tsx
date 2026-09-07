import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import {
  IconCheckCircle2,
  IconShieldCheck,
  IconTruck,
  IconRadio,
  IconArrowRight,
  IconClock,
  IconRotateCcw,
} from "../icons";

export const ConfirmationView: React.FC = () => {
  const { setStep, incidentStatus } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span>STEP 9 OF 10</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">RESPONSE CLOSED-LOOP CONFIRMATION</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            Ground Action Verified & Incident Loop Closed
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Physical roadblock installation verified on NH-13 KM-38. Zero civilian exposure remains in the active runout zone.
          </p>
        </div>

        <button
          onClick={() => setStep(10)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
        >
          <span>Launch Full Incident Replay (Step 10)</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Success Confirmation Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-teal-950/80 border-2 border-emerald-500 rounded-xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <span className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950">
            <IconCheckCircle2 className="w-8 h-8" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 font-bold">
              <span>CLOSED-LOOP VERIFICATION COMPLETE</span>
              <span>•</span>
              <span className="bg-emerald-950 border border-emerald-700 px-2 py-0.2 rounded text-[10px]">
                STATE: {incidentStatus}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Physical Roadblock & Diversion Confirmed Operational
            </h2>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              ASI D. Sonam confirmed via encrypted TETRA wireless network that steel barriers and police warning flashers are secured across both lanes at KM-38.
              Heavy commercial traffic is safely held in the Bhalukpong staging ground.
            </p>
          </div>
        </div>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-center font-mono min-w-[200px]">
          <div className="text-[10px] text-neutral-400">CORRIDOR STATUS</div>
          <div className="text-emerald-400 font-bold text-base mt-1">TRAFFIC SAFELY DIVERTED</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">CASUALTY RISK ELIMINATED</div>
        </div>
      </div>

      {/* Details Grid: Verified Response Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-col justify-between gap-3 shadow">
          <div>
            <div className="text-xs font-mono text-neutral-400 uppercase font-bold flex items-center gap-2">
              <IconTruck className="w-4 h-4 text-emerald-400" />
              PHYSICAL BARRIER TELEMETRY
            </div>
            <div className="text-sm font-bold text-white mt-2">
              NH-13 KM-38 Police Checkpost
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              Barriers installed across 2 lanes. Warning flares deployed. 18 commercial trucks and 2 fuel bowsers safely halted south of slide danger zone.
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500">
            Confirming Officer: <strong className="text-neutral-300">ASI D. Sonam</strong>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-col justify-between gap-3 shadow">
          <div>
            <div className="text-xs font-mono text-neutral-400 uppercase font-bold flex items-center gap-2">
              <IconRadio className="w-4 h-4 text-cyan-400" />
              EARTHMOVER STAGING
            </div>
            <div className="text-sm font-bold text-white mt-2">
              BRO TF 14 / 85 RCC Pre-Positioned
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              JCB-3DX wheel loader and crawler excavator staged at KM-40 shoulder. Ready for immediate debris clearance as soon as rain recedes.
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500">
            Field Unit: <strong className="text-neutral-300">Major V. Sharma (BRO)</strong>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-col justify-between gap-3 shadow">
          <div>
            <div className="text-xs font-mono text-neutral-400 uppercase font-bold flex items-center gap-2">
              <IconShieldCheck className="w-4 h-4 text-purple-400" />
              COMMUNITY WARNING SYSTEM
            </div>
            <div className="text-sm font-bold text-white mt-2">
              Lower Bhalukpong Sirens & SMS
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              Cell broadcast sirens triggered in downstream alluvial fan. 1,420 residents alerted. Precautionary evacuation to high-school shelter advised.
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500">
            Dispatch Node: <strong className="text-neutral-300">DDMA Control Room</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
