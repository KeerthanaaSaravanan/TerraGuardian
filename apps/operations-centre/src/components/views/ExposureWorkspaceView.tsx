import React, { useEffect, useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { apiClient } from "../../services/apiClient";
import { TruthBadge } from "../common";
import {
  IconBuilding,
  IconTruck,
  IconMapPin,
  IconAlertTriangle,
  IconShieldAlert,
  IconActivity,
  IconCheckCircle2,
  IconArrowRight,
  IconRefreshCw,
} from "../icons";
import type { ImpactAssessment, PriorityAssessment } from "../../types/incident";

export const ExposureWorkspaceView: React.FC = () => {
  const { incidentCode, backendIncidentId, priorityLevel, riskLevel, riskScore } = useDemoScenario();

  const [impactData, setImpactData] = useState<ImpactAssessment | null>(null);
  const [priorityData, setPriorityData] = useState<PriorityAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchImpactAndPriority = async () => {
    if (!backendIncidentId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [impact, priority] = await Promise.all([
        apiClient.getIncidentImpact(backendIncidentId),
        apiClient.getIncidentPriority(backendIncidentId),
      ]);
      setImpactData(impact);
      setPriorityData(priority);
    } catch (err: any) {
      console.warn("Failed to fetch live impact/priority, utilizing cached state:", err);
      setLoadError("Using cached operational exposure vectors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImpactAndPriority();
  }, [backendIncidentId]);

  const handleRecalculatePriority = async () => {
    if (!backendIncidentId) return;
    setIsRecalculating(true);
    try {
      const updated = await apiClient.recalculateIncidentPriority(backendIncidentId);
      setPriorityData(updated);
    } catch (err) {
      console.error("Recalculate priority failed:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fallback defaults if backend is still initializing
  const activeChain = impactData?.impact_chain && impactData.impact_chain.length > 0
    ? impactData.impact_chain
    : [
        {
          stage_order: 1,
          stage_name: "1. Hazard Origin",
          node_name: "Colluvial Escarpment Cut-Slope (KM-42)",
          category: "ORIGIN",
          severity: "HIGH" as any,
          description: "44.2° unstable colluvium mantle saturated with 184mm cumulative rainfall.",
          vulnerability_factor: "High Pore-Water Pressure & Gravitational Shear",
          population_count: 0,
        },
        {
          stage_order: 2,
          stage_name: "2. Strategic Corridor",
          node_name: "NH-13 Trans-Arunachal Highway (KM-42)",
          category: "CORRIDOR",
          severity: "CRITICAL" as any,
          description: "Single heavy transit arterial connecting Assam border to West Kameng and Tawang districts.",
          vulnerability_factor: "Zero Immediate Paved Bypass (Detour >180 km unpaved)",
          population_count: 0,
        },
        {
          stage_order: 3,
          stage_name: "3. Community Exposure",
          node_name: "Lower Bhalukpong Residential Sector",
          category: "COMMUNITY",
          severity: "HIGH" as any,
          description: "1,420 residents in downstream alluvial fan trajectory (380 homes).",
          vulnerability_factor: "Alluvial Mudflow & Flash Silt Encroachment",
          population_count: 1420,
        },
        {
          stage_order: 4,
          stage_name: "4. Critical Lifeline Facility",
          node_name: "West Kameng District Civil Hospital & Army Supply Depot",
          category: "LIFELINE",
          severity: "CRITICAL" as any,
          description: "Sole regional ICU hospital oxygen transit and military logistics supply chain traverses KM-42.",
          vulnerability_factor: "Medical Dependency & Strategic Supply Severance",
          population_count: 0,
        },
      ];

  const criticalFacilities = impactData?.critical_facilities || [
    "West Kameng District Civil Hospital (Oxygen/ICU Lifeline)",
    "Army Transit Supply Depot #14",
    "Lower Bhalukpong Power Substation Feeder",
  ];

  const cascadingConsequences = impactData?.cascading_consequences || [
    "Hospital daily oxygen cylinder truck transit and ICU ambulance transfers severed",
    "Lower Bhalukpong residential sector (380 homes) exposed to alluvial silt runout",
    "Strategic military transit and civilian food freight halted (>180km hill detour)",
  ];

  // Component breakdown from priority assessment formula:
  // 25% Hazard, 25% Exposure, 25% Criticality, 15% Connectivity, 10% Difficulty
  const hazardComp = priorityData?.hazard_risk_input ?? (typeof riskScore === "number" ? riskScore : 86.0);
  const exposureComp = priorityData?.exposure_score ?? 85.0;
  const criticalityComp = priorityData?.criticality_score ?? 95.0;
  const connectivityComp = priorityData?.connectivity_penalty_score ?? 98.0;
  const difficultyComp = priorityData?.response_difficulty_score ?? 80.0;
  const operationalPriorityScore = priorityData?.operational_priority_score ?? 89.0;
  const operationalPriorityLevel = priorityData?.priority_level ?? "P1_CRITICAL";

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Consequence & Exposure Banner ── */}
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
            <IconBuilding className="w-5 h-5" />
          </span>
          <div>
            <div className="font-bold text-red-900 dark:text-red-200 uppercase text-xs flex items-center gap-2">
              <span>CRITICAL LIFELINE CONSEQUENCE ASSESSMENT: {operationalPriorityLevel}</span>
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                SCORE: {operationalPriorityScore.toFixed(1)} / 100
              </span>
            </div>
            <div className="text-slate-700 dark:text-neutral-300 text-xs font-sans mt-0.5">
              Physical hazard intersects with NH-13 Trans-Arunachal Highway. <strong>Hazard ≠ Priority:</strong> The high consequence to military logistics, hospital oxygen supply, and civil lifelines drives the critical operational priority rating.
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleRecalculatePriority}
            disabled={isRecalculating}
            className="px-2.5 py-1 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <IconRefreshCw className={`w-3 h-3 ${isRecalculating ? "animate-spin" : ""}`} />
            <span>Recalculate Priority</span>
          </button>
          <TruthBadge truthClass="REAL_HISTORICAL" />
        </div>
      </div>

      {/* ── Risk → Impact Operational Chain Graph ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5 mb-3">
          <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <IconActivity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            OPERATIONAL RISK → IMPACT GRAPH
          </span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            DETERMINISTIC CAUSAL CHAIN
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">1. HAZARD</span>
            <div className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-1">KM-42 Escarpment</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">42.3° Horn Slope</span>
          </div>

          <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">2. EXPOSURE</span>
            <div className="text-sm font-bold text-orange-700 dark:text-orange-300 mt-1">NH-13 + 1,420 Pop</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">Sole Lifeline Road</span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">3. CONSEQUENCE</span>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-1">Oxygen & Army Cut</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">&gt;180km Hill Detour</span>
          </div>

          <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase">4. PRIORITY</span>
            <div className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">P1_CRITICAL</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">89.0 / 100 Index</span>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">5. DECISION</span>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1">Magistrate Order</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">DDMA Sign-Off</span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">6. ACTION</span>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1">Road Closure</div>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">Physical Barricade</span>
          </div>
        </div>
      </div>

      {/* ── 5-Factor Consequence Priority Formula Decomposition ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              CONSEQUENCE PRIORITY FORMULA DECOMPOSITION (FROZEN 5-FACTOR MODEL)
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
              Operational Priority = 25% Hazard + 25% Exposure + 25% Criticality + 15% Connectivity + 10% Difficulty
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2.5 py-1 rounded border border-red-200 dark:border-red-900">
            TOTAL SCORE: {operationalPriorityScore.toFixed(1)} / 100
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Factor 1: 25% Hazard Risk */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-neutral-400 font-semibold">1. Hazard Risk</span>
              <span className="font-bold text-red-600 dark:text-red-400">{hazardComp.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full my-2 overflow-hidden">
              <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, hazardComp)}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Weight: <strong>25%</strong> | Colluvium shear failure risk
            </div>
          </div>

          {/* Factor 2: 25% Population Exposure */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-neutral-400 font-semibold">2. Pop. Exposure</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{exposureComp.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full my-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, exposureComp)}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Weight: <strong>25%</strong> | 1,420 exposed in fan (380 homes)
            </div>
          </div>

          {/* Factor 3: 25% Critical Infrastructure */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-neutral-400 font-semibold">3. Criticality</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{criticalityComp.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full my-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, criticalityComp)}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Weight: <strong>25%</strong> | Civil Hospital & Army Depot
            </div>
          </div>

          {/* Factor 4: 15% Connectivity Severance */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-neutral-400 font-semibold">4. Connectivity</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{connectivityComp.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full my-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, connectivityComp)}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Weight: <strong>15%</strong> | Sole Lifeline, no paved detour
            </div>
          </div>

          {/* Factor 5: 10% Response Difficulty */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-neutral-400 font-semibold">5. Response Diff.</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{difficultyComp.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full my-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, difficultyComp)}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Weight: <strong>10%</strong> | Steep isolated mountain relief
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-Stage Disaster Convergence Chain Nodes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeChain.map((node: any, idx: number) => {
          const isCritical = node.severity === "CRITICAL";
          return (
            <div
              key={idx}
              className={`p-4 bg-white dark:bg-neutral-900 rounded-xl border shadow-sm flex flex-col justify-between gap-3 ${
                isCritical
                  ? "border-red-300 dark:border-red-900/60"
                  : "border-slate-200 dark:border-neutral-800"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-neutral-400 font-bold uppercase">{node.stage_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                      isCritical
                        ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {node.severity}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {node.node_name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
                  {node.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-mono space-y-1">
                <div className="text-amber-700 dark:text-amber-400 text-[11px]">
                  <strong>VULNERABILITY FACTOR:</strong> {node.vulnerability_factor}
                </div>
                {node.population_count > 0 && (
                  <div className="text-slate-500 dark:text-neutral-400 text-[10px]">
                    <strong>AFFECTED POPULATION:</strong> {node.population_count.toLocaleString()} residents
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Critical Facilities & Cascading Consequences ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical Facilities */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <IconBuilding className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            CRITICAL LIFELINE FACILITIES EXPOSED
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
            {criticalFacilities.map((fac, idx) => (
              <li key={idx} className="py-2 flex items-center justify-between text-slate-700 dark:text-neutral-300 font-mono">
                <span>{fac}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold">
                  DEPENDENCY
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cascading Consequences */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            DOWNSTREAM CASCADING CONSEQUENCES
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
            {cascadingConsequences.map((c, idx) => (
              <li key={idx} className="py-2 text-slate-700 dark:text-neutral-300 font-sans leading-relaxed">
                • {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Strategic Bypass & Data Quality Disclosure ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Strategic Connectivity & Alternate Bypass Routing (Spatial Network Telemetry)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
            DATA QUALITY: {impactData?.impact_data_quality || "COMPLETE"}
          </span>
        </div>
        <div className="text-xs text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
          - <strong>Primary Corridor:</strong> NH-13 Bhalukpong - Tenga - Bomdila (KM-42 Sessa Hairpin). Detour penalty: <strong>{impactData?.detour_penalty_km ?? 182.0} km</strong> ({impactData?.detour_travel_time_hours ?? 7.5} hours unpaved).<br />
          - <strong>Designated Light Vehicle Bypass:</strong> Rupa - Kalaktang Road (Load Limit: 12 Tonnes max, light transit only).<br />
          - <strong>Heavy Vehicle Restriction:</strong> Commercial 3-axle freight and military convoys halted at Bhalukpong staging ground.
        </div>
      </div>
    </div>
  );
};
