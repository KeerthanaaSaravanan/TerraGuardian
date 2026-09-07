import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import {
  IconAlertTriangle,
  IconShieldAlert,
  IconActivity,
  IconClock,
  IconArrowRight,
  IconMapPin,
  IconTruck,
  IconBuilding,
  IconCloudRain,
  IconSatellite,
} from "../icons";

export const IncidentWorkspaceView: React.FC = () => {
  const {
    setStep,
    incidentStatus,
    riskLevel,
    riskScore,
    confidenceLevel,
    confidenceScore,
    priorityLevel,
  } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header Banner: Incident Digital Twin Identifier */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-1 rounded">
              TG-2048
            </span>
            <span className="bg-neutral-800 text-neutral-300 font-mono text-xs px-2.5 py-1 rounded border border-neutral-700">
              STATE: <strong className="text-emerald-400">{incidentStatus}</strong>
            </span>
            <span className="text-neutral-500 font-mono text-xs">
              INCIDENT TWIN (LIVING HAZARD OBJECT)
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            NH-13 KM-42 Bhalukpong-Tenga Corridor Slope Debris Flow
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 font-mono">
            <span className="flex items-center gap-1">
              <IconMapPin className="w-3.5 h-3.5 text-red-400" />
              West Kameng, Arunachal Pradesh (27.084° N, 92.568° E)
            </span>
            <span className="flex items-center gap-1">
              <IconClock className="w-3.5 h-3.5 text-neutral-500" />
              Detected: 04:22 IST | Freshness: Real-time Telemetry
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(3)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/40 text-sm transition-all"
          >
            <span>Examine Evidence Reconciliation</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Domain Principles Strip: Risk vs Confidence vs Priority */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: RISK */}
        <div className="bg-neutral-900 border-2 border-red-500/60 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-bold uppercase">HAZARD RISK LEVEL</span>
              <span className="text-red-400 font-bold">PHYSICAL DANGER</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-500 font-mono">{riskLevel}</span>
              <span className="text-sm font-mono text-neutral-400">({riskScore}/100)</span>
            </div>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
              Steep 44.2° colluvium slope with 184mm saturation. High hydrostatic pore pressure threatening cataclysmic slip.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Metric: Slope × Moisture</span>
            <span className="text-red-400 font-semibold">Severe Threshold</span>
          </div>
        </div>

        {/* Card 2: CONFIDENCE (Explicitly highlighting RISK ≠ CONFIDENCE) */}
        <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-bold uppercase">EVIDENCE CONFIDENCE</span>
              <span className="text-amber-400 font-bold">CERTAINTY</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-mono">{confidenceLevel}</span>
              <span className="text-sm font-mono text-neutral-400">({confidenceScore}/100)</span>
            </div>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
              <strong>RISK ≠ CONFIDENCE:</strong> Rainfall is confirmed, but satellite optical is 88% cloud-covered. No ground officer has visually verified the carriageway yet.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-400">Status:</span>
            <span className="text-amber-400 font-semibold">Field Verification Recommended</span>
          </div>
        </div>

        {/* Card 3: PRIORITY (Highlighting Highest Hazard ≠ Highest Priority) */}
        <div className="bg-neutral-900 border-2 border-red-500/60 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-bold uppercase">OPERATIONAL PRIORITY</span>
              <span className="text-red-400 font-bold">CONSEQUENCE</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-400 font-mono">{priorityLevel}</span>
            </div>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
              <strong>Highest hazard ≠ Highest priority:</strong> Even moderate debris volume becomes P1 Critical when severing a solitary strategic lifeline corridor and hospital supply route.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Lifeline Corridor:</span>
            <span className="text-red-400 font-semibold">NH-13 Severance Risk</span>
          </div>
        </div>
      </div>

      {/* Workspace Details: Affected Assets & Multi-Source Evidence Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Critical Affected Assets & Lifeline Matrix (6 cols) */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <IconBuilding className="w-4 h-4 text-emerald-400" />
              EXPOSED CRITICAL ASSETS & POPULATION
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">4 IMPACT NODES</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-red-950 text-red-400 border border-red-800/60 mt-0.5">
                <IconTruck className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">NH-13 Trans-Arunachal Highway (KM-42)</span>
                  <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded">
                    CRITICAL LIFELINE
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Sole heavy transport link between Assam border and West Kameng/Tawang. Detour length: &gt;180 km via unpaved hill tracks.
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 mt-0.5">
                <IconBuilding className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Lower Bhalukpong Residential Sector</span>
                  <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded">
                    1,420 RESIDENTS
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Downslope alluvial cone within 800m runout trajectory. Flash mudflow hazard to 380 homes.
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-blue-950 text-blue-400 border border-blue-800/60 mt-0.5">
                <IconActivity className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">West Kameng District Civil Hospital Lifeline</span>
                  <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded">
                    MEDICAL DEPENDENCY
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Daily oxygen supply truck and emergency ICU ambulance transfers traverse KM-42.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Evidence Snapshot & Resolution Path (6 cols) */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <IconSatellite className="w-4 h-4 text-blue-400" />
                MULTI-MODAL EVIDENCE STATUS
              </h3>
              <span className="text-[11px] font-mono text-amber-400 font-semibold">PARTIAL CONFLICT</span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-300 flex items-center gap-2">
                  <IconCloudRain className="w-4 h-4 text-blue-400" />
                  IMD Bhalukpong AWS Rainfall
                </span>
                <span className="font-mono text-red-400 font-bold">184.6 mm (Extreme)</span>
              </div>

              <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-300 flex items-center gap-2">
                  <IconSatellite className="w-4 h-4 text-neutral-500" />
                  Sentinel-2 Multispectral
                </span>
                <span className="font-mono text-amber-400 font-semibold">88% Cloud Obscured</span>
              </div>

              <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-300 flex items-center gap-2">
                  <IconActivity className="w-4 h-4 text-emerald-400" />
                  GSI NLSM Susceptibility
                </span>
                <span className="font-mono text-amber-300 font-semibold">Zone-IV (High Debris)</span>
              </div>

              <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-300 flex items-center gap-2">
                  <IconClock className="w-4 h-4 text-neutral-500" />
                  Physical Field Inspection
                </span>
                <span className="font-mono text-amber-400 font-semibold animate-pulse">Awaiting Patrol</span>
              </div>
            </div>
          </div>

          {/* Operational Next Action Box */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-lg flex items-center justify-between">
            <div className="text-xs text-neutral-300">
              <span className="text-emerald-400 font-semibold">Recommended Closed-Loop Action:</span>
              <div>Reconcile conflicting sensor feeds and request ground truth verification.</div>
            </div>
            <button
              onClick={() => setStep(3)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-md whitespace-nowrap"
            >
              Step 3: Reconcile →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
