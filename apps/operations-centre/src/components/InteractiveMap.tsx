import React from "react";
import { useDemoScenario } from "../context/DemoScenarioContext";
import { useTheme } from "../context/ThemeContext";
import { OTHER_NER_INCIDENTS } from "../data/deterministicScenario";
import {
  IconLayers,
  IconCloudRain,
  IconAlertTriangle,
  IconTruck,
  IconBuilding,
} from "./icons";

interface InteractiveMapProps {
  detailedView?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ detailedView = false }) => {
  const {
    currentStep,
    selectedIncidentCode,
    selectIncident,
    riskLevel,
    confidenceLevel,
    isActionConfirmed,
    mapLayers,
    toggleMapLayer,
  } = useDemoScenario();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div className="relative w-full h-full min-h-[440px] bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col select-none transition-colors shadow-sm">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700/60 shadow-md text-xs">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono text-slate-800 dark:text-neutral-300 font-bold">
          {detailedView ? "CORRIDOR DETAIL: NH-13 KM-38 to KM-46" : "NORTH EASTERN REGION (NER) OPERATIONAL GRID"}
        </span>
        <span className="text-slate-500 dark:text-neutral-500 font-mono text-[11px]">| EPSG:4326 WGS84</span>
      </div>

      {/* Map Layer Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-300 dark:border-slate-700/60 shadow-md text-[11px] font-mono">
        <span className="text-slate-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1 font-sans">
          <IconLayers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Layers:
        </span>
        <button
          onClick={() => toggleMapLayer("rainfall")}
          className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
            mapLayers.rainfall
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-400 dark:border-blue-600/40 font-bold"
              : "text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-neutral-300"
          }`}
        >
          <IconCloudRain className="w-3 h-3" />
          Simulated Isohyets
        </button>
        <button
          onClick={() => toggleMapLayer("susceptibility")}
          className={`px-2 py-0.5 rounded transition-all ${
            mapLayers.susceptibility
              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-400 dark:border-amber-600/40 font-bold"
              : "text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-neutral-300"
          }`}
        >
          GSI Susceptibility
        </button>
        <button
          onClick={() => toggleMapLayer("corridors")}
          className={`px-2 py-0.5 rounded transition-all ${
            mapLayers.corridors
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-600/40 font-bold"
              : "text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-neutral-300"
          }`}
        >
          Lifeline Highways
        </button>
      </div>

      {/* Vector Geographic Visualization */}
      <div className="relative flex-1 w-full h-full bg-slate-200/60 dark:bg-[#070b12] overflow-hidden transition-colors">
        {/* Subtle coordinate grid */}
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)"
              : "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* SVG Topographic Relief & Vectors */}
        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="rainfallRadar" cx="45%" cy="40%" r="35%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={isDark ? "0.45" : "0.35"} />
              <stop offset="35%" stopColor="#f97316" stopOpacity={isDark ? "0.30" : "0.22"} />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity={isDark ? "0.15" : "0.12"} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="susceptibilityHills" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#78350f" : "#d97706"} stopOpacity={isDark ? "0.25" : "0.15"} />
              <stop offset="50%" stopColor={isDark ? "#b45309" : "#f59e0b"} stopOpacity={isDark ? "0.15" : "0.08"} />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.04" />
            </linearGradient>

            <pattern id="hatchPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="1" strokeOpacity={isDark ? "0.25" : "0.35"} />
            </pattern>
          </defs>

          {/* Topographic elevation contours simulation */}
          <path
            d="M 50 180 Q 200 120, 360 160 T 680 110 T 780 220 L 800 500 L 0 500 Z"
            fill="url(#susceptibilityHills)"
          />
          <path
            d="M 80 140 Q 220 90, 420 120 T 720 80"
            fill="none"
            stroke={isDark ? "#334155" : "#94a3b8"}
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <path
            d="M 120 220 Q 280 170, 520 200 T 760 170"
            fill="none"
            stroke={isDark ? "#334155" : "#94a3b8"}
            strokeWidth="1.5"
          />
          <path
            d="M 160 300 Q 320 260, 580 280 T 780 250"
            fill="none"
            stroke={isDark ? "#1e293b" : "#cbd5e1"}
            strokeWidth="1"
          />

          {/* Simulated Rainfall Isohyets Layer */}
          {mapLayers.rainfall && (
            <ellipse cx="370" cy="210" rx="220" ry="160" fill="url(#rainfallRadar)" />
          )}

          {/* GSI NLSM Landslide Susceptibility Zone */}
          {mapLayers.susceptibility && (
            <polygon
              points="300,160 460,140 480,260 340,290"
              fill="url(#hatchPattern)"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
          )}

          {/* Strategic Highway Network (NH-13 corridor) */}
          {mapLayers.corridors && (
            <>
              {/* NH-13 main corridor line */}
              <path
                d="M 120 420 Q 220 340, 310 280 T 400 200 T 490 120 T 600 60"
                fill="none"
                stroke="#059669"
                strokeWidth="4"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />
              <path
                d="M 120 420 Q 220 340, 310 280 T 400 200 T 490 120 T 600 60"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="6,8"
                strokeOpacity="0.8"
              />

              {/* Tenga bypass road */}
              <path
                d="M 310 280 Q 360 320, 440 240 T 490 120"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                strokeOpacity="0.75"
              />

              {/* Road labels */}
              <text x="210" y="325" fill={isDark ? "#34d399" : "#065f46"} fontSize="11" fontFamily="monospace" fontWeight="bold">
                NH-13 (Trans-Arunachal Highway)
              </text>
              <text x="360" y="310" fill={isDark ? "#93c5fd" : "#0369a1"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                Tenga Bypass (Light Detour)
              </text>
            </>
          )}

          {/* Kameng River valley */}
          <path
            d="M 90 480 Q 240 380, 330 330 T 460 210 T 560 140"
            fill="none"
            stroke="#0284c7"
            strokeWidth="3"
            strokeOpacity="0.45"
          />
          <text x="250" y="375" fill={isDark ? "#38bdf8" : "#0369a1"} fontSize="10" opacity="0.8" fontFamily="sans-serif" fontWeight="bold">
            Kameng River Drainage Axis
          </text>
        </svg>

        {/* Detailed Corridor Callouts (For Steps 4, 7, 8, 9) */}
        {detailedView && (
          <div className="absolute inset-0 pointer-events-none">
            {/* KM-38 Checkpoint */}
            <div className="absolute top-[52%] left-[36%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border shadow-md font-bold ${
                  isActionConfirmed
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border-emerald-500"
                    : currentStep >= 7
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-500 animate-pulse"
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-neutral-300 border-slate-300 dark:border-neutral-700"
                }`}
              >
                <IconTruck className="w-3.5 h-3.5 text-slate-700 dark:text-neutral-300" />
                <span>KM-38 Police Barrier {isActionConfirmed ? "[CONFIRMED]" : currentStep >= 7 ? "[UNCONFIRMED GAP]" : ""}</span>
              </div>
            </div>

            {/* KM-40 BRO Staging */}
            <div className="absolute top-[44%] left-[45%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-300 border border-blue-400 dark:border-blue-700/60 shadow font-bold">
                <span>BRO Heavy Machinery Staging (KM-40)</span>
              </div>
            </div>

            {/* Downstream Village */}
            <div className="absolute top-[58%] left-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 font-bold shadow">
                <IconBuilding className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Lower Bhalukpong (1,420 Residents)</span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary NER Incidents */}
        {!detailedView &&
          OTHER_NER_INCIDENTS.map((inc) => (
            <div
              key={inc.id}
              onClick={() => selectIncident(inc.id)}
              className="absolute cursor-pointer transition-all hover:scale-105 z-10"
              style={{
                top: inc.id === "TG-1082" ? "28%" : inc.id === "TG-1944" ? "68%" : "22%",
                left: inc.id === "TG-1082" ? "74%" : inc.id === "TG-1944" ? "58%" : "24%",
              }}
            >
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border backdrop-blur-md shadow-md ${
                  selectedIncidentCode === inc.id
                    ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/40 font-bold"
                    : inc.riskLevel === "HIGH"
                    ? "bg-orange-50 dark:bg-orange-950/90 border-orange-400 dark:border-orange-600 text-orange-900 dark:text-orange-200"
                    : inc.riskLevel === "MODERATE"
                    ? "bg-amber-50 dark:bg-amber-950/90 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      inc.riskLevel === "HIGH" ? "#ea580c" : inc.riskLevel === "MODERATE" ? "#ca8a04" : "#16a34a",
                  }}
                />
                <span className="font-bold">{inc.code}</span>
                <span className="text-[10px] opacity-80">({inc.riskLevel})</span>
              </div>
            </div>
          ))}

        {/* PRIMARY INCIDENT: TG-2048 PIN */}
        <div
          onClick={() => selectIncident("TG-2048")}
          className="absolute top-[38%] left-[49%] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 transition-transform hover:scale-105"
        >
          {/* Animated Hazard Ring */}
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-red-500 opacity-60" />
            <span className="animate-pulse absolute inline-flex h-8 w-8 rounded-full bg-red-600/30" />

            {/* Core Pin Badge */}
            <div
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 shadow-xl backdrop-blur-md transition-all ${
                selectedIncidentCode === "TG-2048"
                  ? "bg-red-900 text-white border-red-500 ring-4 ring-red-500/30"
                  : "bg-red-800 text-white border-red-600"
              }`}
            >
              <IconAlertTriangle className="w-4 h-4 text-red-200 animate-bounce" />
              <div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs tracking-tight">
                  <span>TG-2048</span>
                  <span className="bg-red-700 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                    {riskLevel} RISK
                  </span>
                </div>
                <div className="text-[10px] text-red-100 font-mono">
                  NH-13 KM-42 | Conf: {confidenceLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Footer Operational Note */}
      <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-neutral-400 font-mono transition-colors">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Active Debris Hazard Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Strategic Corridor NH-13
          </span>
          <span className="text-slate-500">Center: 27.084° N, 92.568° E</span>
        </div>
        <div className="text-slate-500 dark:text-neutral-400 font-sans text-[11px]">
          Demonstration Operational Picture • Synthetic Sensor & Basemap Data
        </div>
      </div>
    </div>
  );
};
