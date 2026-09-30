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
  IconLayers,
  IconShieldCheck,
  IconRadar,
} from "../icons";
import { EvidenceReconciliationView } from "./EvidenceReconciliationView";
import { AuthorityDecisionView } from "./AuthorityDecisionView";
import { ActionTrackingView } from "./ActionTrackingView";
import { ConfirmationView } from "./ConfirmationView";
import { GoldenDemoView } from "./GoldenDemoView";
import { IncidentReplayView } from "./IncidentReplayView";
import { ExposureWorkspaceView } from "./ExposureWorkspaceView";
import { apiClient } from "../../services/apiClient";

export const IncidentWorkspaceView: React.FC = () => {
  const {
    backendIncidentId,
    setStep,
    setActiveNavTab,
    closeIncident,
    previousNavTab,
    incidentSubTab,
    setIncidentSubTab,
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
    currentAssessment,
    previousAssessment,
    whatChanged,
    assessmentVersion,
    reassessWithRealEnvironmentalData,
  } = useDemoScenario();

  const [decisionSupport, setDecisionSupport] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!backendIncidentId) return;
    apiClient.getIncidentDecisionSupport(backendIncidentId)
      .then(res => setDecisionSupport(res))
      .catch(err => console.warn("Decision support endpoint fallback:", err));
  }, [backendIncidentId]);

  const [isReassessing, setIsReassessing] = React.useState(false);

  const handleRunReassessment = async () => {
    setIsReassessing(true);
    try {
      await reassessWithRealEnvironmentalData();
    } catch (err) {
      console.error("Reassessment failed:", err);
    } finally {
      setIsReassessing(false);
    }
  };

  const slopeVal = currentAssessment?.features?.slope_deg != null
    ? currentAssessment.features.slope_deg.toFixed(1)
    : currentAssessment?.slope_degrees != null
    ? currentAssessment.slope_degrees.toFixed(1)
    : "25.7";
  const rainVal = currentAssessment?.features?.rainfall_24h_mm != null
    ? currentAssessment.features.rainfall_24h_mm.toFixed(1)
    : currentAssessment?.rainfall_24h_mm != null
    ? currentAssessment.rainfall_24h_mm.toFixed(1)
    : "74.0";
  const ari7Val = currentAssessment?.features?.ari_7_index != null
    ? currentAssessment.features.ari_7_index.toFixed(1)
    : currentAssessment?.antecedent_rainfall_7d_mm != null
    ? currentAssessment.antecedent_rainfall_7d_mm.toFixed(1)
    : "127.5";
  const elevVal = currentAssessment?.features?.elevation_m != null
    ? currentAssessment.features.elevation_m.toFixed(0)
    : currentAssessment?.elevation_m != null
    ? currentAssessment.elevation_m.toFixed(0)
    : "618";
  const dataClass = currentAssessment?.data_class || "REAL_HISTORICAL";
  const modelType = currentAssessment?.model_type || "Deterministic Heuristic Baseline";
  const currentVer = assessmentVersion || currentAssessment?.assessment_version || currentAssessment?.version || 1;

  const suscData = currentAssessment?.experimental_susceptibility;
  const suscScore = suscData?.score != null ? (typeof suscData.score === "number" ? suscData.score.toFixed(3) : String(suscData.score)) : "0.978";
  const suscClass = suscData?.class || "HIGH";
  const suscModel = suscData?.model_type || "EXPERIMENTAL EMPIRICAL BASELINE";
  const suscStatus = suscData?.scientific_status || "NOT_VALIDATED_EXPERIMENTAL";

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
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
              Detected: 04:22 IST | IMD Weather Station Telemetry (Replay)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              closeIncident();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <span>
              ← Return to {previousNavTab === "MAP" ? "Tactical Map" : previousNavTab === "OPERATIONS" ? "Situational Overview" : "Priority Queue"}
            </span>
          </button>
          <button
            onClick={() => setIncidentSubTab("EVIDENCE")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md text-xs font-mono transition-all cursor-pointer"
          >
            <span>Reconcile Evidence</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Authoritative Assessment Metadata & Evolution Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-mono border border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-emerald-400">ASSESSMENT v{currentVer}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
            {dataClass}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">
            Model: <strong className="text-white">{modelType}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            DEM: <span className="text-slate-200">{slopeVal}° @ {elevVal}m MSL</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Rain: <span className="text-slate-200">{rainVal}mm (ARI-7: {ari7Val})</span>
          </span>
        </div>

        <button
          onClick={handleRunReassessment}
          disabled={isReassessing}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-semibold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {isReassessing ? (
            <span>Computing DEM & ERA5...</span>
          ) : (
            <span>↻ Re-assess with Real Data</span>
          )}
        </button>
      </div>

      {/* ── Master Cognitive Progression (Phase 0 North Star Section 0.13) ── */}
      <div className="bg-slate-50 dark:bg-neutral-950 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 flex items-center justify-between overflow-x-auto gap-2 text-xs font-mono">
        <button
          onClick={() => setIncidentSubTab("OVERVIEW")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "OVERVIEW"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>1. WHAT WE KNOW</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("EVIDENCE")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "EVIDENCE"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>2. WHY WE BELIEVE IT</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("EXPOSURE")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "EXPOSURE"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>3. WHAT IT THREATENS</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("ASSESSMENT")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "ASSESSMENT"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>4. WHAT SHOULD HAPPEN</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("ACTIONS")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "ACTIONS"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>5. WHO AUTHORIZED IT</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("OUTCOME")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
            incidentSubTab === "OUTCOME"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>6. WHAT ACTUALLY HAPPENED</span>
        </button>
        <span className="text-slate-300 dark:text-neutral-700">→</span>
        <button
          onClick={() => setIncidentSubTab("OUTCOME")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
        >
          <span>7. WHAT WE BELIEVE NOW</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setIncidentSubTab("OVERVIEW")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "OVERVIEW"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          OVERVIEW
        </button>
        <button
          onClick={() => setIncidentSubTab("EVIDENCE")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "EVIDENCE"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          EVIDENCE
        </button>
        <button
          onClick={() => setIncidentSubTab("ASSESSMENT")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "ASSESSMENT"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          ASSESSMENT
        </button>
        <button
          onClick={() => setIncidentSubTab("EXPOSURE")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "EXPOSURE"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          EXPOSURE
        </button>
        <button
          onClick={() => setIncidentSubTab("ACTIONS")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "ACTIONS"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          ACTIONS
        </button>
        <button
          onClick={() => setIncidentSubTab("OUTCOME")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "OUTCOME"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          OUTCOME
        </button>
        <button
          onClick={() => setIncidentSubTab("TIMELINE")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            incidentSubTab === "TIMELINE"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
          }`}
        >
          TIMELINE
        </button>
      </div>

      {/* Render Content Based on Sub-Tab */}
      {incidentSubTab === "EVIDENCE" && <EvidenceReconciliationView />}

      {incidentSubTab === "EXPOSURE" && <ExposureWorkspaceView />}

      {incidentSubTab === "ACTIONS" && (
        <div className="space-y-6">
          <AuthorityDecisionView />
          <ActionTrackingView />
        </div>
      )}

      {incidentSubTab === "OUTCOME" && (
        <div className="space-y-6">
          <ConfirmationView />
          <GoldenDemoView />
        </div>
      )}

      {incidentSubTab === "TIMELINE" && <IncidentReplayView />}

      {(incidentSubTab === "OVERVIEW" || incidentSubTab === "ASSESSMENT") && (
        <>
          {/* Core Domain Principles Strip: Risk vs Confidence vs Priority (in Overview) */}
          {incidentSubTab === "OVERVIEW" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Dimension 1: STATIC SUSCEPTIBILITY (Independent Ground Predisposition) */}
                <div className="bg-white dark:bg-neutral-900 border-2 border-rose-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">STATIC SUSCEPTIBILITY</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">TERRAIN PRONENESS</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{suscClass}</span>
                      <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">({suscScore})</span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                      Experimental susceptibility score • not a calibrated probability
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                      Independent static ground predisposition from empirical logistic baseline (Copernicus DEM slope {slopeVal}° & {elevVal}m, ERA5 ARI-7, GSI proximity).
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Status:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">NOT VALIDATED (v0.1-exp)</span>
                  </div>
                </div>

                {/* Dimension 2: CURRENT HAZARD (Dynamic Trigger Assessment) */}
                <div className="bg-white dark:bg-neutral-900 border-2 border-red-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">CURRENT HAZARD RISK</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">PHYSICAL DANGER</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-red-600 dark:text-red-500 font-mono">{riskLevel}</span>
                      <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">({riskScore}/100)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                      Slope {slopeVal}° (Copernicus DEM 30m, {elevVal}m MSL) with {rainVal}mm precipitation (ARI-7: {ari7Val}). Dynamic hydrometeorological trigger loading.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    <span>Metric: Copernicus DEM × ERA5 ARI-7</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">Elevated Threshold</span>
                  </div>
                </div>

                {/* Dimension 3: EVIDENCE CONFIDENCE (Certainty vs Uncertainty) */}
                <div className="bg-white dark:bg-neutral-900 border-2 border-amber-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">EVIDENCE CONFIDENCE</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">CERTAINTY</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{confidenceLevel}</span>
                      <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">({confidenceScore}/100)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                      <strong>RISK ≠ CONFIDENCE:</strong> Rainfall source: ERA5 reanalysis. Terrain source: Copernicus GLO-30. Field verification recommended. Optical satellite obscured.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Status:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Patrol Verification Rec.</span>
                  </div>
                </div>

                {/* Dimension 4: OPERATIONAL PRIORITY (Strategic Consequence) */}
                <div className="bg-white dark:bg-neutral-900 border-2 border-red-500/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">OPERATIONAL PRIORITY</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">CONSEQUENCE</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">{priorityLevel}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                      <strong>Highest hazard ≠ Highest priority:</strong> Even moderate debris volume becomes P1 Critical when severing solitary strategic lifeline corridor and hospital supply route.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    <span>Lifeline Corridor:</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">NH-13 Severance Risk</span>
                  </div>
                </div>
              </div>

              {/* ── Signature Capability: "Why This Incident?" Explainability Panel ── */}
              <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-5 shadow-xl font-mono space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <IconShieldCheck className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                        Operational Explainability: "Why This Incident?"
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Multi-factor consequence derivation grounding why TG-2048 commands immediate operational primacy.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    CONSEQUENCE MODEL: RANK 1 (PRIORITY 89.2)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Pillar 1: Hazard & Susceptibility */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-red-400 font-bold uppercase">1. PHYSICAL HAZARD (86.0)</div>
                    <div className="text-slate-300 text-[11px]">
                      Triggered by 184.6mm 7-day antecedent saturation + 44.2° colluvial mica-schist cut-slope. Exceeds empirical threshold by &gt;150%.
                    </div>
                  </div>

                  {/* Pillar 2: Confidence & Verification */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-amber-400 font-bold uppercase">2. CONFIDENCE EVOLUTION (54% → 82.5%)</div>
                    <div className="text-slate-300 text-[11px]">
                      Initial remote sensing was 54% due to 88% cloud cover on optical imagery. Elevated to 82.5% post SDRF Team Alpha physical ground confirmation of 45m tension crack.
                    </div>
                  </div>

                  {/* Pillar 3: Lifeline Severance & Criticality */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-purple-400 font-bold uppercase">3. LIFELINE SEVERANCE (98.0)</div>
                    <div className="text-slate-300 text-[11px]">
                      NH-13 KM-42 is a solitary strategic arterial lifeline for West Kameng and Tawang border supply. Severance isolates Bomdila District Civil Hospital with no paved bypass.
                    </div>
                  </div>
                </div>

                {/* Supporting, Limiting, and Reassessment Rules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-800/40">
                    <div className="text-emerald-400 text-[10px] uppercase font-bold">Supporting Evidence Signals</div>
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                      <li>IMD AWS-Tenga (184.6mm)</li>
                      <li>Copernicus 30m DEM (44.2° slope)</li>
                      <li>SDRF Alpha on-site visual (#EV-003)</li>
                    </ul>
                  </div>

                  <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-800/40">
                    <div className="text-amber-400 text-[10px] uppercase font-bold">Limiting Factors & Unknowns</div>
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                      <li>Pore-pressure sensor offline at KM-41</li>
                      <li>Subsurface slip surface depth unmeasured</li>
                      <li>Night-time vehicle occupancy estimated</li>
                    </ul>
                  </div>

                  <div className="bg-cyan-950/20 p-3 rounded-lg border border-cyan-800/40">
                    <div className="text-cyan-400 text-[10px] uppercase font-bold">What Would Change This Assessment?</div>
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                      <li>Rain &lt; 10mm/12h: Priority drops to P2</li>
                      <li>Crack widening &gt; 5cm: Triggers Evac</li>
                      <li>Secondary culvert block: Flash flood warning</li>
                    </ul>
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
                          Downslope alluvial cone within 800m drainage path. Flash mudflow risk to 380 homes (Kinematic runout model NOT IMPLEMENTED / DEFERRED).
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
                          ERA5-Land / GPM Precipitation
                        </span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">{rainVal} mm (ARI-7: {ari7Val})</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                          <IconActivity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          Copernicus DEM 30m
                        </span>
                        <span className="font-mono text-slate-800 dark:text-neutral-200 font-semibold">{slopeVal}° @ {elevVal}m MSL</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                          <IconSatellite className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                          Sentinel-2 Multispectral
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">Optical Obscured (SAR Recommended)</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                          <IconLayers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          GSI NLSM Susceptibility
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-300 font-semibold">Zone-IV (High Debris Flow)</span>
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
                      <div>Reconcile conflicting sensor feeds and request verified field inspection.</div>
                    </div>
                    <button
                      onClick={() => setIncidentSubTab("EVIDENCE")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-md whitespace-nowrap shadow-sm cursor-pointer"
                    >
                      Examine Evidence →
                    </button>
                  </div>
                </div>
              </div>

              {/* WHAT CHANGED: Scientific Assessment Evolution Section */}
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold font-mono text-xs">
                      Δ EVOLUTION
                    </span>
                    <div>
                      <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                        <span>WHAT CHANGED: BEFORE vs CURRENT PERSISTED STATE</span>
                        <span className="bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                          PROVENANCE RECONCILED
                        </span>
                      </h2>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                        Forensic lineage comparison: Prior Controlled Demo vs Authoritative Real-Data State
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500">Active State:</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded font-bold">
                      {dataClass} (v{currentVer})
                    </span>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 uppercase">
                        <th className="py-2.5 px-3">Parameter</th>
                        <th className="py-2.5 px-3">Prior State (v0 / Demo)</th>
                        <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">Current State (Persisted)</th>
                        <th className="py-2.5 px-3">Source Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                      {whatChanged && whatChanged.length > 0 ? (
                        whatChanged.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{row.parameter}</td>
                            <td className="py-2.5 px-3 text-slate-400 line-through">{row.before}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-300">
                              {row.current}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">{row.provenance}</td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Slope Angle</td>
                            <td className="py-2.5 px-3 text-slate-400 line-through">44.2° (Colluvium fixture)</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-300">
                              {slopeVal}°
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">Copernicus DEM GLO-30 (real)</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Elevation</td>
                            <td className="py-2.5 px-3 text-slate-400 line-through">840.0 m MSL (fixture)</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-300">
                              {elevVal} m MSL
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">Copernicus DEM GLO-30 (real)</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Rainfall (24h / ARI-7)</td>
                            <td className="py-2.5 px-3 text-slate-400 line-through">184.6 mm / 210.0 (fixture)</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-300">
                              {rainVal} mm (ARI-7: {ari7Val})
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">NASA GPM / ERA5-Land Reanalysis (real historical)</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Hazard Risk Score</td>
                            <td className="py-2.5 px-3 text-slate-400">62.0 / 100 (HIGH)</td>
                            <td className="py-2.5 px-3 font-bold text-red-600 dark:text-red-400">
                              {riskScore}/100 ({riskLevel})
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">Deterministic Heuristic Baseline</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Evidence Confidence</td>
                            <td className="py-2.5 px-3 text-slate-400">49.0 / 100 (LOW)</td>
                            <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                              {confidenceScore}/100 ({confidenceLevel})
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">Multi-source calibrated weighting</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Lithological Susceptibility</td>
                            <td className="py-2.5 px-3 text-slate-400">Zone IV (fixture)</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-neutral-200">Zone IV (Colluvium / Schist)</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">GSI NLSM Corridor Polygon (authoritative)</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Experimental Baseline Susceptibility</td>
                            <td className="py-2.5 px-3 text-slate-400">Uncomputed (Heuristic Scoring Only)</td>
                            <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                              <div>{suscScore} ({suscClass})</div>
                              <div className="text-[10px] font-mono font-normal text-amber-600 dark:text-amber-400 mt-0.5">
                                Experimental susceptibility score • not a calibrated probability
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400">Empirical Baseline Logistic Model (v0.1-exp, NOT VALIDATED)</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Scientific Truth & Model Capabilities Audit (Phase 1 Truth Verification) */}
          <div className="bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5 gap-2">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Assessment Model Capabilities Audit (Truth in Inference)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 font-bold">
                AUDITED: LEVEL 3 (INTEGRATION TESTED)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400">Failure Probability:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">NOT IMPLEMENTED / DEFERRED</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-sans">Hazard score is a dimensional index (0-100), not a calibrated probability.</div>
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400">Kinematic Mode:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">NOT IMPLEMENTED / DEFERRED</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-sans">Debris flow vs planar slide classification deferred to geotechnical phase.</div>
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400">Runout Estimation:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">NOT IMPLEMENTED / DEFERRED</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-sans">Numerical runout trajectory and impact velocity simulation deferred.</div>
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400">Probabilistic Calibration:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">NOT IMPLEMENTED / DEFERRED</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-sans">Platt / isotonic calibration on regional catalogues deferred to Phase 5.</div>
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400">Validated Prediction Metrics:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">NOT IMPLEMENTED / DEFERRED</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-sans">ROC-AUC and Brier scores require regional historical event catalog.</div>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 dark:text-emerald-200 font-bold">Active Operational Engine:</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">IMPLEMENTED & CONNECTED</span>
                </div>
                <div className="text-[10px] text-emerald-800 dark:text-emerald-400 mt-1 font-sans">Deterministic heuristic baseline (Copernicus DEM 30m + ERA5/AWS rainfall).</div>
              </div>
            </div>
          </div>

          {/* Predictive Intelligence & Feature Attribution Architecture */}
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
                    Deterministic Heuristic Trigger + Experimental Empirical Baseline (Logistic Regression v0.1-exp)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-bold">
                  EXPERIMENTAL BASELINE (NOT VALIDATED)
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
                      <span className="font-semibold text-slate-900 dark:text-white">Antecedent Cumulative Precipitation (ERA5 / GPM)</span>
                      <span className="font-mono text-red-600 dark:text-red-400 font-bold">{rainVal} mm (ARI-7: {ari7Val})</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: "40.8%" }} />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                      Substantial hydrometeorological moisture accumulation exceeding baseline stability limits.
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">Terrain Slope Angle (Copernicus DEM 30m)</span>
                      <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{slopeVal}° @ {elevVal}m MSL</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: "34.2%" }} />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                      Steep colluvial escarpment verified against GLO-30 raster data.
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
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">Unvalidated Heuristic Scoring</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-neutral-400">Calibration Benchmark:</span>
                    <span className="font-mono font-bold text-slate-500 dark:text-neutral-400">Corridor DEM Baseline (Uncalibrated)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                    <strong>Scientific Transparency:</strong> Deterministic heuristic baseline scoring function evaluated against West Kameng DEM and historical ERA5/GPM precipitation. Not an empirically trained ML classifier. Calibration benchmark pending.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NEXT BEST INFORMATION (NBI) & COMPETING HYPOTHESES DISCRIMINATION */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <IconRadar className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                    <span>NEXT BEST INFORMATION (NBI) & UNCERTAINTY REDUCTION</span>
                    <span className="bg-amber-600 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                      HYPOTHESIS DISCRIMINATION
                    </span>
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    Qualitative operational mechanism prioritizing observations that maximally reduce epistemic uncertainty between competing hypotheses.
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
                NOT A BAYESIAN INFERENCE ENGINE • QUALITATIVE DISCRIMINATION
              </div>
            </div>

            {/* NBI Action Items */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(decisionSupport?.nbi_items && decisionSupport.nbi_items.length > 0
                ? decisionSupport.nbi_items
                : [
                    {
                      title: "Dispatch Ground Patrol for Physical Hazard Verification",
                      target_modality: "FIELD_PATROL",
                      priority: "HIGH",
                      rationale: "On-site visual confirmation of slope toe displacement and carriageway encroachment provides verified physical evidence, resolving spaceborne cloud obscuration.",
                      spatial_scope: "Slope Toe & Carriageway Envelope (27.084° N, 92.568° E)",
                      temporal_scope: "Immediate (< 2 hours)",
                      target_hypotheses: ["H2_INTERVENTION_CONDITIONED_NON_EVENT", "H5_OBSERVATION_GAP", "H1_FALSE_ALARM"],
                    },
                    {
                      title: "Acquire All-Weather Sentinel-1 InSAR Backscatter Anomaly",
                      target_modality: "SATELLITE_RADAR",
                      priority: "HIGH",
                      rationale: "Optical sensors are 88% cloud-obscured by monsoon front. Synthetic Aperture Radar (SAR) phase coherence penetrates clouds to detect millimeter shear.",
                      spatial_scope: "5km Regional Transit Corridor Envelope",
                      temporal_scope: "Next orbital pass (< 12 hours)",
                      target_hypotheses: ["H3_DELAYED_FAILURE", "H4_SHIFTED_HAZARD", "H5_OBSERVATION_GAP"],
                    },
                    {
                      title: "Reconcile Discordant Field vs Telemetry Signals",
                      target_modality: "CROSS_SOURCE_RECONCILIATION",
                      priority: "HIGH",
                      rationale: "Reconciling source discordance between 184mm rainfall trigger and clear road carriageway avoids premature resource commitment.",
                      spatial_scope: "Carriageway conflict coordinates",
                      temporal_scope: "Immediate (< 1 hour)",
                      target_hypotheses: ["H7_CONFLICTED", "H1_FALSE_ALARM", "H2_INTERVENTION_CONDITIONED_NON_EVENT"],
                    },
                    {
                      title: "Extend Observation Window & Deploy Drone Slope Survey",
                      target_modality: "UAV_DRONE_SURVEY",
                      priority: "HIGH",
                      rationale: "Physical barrier confirmed, but zero surface failure observed. Precipitation surcharge (184mm) maintains critical pore pressure.",
                      spatial_scope: "Upper Colluvial Scar (Elevation 1,480m)",
                      temporal_scope: "Daylight window (< 4 hours)",
                      target_hypotheses: ["H3_DELAYED_FAILURE", "H6_RESIDUAL_HAZARD"],
                    },
                  ]
              ).map((nbi: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        {nbi.target_modality}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-bold uppercase">
                        PRIORITY: {nbi.priority}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{nbi.title}</h3>
                    <p className="text-slate-600 dark:text-neutral-400 leading-relaxed font-sans">{nbi.rationale}</p>
                  </div>

                  <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1 text-[11px] font-mono">
                    <div className="text-slate-500 dark:text-neutral-400">
                      <strong>SCOPE:</strong> {nbi.spatial_scope} • {nbi.temporal_scope}
                    </div>
                    <div className="text-purple-600 dark:text-purple-400 text-[10px]">
                      <strong>DISCRIMINATES:</strong> {Array.isArray(nbi.target_hypotheses) ? nbi.target_hypotheses.join(" vs ") : "Competing Hypotheses"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Competing Outcome Hypotheses Matrix */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-neutral-800">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 block mb-2">
                RESEARCH FOUNDATION: COMPETING OUTCOME HYPOTHESES
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-[10px] font-mono">
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">FALSE ALARM</div>
                  <span className="text-amber-600 font-bold mt-1 block">UNKNOWN</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">NON-EVENT INTERVENTION</div>
                  <span className="text-emerald-600 font-bold mt-1 block">SUPPORTING</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">DELAYED FAILURE</div>
                  <span className="text-purple-600 font-bold mt-1 block">ACTIVE (DELAYED)</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">SHIFTED HAZARD</div>
                  <span className="text-slate-400 font-bold mt-1 block">UNKNOWN</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">OBSERVATION GAP</div>
                  <span className="text-amber-600 font-bold mt-1 block">CONFIRMED (88% CLOUD)</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">RESIDUAL HAZARD</div>
                  <span className="text-red-600 font-bold mt-1 block">ELEVATED MOISTURE</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="font-bold text-slate-800 dark:text-neutral-200">CONFLICTED</div>
                  <span className="text-amber-600 font-bold mt-1 block">RECONCILING</span>
                </div>
              </div>
            </div>
          </div>

          {/* Living Hazard Evolution, Divergence Detection & Bounded Reassessment */}
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
                      BOUNDED REASSESSMENT ENGINE
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
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
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
                <strong>ACTION CONFIRMED ≠ RESOLUTION:</strong> Physical barricade confirmation does not resolve underlying antecedent slope moisture and geotechnical instability.
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
                      04:00 - 06:00 IST (Elapsed without major slope failure)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-neutral-400">Continuity Assessment:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {reassessmentResult?.continuity_supported ?? true ? "SUPPORTED (Elevated antecedent moisture sustained)" : "DISCONTINUOUS"}
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
                    Expected failure window (04:00-06:00 IST) elapsed without major slope failure. Antecedent moisture accumulation remains elevated (ARI-7: {ari7Val}). Slope is retained in <strong>DELAYED</strong> state rather than premature false clearance.
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
        </>
      )}
    </div>
  );
};
