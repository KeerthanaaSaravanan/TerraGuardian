import React, { useState, useEffect } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";
import {
  OutcomeAssessment,
  OutcomeType,
  HypothesisType,
  DecisionSupportAssessment,
  NextBestInformationItem,
} from "../../types/incident";
import {
  IconRadar,
  IconMapPin,
  IconClock,
  IconShieldCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconActivity,
  IconRotateCcw,
  IconCheck,
  IconLock,
  IconFileText,
  IconLayers,
} from "../icons";

type GoldenTimelinePhase =
  | "T0_PREDICTION"
  | "T1_OBSERVATION"
  | "T2_SHIFTED_EVIDENCE"
  | "T3_REASSESSMENT"
  | "T4_CLOSURE_GATE";

type DemoScenarioKey = "SCENARIO_A" | "SCENARIO_B" | "SCENARIO_C" | "SCENARIO_D" | "SCENARIO_E" | "SCENARIO_F" | "SCENARIO_G";

interface ScenarioDefinition {
  key: DemoScenarioKey;
  code: string;
  name: string;
  outcomeType: OutcomeType;
  primaryHypothesis: HypothesisType | "NONE";
  interventionState: string;
  observationAdequacy: string;
  causalClaimEstablished: boolean;
  closurePermitted: boolean;
  hazardState: string;
  summary: string;
}

const DEMO_SCENARIOS: Record<DemoScenarioKey, ScenarioDefinition> = {
  SCENARIO_A: {
    key: "SCENARIO_A",
    code: "A",
    name: "Event Observed (Direct Breach)",
    outcomeType: "EVENT_OBSERVED",
    primaryHypothesis: "NONE",
    interventionState: "NO_INTERVENTION",
    observationAdequacy: "ADEQUATE",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "ACTIVE",
    summary: "Colluvial mass failure occurred at predicted KM-42 location. Carriageway breached.",
  },
  SCENARIO_B: {
    key: "SCENARIO_B",
    code: "B",
    name: "Non-Event Observed (Adequate)",
    outcomeType: "NON_EVENT_OBSERVED",
    primaryHypothesis: "H1_FALSE_ALARM",
    interventionState: "NO_INTERVENTION",
    observationAdequacy: "ADEQUATE",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "DISSIPATED",
    summary: "Clear satellite and patrol view confirm slope intact under dry conditions. No intervention deployed.",
  },
  SCENARIO_C: {
    key: "SCENARIO_C",
    code: "C",
    name: "Observation Gap (Cloud / Blind)",
    outcomeType: "OBSERVATION_GAP",
    primaryHypothesis: "H5_OBSERVATION_GAP",
    interventionState: "NO_INTERVENTION",
    observationAdequacy: "INADEQUATE_OBSCURATION",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "EXPECTED",
    summary: "88% monsoon cloud obscuration prevents optical detection. Observation gap persists.",
  },
  SCENARIO_D: {
    key: "SCENARIO_D",
    code: "D",
    name: "The Hard Case (Intervention + Non-Event)",
    outcomeType: "INTERVENTION_CONDITIONED_NON_EVENT",
    primaryHypothesis: "H2_INTERVENTION_CONDITIONED_NON_EVENT",
    interventionState: "INTERVENTION_CONFIRMED",
    observationAdequacy: "ADEQUATE",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "DELAYED",
    summary: "Physical barrier confirmed deployed. Slope intact during initial window. Causal prevention UNPROVEN.",
  },
  SCENARIO_E: {
    key: "SCENARIO_E",
    code: "E",
    name: "Residual Hazard (Delayed Slip)",
    outcomeType: "RESIDUAL_HAZARD",
    primaryHypothesis: "H3_DELAYED_FAILURE",
    interventionState: "INTERVENTION_CONFIRMED",
    observationAdequacy: "ADEQUATE",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "DELAYED",
    summary: "Hydrologic pore pressure surcharge persists. Delay in failure window does not clear risk.",
  },
  SCENARIO_F: {
    key: "SCENARIO_F",
    code: "F",
    name: "Shifted Hazard (Event + H4 Offset)",
    outcomeType: "EVENT_OBSERVED",
    primaryHypothesis: "H4_SHIFTED_HAZARD",
    interventionState: "INTERVENTION_CONFIRMED",
    observationAdequacy: "ADEQUATE",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "SHIFTED",
    summary: "Slurry debris verified at KM-43.2 (1.2km offset). Within 5km corridor. SAME INCIDENT PRESERVED.",
  },
  SCENARIO_G: {
    key: "SCENARIO_G",
    code: "G",
    name: "Conflicted Evidence",
    outcomeType: "CONFLICTED",
    primaryHypothesis: "H7_CONFLICTED",
    interventionState: "INTERVENTION_CONFIRMED",
    observationAdequacy: "INADEQUATE_CONFLICTED",
    causalClaimEstablished: false,
    closurePermitted: false,
    hazardState: "ACTIVE",
    summary: "InSAR radar fringe decorrelation directly contradicts negative driver report.",
  },
};

export const GoldenDemoView: React.FC = () => {
  const {
    incidentStatus,
    hazardState,
    hazardHypothesis,
    riskScore,
    riskLevel,
    confidenceScore,
    confidenceLevel,
    priorityLevel,
    backendIncidentId,
    operationalTasks,
  } = useDemoScenario();

  const { currentUser } = useAuth();

  const [activePhase, setActivePhase] = useState<GoldenTimelinePhase>("T1_OBSERVATION");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<DemoScenarioKey>("SCENARIO_D");
  const [outcomeData, setOutcomeData] = useState<OutcomeAssessment | null>(null);
  const [decisionSupport, setDecisionSupport] = useState<DecisionSupportAssessment | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [closureAttemptResult, setClosureAttemptResult] = useState<{
    blocked: boolean;
    reason: string;
    statusCode?: number;
    timestamp?: string;
  } | null>(null);

  // Fetch live backend outcome or decision support
  useEffect(() => {
    const fetchIntelligence = async () => {
      if (!backendIncidentId) return;
      try {
        const out = await apiClient.getIncidentOutcome(backendIncidentId);
        if (out) setOutcomeData(out);
      } catch {
        // Fallback to scenario projection
      }
      try {
        const ds = await apiClient.getDecisionSupport(backendIncidentId);
        if (ds) setDecisionSupport(ds);
      } catch {
        // Fallback to scenario projection
      }
    };
    fetchIntelligence();
  }, [backendIncidentId, activePhase]);

  const handleEvaluateOutcome = async (observedLat?: number, observedLon?: number) => {
    if (!backendIncidentId) return;
    setIsEvaluating(true);
    try {
      const out = await apiClient.evaluateOutcome(backendIncidentId, {
        observed_latitude: observedLat,
        observed_longitude: observedLon,
        actor_name: currentUser?.full_name || "Operations Duty Officer",
      });
      setOutcomeData(out);
    } catch (err: unknown) {
      console.warn("Backend outcome evaluation offline, using domain scenario projection:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTestClosureGate = async () => {
    if (!backendIncidentId) {
      setClosureAttemptResult({
        blocked: true,
        statusCode: 422,
        reason: "Closure blocked by Evidentiary Gate [PRECONDITION_FAILED]: All dispatched operational tasks must be PHYSICALLY_CONFIRMED by field personnel before incident resolution.",
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    try {
      await apiClient.transitionIncidentState(backendIncidentId, {
        target_status: "RESOLVED",
        actor_role: currentUser?.role || "AUTHORIZED_DECISION_MAKER",
        actor_name: currentUser?.full_name || "District Magistrate",
        authority_order_code: "ORD-CLOSURE-TEST-01",
      });
      setClosureAttemptResult({
        blocked: false,
        statusCode: 200,
        reason: "AUTHORIZED: Evidentiary closure gate passed all 7 configured precondition checks.",
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      const status = err.status || 422;
      const detail = err.detail || err.message || "Closure blocked by Evidentiary Gate: Active preconditions unsatisfied.";
      setClosureAttemptResult({
        blocked: true,
        statusCode: status,
        reason: detail,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  // Derive active scenario presentation
  const activeScenario = DEMO_SCENARIOS[selectedScenarioKey];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-[1600px] mx-auto font-sans">
      {/* ── Top Visual Centerpiece Banner: THE HARD CASE ── */}
      <div className="bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-600 text-white font-mono font-bold text-sm shadow-md">
              TG-2048
            </span>
            <div>
              <div className="text-[11px] font-mono tracking-widest text-emerald-400 font-bold uppercase">
                THE CANONICAL CLOSED-LOOP DEMONSTRATION
              </div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tight mt-0.5">
                Living Incident & Hazard Outcome Engine
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
              PERSISTENT ID: <strong className="text-white">TG-2048</strong>
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold text-[10px]">
              SEEDED DEMO FIXTURE
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 font-bold">
              LINEAGE: HL-TG-2048-01
            </span>
          </div>
        </div>

        {/* The Hard Case Architectural Principle */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 flex flex-col gap-3 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold w-fit">
              <IconAlertTriangle className="w-3.5 h-3.5" />
              <span>THE HARD CASE: WARNING → INTERVENTION → NO OBSERVED EVENT</span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              EVENT ABSENCE ≠ HAZARD RESOLUTION.
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans max-w-3xl">
              An unobserved event at the predicted time or place does <strong>NOT</strong> establish resolution or a false alarm. Saturated mountain slopes remain primed. TerraGuardian treats the incident as a living, bounded hazard hypothesis reconciled against continuous evidence.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-emerald-400 font-bold pt-1">
              <span>PREDICT</span>
              <span>→</span>
              <span>OBSERVE</span>
              <span>→</span>
              <span>DIVERGENCE</span>
              <span>→</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/50">SAME INCIDENT REASSESSMENT</span>
            </div>
          </div>

          {/* Interactive Flow Stepper Mini-Bar */}
          <div className="lg:col-span-4 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 min-w-0">
            <div className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              SELECT TIMELINE STAGE:
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActivePhase("T0_PREDICTION");
                  setSelectedScenarioKey("SCENARIO_A");
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  activePhase === "T0_PREDICTION"
                    ? "bg-emerald-600 text-white font-bold shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>T0: Prediction at KM-42</span>
                <span className="text-[10px] opacity-80">EXPECTED</span>
              </button>

              <button
                onClick={() => {
                  setActivePhase("T1_OBSERVATION");
                  setSelectedScenarioKey("SCENARIO_D");
                  handleEvaluateOutcome();
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  activePhase === "T1_OBSERVATION"
                    ? "bg-amber-600 text-white font-bold shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>T1: The Hard Case (No Event)</span>
                <span className="text-[10px] opacity-80">DELAYED / GAP</span>
              </button>

              <button
                onClick={() => {
                  setActivePhase("T2_SHIFTED_EVIDENCE");
                  setSelectedScenarioKey("SCENARIO_F");
                  handleEvaluateOutcome(27.094, 92.571);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  activePhase === "T2_SHIFTED_EVIDENCE"
                    ? "bg-cyan-600 text-white font-bold shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>T2: Later Evidence at KM-43.2</span>
                <span className="text-[10px] opacity-80">SHIFTED (+1.2km)</span>
              </button>

              <button
                onClick={() => {
                  setActivePhase("T3_REASSESSMENT");
                  setSelectedScenarioKey("SCENARIO_F");
                  handleEvaluateOutcome(27.094, 92.571);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  activePhase === "T3_REASSESSMENT"
                    ? "bg-purple-600 text-white font-bold shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>T3: Reassess SAME Incident</span>
                <span className="text-[10px] opacity-80">REASSESSED</span>
              </button>

              <button
                onClick={() => {
                  setActivePhase("T4_CLOSURE_GATE");
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  activePhase === "T4_CLOSURE_GATE"
                    ? "bg-red-600 text-white font-bold shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>T4: Evidentiary Closure Gate</span>
                <span className="text-[10px] opacity-80">7 GATES ENFORCED</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scenario Matrix Inspector (Scenarios A through G) ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <IconLayers className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                RESEARCH SCENARIO MATRIX INSPECTOR (SCENARIOS A – G)
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                Deterministic domain projections representing all Prompt 04 research outcomes
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold border border-slate-300 dark:border-neutral-700">
            PROJECTION MATRIX
          </span>
        </div>

        {/* Scenario Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.values(DEMO_SCENARIOS).map((sc) => {
            const isSelected = selectedScenarioKey === sc.key;
            return (
              <button
                key={sc.key}
                onClick={() => setSelectedScenarioKey(sc.key)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-400/40 shadow-sm"
                    : "bg-slate-50 dark:bg-neutral-950/50 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] mb-1 font-bold">
                    <span className={isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-neutral-400"}>
                      SCENARIO {sc.code}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                      {sc.hazardState}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {sc.name}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 mt-2 truncate">
                  {sc.outcomeType}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Visual Timeline: T0 -> T1 -> T2 (Judge Central Focus) ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
          <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
            <IconClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            LIVING INCIDENT FORENSIC TIMELINE (SAME PERSISTENT OBJECT)
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
            ID: <strong className="text-slate-900 dark:text-white">{backendIncidentId || "TG-2048-UUID"}</strong>
          </span>
        </div>

        {/* 3-Column Visual Stage Progression */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Box T0 */}
          <div
            onClick={() => {
              setActivePhase("T0_PREDICTION");
              setSelectedScenarioKey("SCENARIO_A");
            }}
            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
              activePhase === "T0_PREDICTION"
                ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md"
                : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-950/50"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-500 dark:text-neutral-400">T0 • 04:00 IST</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  PREDICTION
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Catastrophic Slope Failure Forecast
              </div>
              <div className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1">
                Location: NH-13 KM-42 (27.084° N, 92.568° E)
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2 leading-relaxed">
                Physics-informed baseline derived from 184mm antecedent rainfall + 44.2° cut-slope shear gradient.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-between text-[11px] font-mono">
              <span>Risk: 86 (HIGH)</span>
              <span>Confidence: 54% (MODERATE)</span>
            </div>
          </div>

          {/* Box T1 */}
          <div
            onClick={() => {
              setActivePhase("T1_OBSERVATION");
              setSelectedScenarioKey("SCENARIO_D");
              handleEvaluateOutcome();
            }}
            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
              activePhase === "T1_OBSERVATION"
                ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md"
                : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-950/50"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-500 dark:text-neutral-400">T1 • 06:30 IST</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  NO EVENT OBSERVED
                </span>
              </div>
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                Temporal Window Elapsed Without Slide
              </div>
              <div className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1">
                Location: KM-42 Checkpost Clear
              </div>
              <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                <strong>DON'T CLOSE. REASSESS.</strong> 88% cloud cover obscures satellite. Roadblock confirmed, but saturation sustains risk. Transitioned to <strong>DELAYED</strong>.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-between text-[11px] font-mono text-amber-700 dark:text-amber-300 font-bold">
              <span>Hazard: DELAYED</span>
              <span>Outcome: GAP</span>
            </div>
          </div>

          {/* Box T2 */}
          <div
            onClick={() => {
              setActivePhase("T2_SHIFTED_EVIDENCE");
              setSelectedScenarioKey("SCENARIO_F");
              handleEvaluateOutcome(27.094, 92.571);
            }}
            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
              activePhase === "T2_SHIFTED_EVIDENCE" || activePhase === "T3_REASSESSMENT"
                ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-md"
                : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-950/50"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-500 dark:text-neutral-400">T2 • 07:15 IST</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  SHIFTED EVIDENCE
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Patrol Reports Slurry at KM-43.2
              </div>
              <div className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1">
                Offset: 1.2km North (Within 5km Scope)
              </div>
              <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed">
                ASI Sonam patrol confirms mud slurry and rock sloughing blocking 60% road. <strong>SAME INCIDENT PRESERVED</strong> and reassessed to <strong>SHIFTED / ACTIVE</strong>.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-between text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-bold">
              <span>Hazard: SHIFTED (1.2km)</span>
              <span>Confidence: 94% (Verified)</span>
            </div>
          </div>
        </div>

        {/* SAME INCIDENT Continuity Banner Underneath */}
        <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-900 dark:text-white">
              CONTINUITY PRINCIPLE: ONE INCIDENT • PERSISTENT UUID
            </span>
          </div>
          <div className="text-slate-600 dark:text-neutral-400 text-[11px]">
            New evidence does NOT spawn a detached duplicate record. It updates the living hypothesis: <strong>HL-TG-2048-01</strong>.
          </div>
        </div>
      </div>

      {/* ── Active Phase Detail View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Outcome Engine & Hypotheses (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <IconRadar className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                OUTCOME ENGINE EVALUATION (PROMPT 04)
              </h3>
            </div>
            <button
              onClick={() => handleEvaluateOutcome()}
              disabled={isEvaluating}
              className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {isEvaluating ? "Evaluating..." : "Re-evaluate Outcome"}
            </button>
          </div>

          {/* Outcome Result Card */}
          <div className="bg-slate-50 dark:bg-neutral-950 p-5 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col gap-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-bold">
                DERIVED OUTCOME TYPE:
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                {outcomeData?.outcome_type || activeScenario.outcomeType}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-neutral-800">
              <div>
                <span className="text-[10px] text-slate-400 block">INTERVENTION CONTEXT:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  {outcomeData?.intervention_state || activeScenario.interventionState}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">OBSERVATION ADEQUACY:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  {outcomeData?.observation_adequacy || activeScenario.observationAdequacy}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">CAUSAL CLAIM:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {outcomeData?.causal_claim_established ? "ESTABLISHED" : "UNPROVEN (FALSE)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">CLOSURE PERMITTED:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {outcomeData?.closure_permitted ? "YES" : "NO (STRICTLY BLOCKED)"}
                </span>
              </div>
            </div>

            {/* Invariant Truth Notice for Scenario D & Research UX */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-sans">
              <strong>CRITICAL SCIENTIFIC INVARIANT:</strong> Causal prevention is explicitly unproven (<code>causal_claim_established = false</code>). Event absence following intervention deployment does not establish that the roadblock or drainage trench prevented the landslide. The hazard is sustained as DELAYED/SHIFTED until geotechnical clearance.
            </div>

            {/* Explanation */}
            <div className="text-xs text-slate-700 dark:text-neutral-300 font-sans leading-relaxed pt-1">
              <strong>Engine Rationale:</strong> {outcomeData?.explanation || activeScenario.summary}
            </div>
          </div>

          {/* 7 Competing Hypotheses Visualization Panel */}
          <div className="bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5">
              <span className="font-bold text-slate-900 dark:text-white">
                H1 – H7 COMPETING OPERATIONAL HYPOTHESES
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                PRIMARY: {outcomeData?.primary_hypothesis || (activeScenario.primaryHypothesis === "NONE" ? "NONE (DIRECT OCCURRENCE)" : activeScenario.primaryHypothesis)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  code: "H1_FALSE_ALARM",
                  title: "H1: False Alarm",
                  status: selectedScenarioKey === "SCENARIO_B" ? "VIABLE" : "CONTRADICTED",
                  desc: "Baseline model over-prediction; slope intrinsically stable.",
                },
                {
                  code: "H2_INTERVENTION_CONDITIONED_NON_EVENT",
                  title: "H2: Intervention Non-Event",
                  status: selectedScenarioKey === "SCENARIO_D" ? "ACTIVE" : "CONTRADICTED",
                  desc: "Non-event observed following mitigation; causal link unproven.",
                },
                {
                  code: "H3_DELAYED_FAILURE",
                  title: "H3: Delayed Failure",
                  status: selectedScenarioKey === "SCENARIO_D" || selectedScenarioKey === "SCENARIO_E" ? "VIABLE" : "CONTRADICTED",
                  desc: "Hydrostatic pore pressure surcharge sustained; rupture delayed.",
                },
                {
                  code: "H4_SHIFTED_HAZARD",
                  title: "H4: Shifted Hazard",
                  status: selectedScenarioKey === "SCENARIO_F" ? "SUPPORTED" : selectedScenarioKey === "SCENARIO_A" ? "DISFAVORED" : "VIABLE",
                  desc: "Rupture occurred on adjacent slope flank within corridor scope.",
                },
                {
                  code: "H5_OBSERVATION_GAP",
                  title: "H5: Observation Gap",
                  status: selectedScenarioKey === "SCENARIO_C" ? "ACTIVE" : "CONTRADICTED",
                  desc: "Optical obscuration or sensor blackout; ground reality unverified.",
                },
                {
                  code: "H6_RESIDUAL_HAZARD",
                  title: "H6: Residual Hazard",
                  status: selectedScenarioKey === "SCENARIO_A" ? "SUPPORTED" : selectedScenarioKey === "SCENARIO_D" || selectedScenarioKey === "SCENARIO_F" ? "VIABLE" : "DISFAVORED",
                  desc: "Unstable scarp crown retains detachment potential post-event.",
                },
                {
                  code: "H7_CONFLICTED",
                  title: "H7: Conflicted Evidence",
                  status: selectedScenarioKey === "SCENARIO_G" ? "ACTIVE" : "CONTRADICTED",
                  desc: "Discrepancy between sensor telemetry and observational reports.",
                },
              ].map((hyp) => (
                <div
                  key={hyp.code}
                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                    hyp.code === (outcomeData?.primary_hypothesis || activeScenario.primaryHypothesis)
                      ? "bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-700"
                      : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-slate-900 dark:text-white">{hyp.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        hyp.status === "SUPPORTED"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                          : hyp.status === "VIABLE" || hyp.status === "ACTIVE"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400"
                      }`}
                    >
                      {hyp.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-neutral-400 font-sans mt-1">
                    {hyp.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Spatial Intelligence & 3-Tier Threshold Hierarchy */}
          <div className="bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between font-bold border-b border-slate-200 dark:border-neutral-800 pb-2">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                <IconMapPin className="w-4 h-4 text-emerald-600" />
                GIS SPATIAL INTELLIGENCE & THRESHOLD HIERARCHY
              </span>
              <span className="text-[10px] text-slate-500 font-mono">CLASS C / D POLICIES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-[9px] text-red-600 dark:text-red-400 font-bold block uppercase">
                  1. INPUT REJECTION BOUNDARY
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">&gt; 10.0 km</span>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Rejects distant valley observations from silent cross-incident attachment.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">
                  2. SUPPORTED INCIDENT CORRIDOR
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">≤ 5.0 km</span>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Maintains living incident continuity (HL-TG-2048-01) for nearby flank distress.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold block uppercase">
                  3. LOCAL SPATIAL DIVERGENCE
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">≤ 500 m</span>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Threshold below which distress is treated as direct scarp breach (Scenario A).
                </p>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-neutral-500 pt-1 font-sans">
              <strong>Disclosure:</strong> Boundaries represent configured operational thresholds, not universal physical constants.
            </div>
          </div>

          {/* Decision Intelligence & Next-Best-Information */}
          <div className="bg-emerald-50/30 dark:bg-neutral-950 p-4 rounded-xl border border-emerald-300/60 dark:border-neutral-800 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-600 text-white font-bold text-[10px]">
                  NBI
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  NEXT-BEST-INFORMATION (DECISION INTELLIGENCE)
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                QUALITATIVE DISCRIMINATION ONLY
              </span>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
              Targeted information gathering actions prioritizing maximal evidential uncertainty reduction:
            </div>

            <div className="space-y-2">
              {(decisionSupport?.next_best_information || [
                {
                  id: "1",
                  title: "Dispatch Ground Patrol for Toe Inspection",
                  target_modality: "FIELD_PATROL",
                  priority: "HIGH",
                  qualitative_discrimination: "HIGH",
                  rationale: "Physical inspection of cut-slope toe resolves optical cloud cover and discriminates H1 vs H3.",
                },
                {
                  id: "2",
                  title: "Acquire Sentinel-1 SAR Radar Interferometry",
                  target_modality: "SATELLITE_RADAR",
                  priority: "HIGH",
                  qualitative_discrimination: "HIGH",
                  rationale: "Synthetic Aperture Radar penetrates 88% monsoon cloud cover to measure slope decorrelation.",
                },
                {
                  id: "3",
                  title: "Execute Geotechnical Inclinometer & Drone Survey",
                  target_modality: "ENGINEERING_SURVEY",
                  priority: "HIGH",
                  qualitative_discrimination: "MEDIUM",
                  rationale: "Event absence at KM-42 requires extended window to evaluate delayed rupture and discriminates H3 vs H6.",
                },
              ]).map((nbi: any, idx: number) => (
                <div
                  key={nbi.id || idx}
                  className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {nbi.title}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                      [{nbi.qualitative_discrimination || "HIGH"} DISCRIMINATION]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans">
                    {nbi.rationale}
                  </p>
                  <div className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider pt-0.5">
                    RECOMMENDATION ONLY • DOES NOT CONFER OPERATIONAL AUTHORITY
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-[10px] text-slate-500 dark:text-neutral-500">
              Governance Rule: <strong>AI ASSISTS REASONING • RULES GOVERN STATE TRANSITIONS • HUMANS AUTHORIZE ACTIONS</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Evidentiary Closure Gate Inspection (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                  <IconLock className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                  EVIDENTIARY CLOSURE GATE
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 px-2 py-0.5 rounded font-bold">
                PROMPT 05 HARDENED
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-sans">
              Incidents cannot be arbitrarily resolved. The authoritative backend requires all <strong>7 configured evidentiary precondition gates</strong> to be satisfied before transitioning to <code>RESOLVED</code>:
            </p>

            {/* 7 Preconditions Checklist */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  1. Source State: REASSESSING
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">MANDATORY</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  2. Actor Role: AUTHORIZED_DECISION_MAKER
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">MAGISTRATE</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  3. Order Reference: Resolution Order Code
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">REQUIRED</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  4. Dispatched Tasks: ALL PHYSICALLY_CONFIRMED
                </span>
                <span className="text-[10px] text-amber-600 font-bold">ENFORCED</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  5. Evidence Conflicts: All Reconciled
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">ZERO CONFLICTS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-emerald-500 font-bold">✓</span>
                  6. Ground Truth: Fresh Verified FIELD (≤21,600s)
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">MAX 6.0H AGE</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                  <span className="text-red-500 font-bold">✕</span>
                  7. Outcome Engine: Clearance & Fresh Eval
                </span>
                <span className="text-[10px] text-red-600 font-bold">BLOCKS CLOSURE</span>
              </div>
            </div>

            {/* Test Closure Gate Execution Box */}
            {closureAttemptResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono leading-relaxed ${
                  closureAttemptResult.blocked
                    ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>
                    {closureAttemptResult.blocked
                      ? `GATE REJECTION (${closureAttemptResult.statusCode || 422} PRECONDITION FAILED)`
                      : "AUTHORIZED RESOLUTION (200 OK)"}
                  </span>
                  <span className="text-[10px] opacity-70">{closureAttemptResult.timestamp}</span>
                </div>
                <div>{closureAttemptResult.reason}</div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex flex-col gap-2">
            <button
              onClick={handleTestClosureGate}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <IconLock className="w-4 h-4 text-amber-400" />
              <span>Test Closure Transition (Verify Preconditions)</span>
            </button>
            <div className="text-[11px] text-center text-slate-500 dark:text-neutral-400 font-mono">
              Role: <strong>{currentUser?.role || "OPERATOR"}</strong> • Guard: <code>StateTransitionService.transition()</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
