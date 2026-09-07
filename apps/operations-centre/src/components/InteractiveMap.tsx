import React from "react";
import { useDemoScenario } from "../context/DemoScenarioContext";
import { OTHER_NER_INCIDENTS } from "../data/deterministicScenario";
import {
  IconMapPin,
  IconLayers,
  IconCloudRain,
  IconAlertTriangle,
  IconShieldCheck,
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

  return (
    <div className="relative w-full h-full min-h-[420px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col select-none">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-700/60 shadow-lg text-xs">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono text-neutral-300">
          {detailedView ? "CORRIDOR DETAIL: NH-13 KM-38 to KM-46" : "NORTH EASTERN REGION (NER) OPERATIONAL GRID"}
        </span>
        <span className="text-neutral-500 font-mono">| EPSG:4326 WGS84</span>
      </div>

      {/* Map Layer Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-lg border border-neutral-700/60 shadow-lg text-[11px]">
        <span className="text-neutral-400 px-1 font-semibold flex items-center gap-1">
          <IconLayers className="w-3.5 h-3.5 text-emerald-400" />
          Layers:
        </span>
        <button
          onClick={() => toggleMapLayer("rainfall")}
          className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
            mapLayers.rainfall
              ? "bg-blue-900/40 text-blue-300 border border-blue-600/40"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <IconCloudRain className="w-3 h-3" />
          Rainfall Radar
        </button>
        <button
          onClick={() => toggleMapLayer("susceptibility")}
          className={`px-2 py-0.5 rounded transition-all ${
            mapLayers.susceptibility
              ? "bg-amber-900/40 text-amber-300 border border-amber-600/40"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          GSI Susceptibility
        </button>
        <button
          onClick={() => toggleMapLayer("corridors")}
          className={`px-2 py-0.5 rounded transition-all ${
            mapLayers.corridors
              ? "bg-emerald-900/40 text-emerald-300 border border-emerald-600/40"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Lifeline Corridors
        </button>
      </div>

      {/* Vector/Canvas Geographic Visualization */}
      <div className="relative flex-1 w-full h-full bg-[#080c10] overflow-hidden">
        {/* Subtle coordinate grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* SVG Topographic Relief & Vectors */}
        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Radar rainfall gradient */}
            <radialGradient id="rainfallRadar" cx="45%" cy="40%" r="35%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>

            {/* Susceptibility gradient */}
            <linearGradient id="susceptibilityHills" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#b45309" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.05" />
            </linearGradient>

            <pattern id="hatchPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.2" />
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
            stroke="#262626"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <path
            d="M 120 220 Q 280 170, 520 200 T 760 170"
            fill="none"
            stroke="#262626"
            strokeWidth="1.5"
          />
          <path
            d="M 160 300 Q 320 260, 580 280 T 780 250"
            fill="none"
            stroke="#1f2937"
            strokeWidth="1"
          />

          {/* Active Rainfall Radar Layer */}
          {mapLayers.rainfall && (
            <ellipse cx="370" cy="210" rx="220" ry="160" fill="url(#rainfallRadar)" />
          )}

          {/* GSI NLSM Landslide Susceptibility Zone */}
          {mapLayers.susceptibility && (
            <polygon
              points="300,160 460,140 480,260 340,290"
              fill="url(#hatchPattern)"
              stroke="#d97706"
              strokeWidth="1"
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
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />
              <path
                d="M 120 420 Q 220 340, 310 280 T 400 200 T 490 120 T 600 60"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="6,8"
                strokeOpacity="0.6"
              />

              {/* Tenga bypass road */}
              <path
                d="M 310 280 Q 360 320, 440 240 T 490 120"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="4,4"
                strokeOpacity="0.7"
              />

              {/* Road labels */}
              <text x="210" y="325" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                NH-13 (Trans-Arunachal Highway)
              </text>
              <text x="360" y="310" fill="#93c5fd" fontSize="9" fontFamily="monospace">
                Tenga Bypass (Light Detour)
              </text>
            </>
          )}

          {/* River valley */}
          <path
            d="M 90 480 Q 240 380, 330 330 T 460 210 T 560 140"
            fill="none"
            stroke="#0369a1"
            strokeWidth="3"
            strokeOpacity="0.4"
          />
          <text x="250" y="375" fill="#38bdf8" fontSize="9" opacity="0.6" fontFamily="sans-serif">
            Kameng River
          </text>
        </svg>

        {/* Detailed Corridor Callouts (For Steps 4, 7, 8, 9) */}
        {detailedView && (
          <div className="absolute inset-0 pointer-events-none">
            {/* KM-38 Checkpoint */}
            <div className="absolute top-[52%] left-[36%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border shadow-lg ${
                  isActionConfirmed
                    ? "bg-emerald-950/90 text-emerald-300 border-emerald-500"
                    : currentStep >= 7
                    ? "bg-amber-950/90 text-amber-300 border-amber-500 animate-pulse"
                    : "bg-neutral-900/90 text-neutral-300 border-neutral-700"
                }`}
              >
                <IconTruck className="w-3.5 h-3.5" />
                <span>KM-38 Police Barrier {isActionConfirmed ? "[CONFIRMED]" : currentStep >= 7 ? "[UNCONFIRMED]" : ""}</span>
              </div>
            </div>

            {/* KM-40 BRO Staging */}
            <div className="absolute top-[44%] left-[45%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900/80 text-blue-300 border border-blue-700/60 shadow">
                <span>BRO Heavy Earthmover Staging (KM-40)</span>
              </div>
            </div>

            {/* Downstream Village */}
            <div className="absolute top-[58%] left-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900/80 text-neutral-300 border border-neutral-700">
                <IconBuilding className="w-3 h-3 text-amber-400" />
                <span>Lower Bhalukpong (1,420 pop)</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Incidents Markers */}
        {/* Secondary NER Incidents */}
        {!detailedView &&
          OTHER_NER_INCIDENTS.map((inc) => (
            <div
              key={inc.id}
              onClick={() => selectIncident(inc.id)}
              className="absolute cursor-pointer transition-all hover:scale-110 z-10"
              style={{
                top: inc.id === "TG-1082" ? "28%" : inc.id === "TG-1944" ? "68%" : "22%",
                left: inc.id === "TG-1082" ? "74%" : inc.id === "TG-1944" ? "58%" : "24%",
              }}
            >
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono border backdrop-blur-md shadow-md ${
                  selectedIncidentCode === inc.id
                    ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/50"
                    : inc.riskLevel === "HIGH"
                    ? "bg-orange-950/80 border-orange-600/80 text-orange-200"
                    : inc.riskLevel === "MODERATE"
                    ? "bg-amber-950/80 border-amber-600/80 text-amber-200"
                    : "bg-neutral-900/80 border-neutral-700 text-neutral-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      inc.riskLevel === "HIGH" ? "#f97316" : inc.riskLevel === "MODERATE" ? "#eab308" : "#22c55e",
                  }}
                />
                <span className="font-bold">{inc.code}</span>
                <span className="text-[9px] opacity-70">({inc.riskLevel})</span>
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
            <span className="animate-pulse absolute inline-flex h-8 w-8 rounded-full bg-red-600/40" />

            {/* Core Pin Badge */}
            <div
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 shadow-2xl backdrop-blur-md transition-all ${
                selectedIncidentCode === "TG-2048"
                  ? "bg-red-950/95 border-red-500 text-red-100 ring-4 ring-red-500/30"
                  : "bg-red-950/85 border-red-600 text-red-200"
              }`}
            >
              <IconAlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
              <div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs tracking-tight">
                  <span>TG-2048</span>
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                    {riskLevel} RISK
                  </span>
                </div>
                <div className="text-[10px] text-red-300/90 font-mono">
                  NH-13 KM-42 | Conf: {confidenceLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Footer Telemetry Bar */}
      <div className="bg-neutral-900/95 border-t border-neutral-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Active Debris Hazard Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Strategic Corridor NH-13
          </span>
          <span className="text-neutral-500">Center: 27.084° N, 92.568° E</span>
        </div>
        <div className="text-neutral-400">
          Source: IMD AWS #428 + GSI NLSM + Sentinel-1 SAR
        </div>
      </div>
    </div>
  );
};
