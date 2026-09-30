import React, { useState, useEffect } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { usePublicReport } from "../../context/PublicReportContext";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";
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
import type {
  EvidenceConflictStatus,
  EvidenceInterpretation,
  EvidenceProcessingStatus,
  CitizenReportItem,
} from "../../types/incident";

export const EvidenceReconciliationView: React.FC = () => {
  const {
    setStep,
    setIncidentSubTab,
    riskLevel,
    confidenceLevel,
    reconciliationSummary,
    backendEvidence,
    reconcileEvidence,
    verifyCitizenEvidence,
    backendStatus,
  } = useDemoScenario();
  const { isSubmittedToOperations, activeImage, compiledObservation } = usePublicReport();
  const { userProfile, hasPermission } = useAuth();
  const canReconcile = hasPermission("RECONCILE_EVIDENCE");

  const [isReconciling, setIsReconciling] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "CITIZEN" | "WEATHER" | "SATELLITE" | "TERRAIN" | "FIELD">("ALL");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Live persistent citizen reports queue
  const [liveReports, setLiveReports] = useState<CitizenReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [citizenStatusFilter, setCitizenStatusFilter] = useState<string>("ALL");

  const loadCitizenReports = async () => {
    setIsLoadingReports(true);
    try {
      const reports = await apiClient.getCitizenReports(
        citizenStatusFilter !== "ALL" ? citizenStatusFilter : undefined
      );
      setLiveReports(reports);
    } catch (err) {
      console.warn("Failed to load live citizen reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    loadCitizenReports();
  }, [citizenStatusFilter]);

  const handleReviewAction = async (reportId: string, action: "APPROVE" | "REJECT") => {
    setReviewLoadingId(reportId);
    setReviewFeedback(null);
    try {
      await apiClient.reviewCitizenReport(reportId, {
        action,
        review_notes:
          action === "APPROVE"
            ? `Verified by ${userProfile?.fullName || "Operations Officer"} (${userProfile?.role || "OPERATOR"}). Integrated into authoritative incident evidence.`
            : `Rejected by ${userProfile?.fullName || "Operations Officer"}: Non-actionable or insufficient ground evidence.`,
      });
      setReviewFeedback(
        `Report ${action === "APPROVE" ? "APPROVED and integrated to Incident Twin" : "REJECTED"}.`
      );
      await loadCitizenReports();
      await reconcileEvidence();
    } catch (err: any) {
      setReviewFeedback(`Review action failed: ${err.message || "Unauthorized"}`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      await reconcileEvidence();
      await loadCitizenReports();
    } finally {
      setIsReconciling(false);
    }
  };

  const handleVerifyEvidence = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyCitizenEvidence(id);
      await loadCitizenReports();
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
        freshness: be.freshness_seconds ? `${Math.round(be.freshness_seconds / 60)}m ago` : "Recent (Demo)",
        status: be.interpretation || "CONFIRMING",
        details: be.details || be.raw_data?.details as string || "Domain-evaluated sensor telemetry and spatial payload.",
        conflict_status: be.conflict_status,
        conflict_details: be.conflict_details,
        processing_status: be.processing_status,
        interpretation: be.interpretation,
        is_simulated: be.is_simulated,
        photo_url: (be.raw_data?.photo_url as string) || (be.source === "CITIZEN" ? (be.raw_data?.image_url as string) : undefined),
        raw_data: be.raw_data,
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
              observation: "Field Ground Visual: Active Debris Runoff & Cut Slope Failure",
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

  const citizenCount = displayEvidence.filter(e => e.sourceType === "CITIZEN" || e.sourceType === "PUBLIC_CITIZEN").length;
  const unverifiedCitizenCount = displayEvidence.filter(e => (e.sourceType === "CITIZEN" || e.sourceType === "PUBLIC_CITIZEN") && (e.interpretation === "UNVERIFIED" || e.status === "UNVERIFIED")).length;

  const filteredEvidence = displayEvidence.filter(item => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "CITIZEN") return item.sourceType === "CITIZEN" || item.sourceType === "PUBLIC_CITIZEN";
    if (selectedFilter === "TERRAIN") return item.sourceType === "TERRAIN" || item.sourceType === "HISTORICAL";
    return item.sourceType === selectedFilter;
  });

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
            onClick={() => {
              setIncidentSubTab("ASSESSMENT");
              setStep(4);
            }}
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
                {backendStatus === "CONNECTED" ? "FASTAPI BACKEND" : "STANDALONE LOCAL REPLAY"}
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

      {/* ── Signature Capability #3: Evidence Convergence ("Why Do We Believe This?") ── */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-4 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Evidence Convergence Engine ("Why Do We Believe This?")
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  CONVERGENT (4 OF 4 PATHWAYS AGREE)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono">
                  CONTROLLED DEMONSTRATION
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-sensor cross-validation isolating physical signal from sensor artifact [CONTROLLED DEMO SCENARIO].
              </p>
            </div>
          </div>
          <div className="text-[11px] text-right text-slate-400">
            <span>Overall Assessment Trust: </span>
            <strong className="text-emerald-400 text-xs">82.5% HIGH</strong>
          </div>
        </div>

        {/* The 4 Independent Evidence Pathways */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Pathway 1 */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="w-1.5 h-full bg-blue-500 absolute top-0 left-0" />
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-blue-400 uppercase font-bold">PATHWAY 1: DYNAMIC HAZARD</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">SCENARIO TELEMETRY</span>
            </div>
            <div className="pl-1">
              <div className="font-bold text-white text-xs">IMD ARI-7 Rainfall Saturation</div>
              <div className="text-slate-300 text-[11px] mt-1">184.6mm 7-day antecedent, 8.4mm/hr convective rate</div>
              <div className="text-blue-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>●</span> <span>High Scenario Reliability (Demo AWS)</span>
              </div>
            </div>
          </div>

          {/* Pathway 2 */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="w-1.5 h-full bg-purple-500 absolute top-0 left-0" />
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-purple-400 uppercase font-bold">PATHWAY 2: STATIC SUSCEPTIBILITY</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">TERRAIN MODEL</span>
            </div>
            <div className="pl-1">
              <div className="font-bold text-white text-xs">Copernicus 30m DEM + GSI NLSM</div>
              <div className="text-slate-300 text-[11px] mt-1">44.2° cut-slope in Daling-Buxa fractured mica-schist</div>
              <div className="text-purple-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>●</span> <span>High Reliability (Verified Topo)</span>
              </div>
            </div>
          </div>

          {/* Pathway 3 */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="w-1.5 h-full bg-emerald-500 absolute top-0 left-0" />
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">PATHWAY 3: SCENARIO FIELD EVIDENCE</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">SCENARIO VERIFIED</span>
            </div>
            <div className="pl-1">
              <div className="font-bold text-white text-xs">SDRF Team Alpha Field Visual</div>
              <div className="text-slate-300 text-[11px] mt-1">45m tension crack with active mud slurry at KM-42 scarp</div>
              <div className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>●</span> <span>Scenario Patrol Evidence (Controlled Demo)</span>
              </div>
            </div>
          </div>

          {/* Pathway 4 */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="w-1.5 h-full bg-amber-500 absolute top-0 left-0" />
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold">PATHWAY 4: CITIZEN INTEL</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">UNVERIFIED SUBMISSION</span>
            </div>
            <div className="pl-1">
              <div className="font-bold text-white text-xs">Safe PWA Report #CR-2048-01</div>
              <div className="text-slate-300 text-[11px] mt-1">Carriageway encroachment reported at Bhalukpong checkpost</div>
              <div className="text-amber-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>●</span> <span>Moderate Trust (Pending Operator Sign-off)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence Trust & Uncertainty Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          {/* Known With High Confidence */}
          <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/40">
            <div className="text-emerald-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Known (High Confidence)</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>Rain saturation: 184.6mm (IMD)</li>
              <li>Slope angle: 44.2° (Copernicus DEM)</li>
              <li>Surface tension crack: 45m (SDRF)</li>
              <li>Lifeline status: NH-13 sole artery</li>
            </ul>
          </div>

          {/* Inferred With Moderate Confidence */}
          <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-800/40">
            <div className="text-blue-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Inferred (Moderate Confidence)</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>Pore-water pressure from ARI-7</li>
              <li>Potential debris volume: ~3,200 m³</li>
              <li>Clearing duration: 14 to 18 hours</li>
              <li>Estimated pop isolation: 1,420</li>
            </ul>
          </div>

          {/* Unknown / Unconfirmed Data Gaps */}
          <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-800/40">
            <div className="text-amber-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Unknown / Information Gaps</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>Piezometer telemetry: KM-41 offline</li>
              <li>Subsurface slip surface exact depth</li>
              <li>Night-time vehicle occupancy downstream</li>
              <li>Bridle track clearance for 10-wheelers</li>
            </ul>
          </div>

          {/* Sensitivity Scenario (Demonstration Model Bounds) */}
          <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-800/40">
            <div className="text-purple-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Sensitivity Scenario</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>Additional rainfall increases modeled hazard under current demonstration assumptions</li>
              <li>Rain &lt; 10mm/12h: Hazard lowers towards baseline</li>
              <li>Crack widening &gt; 5cm: Triggers scenario escalation</li>
              <li>Culvert rupture: Increases modeled debris velocity</li>
            </ul>
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
          onClick={() => {
            setIncidentSubTab("ACTIONS");
            setStep(5);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Dispatch Ground Patrol Verification</span>
          <IconArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Evidence Source Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setSelectedFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
            selectedFilter === "ALL"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          All Evidence ({displayEvidence.length})
        </button>
        <button
          onClick={() => setSelectedFilter("CITIZEN")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === "CITIZEN"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <IconRadio className="w-3.5 h-3.5" />
          <span>Citizen Evidence Queue ({liveReports.length > 0 ? liveReports.length : citizenCount})</span>
          {liveReports.filter(r => r.review_status === "PENDING_REVIEW").length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {liveReports.filter(r => r.review_status === "PENDING_REVIEW").length} Pending
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("WEATHER")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === "WEATHER"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <IconCloudRain className="w-3.5 h-3.5" />
          <span>Meteorological ({displayEvidence.filter(e => e.sourceType === "WEATHER").length})</span>
        </button>
        <button
          onClick={() => setSelectedFilter("SATELLITE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === "SATELLITE"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <IconSatellite className="w-3.5 h-3.5" />
          <span>Satellite InSAR & Optical ({displayEvidence.filter(e => e.sourceType === "SATELLITE").length})</span>
        </button>
        <button
          onClick={() => setSelectedFilter("TERRAIN")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === "TERRAIN"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <IconMountain className="w-3.5 h-3.5" />
          <span>Terrain & Lithology ({displayEvidence.filter(e => e.sourceType === "TERRAIN" || e.sourceType === "HISTORICAL").length})</span>
        </button>
        <button
          onClick={() => setSelectedFilter("FIELD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === "FIELD"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <IconShieldCheck className="w-3.5 h-3.5" />
          <span>Field Patrol ({displayEvidence.filter(e => e.sourceType === "FIELD").length})</span>
        </button>
      </div>

      {/* ── AUTHORITATIVE CITIZEN EVIDENCE REVIEW QUEUE SECTION ── */}
      {(selectedFilter === "CITIZEN" || selectedFilter === "ALL") && liveReports.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-md space-y-4 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <IconRadio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Citizen Safe Evidence Review Queue
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                    FASTAPI + SQLITE DURABLE ({liveReports.length} REPORTS)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
                  Real-time intake from Citizen Safe PWA across 8 North Eastern Region states. Screened by Multimodal Vision AI; human review required for authoritative incident elevation.
                </p>
              </div>
            </div>

            {/* Filter status buttons & Refresh */}
            <div className="flex items-center gap-2 text-xs font-mono">
              {["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setCitizenStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    citizenStatusFilter === st
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                      : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}

              <button
                onClick={loadCitizenReports}
                disabled={isLoadingReports}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1"
                title="Refresh live citizen queue"
              >
                <span className={isLoadingReports ? "animate-spin inline-block" : ""}>⟳</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Review feedback message */}
          {reviewFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <span>{reviewFeedback}</span>
              <button
                onClick={() => setReviewFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Citizen reports grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveReports.map((report) => {
              const isPending = report.review_status === "PENDING_REVIEW";
              const isApproved = report.review_status === "APPROVED";
              const isRejected = report.review_status === "REJECTED";

              return (
                <div
                  key={report.id}
                  className={`border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all ${
                    isPending
                      ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800/60"
                      : isApproved
                      ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800/60"
                      : "bg-red-50/20 dark:bg-red-950/10 border-red-300 dark:border-red-800/60"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Tracking ID + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {report.tracking_id}
                        </span>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                            report.is_ner_region
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {report.is_ner_region ? "NER REGION" : "OUTSIDE NER"}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isApproved
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                            : isRejected
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse"
                        }`}
                      >
                        {report.review_status}
                      </span>
                    </div>

                    {/* Photo + Telemetry Row */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <div
                        onClick={() => setExpandedImage(report.image_url)}
                        className="col-span-1 h-24 rounded-lg overflow-hidden bg-slate-950 relative border border-slate-300 dark:border-neutral-700 cursor-pointer group"
                      >
                        <img
                          src={report.image_url}
                          alt="Citizen Upload"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                          🔍 View
                        </div>
                      </div>

                      <div className="col-span-2 space-y-1 text-xs font-mono">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {report.locality || report.district}, {report.state}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                          Corridor: {report.road_corridor || "Local Artery"}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                          GPS: {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E (±{report.gps_accuracy ?? 10}m)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Received: {new Date(report.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {/* AI Screening Findings */}
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          AI VISION SCREENING: {report.ai_screening_result?.hazard_type || "SLOPE_DEBRIS"}
                        </span>
                        <span className="text-slate-500 dark:text-neutral-400">
                          {report.ai_screening_result?.confidence || "MODERATE"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-neutral-300 font-sans">
                        {report.ai_observation || "Slope failure indicators detected."}
                      </p>
                    </div>

                    {/* Citizen Notes */}
                    {report.citizen_notes && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-600 dark:text-neutral-400 text-[10px] uppercase font-mono block">
                          Citizen Field Note:
                        </span>
                        <p className="text-slate-800 dark:text-neutral-200 text-[11px] italic bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800 mt-0.5">
                          "{report.citizen_notes}"
                        </p>
                      </div>
                    )}

                    {/* Review Disposition Status if already processed */}
                    {!isPending && (
                      <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 pt-1 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                        <span>
                          Reviewed by: <strong className="text-slate-800 dark:text-neutral-200">{report.reviewer_name || "Operations Officer"}</strong> ({report.reviewer_role})
                        </span>
                        {report.incident_code && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Incident: {report.incident_code}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operator Review Actions (RBAC enforced) */}
                  {isPending && (
                    <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                      {canReconcile ? (
                        <>
                          <button
                            onClick={() => handleReviewAction(report.id, "REJECT")}
                            disabled={reviewLoadingId === report.id}
                            className="bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-medium text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 transition-colors cursor-pointer"
                          >
                            {reviewLoadingId === report.id ? "Processing..." : "Reject Report"}
                          </button>

                          <button
                            onClick={() => handleReviewAction(report.id, "APPROVE")}
                            disabled={reviewLoadingId === report.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <IconCheck className="w-3.5 h-3.5" />
                            <span>{reviewLoadingId === report.id ? "Integrating..." : "Approve & Integrate to Incident"}</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                          Review requires Operator / Magistrate authorization (RECONCILE_EVIDENCE).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Source Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvidence.map((item) => {
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
              className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm transition-all min-w-0 ${
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

                  {/* Explicit Lineage Relation & "Why Do We Believe This?" Box */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-neutral-400 font-bold uppercase mb-1">
                      <span className="text-purple-600 dark:text-purple-400">
                        LINEAGE: {isWeather ? "SUPPORTS HAZARD HYPOTHESIS" : isSat ? (isConflicted ? "CONTRADICTS OPTICAL CLARITY" : "DERIVED_FROM SAR BACKSCATTER") : isTerrain ? "DERIVED_FROM COPERNICUS GLO-30 DEM" : isHist ? "SUPERSEDES VIRGIN SLOPE ASSUMPTION" : isCitizen ? "SUPPORTS CARRIAGEWAY OBSTRUCTION REPORT" : "SUPPORTS SCENARIO FIELD CONFIRMATION"}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[9px]">DATA → FEATURE → ASSESSMENT</span>
                    </div>
                    <div className="text-slate-700 dark:text-neutral-300 font-sans leading-relaxed text-xs">
                      <strong className="text-slate-900 dark:text-white font-mono text-[10px] block mb-0.5">WHY WE BELIEVE THIS:</strong>
                      {isWeather && "Extreme antecedent precipitation (184.6mm) on saturated 44.2° cut slope exceeds regional 70mm/24h empirical threshold by >150%."}
                      {isSat && (isConflicted ? "Optical Sentinel-2 imagery has 88% monsoon cloud obstruction; radar backscatter indicates surface roughness anomaly but lacks optical confirmation." : "Synthetic Aperture Radar phase coherence penetrates monsoon clouds, confirming localized slope shift.")}
                      {isTerrain && "Horn (1981) 3x3 finite-difference algorithm on 30m posting verifies 42.3° colluvial escarpment on fractured Daling-Buxa formation."}
                      {isHist && "BRO Project Vartak maintenance records confirm 3 historical slides at KM-42 (2021-2024), nearest GSI NLSM landslide polygon is 140.6m away."}
                      {isCitizen && "Citizen mobile camera upload with geocoding verifies carriageway encroachment; kept UNVERIFIED until physical patrol sign-off."}
                      {isField && "Official SDRF / BRO field officer physical ground inspection confirmed barricade placement and slope status."}
                    </div>
                  </div>

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

                  {/* If Citizen Evidence, display first-class photo artifact with expand + honest CV analysis */}
                  {isCitizen && (
                    <div className="mt-3 space-y-2">
                      <div
                        onClick={() => setExpandedImage(item.photo_url || activeImage || "/samples/landslide_debris_flow.jpg")}
                        className="rounded-lg overflow-hidden border border-slate-300 dark:border-neutral-700 bg-slate-950 h-32 flex items-center justify-center relative cursor-pointer group"
                      >
                        <img
                          src={item.photo_url || activeImage || "/samples/landslide_debris_flow.jpg"}
                          alt="Citizen Uploaded Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-white flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>GROUND PHOTO ARTIFACT</span>
                        </div>
                        <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-slate-300 group-hover:text-white">
                          🔍 Click to Expand
                        </div>
                      </div>

                      {/* Honest CV Analysis Card */}
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-mono">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600 dark:text-neutral-400">CV INFERENCE ENGINE</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            NOT CONNECTED / EXPERIMENTAL
                          </span>
                        </div>
                        <div className="text-slate-900 dark:text-white font-semibold mt-1">
                          CV ANALYSIS: NOT CONNECTED / EXPERIMENTAL • Manual verification required
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-normal">
                          Zero automated object detection. No synthetic bounding boxes or fabricated probabilities applied. Requires visual inspection by authorized Field Controller.
                        </div>
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

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-2xl max-w-2xl w-full p-4 shadow-2xl flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                CITIZEN OPTICAL EVIDENCE ARTIFACT • NH-13 KM-41.8
              </span>
              <button
                onClick={() => setExpandedImage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 max-h-[60vh] flex items-center justify-center">
              <img
                src={expandedImage}
                alt="Full Resolution Evidence"
                className="w-full h-full object-contain max-h-[60vh]"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <div>
                <span className="block text-slate-400">INGEST SOURCE</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">TerraGuardian Safe PWA</span>
              </div>
              <div>
                <span className="block text-slate-400">GEOTAG STATUS</span>
                <span className="font-bold text-emerald-600">Geo-Verified (27.20°N, 92.45°E)</span>
              </div>
              <div>
                <span className="block text-slate-400">CV STATE</span>
                <span className="font-bold text-amber-600">Experimental / Disconnected</span>
              </div>
              <div>
                <span className="block text-slate-400">VERIFICATION</span>
                <span className="font-bold text-amber-600">Pending Field Patrol</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


