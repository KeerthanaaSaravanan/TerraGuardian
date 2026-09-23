import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { usePublicReport } from "../../context/PublicReportContext";
import { INITIAL_EVIDENCE } from "../../data/deterministicScenario";
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
  IconCheck,
} from "../icons";
import type { EvidenceConflictStatus, EvidenceInterpretation, EvidenceProcessingStatus } from "../../types/incident";

export const EvidenceReconciliationView: React.FC = () => {
  const {
    setStep,
    riskLevel,
    confidenceLevel,
    reconciliationSummary,
    backendEvidence,
    reconcileEvidence,
    verifyCitizenEvidence,
    backendStatus,
  } = useDemoScenario();
  const { isSubmittedToOperations, activeImage, compiledObservation } = usePublicReport();
  const [isReconciling, setIsReconciling] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      await reconcileEvidence();
    } finally {
      setIsReconciling(false);
    }
  };

  const handleVerifyEvidence = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyCitizenEvidence(id);
    } finally {
      setVerifyingId(null);
    }
  };

  // Compile view evidence from backend if available, or deterministic scenario
  const displayEvidence = backendEvidence.length > 0
    ? backendEvidence.map((be) => ({
        id: be.id,
        sourceType: be.source,
        sourceName: be.source_name,
        observation: be.observation || be.raw_data?.observation as string || be.evidence_type,
        metric: be.metric || be.raw_data?.metric as string || (be.confidence_contribution ? `Weight: ${(be.confidence_contribution * 100).toFixed(0)}%` : "Verified Input"),
        reliability: be.reliability || be.raw_data?.reliability as string || "HIGH",
        freshness: be.freshness_seconds ? `${Math.round(be.freshness_seconds / 60)}m ago` : "Live",
        status: be.interpretation || "CONFIRMING",
        details: be.details || be.raw_data?.details as string || "Domain-evaluated sensor telemetry and spatial payload.",
        conflict_status: be.conflict_status,
        conflict_details: be.conflict_details,
        processing_status: be.processing_status,
        interpretation: be.interpretation,
        is_simulated: be.is_simulated,
      }))
    : (isSubmittedToOperations
        ? [
            ...INITIAL_EVIDENCE.map((ie) => ({
              ...ie,
              conflict_status: (ie.id === "ev-sat-1" ? "CONFLICTED" : "NONE") as EvidenceConflictStatus,
              conflict_details: ie.id === "ev-sat-1" ? "88% cloud obstruction obscuring optical ground scar" : undefined,
              processing_status: "RECONCILED" as EvidenceProcessingStatus,
              interpretation: (ie.status === "CONFIRMING" ? "VERIFIED" : "UNVERIFIED") as EvidenceInterpretation,
              is_simulated: true,
            })),
            {
              id: compiledObservation.observationId,
              sourceType: "CITIZEN" as const,
              sourceName: `Citizen Mobile Observation (#${compiledObservation.observationId})`,
              observation: "Live Ground Visual: Active Debris Runoff & Cut Slope Failure",
              metric: "Optical Geo-Verification Passed (NH-13 KM-41.8)",
              reliability: "HIGH",
              freshness: "Just now",
              status: "UNVERIFIED" as const,
              details: `${compiledObservation.reporterNote || "Slope movement and road debris encroachment observed."} User-submitted ground observation. Pending field authority confirmation.`,
              conflict_status: "NONE" as EvidenceConflictStatus,
              conflict_details: undefined,
              processing_status: "RECEIVED" as EvidenceProcessingStatus,
              interpretation: "UNVERIFIED" as EvidenceInterpretation,
              is_simulated: false,
            },
          ]
        : INITIAL_EVIDENCE.map((ie) => ({
            ...ie,
            conflict_status: (ie.id === "ev-sat-1" ? "CONFLICTED" : "NONE") as EvidenceConflictStatus,
            conflict_details: ie.id === "ev-sat-1" ? "88% cloud obstruction obscuring optical ground scar" : undefined,
            processing_status: "RECONCILED" as EvidenceProcessingStatus,
            interpretation: (ie.status === "CONFIRMING" ? "VERIFIED" : "UNVERIFIED") as EvidenceInterpretation,
            is_simulated: true,
          })));

  const dominantSignal = reconciliationSummary?.dominant_signal || "EXTREME_PRECIPITATION_WITH_OPTICAL_OBSCURATION";
  const qualityScore = reconciliationSummary?.evidence_quality_score ?? 0.65;
  const supportingCount = reconciliationSummary?.supporting_evidence_ids?.length ?? displayEvidence.filter(e => e.conflict_status !== "CONFLICTED").length;
  const conflictingCount = reconciliationSummary?.conflicting_evidence_ids?.length ?? displayEvidence.filter(e => e.conflict_status === "CONFLICTED").length;
  const staleCount = reconciliationSummary?.stale_evidence_ids?.length ?? 0;
  const recommendedAction = reconciliationSummary?.recommended_action || "FIELD_VERIFICATION_REQUIRED";

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header & Core Thesis Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 3 OF 10</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold uppercase">
              Authoritative Evidence Reconciliation Fabric
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Multi-Source Cross-Reconciliation for TG-2048
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Cross-referencing authoritative meteorological telemetry, synthetic aperture radar, geological susceptibility, and citizen reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-xs border border-neutral-700 transition-all shadow-sm cursor-pointer"
          >
            <span className={isReconciling ? "animate-spin" : ""}>⟳</span>
            <span>{isReconciling ? "Reconciling Fabric..." : "Run Cross-Source Reconciliation"}</span>
          </button>

          <button
            onClick={() => setStep(4)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <span>Examine Impact & Priority</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CORE OPERATIONAL CALLOUT: RISK ≠ CONFIDENCE */}
      <PrincipleBanner
        principle="RISK ≠ CONFIDENCE"
        title={`Current Evaluation: ${riskLevel} RISK (86%) + ${confidenceLevel} CONFIDENCE (54%)`}
        explanation="Extreme antecedent rainfall (184mm) on a steep (44°) vulnerable slope produces a HIGH RISK score. However, optical satellites are 88% cloud-obstructed, radar surface coherence is noisy, and physical ground visual confirmation has not occurred. → Evidence is partially conflicting / incomplete: Field verification is recommended before declaring authoritative highway closure."
        variant="amber"
      />

      {/* Authoritative Reconciliation Engine Summary Card */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              Deterministic Reconciliation Engine Analysis
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
              {dominantSignal}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Quality Score: </span>
              <strong className="text-emerald-400 text-sm">{(qualityScore * 100).toFixed(0)}%</strong>
            </div>
            <div>
              <span className="text-slate-400">Backend Authority: </span>
              <span className={backendStatus === "CONNECTED" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {backendStatus === "CONNECTED" ? "LIVE FASTAPI" : "DETERMINISTIC FALLBACK"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-slate-400 text-[11px] font-mono uppercase">Total Evidence</div>
            <div className="text-lg font-bold text-white mt-1">{displayEvidence.length} items</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Multi-source ingest</div>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/40">
            <div className="text-emerald-300 text-[11px] font-mono uppercase">Supporting Signals</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">{supportingCount}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Weather, Radar, Geo</div>
          </div>
          <div className="bg-amber-950/40 p-3 rounded-lg border border-amber-800/40">
            <div className="text-amber-300 text-[11px] font-mono uppercase">Conflicted / Obscured</div>
            <div className="text-lg font-bold text-amber-400 mt-1">{conflictingCount}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">Optical Cloud Cover</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-slate-400 text-[11px] font-mono uppercase">Stale Telemetry</div>
            <div className="text-lg font-bold text-slate-200 mt-1">{staleCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">&gt;24h delta</div>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-mono text-amber-400 font-semibold uppercase">Reconciliation Summary: </span>
            <span className="text-slate-300">
              {reconciliationSummary?.conflict_summary ||
                "Severe rainfall (184mm) and high geological susceptibility confirm critical slope hazard. Optical satellite sensors report severe obscuration (88%), preventing direct optical verification."}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono uppercase text-slate-400">Recommended Next Step:</span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs">
              {recommendedAction}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Action Quick Dispatch Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <span className="font-mono font-bold uppercase">Public Safety Boundary Policy:</span>
          <span>Citizen submissions enter as UNVERIFIED and cannot independently trigger state transitions or road closures without field officer confirmation.</span>
        </div>
        <button
          onClick={() => setStep(5)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
          const isField = item.sourceType === "FIELD";
          const isConflicted = item.conflict_status === "CONFLICTED" || item.conflict_status === "PARTIALLY_CONFLICTED";
          const isUnverified = item.interpretation === "UNVERIFIED" || item.status === "UNVERIFIED";

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm transition-all ${
                isConflicted
                  ? "border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
                  : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
              }`}
            >
              <div>
                {/* Source Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                      {isWeather && <IconCloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                      {isSat && <IconSatellite className="w-4 h-4 text-purple-500 dark:text-purple-400" />}
                      {isTerrain && <IconMountain className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                      {isHist && <IconClock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                      {isCitizen && <IconRadio className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                      {isField && <IconShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                          {item.sourceType}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                          {item.processing_status || "RECONCILED"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{item.sourceName}</h3>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        item.interpretation === "VERIFIED" || item.status === "CONFIRMING"
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                          : item.interpretation === "REJECTED"
                          ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/60"
                          : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                      }`}
                    >
                      {item.interpretation || (item.status === "CONFIRMING" ? "VERIFIED" : "UNVERIFIED")}
                    </span>

                    {isConflicted && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        {item.conflict_status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Observation & Metric */}
                <div className="mt-3 bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800/80">
                  <div className="text-xs text-slate-800 dark:text-neutral-200 font-semibold">{item.observation}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{item.metric}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 mt-2 leading-relaxed">{item.details}</p>

                  {/* Conflict explanation banner if conflicted */}
                  {item.conflict_details && (
                    <div className="mt-2.5 p-2 rounded bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <IconAlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{item.conflict_details}</span>
                    </div>
                  )}

                  {/* Citizen verification button for unverified citizen evidence */}
                  {isCitizen && isUnverified && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                        Awaiting Field Authority Verification
                      </span>
                      <button
                        onClick={() => handleVerifyEvidence(item.id)}
                        disabled={verifyingId === item.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <IconCheck className="w-3 h-3" />
                        <span>{verifyingId === item.id ? "Verifying..." : "Verify as Field Authority"}</span>
                      </button>
                    </div>
                  )}

                  {/* If Citizen Evidence, display image preview */}
                  {isCitizen && isSubmittedToOperations && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-slate-300 dark:border-neutral-700 bg-black/40 h-28 flex items-center justify-center relative">
                      <img
                        src={activeImage}
                        alt="Citizen Upload"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                        CITIZEN INGEST • UNVERIFIED
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


