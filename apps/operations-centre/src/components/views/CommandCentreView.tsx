import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { InteractiveMap } from "../InteractiveMap";
import { OTHER_NER_INCIDENTS } from "../../data/deterministicScenario";
import { RiskIndicator, ConfidenceMeter } from "../common";
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
  IconLayers,
  IconMapPin,
  IconSatellite,
  IconFileText,
  IconSend,
  IconBuilding,
  IconTruck,
} from "../icons";

export const CommandCentreView: React.FC = () => {
  const {
    selectIncident,
    openIncident,
    riskLevel,
    confidenceLevel,
    incidentStatus,
    setActiveNavTab,
  } = useDemoScenario();

  // TG-2048 Card Active Tab
  const [activeCardTab, setActiveCardTab] = useState<
    "Overview" | "Evidence" | "Impact" | "Tasks" | "Decision" | "Action" | "Replay"
  >("Overview");

  // Map Layer Toggles Overlay State
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [showLegendPanel, setShowLegendPanel] = useState(true);
  const [mapBaseType, setMapBaseType] = useState<"Base" | "Terrain" | "Hybrid">("Terrain");

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-5 w-full max-w-[1720px] mx-auto text-slate-100">
      {/* ── TOP KPI & LIVE DATA FEEDS STRIP (Matching media_1790946143288.jpg) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white shadow-xl flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
        {/* 5 Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 min-w-[320px]">
          {/* Active Incidents */}
          <div
            onClick={() => setActiveNavTab("QUEUE")}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-2.5 rounded-lg flex flex-col justify-between cursor-pointer transition-colors"
          >
            <div className="text-2xl font-black font-mono text-white leading-tight">12</div>
            <div className="text-xs font-semibold text-slate-300">Active Incidents</div>
            <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5 font-bold">
              <span>↑ +3 from yesterday</span>
            </div>
          </div>

          {/* Critical */}
          <div
            onClick={() => openIncident("TG-2048", "OPERATIONS")}
            className="bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 p-2.5 rounded-lg flex flex-col justify-between cursor-pointer transition-colors"
          >
            <div className="text-2xl font-black font-mono text-red-400 leading-tight">3</div>
            <div className="text-xs font-semibold text-red-200">Critical</div>
            <div className="text-[10px] text-red-400/80 font-mono mt-0.5">Immediate action</div>
          </div>

          {/* High Risk */}
          <div
            onClick={() => setActiveNavTab("QUEUE")}
            className="bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/60 p-2.5 rounded-lg flex flex-col justify-between cursor-pointer transition-colors"
          >
            <div className="text-2xl font-black font-mono text-amber-400 leading-tight">5</div>
            <div className="text-xs font-semibold text-amber-200">High Risk</div>
            <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">Monitoring closely</div>
          </div>

          {/* Verification */}
          <div
            onClick={() => setActiveNavTab("FIELD")}
            className="bg-yellow-950/40 hover:bg-yellow-950/60 border border-yellow-800/60 p-2.5 rounded-lg flex flex-col justify-between cursor-pointer transition-colors"
          >
            <div className="text-2xl font-black font-mono text-yellow-400 leading-tight">4</div>
            <div className="text-xs font-semibold text-yellow-200">Verification</div>
            <div className="text-[10px] text-yellow-400/80 font-mono mt-0.5">Field check pending</div>
          </div>

          {/* Watch */}
          <div
            onClick={() => setActiveNavTab("QUEUE")}
            className="bg-blue-950/40 hover:bg-blue-950/60 border border-blue-800/60 p-2.5 rounded-lg flex flex-col justify-between cursor-pointer transition-colors"
          >
            <div className="text-2xl font-black font-mono text-cyan-400 leading-tight">14</div>
            <div className="text-xs font-semibold text-cyan-200">Watch</div>
            <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">Under observation</div>
          </div>
        </div>

        {/* Live Data Feeds */}
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-lg p-2.5 flex flex-col justify-between shrink-0 min-w-[320px]">
          <div className="text-[11px] font-mono text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
            <span>Data Feeds (Live)</span>
            <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
              <IconRadar className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">IMD</span>
              <span className="text-[10px] text-emerald-400 font-bold">Live</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
              <IconSatellite className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300">NRSC</span>
              <span className="text-[10px] text-emerald-400 font-bold">Live</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
              <IconActivity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Sensors</span>
              <span className="text-[10px] text-cyan-300 font-bold">8/10</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
              <IconFileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300">Field Reports</span>
              <span className="text-[10px] text-blue-300 font-bold">12 new</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
              <IconSatellite className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Satellite</span>
              <span className="text-[10px] text-emerald-400 font-bold">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN SECTION: GIS MAP & TG-2048 CARD (Matching media_1790946143288.jpg) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column: Interactive GIS Map with Overlaid Controls (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-3 min-w-0 relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
          <div className="relative h-[560px] w-full">
            <InteractiveMap detailedView={false} className="h-full w-full" />

            {/* Overlaid Map Layers Panel (Left) */}
            <div className="absolute top-3 left-3 z-[1000] w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 text-xs shadow-2xl transition-all">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                  <IconLayers className="w-3.5 h-3.5 text-cyan-400" />
                  Map Layers
                </span>
                <button
                  onClick={() => setShowLayerPanel(!showLayerPanel)}
                  className="text-slate-400 hover:text-white text-[10px] font-mono px-1 py-0.5 rounded hover:bg-slate-800"
                >
                  {showLayerPanel ? "▲" : "▼"}
                </button>
              </div>

              {showLayerPanel && (
                <div className="mt-2 space-y-2">
                  {/* Base / Terrain / Hybrid Tabs */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    {(["Base", "Terrain", "Hybrid"] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => setMapBaseType(b)}
                        className={`flex-1 py-1 rounded text-center transition-colors ${
                          mapBaseType === b
                            ? "bg-blue-600 text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {/* Layer Checkboxes */}
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 font-sans text-[11px] text-slate-300">
                    {[
                      { label: "Risk Zones", checked: true, color: "text-red-400" },
                      { label: "Active Incidents", checked: true, color: "text-amber-400" },
                      { label: "Landslide Susceptibility", checked: true, color: "text-orange-400" },
                      { label: "Rainfall (IMD)", checked: true, color: "text-blue-400" },
                      { label: "Satellite (Copernicus)", checked: true, color: "text-purple-400" },
                      { label: "Road Network", checked: true, color: "text-slate-300" },
                      { label: "Villages & Settlements", checked: true, color: "text-emerald-400" },
                      { label: "Hospitals & Health Facilities", checked: true, color: "text-rose-400" },
                      { label: "Critical Infrastructure", checked: true, color: "text-yellow-400" },
                      { label: "Alternate Routes", checked: true, color: "text-cyan-400" },
                      { label: "Historical Landslides", checked: false, color: "text-slate-400" },
                      { label: "Real-time Sensors", checked: true, color: "text-emerald-400" },
                    ].map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-2 hover:bg-slate-800/60 p-1 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className={item.color}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overlaid Live Layers Legend (Right) */}
            <div className="absolute top-3 right-3 z-[1000] w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                  Live Layers
                </span>
                <button
                  onClick={() => setShowLegendPanel(!showLegendPanel)}
                  className="text-slate-400 hover:text-white text-[10px] font-mono px-1 py-0.5 rounded hover:bg-slate-800"
                >
                  {showLegendPanel ? "▲" : "▼"}
                </button>
              </div>

              {showLegendPanel && (
                <div className="mt-2 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-slate-300">Critical Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-300">High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-300">Watch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">▲</span>
                    <span className="text-slate-300">Incident</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-400" />
                    <span className="text-slate-300">Road (Open)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-red-500" />
                    <span className="text-slate-300">Road (Blocked)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-emerald-400 border-dashed" />
                    <span className="text-slate-300">Alternate Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">●</span>
                    <span className="text-slate-300">Village</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">H</span>
                    <span className="text-slate-300">Hospital</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">🏫</span>
                    <span className="text-slate-300">School</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">📡</span>
                    <span className="text-slate-300">Sensor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">🌧</span>
                    <span className="text-slate-300">Rain Gauge</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: TG-2048 Detailed Card (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-3 min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          {/* TG-2048 Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold font-mono text-white">TG-2048</span>
                <span className="bg-red-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded shadow">
                  CRITICAL
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                NH-13 Corridor, West Kameng, Arunachal Pradesh
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Started 10:34 AM • Last updated 6 min ago
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 text-xs font-mono">
            {(
              [
                "Overview",
                "Evidence",
                "Impact",
                "Tasks",
                "Decision",
                "Action",
                "Replay",
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveCardTab(tab);
                  if (tab === "Evidence") setActiveNavTab("EVIDENCE");
                  if (tab === "Impact") {
                    openIncident("TG-2048", "IMPACT");
                    setActiveNavTab("INCIDENTS");
                  }
                  if (tab === "Tasks") setActiveNavTab("FIELD");
                  if (tab === "Decision") {
                    openIncident("TG-2048", "OPERATIONS");
                    setActiveNavTab("INCIDENTS");
                  }
                  if (tab === "Action") setActiveNavTab("ALERTS");
                  if (tab === "Replay") setActiveNavTab("REPLAY");
                }}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeCardTab === tab
                    ? "bg-slate-800 text-white font-bold border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 3 Metric Progress Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Risk Score */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
              <div className="text-[10px] font-mono text-slate-400 font-semibold">Risk Score</div>
              <div className="text-lg font-bold font-mono text-white mt-1">78 / 100</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-red-500 h-full rounded-full" style={{ width: "78%" }} />
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
              <div className="text-[10px] font-mono text-slate-400 font-semibold">Confidence</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">64 / 100</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: "64%" }} />
              </div>
            </div>

            {/* Operational Priority */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
              <div className="text-[10px] font-mono text-slate-400 font-semibold">Operational Priority</div>
              <div className="text-base font-bold font-mono text-red-400 mt-1">CRITICAL</div>
              <div className="flex gap-1 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-red-500" />
                <div className="flex-1 h-1.5 rounded-full bg-red-500" />
                <div className="flex-1 h-1.5 rounded-full bg-red-500" />
              </div>
            </div>
          </div>

          {/* Current State Progression Stepper */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Current State</span>
              <span className="bg-blue-600/80 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                VERIFYING
              </span>
            </div>
            {/* Stepper Dots & Labels */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 overflow-x-auto gap-2">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>Detected 10:34</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>Assessing 10:36</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0 text-cyan-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-500/40" />
                <span>Verifying (current)</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Decision Pending</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Responding</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Monitoring</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Resolved</span>
              </div>
            </div>
          </div>

          {/* Verification Required Banner */}
          <div className="bg-red-950/40 border border-red-800/80 p-2.5 rounded-lg flex items-center gap-2.5 text-xs text-red-200">
            <IconAlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-red-300">Verification Required</div>
              <div className="text-[11px] text-red-200/90 leading-tight">
                Confidence reduced due to missing sensor data. Field verification in progress.
              </div>
            </div>
          </div>

          {/* Why is this significant? & Mountain Thumbnail */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-950 border border-slate-800 p-3 rounded-lg">
            <div className="sm:col-span-7 space-y-1.5 text-xs">
              <div className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                Why is this significant?
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span className="text-blue-400">🌧</span>
                  <span>Heavy rainfall (IMD): 180 mm (24h)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-amber-400">▲</span>
                  <span>High landslide susceptibility</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-red-400">⚠️</span>
                  <span>NH-13 (primary connectivity) at risk</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-400">👥</span>
                  <span>2 villages (~1,200 people) nearby</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-rose-400">🏥</span>
                  <span>Hospital route may be affected</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-yellow-400">↪</span>
                  <span>No reliable alternate route (only 1 long detour)</span>
                </li>
              </ul>
            </div>

            <div className="sm:col-span-5 flex flex-col gap-2">
              <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-800 relative group">
                <img
                  src="/samples/sample-landslide-nagaland.jpg"
                  alt="West Kameng Hazard Terrain"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-1 right-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300">
                  KM-42 Field Site
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveNavTab("MAP")}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <IconMapPin className="w-3.5 h-3.5" />
                  <span>View on Map</span>
                </button>
                <button
                  onClick={() => openIncident("TG-2048", "OPERATIONS")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 LOWER PANELS (Matching media_1790946143288.jpg) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Panel 1: Evidence Reconciliation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs uppercase font-mono flex items-center gap-1.5">
                <IconShieldAlert className="w-4 h-4 text-cyan-400" />
                Evidence Reconciliation
              </span>
              <button
                onClick={() => setActiveNavTab("EVIDENCE")}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-2 font-semibold">6 Sources</div>

            {/* Table of Evidence */}
            <div className="mt-2 space-y-2 text-xs font-mono">
              {[
                { source: "IMD Rainfall", status: "High", time: "12 min ago", bar: "w-full bg-emerald-500", statusColor: "bg-emerald-950 text-emerald-300 border-emerald-800" },
                { source: "GSI / NLFC", status: "High", time: "28 min ago", bar: "w-4/5 bg-emerald-500", statusColor: "bg-emerald-950 text-emerald-300 border-emerald-800" },
                { source: "Satellite (Copernicus)", status: "Medium", time: "42 min ago", bar: "w-3/5 bg-amber-500", statusColor: "bg-amber-950 text-amber-300 border-amber-800" },
                { source: "On-site Sensor", status: "Unavailable", time: "-", bar: "w-0 bg-red-500", statusColor: "bg-red-950 text-red-300 border-red-800" },
                { source: "Field Report", status: "High", time: "18 min ago", bar: "w-4/5 bg-emerald-500", statusColor: "bg-emerald-950 text-emerald-300 border-emerald-800" },
                { source: "Citizen Report", status: "Support", time: "25 min ago", bar: "w-3/4 bg-cyan-500", statusColor: "bg-cyan-950 text-cyan-300 border-cyan-800" },
              ].map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] gap-2 py-0.5">
                  <span className="text-slate-300 truncate w-32">{ev.source}</span>
                  <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${ev.statusColor}`}>
                    {ev.status}
                  </span>
                  <span className="text-slate-400 text-[10px] w-16 text-right">{ev.time}</span>
                  <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                    <div className={`h-full rounded-full ${ev.bar}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-800">
              4 supporting signals • 1 unavailable • 1 conflicting observation
            </div>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/80 p-2 rounded-lg text-[10px] text-amber-200 font-mono mt-3">
            Confidence reduced due to missing sensor data and conflicting satellite interpretation.
          </div>
        </div>

        {/* Panel 2: Impact Analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs uppercase font-mono flex items-center gap-1.5">
                <IconActivity className="w-4 h-4 text-emerald-400" />
                Impact Analysis
              </span>
              <button
                onClick={() => {
                  openIncident("TG-2048", "IMPACT");
                  setActiveNavTab("INCIDENTS");
                }}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                View Details
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-2 font-semibold">
              Affected Assets (Auto-detected)
            </div>

            {/* 4 Summary Blocks */}
            <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-xs">
              <div className="bg-red-950/40 border border-red-800/60 p-2 rounded-lg">
                <div className="text-red-400 font-bold">1 Critical Road</div>
                <div className="text-[10px] text-slate-400">(NH-13)</div>
              </div>
              <div className="bg-blue-950/40 border border-blue-800/60 p-2 rounded-lg">
                <div className="text-cyan-400 font-bold">2 Villages</div>
                <div className="text-[10px] text-slate-400">(~1,200 people)</div>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-2 rounded-lg">
                <div className="text-emerald-400 font-bold">1 Hospital Route</div>
                <div className="text-[10px] text-slate-400">(Access at risk)</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <div className="text-slate-300 font-bold">1 School</div>
                <div className="text-[10px] text-slate-400">(Nearby)</div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-amber-300 mt-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>No reliable Alternate Route (Only 1 long detour)</span>
            </div>

            {/* Asset Table */}
            <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
              {[
                { asset: "Road", name: "NH-13", dist: "0 km", status: "At Risk" },
                { asset: "Village", name: "Dirang", dist: "2.3 km", status: "At Risk" },
                { asset: "Village", name: "Rupa", dist: "4.1 km", status: "At Risk" },
                { asset: "Hospital", name: "Dirang CHC", dist: "6.8 km", status: "Access Impacted" },
                { asset: "School", name: "Dirang Govt. School", dist: "3.9 km", status: "At Risk" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 w-16 truncate">{row.asset}</span>
                  <span className="font-semibold text-white w-28 truncate">{row.name}</span>
                  <span className="text-slate-400 w-12 text-right">{row.dist}</span>
                  <span className="text-red-400 text-[10px] font-bold text-right flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 3: Priority Reasoning */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs uppercase font-mono flex items-center gap-1.5">
                <IconShieldAlert className="w-4 h-4 text-purple-400" />
                Priority Reasoning
              </span>
              <button
                onClick={() => {
                  openIncident("TG-2048", "OPERATIONS");
                  setActiveNavTab("INCIDENTS");
                }}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                View Model
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-2 font-semibold">
              Why CRITICAL even if hazard is moderate?
            </div>

            {/* 6 Factor Bars */}
            <div className="mt-2.5 space-y-2 text-xs font-mono">
              {[
                { factor: "Hazard (78)", weight: "0.25", width: "w-4/5", color: "bg-red-500" },
                { factor: "Exposure (Population) (82)", weight: "0.20", width: "w-[82%]", color: "bg-amber-500" },
                { factor: "Infrastructure Criticality (95)", weight: "0.20", width: "w-[95%]", color: "bg-yellow-500" },
                { factor: "Connectivity Risk (91)", weight: "0.20", width: "w-[91%]", color: "bg-cyan-500" },
                { factor: "Response Difficulty (70)", weight: "0.10", width: "w-[70%]", color: "bg-blue-500" },
                { factor: "Environmental Sensitivity (65)", weight: "0.05", width: "w-[65%]", color: "bg-emerald-500" },
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span className="truncate">{f.factor}</span>
                    <span className="text-slate-400">{f.weight}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${f.color} ${f.width}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-xs font-mono font-bold">
              <span className="text-slate-300">Weighted Score</span>
              <span className="text-red-400 text-sm">91 / 100</span>
            </div>
          </div>

          <div className="bg-red-950/40 border border-red-800/80 p-2.5 rounded-lg text-[10px] text-red-200 font-mono mt-3">
            <span className="font-bold text-red-300">CRITICAL PRIORITY:</span> Threatens a key road and hospital connectivity with high population exposure and limited alternatives.
          </div>
        </div>

        {/* Panel 4: System Activity (AI Agents) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs uppercase font-mono flex items-center gap-1.5">
                <IconRadar className="w-4 h-4 text-emerald-400" />
                System Activity (AI Agents)
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            {/* Agent Timeline */}
            <div className="mt-3 space-y-2 text-[11px] font-mono">
              {[
                { time: "10:34", agent: "Risk Intelligence", desc: "Rainfall threshold exceeded (IMD)", color: "text-blue-400" },
                { time: "10:35", agent: "Evidence Engine", desc: "Multiple sources ingested", color: "text-cyan-400" },
                { time: "10:36", agent: "Uncertainty Engine", desc: "Sensor data missing → confidence reduced", color: "text-amber-400" },
                { time: "10:37", agent: "Impact Engine", desc: "NH-13 and nearby villages identified", color: "text-emerald-400" },
                { time: "10:38", agent: "Priority Engine", desc: "Incident classified as CRITICAL", color: "text-red-400" },
                { time: "10:40", agent: "Field Coordinator", desc: "Verification task assigned", color: "text-purple-400" },
                { time: "10:41", agent: "Citizen Input", desc: "1 new citizen report received", color: "text-rose-400" },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-2 border-l border-slate-800 pl-2">
                  <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                  <div className="flex flex-col">
                    <span className={`font-bold ${log.color}`}>{log.agent}</span>
                    <span className="text-slate-400 text-[10px] leading-tight">{log.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setActiveNavTab("REVIEW")}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Logs</span>
              <IconArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM INCIDENT LIFECYCLE TIMELINE (Matching media_1790946143288.jpg) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-wrap xl:flex-nowrap items-center justify-between gap-4">
        {/* Left: 9 Lifecycle Stages */}
        <div className="flex flex-col gap-2 flex-1 min-w-[320px]">
          <div className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
            <IconClock className="w-4 h-4 text-cyan-400" />
            <span>Incident Lifecycle — From Detection to Learning</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono overflow-x-auto gap-2 pt-1 pb-1">
            {[
              { num: 1, label: "Sense", desc: "Multi-source data", active: false, done: true },
              { num: 2, label: "Reconcile", desc: "Evidence fusion", active: false, done: true },
              { num: 3, label: "Verify", desc: "Field confirmation", active: true, done: false },
              { num: 4, label: "Understand", desc: "Impact analysis", active: false, done: false },
              { num: 5, label: "Prioritize", desc: "Operational risk", active: false, done: false },
              { num: 6, label: "Decide", desc: "Human authority", active: false, done: false },
              { num: 7, label: "Act", desc: "Response execution", active: false, done: false },
              { num: 8, label: "Confirm", desc: "Action verification", active: false, done: false },
              { num: 9, label: "Learn", desc: "Model improvement", active: false, done: false },
            ].map((st, i) => (
              <React.Fragment key={st.num}>
                <div
                  className={`flex flex-col items-center text-center shrink-0 px-2 py-1 rounded transition-colors ${
                    st.active
                      ? "bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 font-bold ring-2 ring-emerald-500/20"
                      : st.done
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        st.active
                          ? "bg-emerald-500 text-slate-950"
                          : st.done
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {st.num}
                    </span>
                    <span>{st.label}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5">{st.desc}</span>
                </div>
                {i < 8 && <span className="text-slate-700 text-xs shrink-0">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right: National Impact Summary */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shrink-0 flex flex-col justify-between min-w-[280px]">
          <div className="text-[11px] font-bold text-slate-200">
            People Informed. Routes Secured. Communities Safer.
          </div>
          <div className="grid grid-cols-4 gap-3 mt-2 text-center font-mono">
            <div>
              <div className="text-base font-bold text-cyan-400">1.2M</div>
              <div className="text-[9px] text-slate-400">People in Risk</div>
            </div>
            <div>
              <div className="text-base font-bold text-emerald-400">4.2K</div>
              <div className="text-[9px] text-slate-400">Km Critical Roads</div>
            </div>
            <div>
              <div className="text-base font-bold text-amber-400">89</div>
              <div className="text-[9px] text-slate-400">Response Teams</div>
            </div>
            <div>
              <div className="text-base font-bold text-purple-400">7</div>
              <div className="text-[9px] text-slate-400">States Connected</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
