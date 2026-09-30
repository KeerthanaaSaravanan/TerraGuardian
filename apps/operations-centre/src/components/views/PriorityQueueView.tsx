import React, { useState, useEffect } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { OTHER_NER_INCIDENTS } from "../../data/deterministicScenario";
import { TruthBadge } from "../common";
import { apiClient } from "../../services/apiClient";
import {
  IconAlertTriangle,
  IconShieldAlert,
  IconArrowRight,
  IconMapPin,
  IconFilter,
  IconClock,
  IconActivity,
  IconCheckCircle2,
  IconRadio,
  IconSearch,
} from "../icons";

interface PriorityItem {
  id: string;
  code: string;
  title: string;
  corridor: string;
  locationDetails: string;
  hazardScore: number;
  hazardLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  confidenceScore: number;
  confidenceLevel: "HIGH" | "MODERATE" | "LOW";
  priorityLevel: "P1_CRITICAL" | "P2_HIGH" | "P3_MODERATE" | "P4_LOW";
  priorityScore: number;
  state: string;
  exposureSummary: string;
  pendingDecision: string;
  requiredRole: string;
  freshness: string;
  priorityRationale: string;
  dataClass: "CONTROLLED_DEMO" | "REAL_HISTORICAL";
}

export const PriorityQueueView: React.FC = () => {
  const {
    openIncident,
    riskScore,
    riskLevel,
    confidenceScore,
    confidenceLevel,
    incidentStatus,
  } = useDemoScenario();

  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [backendQueue, setBackendQueue] = useState<any[]>([]);
  const [formulaMeta, setFormulaMeta] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getPriorityQueue()
      .then((res) => {
        if (isMounted && res && res.items) {
          setBackendQueue(res.items);
          if (res.formula_metadata) setFormulaMeta(res.formula_metadata);
        }
      })
      .catch((err) => {
        console.warn("Priority queue API fallback to deterministic scenario:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Primary live incident TG-2048 plus audited secondary queue records
  const fallbackItems: PriorityItem[] = [
    {
      id: "TG-2048",
      code: "TG-2048",
      title: "NH-13 KM-42 Bhalukpong-Tenga Corridor Slope Debris Flow",
      corridor: "NH-13 Trans-Arunachal Highway",
      locationDetails: "West Kameng, Arunachal Pradesh (27.084° N, 92.568° E)",
      hazardScore: riskScore || 86.0,
      hazardLevel: (riskLevel as any) || "HIGH",
      confidenceScore: confidenceScore || 78.0,
      confidenceLevel: (confidenceLevel as any) || "MODERATE",
      priorityLevel: "P1_CRITICAL",
      priorityScore: 89.2,
      state: incidentStatus || "MONITORING (ACTIVE)",
      exposureSummary:
        "Trans-Arunachal Highway (NH-13) • 1,420 exposed population • Sole arterial lifeline to Tawang strategic military sector",
      pendingDecision:
        "Statutory Authority Order: Precautionary Road Closure & Heavy Vehicle Diversion at KM-38 Checkpost",
      requiredRole: "DISTRICT_MAGISTRATE / INCIDENT_COMMANDER",
      freshness: "Synced 2 mins ago • Real Telemetry Sync",
      priorityRationale:
        "Saturated mica-schist cut-slope failure above sole arterial highway connecting Tawang; high consequence overriding moderate confidence.",
      dataClass: "CONTROLLED_DEMO",
    },
    {
      id: "TG-2105",
      code: "TG-2105",
      title: "Mangan-Chungthang Road Blockage Debris",
      corridor: "North Sikkim Highway",
      locationDetails: "Toong River Flank, Mangan, Sikkim (27.562° N, 88.614° E)",
      hazardScore: 78.0,
      hazardLevel: "HIGH",
      confidenceScore: 88.0,
      confidenceLevel: "HIGH",
      priorityLevel: "P2_HIGH",
      priorityScore: 80.0,
      state: "RESPONDING",
      exposureSummary:
        "North Sikkim border axis lifeline; heavy transport corridor and hydel project access",
      pendingDecision:
        "Debris clearance team dispatch & temporary Bailey bridge engineering inspection",
      requiredRole: "BORDER_ROADS_ORGANISATION / PWD",
      freshness: "Updated 25 mins ago",
      priorityRationale:
        "Glacial till with loose granitic scree active failure blocking transit; machinery en route.",
      dataClass: "CONTROLLED_DEMO",
    },
    {
      id: "TG-1944",
      code: "TG-1944",
      title: "Dima Hasao Hill Cut Embankment Subsidence",
      corridor: "Lumding-Badarpur Hill Section",
      locationDetails: "Jatinga Valley Link KM-74, Dima Hasao, Assam (25.132° N, 93.018° E)",
      hazardScore: 61.0,
      hazardLevel: "MODERATE",
      confidenceScore: 58.0,
      confidenceLevel: "MODERATE",
      priorityLevel: "P2_HIGH",
      priorityScore: 74.0,
      state: "ASSESSING",
      exposureSummary:
        "Lumding-Badarpur Hill Section rail/road intermodal freight connectivity",
      pendingDecision:
        "Geotechnical pore-pressure sensor verification & track foundation inspection",
      requiredRole: "RAILWAY_ENGINEER / GEOTECHNICAL_OFFICER",
      freshness: "Updated 45 mins ago",
      priorityRationale:
        "Disang shales with heavy moisture pore pressure and cut-slope subsidence threatening trackbed.",
      dataClass: "CONTROLLED_DEMO",
    },
    {
      id: "TG-1082",
      code: "TG-1082",
      title: "Lower Subansiri Slope Ravelling",
      corridor: "NH-229 Axis",
      locationDetails: "Gerukamukh Sector, Lower Subansiri, Arunachal Pradesh (27.521° N, 94.254° E)",
      hazardScore: 28.0,
      hazardLevel: "LOW",
      confidenceScore: 82.0,
      confidenceLevel: "HIGH",
      priorityLevel: "P4_LOW",
      priorityScore: 25.0,
      state: "MONITORING",
      exposureSummary:
        "Local transit route with stabilized retaining structures intact; minor debris on shoulder",
      pendingDecision: "Periodic camera patrol monitoring; no immediate roadblock required",
      requiredRole: "DISASTER_OPERATOR",
      freshness: "Updated 2 hours ago",
      priorityRationale:
        "Siwalik sandstone with moderate stabilization intact; baseline precipitation within bounds.",
      dataClass: "CONTROLLED_DEMO",
    },
  ];

  const allItems: PriorityItem[] = backendQueue.length > 0
    ? backendQueue.map((b) => ({
        id: b.incident_id || b.code,
        code: b.code,
        title: b.title,
        corridor: b.corridor,
        locationDetails: b.location_details,
        hazardScore: b.hazard_score,
        hazardLevel: b.hazard_level,
        confidenceScore: b.confidence_score,
        confidenceLevel: b.confidence_level,
        priorityLevel: b.priority_level,
        priorityScore: b.priority_score,
        state: b.state,
        exposureSummary: b.exposure_summary,
        pendingDecision: b.pending_decision,
        requiredRole: b.required_role,
        freshness: b.freshness,
        priorityRationale: b.priority_rationale,
        dataClass: b.data_class || "CONTROLLED_DEMO",
      }))
    : fallbackItems;

  const filteredItems = allItems.filter((item) => {
    if (priorityFilter !== "ALL" && item.priorityLevel !== priorityFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.corridor.toLowerCase().includes(q) ||
        item.locationDetails.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadge = (lvl: string) => {
    switch (lvl) {
      case "P1_CRITICAL":
        return "bg-red-600 text-white border-red-700 shadow-sm";
      case "P2_HIGH":
        return "bg-amber-500 text-white border-amber-600 shadow-sm";
      case "P3_MODERATE":
        return "bg-blue-600 text-white border-blue-700 shadow-sm";
      default:
        return "bg-slate-500 text-white border-slate-600 shadow-sm";
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Header Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800">
            <IconShieldAlert className="w-6 h-6 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-mono uppercase tracking-tight">
                Operational Priority Queue
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold">
                RANKED BY OPERATIONAL URGENCY
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
              Multi-factor consequence ranking: Physical Hazard × Evidential Confidence × Lifeline Criticality
            </p>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="bg-slate-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700">
            <span className="text-slate-400 mr-1.5">QUEUED:</span>
            <strong className="text-slate-900 dark:text-white">{allItems.length}</strong>
          </div>
          <div className="bg-red-100 dark:bg-red-950/60 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
            <span className="opacity-75 mr-1.5">P1 CRITICAL:</span>
            <strong>{allItems.filter((x) => x.priorityLevel === "P1_CRITICAL").length}</strong>
          </div>
          <div className="bg-amber-100 dark:bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <span className="opacity-75 mr-1.5">DECISION PENDING:</span>
            <strong>1 ORDER</strong>
          </div>
        </div>
      </div>

      {/* Consequence Model & Data Truth Provenance Disclosure (Section 2 Gate) */}
      <div className="bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 text-[10px]">
            MODEL: {formulaMeta?.model_name || "CONSEQUENCE & LIFELINE IMPACT v1.0"}
          </span>
          <span className="text-slate-600 dark:text-neutral-300">
            FORMULA: {formulaMeta?.formula || "0.25 × Hazard + 0.25 × Exposure + 0.25 × Criticality + 0.15 × Connectivity + 0.10 × Response"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">DATA STATUS:</span>
          <TruthBadge truthClass="CONTROLLED_DEMO" />
          <span className="text-[10px] text-slate-500">(Deterministic Demonstration Scoring)</span>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <IconFilter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
            PRIORITY FILTER:
          </span>
          <div className="flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg p-0.5 text-xs font-mono">
            {[
              { id: "ALL", label: "ALL" },
              { id: "P1_CRITICAL", label: "P1 CRITICAL" },
              { id: "P2_HIGH", label: "P2 HIGH" },
              { id: "P4_LOW", label: "P4 LOW" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPriorityFilter(f.id)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  priorityFilter === f.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <IconSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Priority Incident Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`border rounded-2xl p-5 transition-all shadow-sm ${
              item.priorityLevel === "P1_CRITICAL"
                ? "bg-white dark:bg-neutral-900 border-red-400/80 dark:border-red-800/80 shadow-md ring-1 ring-red-500/20"
                : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
            }`}
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 dark:border-neutral-800/80 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-mono text-xs font-black px-2.5 py-0.5 rounded border ${getPriorityBadge(
                      item.priorityLevel
                    )}`}
                  >
                    {item.priorityLevel.replace("_", " ")}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-slate-200 dark:border-neutral-700">
                    {item.code}
                  </span>
                  <TruthBadge maturity={item.dataClass} size="sm" />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                    STATUS: <strong className="text-emerald-600 dark:text-emerald-400">{item.state}</strong>
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {item.title}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400">
                  <IconMapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{item.locationDetails}</span>
                  <span className="text-slate-300 dark:text-neutral-700">•</span>
                  <span className="text-slate-700 dark:text-neutral-300 font-semibold">{item.corridor}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => openIncident(item.id, "QUEUE")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold shadow transition-all cursor-pointer ${
                  item.priorityLevel === "P1_CRITICAL"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900"
                }`}
              >
                <span>OPEN INCIDENT TWIN</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics Ribbon: Decoupled Hazard vs Confidence vs Priority */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 text-xs font-mono">
              <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Physical Hazard Index</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {item.hazardScore.toFixed(1)} / 100
                  <span className="text-[10px] ml-1.5 text-red-600 dark:text-red-400 font-semibold">
                    ({item.hazardLevel})
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Epistemic Confidence</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {item.confidenceScore.toFixed(1)}%
                  <span className="text-[10px] ml-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                    ({item.confidenceLevel})
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Operational Priority Score</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {item.priorityScore.toFixed(1)}
                  <span className="text-[10px] ml-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    (Rank 1 of 4)
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Telemetry Freshness</div>
                <div className="text-xs font-semibold text-slate-700 dark:text-neutral-300 mt-1 truncate">
                  {item.freshness}
                </div>
              </div>
            </div>

            {/* Context & Priority Rationale */}
            <div className="space-y-2 text-xs font-sans">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-200/80 dark:border-neutral-800/80">
                <strong className="font-mono text-[10px] uppercase text-slate-500 dark:text-neutral-400 block mb-0.5">
                  CRITICAL EXPOSURE & LIFELINE CONSEQUENCE:
                </strong>
                <p className="text-slate-700 dark:text-neutral-300 leading-relaxed font-mono text-[11px]">
                  {item.exposureSummary}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 font-mono">
                <div>
                  <strong className="text-[10px] uppercase text-amber-800 dark:text-amber-400 block">
                    NEXT STATUTORY DECISION / REQUIRED ACTION:
                  </strong>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.pendingDecision}
                  </span>
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 shrink-0">
                  Role: <strong>{item.requiredRole}</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono px-1">
                <strong>WHY THIS PRIORITY:</strong> {item.priorityRationale}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
