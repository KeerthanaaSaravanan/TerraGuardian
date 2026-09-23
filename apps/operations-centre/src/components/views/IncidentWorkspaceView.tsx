import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { StatusBadge, RiskIndicator, ConfidenceMeter, PriorityIndicator, OperationalCard } from "../common";
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
    hazardState,
    hazardHypothesis,
    hazardLineage,
    reassessmentResult,
    runHazardReassessment,
    runPredictiveAssessment,
    riskLevel,
    riskScore,
    confidenceLevel,
    confidenceScore,
    priorityLevel,
  } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header Banner: Incident Digital Twin Identifier */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-1 rounded">
              TG-2048
            </span>
            <StatusBadge status={incidentStatus} />
            <span className="text-slate-500 dark:text-neutral-500 font-mono text-xs">
              INCIDENT TWIN (LIVING HAZARD OBJECT)
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            NH-13 KM-42 Bhalukpong-Tenga Corridor Slope Debris Flow
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-neutral-400 font-mono">
            <span className="flex items-center gap-1">
              <IconMapPin className="w-3.5 h-3.5 text-red-500" />
              West Kameng, Arunachal Pradesh (27.084° N, 92.568° E)
            </span>
            <span className="flex items-center gap-1">
              <IconClock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              Detected: 04:22 IST | Deterministic Demonstration Telemetry
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(3)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-md text-sm transition-all"
          >
            <span>Examine Evidence Reconciliation</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Domain Principles Strip: Risk vs Confidence vs Priority */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: RISK */}
        <div className="bg-white dark:bg-neutral-900 border-2 border-red-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">HAZARD RISK LEVEL</span>
              <span className="text-red-600 dark:text-red-400 font-bold">PHYSICAL DANGER</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-600 dark:text-red-500 font-mono">{riskLevel}</span>
              <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">({riskScore}/100)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
              Steep 44.2° colluvium slope with 184mm saturation. High hydrostatic pore pressure threatening cataclysmic slip.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            <span>Metric: Slope × Moisture</span>
            <span className="text-red-600 dark:text-red-400 font-semibold">Severe Threshold</span>
          </div>
        </div>

        {/* Card 2: CONFIDENCE (Explicitly highlighting RISK ≠ CONFIDENCE) */}
        <div className="bg-white dark:bg-neutral-900 border-2 border-amber-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">EVIDENCE CONFIDENCE</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">CERTAINTY</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{confidenceLevel}</span>
              <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">({confidenceScore}/100)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
              <strong>RISK ≠ CONFIDENCE:</strong> Rainfall is confirmed, but satellite optical is 88% cloud-covered. No ground officer has visually verified the carriageway yet.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 dark:text-neutral-400">Status:</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Field Verification Recommended</span>
          </div>
        </div>

        {/* Card 3: PRIORITY (Highlighting Highest Hazard ≠ Highest Priority) */}
        <div className="bg-white dark:bg-neutral-900 border-2 border-red-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">OPERATIONAL PRIORITY</span>
              <span className="text-red-600 dark:text-red-400 font-bold">CONSEQUENCE</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-600 dark:text-red-400 font-mono">{priorityLevel}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
              <strong>Highest hazard ≠ Highest priority:</strong> Even moderate debris volume becomes P1 Critical when severing a solitary strategic lifeline corridor and hospital supply route.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            <span>Lifeline Corridor:</span>
            <span className="text-red-600 dark:text-red-400 font-semibold">NH-13 Severance Risk</span>
          </div>
        </div>
      </div>

      {/* Workspace Details: Affected Assets & Multi-Source Evidence Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Critical Affected Assets & Lifeline Matrix (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm min-w-0">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
              <IconBuilding className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              EXPOSED CRITICAL ASSETS & POPULATION
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-500">4 IMPACT NODES</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800/60 mt-0.5">
                <IconTruck className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">NH-13 Trans-Arunachal Highway (KM-42)</span>
                  <span className="text-[10px] font-mono bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 px-1.5 py-0.2 rounded font-bold">
                    CRITICAL LIFELINE
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                  Sole heavy transport link between Assam border and West Kameng/Tawang. Detour length: &gt;180 km via unpaved hill tracks.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 mt-0.5">
                <IconBuilding className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Lower Bhalukpong Residential Sector</span>
                  <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded font-bold">
                    1,420 RESIDENTS
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                  Downslope alluvial cone within 800m runout trajectory. Flash mudflow hazard to 380 homes.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800 flex items-start gap-3">
              <span className="p-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800/60 mt-0.5">
                <IconActivity className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">West Kameng District Civil Hospital Lifeline</span>
                  <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-1.5 py-0.2 rounded font-bold">
                    MEDICAL DEPENDENCY
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                  Daily oxygen supply truck and emergency ICU ambulance transfers traverse KM-42.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Evidence Snapshot & Resolution Path (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <IconSatellite className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                MULTI-MODAL EVIDENCE STATUS
              </h3>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">PARTIAL CONFLICT</span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                  <IconCloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  IMD Bhalukpong AWS Rainfall
                </span>
                <span className="font-mono text-red-600 dark:text-red-400 font-bold">184.6 mm (Extreme)</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                  <IconSatellite className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                  Sentinel-2 Multispectral
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">88% Cloud Obscured</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                  <IconActivity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  GSI NLSM Susceptibility
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-300 font-semibold">Zone-IV (High Debris)</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                  <IconClock className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                  Physical Field Inspection
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold animate-pulse">Awaiting Patrol</span>
              </div>
            </div>
          </div>

          {/* Operational Next Action Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-lg flex items-center justify-between">
            <div className="text-xs text-slate-700 dark:text-neutral-300">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Recommended Closed-Loop Action:</span>
              <div>Reconcile conflicting sensor feeds and request ground truth verification.</div>
            </div>
            <button
              onClick={() => setStep(3)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-md whitespace-nowrap shadow-sm cursor-pointer"
            >
              Step 3: Reconcile →
            </button>
          </div>
        </div>
      </div>

      {/* PROMPT 05: Predictive Intelligence & Feature Attribution Architecture */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              <IconActivity className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                PREDICTIVE HAZARD & EVIDENTIAL CONFIDENCE ENGINE
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                Interpretable Physics-Informed Logistic Hazard Model (scikit-learn + Slope Mechanics)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded font-bold">
              SYNTHETIC CALIBRATION DEMO
            </span>
            <button
              onClick={() => runPredictiveAssessment()}
              className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-mono font-medium px-3 py-1 rounded border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
            >
              Recalculate Model Inference
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Feature Drivers & Contributions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-w-0">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
              PRIMARY HAZARD DRIVERS (TRACEABLE LOG-ODDS ATTRIBUTION)
            </span>
            <div className="flex flex-col gap-2">
              <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">Antecedent Cumulative Rainfall (7-day IMD)</span>
                  <span className="font-mono text-red-600 dark:text-red-400 font-bold">184.6 mm (40.8% weight)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: "40.8%" }} />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                  Extreme hydrometeorological saturation exceeding 120mm failure threshold.
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">Terrain Slope Angle (SRTM DEM 30m)</span>
                  <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">44.2° (34.2% weight)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: "34.2%" }} />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                  Critical gravitational shear stress on steep colluvial escarpment.
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">Lithological Susceptibility (GSI NLSM)</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">Zone IV (18.5% weight)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: "18.5%" }} />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                  Highly weathered mica schist and fractured phyllite bedrock prone to planar sliding.
                </span>
              </div>
            </div>
          </div>

          {/* Model Quality & Validation Metrics (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
              DATA COMPLETENESS & BENCHMARK VALIDATION
            </span>
            <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Feature Completeness:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">78% (7 of 9 vectors)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Optical Cloud Obscuration:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">88.0% (Reduced confidence)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Validation Protocol:</span>
                <span className="font-mono text-slate-800 dark:text-neutral-200">Synthetic 5-Fold Corridor Holdout</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Synthetic Brier Score:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">0.114 (Synthetic Benchmark)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                <strong>Scientific Transparency:</strong> Evaluated on synthetic North Eastern Region corridor holdout splits. No real-world production accuracy claims made prior to physical sensor calibration.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT 06: Living Hazard Evolution, Divergence Detection & Bounded Reassessment */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
              <IconActivity className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <span>LIVING HAZARD EVOLUTION & FORENSIC REASSESSMENT</span>
                <span className="bg-purple-600 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  PROMPT 06
                </span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                Continuous reconciliation of expected hypothesis vs observed reality across 4 independent dimensions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runHazardReassessment()}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Trigger Bounded Reassessment</span>
            </button>
          </div>
        </div>

        {/* 4 Independent Dimensions Banner */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-500 font-bold block">1. LIFECYCLE STATE</span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1 block">
              {incidentStatus}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">Authority workflow lifecycle</span>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-purple-500/40 dark:border-purple-800/60">
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block">2. PHYSICAL HAZARD STATE</span>
            <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 mt-1 block">
              {hazardHypothesis?.current_state || hazardState || "DELAYED"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">Independent physical reality</span>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-500 font-bold block">3. EVIDENCE STATE</span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1 block">
              RECONCILED
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">Multi-source fabric status</span>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-500 font-bold block">4. ACTION STATE</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              PHYSICALLY_CONFIRMED
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">Barricade verified on ground</span>
          </div>
        </div>

        {/* Invariant Truth Banners */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 p-2.5 rounded text-amber-900 dark:text-amber-200">
            <strong>EVENT ABSENCE ≠ HAZARD RESOLUTION:</strong> Non-occurrence in 04:00-06:00 IST window causes state to become DELAYED, maintaining safety perimeter.
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 p-2.5 rounded text-blue-900 dark:text-blue-200">
            <strong>ACTION CONFIRMED ≠ RESOLUTION:</strong> Physical barricade confirmation does not resolve underlying 184mm hydrostatic pore pressure.
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 p-2.5 rounded text-purple-900 dark:text-purple-200">
            <strong>DIVERGENCE → REASSESSMENT:</strong> Temporal & spatial envelope discrepancies trigger bounded recalculation, not arbitrary escalation.
          </div>
        </div>

        {/* Expected vs Observed Divergence Details & Lineage */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Living Hypothesis & Divergence Monitor (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
              EXPECTED HYPOTHESIS VS OBSERVED REALITY
            </span>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Living Hypothesis ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {hazardHypothesis?.id || "HYP-TG-2048-01"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Forensic Lineage ID:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {hazardHypothesis?.lineage_id || hazardLineage?.lineage_id || "HL-TG-2048-01"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Expected Spatial Envelope:</span>
                <span className="font-mono text-slate-800 dark:text-neutral-200">
                  27.084° N, 92.568° E (Corridor KM-42 ± 250m)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Expected Failure Window:</span>
                <span className="font-mono text-slate-800 dark:text-neutral-200">
                  04:00 - 06:00 IST (Elapsed without cataclysmic rupture)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Continuity Assessment:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {reassessmentResult?.continuity_supported ?? true ? "SUPPORTED (Hydrostatic pressure sustained)" : "DISCONTINUOUS"}
                </span>
              </div>
            </div>

            {/* Divergence Alert Box */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-3.5 rounded-lg flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <IconAlertTriangle className="w-4 h-4 text-amber-600" />
                  DETECTED DIVERGENCE: TEMPORAL (MODERATE)
                </span>
                <span className="text-[10px] font-mono bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold">
                  REASSESSED AS DELAYED
                </span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Expected failure window (04:00-06:00 IST) elapsed without catastrophic slope rupture. Hydrostatic pore pressure remains at 184mm critical saturation. Slope is retained in <strong>DELAYED</strong> state rather than premature false clearance.
              </p>
            </div>
          </div>

          {/* Right: Bounded Reassessment Result & Lineage Tree (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
              BOUNDED REASSESSMENT & AUDITED GUIDANCE
            </span>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Target Hazard State:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {reassessmentResult?.updated_hazard_state || "DELAYED"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Lineage Decision:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {reassessmentResult?.lineage_decision || "UPDATE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-neutral-400">Updated Risk / Confidence:</span>
                <span className="font-mono text-slate-800 dark:text-neutral-200">
                  {reassessmentResult?.updated_risk_level || "HIGH"} ({reassessmentResult ? Math.round(reassessmentResult.updated_risk_score) : 84}/100) / {reassessmentResult?.updated_confidence_level || "MODERATE"} ({reassessmentResult ? Math.round(reassessmentResult.updated_confidence_score) : 62}/100)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 block font-bold">OPERATIONAL GUIDANCE:</span>
                <p className="text-xs text-slate-700 dark:text-neutral-300 mt-1 leading-snug">
                  {reassessmentResult?.operational_guidance ||
                    "Maintain KM-42 physical barricade and vehicular traffic halt. Deploy geotechnical patrol with inclinometers before any clearance authorization."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                <span>Lineage Depth: {hazardLineage?.total_reassessments_performed || 1} iterations</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Audit Event Logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


