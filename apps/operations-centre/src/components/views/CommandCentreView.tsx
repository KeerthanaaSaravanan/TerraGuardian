import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { InteractiveMap } from "../InteractiveMap";
import { OTHER_NER_INCIDENTS } from "../../data/deterministicScenario";
import { StatusBadge, RiskIndicator, ConfidenceMeter, PriorityIndicator, TruthBadge, WhatChangedPanel } from "../common";
import { WhatChangedEngine } from "../common/WhatChangedEngine";
import {
  IconAlertTriangle,
  IconCloudRain,
  IconActivity,
  IconArrowRight,
  IconRadio,
  IconRadar,
  IconShieldAlert,
  IconCheckCircle2,
  IconClock,
} from "../icons";

export const CommandCentreView: React.FC = () => {
  const {
    setStep,
    selectIncident,
    openIncident,
    riskLevel,
    confidenceLevel,
    incidentStatus,
    priorityLevel,
    currentAssessment,
    whatChanged,
    assessmentVersion,
    setActiveNavTab,
    backendIncidentId,
  } = useDemoScenario();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Top Banner: Regional Hazard Intelligence Alert */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-3.5 rounded-xl text-xs text-red-900 dark:text-red-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/50">
            <IconAlertTriangle className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <div className="font-bold uppercase tracking-wider text-red-700 dark:text-red-300 text-[11px] font-mono">
              IMD & GSI REGIONAL ADVISORY: NORTH EASTERN REGION (ZONE-V)
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Cloudburst activity concentrated over Kameng and Subansiri basins. Multiple chronic landslide corridors triggered.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="bg-red-100 dark:bg-red-900/50 px-2.5 py-1 rounded border border-red-300 dark:border-red-700/60 text-red-800 dark:text-red-200 font-bold">
            ACTIVE ALERTS: 4
          </span>
          <span className="bg-slate-100 dark:bg-neutral-900 px-2.5 py-1 rounded border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300">
            TELEMETRY: IMD WEATHER STATION REPLAY
          </span>
        </div>
      </div>

      {/* Model Transparency Sub-Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 px-3.5 py-2 rounded-lg text-xs font-mono text-slate-700 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">MODEL ENGINE:</span>
          <span className="bg-slate-200 dark:bg-neutral-800 px-2 py-0.5 rounded font-bold text-amber-600 dark:text-amber-400">
            Deterministic Heuristic Baseline
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-neutral-400">Calibration: <strong>Uncalibrated DEM Heuristic</strong></span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-neutral-400">Active Corridor: <strong>West Kameng (NH-13)</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-neutral-400">
          Substrate: <span className="text-emerald-600 dark:text-emerald-400 font-bold">REAL_HISTORICAL (Copernicus DEM 30m)</span>
        </div>
      </div>

      {/* Actionable Decision Directive Callout Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-white/20 border border-white/30 text-white shrink-0">
            <IconShieldAlert className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <div className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-200">
              ACTIONABLE OPERATIONAL DIRECTIVE • TG-2048 (NH-13 KM-42)
            </div>
            <div className="text-sm font-bold text-white">
              DECISION REQUIRED: Precautionary Road Closure & Multi-Agency Dispatch
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              openIncident("TG-2048", "OPERATIONS");
            }}
            className="bg-white hover:bg-slate-100 text-red-900 font-mono font-bold text-xs px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Review Statutory Decision Gate</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Citizen Evidence Queue Callout */}
      <div className="bg-slate-900 border border-cyan-500/40 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-white shadow-sm font-mono">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-cyan-300">CITIZEN SAFE EVIDENCE INGEST:</span>
          <span className="text-slate-300 text-[11px]">Real-time public field observations active. Reconcile evidence to update hazard twin.</span>
        </div>
        <button
          onClick={() => {
            openIncident("TG-2048", "EVIDENCE");
          }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>Review Citizen Queue</span>
          <IconArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 4 Foundational Operational Questions (Phase 0 North Star Section 0.13 & Phase 1 Section 6) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        <div
          onClick={() => setActiveNavTab("MAP")}
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-emerald-500 p-3 rounded-xl shadow-xs cursor-pointer transition-colors group"
        >
          <div className="text-[10px] text-slate-500 group-hover:text-emerald-500 uppercase font-bold flex items-center justify-between">
            <span>1. WHAT IS HAPPENING?</span>
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">MAP →</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">4 Active Sites in NER</div>
          <div className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans mt-0.5">Heavy precipitation over Kameng & Subansiri basins.</div>
        </div>

        <div
          onClick={() => {
            const el = document.getElementById("what-changed-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-amber-500 p-3 rounded-xl shadow-xs cursor-pointer transition-colors group"
        >
          <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold flex items-center justify-between">
            <span>2. WHAT CHANGED?</span>
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">WHY →</span>
          </div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">Rainfall +32mm / 24h</div>
          <div className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans mt-0.5">KM-42 hazard risk elevated from Moderate (64) to High (86).</div>
        </div>

        <div
          onClick={() => {
            openIncident("TG-2048");
            setActiveNavTab("INCIDENTS");
          }}
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-red-500 p-3 rounded-xl shadow-xs cursor-pointer transition-colors group"
        >
          <div className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold flex items-center justify-between">
            <span>3. WHAT MATTERS?</span>
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">IMPACT →</span>
          </div>
          <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">NH-13 Lifeline Highway</div>
          <div className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans mt-0.5">Sole arterial lifeline for 60k residents in Tawang.</div>
        </div>

        <div
          onClick={() => {
            openIncident("TG-2048");
            setActiveNavTab("INCIDENTS");
          }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 hover:border-red-500 p-3 rounded-xl shadow-xs cursor-pointer transition-colors group"
        >
          <div className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold flex items-center justify-between">
            <span>4. WHAT NEEDS DECISION?</span>
            <span className="animate-pulse">● GATE</span>
          </div>
          <div className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">Precautionary Road Closure</div>
          <div className="text-[11px] text-red-800 dark:text-red-200 font-sans mt-0.5 underline">Review DM statutory authorization →</div>
        </div>
      </div>

      {/* Main Grid: Map & Operational Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[620px]">
        {/* Left Column: Interactive Map & What Changed Panel (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3 min-w-0">
          <div className="flex-1 min-h-[460px]">
            <InteractiveMap detailedView={false} />
          </div>

          {/* Operational Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 p-3 rounded-lg flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                <span>ERA5 / GPM RAINFALL</span>
                <IconCloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {currentAssessment?.features?.rainfall_24h_mm?.toFixed(1) || "74.0"}
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">mm / 24h</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-semibold">▲ ERA5-Land Reanalysis (Real)</div>
            </div>

            <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 p-3 rounded-lg flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                <span>TERRAIN SLOPE (COPERNICUS DEM)</span>
                <IconActivity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-300 font-mono">
                  {currentAssessment?.features?.slope_deg?.toFixed(1) || "25.7"}°
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400/80 font-medium">GLO-30 Raster</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-semibold">KM-42 West Kameng (Real)</div>
            </div>

            <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 p-3 rounded-lg flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                <span>DOPPLER RADAR FEED</span>
                <IconRadar className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-bold text-slate-500 dark:text-neutral-400 font-mono">NO LIVE FEED</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono mt-1">DWR: Offline / Fallback to IMD AWS</div>
            </div>

            <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 p-3 rounded-lg flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                <span>INTER-AGENCY COMMS</span>
                <IconRadio className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">BRO + SDRF</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-semibold">TETRA Net (Simulated)</div>
            </div>
          </div>

          {/* Real Dimensional What Changed Engine */}
          <div id="what-changed-section">
            <WhatChangedEngine
              incidentId={backendIncidentId || "TG-2048"}
              onNavigateToEvidence={() => setActiveNavTab("EVIDENCE")}
              onNavigateToActions={() => {
                openIncident("TG-2048");
                setActiveNavTab("INCIDENTS");
              }}
            />
          </div>
        </div>

        {/* Right Column: Incident Queue & TG-2048 Highlight (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-4 min-w-0">
          {/* Priority Focus Header */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-400 font-bold flex items-center gap-1.5">
                <IconShieldAlert className="w-4 h-4 text-red-500" />
                ACTIVE HAZARD QUEUE (NER)
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-neutral-500">SORTED BY PRIORITY</span>
            </div>

            {/* TG-2048 FEATURED CARD */}
            <div className="relative bg-gradient-to-b from-red-50 to-white dark:from-red-950/60 dark:to-neutral-900 border-2 border-red-500 rounded-xl p-4 shadow-lg flex flex-col gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-red-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded shadow">
                      TG-2048
                    </span>
                    <RiskIndicator level={riskLevel} size="sm" />
                    <ConfidenceMeter level={confidenceLevel} size="sm" showSegments={false} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                    NH-13 KM-42 Slope Debris Flow
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
                    Bhalukpong-Tenga Corridor, West Kameng, AP
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed bg-slate-50 dark:bg-neutral-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <span className="text-red-600 dark:text-red-400 font-semibold">Operational Context:</span> Saturated mica-schist face above NH-13 trans-highway. Rain volume 184mm. Potential single-point cutoff for Tawang district lifeline.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-500">STATE</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{incidentStatus}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500 dark:text-neutral-500">IMPACT PRIORITY</div>
                  <div className="font-bold text-red-600 dark:text-red-400">CRITICAL (P1)</div>
                </div>
              </div>

              {/* Action Button to Launch Workspace */}
              <button
                onClick={() => openIncident("TG-2048", "OPERATIONS")}
                className="w-full mt-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md text-sm transition-all cursor-pointer"
              >
                <span>Investigate TG-2048 Workspace</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Other Incidents in Queue */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-500 font-semibold px-1">
                OTHER ACTIVE MONITORED SITES
              </div>
              {OTHER_NER_INCIDENTS.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    selectIncident(inc.id);
                    openIncident(inc.id);
                  }}
                  className="bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-neutral-300">{inc.code}</span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold"
                        style={{
                          backgroundColor:
                            inc.riskLevel === "HIGH"
                              ? "#fee2e2"
                              : inc.riskLevel === "MODERATE"
                              ? "#fef3c7"
                              : "#dcfce7",
                          color:
                            inc.riskLevel === "HIGH"
                              ? "#b91c1c"
                              : inc.riskLevel === "MODERATE"
                              ? "#b45309"
                              : "#15803d",
                        }}
                      >
                        {inc.riskLevel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-neutral-400 truncate max-w-[200px] mt-0.5">
                      {inc.title}
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-500 dark:text-neutral-500">
                    <div>{inc.status}</div>
                    <div className="text-[10px] text-slate-400 dark:text-neutral-600">{inc.priorityLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

