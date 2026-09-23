import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { HAZARD_PROPAGATION_CHAIN } from "../../data/deterministicScenario";
import { PrincipleBanner, RiskIndicator, ConfidenceMeter, PriorityIndicator } from "../common";
import {
  IconArrowRight,
  IconAlertTriangle,
  IconTruck,
  IconBuilding,
  IconActivity,
  IconMountain,
  IconShieldAlert,
  IconRotateCcw,
  IconCheckCircle2,
  IconShieldCheck,
} from "../icons";

export const ImpactPriorityView: React.FC = () => {
  const {
    setStep,
    riskScore,
    riskLevel,
    confidenceScore,
    confidenceLevel,
    priorityLevel,
    impactAssessment,
    priorityAssessment,
    recalculatePriority,
  } = useDemoScenario();

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculatePriority({
        actor_role: "OPERATOR",
        actor_name: "Control Room Shift Commander",
        reason: "Operational triage reassessment from updated downstream lifeline dependencies",
      });
      setRecalcSuccess(true);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (e) {
      console.error("Recalculate priority failed:", e);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fallback decomposed scores matching backend source of truth
  const hazardWeightScore = priorityAssessment?.hazard_risk_input ?? riskScore;
  const exposureScore = priorityAssessment?.exposure_score ?? 90.5;
  const criticalityScore = priorityAssessment?.criticality_score ?? 95.0;
  const connectivityScore = priorityAssessment?.connectivity_penalty_score ?? 92.0;
  const responseDiffScore = priorityAssessment?.response_difficulty_score ?? 80.0;
  const compositeScore = priorityAssessment?.priority_score ?? 89.7;

  const primaryDrivers = priorityAssessment?.primary_drivers ?? [
    "Sole arterial corridor (NH-13) severed with zero paved alternative routes.",
    "1,420 residents directly downstream in Munna Camp and Bhalukpong corridor.",
    "Critical lifeline dependency: Civil Hospital Tawang oxygen & medical supply chain compromised.",
    "Emergency detour adds +182 km and +7.5 hours over unpaved seasonal mountain pass.",
  ];

  const counterfactors = priorityAssessment?.counterfactors ?? [
    "SDRF Quick Response Team Bravo pre-positioned at KM-38 (15 min transit window).",
    "BRO heavy earthmoving equipment staged at Bhalukpong depot for immediate clearance.",
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* ── 1. Header & Actions ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 4 OF 10</span>
            <span>•</span>
            <span className="text-red-600 dark:text-red-400 font-bold">
              IMPACT INTELLIGENCE & OPERATIONAL PRIORITY ENGINE
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Downstream Consequence Cascade & Response Priority
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Reasoning from Hazard → Exposure → Criticality → Connectivity → Response Difficulty to establish backend-authoritative triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Trigger backend operational priority recalculation"
          >
            <IconRotateCcw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin text-emerald-500" : ""}`} />
            <span>{isRecalculating ? "RECALCULATING..." : recalcSuccess ? "RECALCULATED ✓" : "RECALCULATE PRIORITY"}</span>
          </button>

          <button
            onClick={() => setStep(5)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <span>Proceed to Field Verification</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Core Operational Callout: HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY ── */}
      <PrincipleBanner
        principle="HIGHEST HAZARD ≠ HIGHEST PRIORITY"
        title={`Why TG-2048 is Rated ${priorityLevel}`}
        explanation="In raw geological volume, a 50,000 m³ rock avalanche in the unpopulated Upper Dibang gorge has higher hazard magnitude. However, it threatens zero humans or lifelines (Priority: P3_MODERATE). Conversely, TG-2048 represents a 450 m³ debris flow that directly severs NH-13—the sole heavy transport and oxygen lifeline into West Kameng and Tawang—while threatening 1,420 downstream residents. Formula: Priority = 25% Hazard (86.0) + 25% Exposure (90.5) + 25% Criticality (95.0) + 15% Connectivity (92.0) + 10% Response Difficulty (80.0) → 89.7 / 100 (P1_CRITICAL)."
        variant="red"
      />

      {/* ── 3. Four-Metric Operational State Matrix ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Hazard Risk */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-neutral-400 uppercase">
              1. Physical Hazard Risk
            </span>
            <span className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <IconMountain className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {riskScore}<span className="text-sm font-normal text-slate-500 dark:text-neutral-500">/100</span>
            </div>
            <div className="mt-1">
              <RiskIndicator level={riskLevel} score={riskScore} size="sm" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
            Geological slide probability based on slope saturation & rainfall threshold.
          </p>
        </div>

        {/* Metric 2: Evidential Confidence */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-neutral-400 uppercase">
              2. Evidential Confidence
            </span>
            <span className="p-1.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <IconShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {confidenceScore}<span className="text-sm font-normal text-slate-500 dark:text-neutral-500">%</span>
            </div>
            <div className="mt-1">
              <ConfidenceMeter level={confidenceLevel} score={confidenceScore} size="sm" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
            Certainty from multi-source sensor convergence and citizen triangulation.
          </p>
        </div>

        {/* Metric 3: Downstream Impact */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-neutral-400 uppercase">
              3. Downstream Consequence
            </span>
            <span className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <IconBuilding className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              CRITICAL
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mt-1">
              {impactAssessment?.population_exposed ?? 1420} Exposed • 2 Hospitals
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
            Sole lifeline corridor severed with severe isolation penalty (+182 km detour).
          </p>
        </div>

        {/* Metric 4: Operational Priority */}
        <div className="bg-white dark:bg-neutral-900 border-2 border-red-500 dark:border-red-600 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 uppercase">
              4. Operational Priority
            </span>
            <span className="p-1.5 rounded-md bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
              <IconShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              P1_CRITICAL
            </div>
            <div className="mt-1">
              <PriorityIndicator level={priorityLevel} size="sm" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
            Composite score {compositeScore.toFixed(1)} / 100 • Immediate multi-agency mobilization required.
          </p>
        </div>
      </div>

      {/* ── 4. Four-Stage Causal Consequence Cascade Chain ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 gap-2">
          <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
            <IconActivity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            CAUSAL CONSEQUENCE CASCADE: HAZARD → EXPOSURE → CRITICALITY → LIFELINE
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
            4-STAGE PROPAGATION CASCADE (WEST KAMENG CORRIDOR)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {HAZARD_PROPAGATION_CHAIN.map((node, index) => (
            <div
              key={node.stage}
              className="relative bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3 group hover:border-slate-300 dark:hover:border-neutral-700 shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    STAGE {index + 1}: {node.stage}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                      node.severity === "CRITICAL"
                        ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                        : "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800"
                    }`}
                  >
                    {node.severity}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-white shadow-xs">
                    {node.category === "ORIGIN" && <IconMountain className="w-4 h-4 text-amber-500" />}
                    {node.category === "CORRIDOR" && <IconTruck className="w-4 h-4 text-red-500" />}
                    {node.category === "COMMUNITY" && <IconBuilding className="w-4 h-4 text-amber-500" />}
                    {node.category === "LIFELINE" && <IconActivity className="w-4 h-4 text-blue-500" />}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{node.name}</h4>
                </div>

                <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2 leading-relaxed">{node.description}</p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-neutral-800/80 text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                <span>Vulnerability Factor: </span>
                <span className="text-slate-800 dark:text-neutral-200 font-semibold">{node.vulnerabilityFactor}</span>
              </div>

              {/* Arrow linking to next step */}
              {index < HAZARD_PROPAGATION_CHAIN.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-full p-1 text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <IconArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Explainability & Decomposed Priority Scoring Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Decomposed Component Weights & Score Calculation */}
        <div className="lg:col-span-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <IconShieldAlert className="w-4 h-4 text-red-500" />
                DECOMPOSED PRIORITY SCORING
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                P1_CRITICAL ({compositeScore.toFixed(1)})
              </span>
            </div>

            <div className="space-y-3.5 mt-4">
              {/* Factor 1: Hazard Risk */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-neutral-400">Hazard Risk (25%)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{hazardWeightScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(hazardWeightScore, 100)}%` }} />
                </div>
              </div>

              {/* Factor 2: Population Exposure */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-neutral-400">Population Exposure (25%)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{exposureScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(exposureScore, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                  1,420 exposed • 380 vulnerable in direct path
                </span>
              </div>

              {/* Factor 3: Infrastructure Criticality */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-neutral-400">Infrastructure Criticality (25%)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{criticalityScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(criticalityScore, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                  District Hospital + Strategic Army Supply Route
                </span>
              </div>

              {/* Factor 4: Corridor Connectivity Penalty */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-neutral-400">Connectivity Penalty (15%)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{connectivityScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(connectivityScore, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                  Sole lifeline • Detour adds +182 km (+7.5 hrs)
                </span>
              </div>

              {/* Factor 5: Response Difficulty */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-neutral-400">Response Accessibility (10%)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{responseDiffScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(responseDiffScore, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                  Monsoon cloud cover + steep gorge access
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-red-900 dark:text-red-300">
              <span>WEIGHTED COMPOSITE SCORE</span>
              <span className="text-sm">{compositeScore.toFixed(1)} / 100</span>
            </div>
            <p className="text-[11px] text-red-800 dark:text-red-400 mt-1">
              Score ≥ 80.0 qualifies as <span className="font-bold">P1_CRITICAL</span> operational urgency.
            </p>
          </div>
        </div>

        {/* Right: Primary Drivers, Counterfactors, and Operational Rationale */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <IconAlertTriangle className="w-4 h-4 text-amber-500" />
                EXPLAINABILITY & OPERATIONAL JUSTIFICATION
              </h3>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                BACKEND-AUTHORITATIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Primary Drivers */}
              <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-3.5">
                <h4 className="text-xs font-bold font-mono uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-2">
                  <IconAlertTriangle className="w-3.5 h-3.5" />
                  Primary Urgency Drivers
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-neutral-300">
                  {primaryDrivers.map((driver, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-red-500 font-bold shrink-0">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Counterfactors & Mitigations */}
              <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-3.5">
                <h4 className="text-xs font-bold font-mono uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                  <IconCheckCircle2 className="w-3.5 h-3.5" />
                  Counterfactors & Mitigations
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-neutral-300">
                  {counterfactors.map((cf, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{cf}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Operational Rationale Statement */}
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-neutral-400 mb-1">
                Operational Rationale & Recommendation
              </div>
              <p className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed font-sans">
                {priorityAssessment?.operational_rationale ??
                  "TG-2048 threatens a single-point-of-failure corridor with high civilian exposure and critical medical lifeline dependency. While geological volume is moderate (450 m³), the severe isolation penalty and lack of paved detour necessitate immediate P1_CRITICAL operational mobilization."}
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-center gap-3">
            <IconShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-300">
              <span className="font-bold">HUMAN AUTHORITY INVARIANT: </span>
              Priority assessment is advisory decision support. It does NOT auto-dispatch field units or auto-authorize statutory road closures. Official orders require District Magistrate authorization (Step 6).
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Side-by-Side Comparative Demonstration (HAZARD ≠ PRIORITY) ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
              <IconShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              SIDE-BY-SIDE PROOF: HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Comparing two concurrent North Eastern incidents to prove why human consequence and network connectivity govern triage.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
            DETERMINISTIC DEMONSTRATION DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: TG-2048 (High Hazard, P1 Priority) */}
          <div className="bg-red-50/40 dark:bg-red-950/20 border-2 border-red-500/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-red-700 dark:text-red-400">
                  INCIDENT 1: TG-2048 (WEST KAMENG)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-black rounded bg-red-600 text-white">
                  PRIORITY: P1_CRITICAL (89.7)
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                NH-13 Corridor (KM-42.3 Munna Camp)
              </h4>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded border border-red-200 dark:border-red-900/50">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">HAZARD RISK SCORE</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">86 / 100 (HIGH)</div>
                </div>
                <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded border border-red-200 dark:border-red-900/50">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">EXPOSED POPULATION</div>
                  <div className="font-bold text-red-600 dark:text-red-400 text-sm">1,420 Residents</div>
                </div>
                <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded border border-red-200 dark:border-red-900/50">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">CORRIDOR STATUS</div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">Sole Lifeline (No Paved Detour)</div>
                </div>
                <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded border border-red-200 dark:border-red-900/50">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">CRITICAL INFRASTRUCTURE</div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">District Hospital + Fuel Supply</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-white/90 dark:bg-neutral-900/90 rounded border border-red-200 dark:border-red-900/50 text-[11px] text-slate-700 dark:text-neutral-300 leading-snug">
              <span className="font-bold text-red-700 dark:text-red-400">Operational Implication: </span>
              Immediate human review required for response prioritization, resource staging, and magistrate authorization.
            </div>
          </div>

          {/* Card 2: TG-2055 (Critical Hazard, P3 Priority) */}
          <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-600 dark:text-neutral-400">
                  INCIDENT 2: TG-2055 (UPPER DIBANG)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-black rounded bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200">
                  PRIORITY: P3_MODERATE (46.5)
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                Upper Dibang Gorge Ridge Rockfall
              </h4>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">HAZARD RISK SCORE</div>
                  <div className="font-bold text-red-600 dark:text-red-400 text-sm">94 / 100 (CRITICAL)</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">EXPOSED POPULATION</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">0 (Uninhabited Ridge)</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">CORRIDOR STATUS</div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">Bypass Available (Valley Road)</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">CRITICAL INFRASTRUCTURE</div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">None (Forest Boundary)</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-neutral-900 rounded border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-700 dark:text-neutral-300 leading-snug">
              <span className="font-bold text-slate-700 dark:text-neutral-300">Operational Implication: </span>
              Higher physical hazard (50,000 m³ volume), but zero immediate human exposure or lifeline disruption. Retained for routine remote monitoring.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


