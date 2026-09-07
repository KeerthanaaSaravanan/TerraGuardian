import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { INITIAL_EVIDENCE, EvidenceItem } from "../../data/deterministicScenario";
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

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header & Core Thesis Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span>STEP 3 OF 10</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">EVIDENCE RECONCILIATION ENGINE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            Multi-Source Sensor & Intelligence Fusion for TG-2048
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
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
      <div className="bg-gradient-to-r from-amber-950/70 via-neutral-900 to-red-950/70 border-2 border-amber-500/80 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="p-3 rounded-xl bg-amber-900/60 text-amber-300 border border-amber-600/60 shadow">
            <IconAlertTriangle className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold text-amber-300">
              <span>CORE ARCHITECTURAL RULE:</span>
              <span className="bg-amber-400 text-neutral-950 px-2 py-0.2 rounded font-black text-xs">
                RISK ≠ CONFIDENCE
              </span>
            </div>
            <div className="text-base font-bold text-white">
              Current Evaluation: <span className="text-red-400 font-mono">HIGH RISK (86%)</span> +{" "}
              <span className="text-amber-400 font-mono">MODERATE CONFIDENCE (54%)</span>
            </div>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              <strong>OPERATIONAL EXPLANATION:</strong> Extreme antecedent rainfall (184mm) on a steep (44°) vulnerable slope produces a <em>HIGH RISK</em> score. However, optical satellites are 88% cloud-obstructed, radar surface coherence is noisy, and physical ground visual confirmation has not occurred.
              <br />
              <span className="text-amber-300 font-semibold">
                → Evidence is partially conflicting / incomplete: Field verification is recommended before declaring authoritative highway closure.
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 text-center min-w-[210px]">
          <span className="text-[11px] font-mono text-neutral-400">RECOMMENDED ACTION</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">REQUEST GROUND TRUTH</span>
          <button
            onClick={() => setStep(5)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs py-2 px-3 rounded-lg mt-1 transition-all shadow"
          >
            Dispatch Patrol (Step 5)
          </button>
        </div>
      </div>

      {/* Multi-Source Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INITIAL_EVIDENCE.map((item) => {
          const isWeather = item.sourceType === "WEATHER";
          const isSat = item.sourceType === "SATELLITE";
          const isTerrain = item.sourceType === "TERRAIN";
          const isHist = item.sourceType === "HISTORICAL";

          return (
            <div
              key={item.id}
              className={`bg-neutral-900 border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all ${
                item.status === "INCONCLUSIVE"
                  ? "border-amber-500/50 bg-amber-950/10"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div>
                {/* Source Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
                      {isWeather && <IconCloudRain className="w-4 h-4 text-blue-400" />}
                      {isSat && <IconSatellite className="w-4 h-4 text-purple-400" />}
                      {isTerrain && <IconMountain className="w-4 h-4 text-amber-400" />}
                      {isHist && <IconClock className="w-4 h-4 text-emerald-400" />}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {item.sourceType} EVIDENCE
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight">{item.sourceName}</h3>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.status === "CONFIRMING"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                        : "bg-amber-950 text-amber-300 border-amber-700/60"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Observation & Metric */}
                <div className="mt-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                  <div className="text-xs text-neutral-200 font-semibold">{item.observation}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-white">{item.metric}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{item.details}</p>
                </div>
              </div>

              {/* Provenance & Freshness Footer */}
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-800">
                <span className="flex items-center gap-1">
                  <IconShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                  Reliability: <strong className="text-neutral-300">{item.reliability}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <IconClock className="w-3.5 h-3.5 text-neutral-400" />
                  Freshness: <strong className="text-neutral-300">{item.freshness}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
