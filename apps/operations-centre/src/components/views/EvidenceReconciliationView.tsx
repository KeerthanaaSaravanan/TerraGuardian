import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { usePublicReport } from "../../context/PublicReportContext";
import { INITIAL_EVIDENCE, EvidenceItem } from "../../data/deterministicScenario";
import { PrincipleBanner } from "../common";
import {
  IconCloudRain,
  IconSatellite,
  IconMountain,
  IconClock,
  IconAlertTriangle,
  IconArrowRight,
  IconShieldCheck,
  IconRadio,
} from "../icons";

export const EvidenceReconciliationView: React.FC = () => {
  const { setStep, riskLevel, confidenceLevel } = useDemoScenario();
  const { isSubmittedToOperations, activeImage, compiledObservation } = usePublicReport();

  // Combine initial evidence with citizen observation if submitted
  const displayEvidence: EvidenceItem[] = isSubmittedToOperations
    ? [
        ...INITIAL_EVIDENCE,
        {
          id: compiledObservation.observationId,
          sourceType: "CITIZEN",
          sourceName: `Citizen Mobile Observation (#${compiledObservation.observationId})`,
          observation: "Live Ground Visual: Active Debris Runoff & Cut Slope Failure",
          metric: "Optical Geo-Verification Passed (NH-13 KM-41.8)",
          reliability: "HIGH",
          freshness: "Just now",
          status: "CONFIRMING",
          details: `${compiledObservation.reporterNote || "Slope movement and road debris encroachment observed."} Computer vision verified fresh shear scarp (~35m) with high moisture surcharge.`,
        },
      ]
    : INITIAL_EVIDENCE;

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header & Core Thesis Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 3 OF 10</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">EVIDENCE RECONCILIATION ENGINE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Multi-Source Sensor & Intelligence Fusion for TG-2048
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Cross-referencing authoritative meteorological, orbital synthetic aperture radar, geological basemaps, and historical logs.
          </p>
        </div>

        <button
          onClick={() => setStep(4)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
        >
          <span>Examine Impact & Priority</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* CORE OPERATIONAL CALLOUT: RISK ≠ CONFIDENCE */}
      <PrincipleBanner
        principle="RISK ≠ CONFIDENCE"
        title="Current Evaluation: HIGH RISK (86%) + MODERATE CONFIDENCE (54%)"
        explanation="Extreme antecedent rainfall (184mm) on a steep (44°) vulnerable slope produces a HIGH RISK score. However, optical satellites are 88% cloud-obstructed, radar surface coherence is noisy, and physical ground visual confirmation has not occurred. → Evidence is partially conflicting / incomplete: Field verification is recommended before declaring authoritative highway closure."
        variant="amber"
      />

      {/* Recommended Action Quick Dispatch Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <span className="font-mono font-bold uppercase">Recommended Resolution:</span>
          <span>Dispatch nearest SDRF Quick Response Team to establish on-corridor ground truth.</span>
        </div>
        <button
          onClick={() => setStep(5)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>Dispatch Ground Patrol (Step 5)</span>
          <IconArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Multi-Source Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayEvidence.map((item) => {
          const isWeather = item.sourceType === "WEATHER";
          const isSat = item.sourceType === "SATELLITE";
          const isTerrain = item.sourceType === "TERRAIN";
          const isHist = item.sourceType === "HISTORICAL";
          const isCitizen = item.sourceType === "CITIZEN";

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm transition-all ${
                item.status === "INCONCLUSIVE"
                  ? "border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
                  : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
              }`}
            >
              <div>
                {/* Source Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                      {isWeather && <IconCloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                      {isSat && <IconSatellite className="w-4 h-4 text-purple-500 dark:text-purple-400" />}
                      {isTerrain && <IconMountain className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                      {isHist && <IconClock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                      {isCitizen && <IconRadio className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                        {item.sourceType} EVIDENCE
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.sourceName}</h3>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.status === "CONFIRMING"
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                        : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Observation & Metric */}
                <div className="mt-3 bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800/80">
                  <div className="text-xs text-slate-800 dark:text-neutral-200 font-semibold">{item.observation}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{item.metric}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 mt-2 leading-relaxed">{item.details}</p>

                  {/* If Citizen Evidence, display image preview */}
                  {isCitizen && isSubmittedToOperations && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-slate-300 dark:border-neutral-700 bg-black/40 h-28 flex items-center justify-center relative">
                      <img
                        src={activeImage}
                        alt="Citizen Upload"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                        METADATA VERIFIED
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Provenance & Freshness Footer */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-500 pt-2 border-t border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-1">
                  <IconShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                  Reliability: <strong className="text-slate-700 dark:text-neutral-300">{item.reliability}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <IconClock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                  Freshness: <strong className="text-slate-700 dark:text-neutral-300">{item.freshness}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

