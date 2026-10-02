import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconLayers,
  IconInfo,
} from "../icons";

interface WhereIsDangerMapProps {
  onOpenWhyAlertModal: () => void;
}

export const WhereIsDangerMap: React.FC<WhereIsDangerMapProps> = ({ onOpenWhyAlertModal }) => {
  const { location, requestGps } = useLocationService();
  const { t } = useCitizenI18n();

  // Active view target focus
  const [mapFocus, setMapFocus] = useState<"ALL" | "INCIDENT" | "USER" | "ROADBLOCK">("ALL");
  const [showExplanation, setShowExplanation] = useState(false);

  // Geospatial anchors (West Kameng NH-13 Corridor)
  const INCIDENT = { lat: 27.0842, lng: 92.5681, label: "TG-2048: NH-13 KM-42" };
  const ROADBLOCK = { lat: 27.0610, lng: 92.5510, label: "KM-38 Checkpost" };
  const DETOUR = { lat: 27.1250, lng: 92.5120, label: "Rupa-Kalaktang Bypass" };

  // Calculate distance from user to incident
  const dLat = (INCIDENT.lat - location.latitude) * 111;
  const dLng = (INCIDENT.lng - location.longitude) * 111 * Math.cos((INCIDENT.lat * Math.PI) / 180);
  const distanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;

  // Map coordinate transformation to 600x380 SVG canvas
  const centerLat = 27.080;
  const centerLng = 92.550;
  const scale = 1400;

  const toSvgX = (lng: number) => 300 + (lng - centerLng) * scale;
  const toSvgY = (lat: number) => 190 - (lat - centerLat) * scale;

  const incidentX = toSvgX(INCIDENT.lng);
  const incidentY = toSvgY(INCIDENT.lat);
  const roadblockX = toSvgX(ROADBLOCK.lng);
  const roadblockY = toSvgY(ROADBLOCK.lat);
  const detourX = toSvgX(DETOUR.lng);
  const detourY = toSvgY(DETOUR.lat);

  const rawUserX = toSvgX(location.longitude);
  const rawUserY = toSvgY(location.latitude);
  const userX = Math.max(35, Math.min(565, rawUserX));
  const userY = Math.max(35, Math.min(345, rawUserY));

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <IconLayers className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
              Where is the Danger?
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Active incident area, affected corridor, and blocked road checkpoint
          </p>
        </div>

        {/* Data Status Badge & Focus Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
            STATUS: OPERATIONAL ASSESSMENT
          </span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-white/10 text-[11px]">
            <button
              onClick={() => setMapFocus("ALL")}
              className={`px-2 py-1 rounded transition-colors ${mapFocus === "ALL" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Corridor
            </button>
            <button
              onClick={() => {
                setMapFocus("USER");
                requestGps();
              }}
              className={`px-2 py-1 rounded transition-colors ${mapFocus === "USER" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
            >
              My Pin
            </button>
          </div>
        </div>
      </div>

      {/* SVG Citizen Map */}
      <div className="mt-3 relative w-full h-[320px] sm:h-[360px] rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center select-none">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />

        <svg viewBox="0 0 600 380" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="citDangerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </radialGradient>
            <radialGradient id="citImpactGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* 15 km District Monitoring Area */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="150"
            fill="none"
            stroke="#eab308"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            className="opacity-40"
          />
          <text
            x={incidentX - 140}
            y={incidentY - 135}
            fill="#eab308"
            fontSize="9"
            className="opacity-75 font-semibold"
          >
            Monitoring area (15 km)
          </text>

          {/* 5 km Potential Impact Area */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="80"
            fill="url(#citImpactGrad)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={incidentX + 60}
            y={incidentY - 55}
            fill="#fbbf24"
            fontSize="9"
            fontWeight="bold"
          >
            Potential impact area
          </text>

          {/* 2.5 km Affected Danger Zone */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="42"
            fill="url(#citDangerGrad)"
            stroke="#ef4444"
            strokeWidth="2"
          />

          {/* Arterial Highway Network: NH-13 */}
          <path
            d={`M 70,340 Q 210,270 ${roadblockX},${roadblockY} T ${incidentX},${incidentY} T 520,60`}
            fill="none"
            stroke="#64748b"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={`M 70,340 Q 210,270 ${roadblockX},${roadblockY} T ${incidentX},${incidentY} T 520,60`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Blocked corridor section */}
          <path
            d={`M ${roadblockX},${roadblockY} T ${incidentX},${incidentY}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="4"
            strokeDasharray="6 3"
          />
          <text x="110" y="315" fill="#cbd5e1" fontSize="9" fontWeight="bold">
            NH-13 TRANS-ARUNACHAL HIGHWAY
          </text>

          {/* Authorized Bypass: Rupa-Kalaktang */}
          <path
            d={`M 140,310 Q ${detourX},${detourY} 480,130`}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
          <text x={detourX - 45} y={detourY - 10} fill="#34d399" fontSize="8.5" fontWeight="bold">
            Authorized Detour: Rupa Bypass
          </text>

          {/* Distance Line from User to Incident */}
          <line
            x1={userX}
            y1={userY}
            x2={incidentX}
            y2={incidentY}
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeDasharray="4 2"
          />
          <rect
            x={(userX + incidentX) / 2 - 24}
            y={(userY + incidentY) / 2 - 9}
            width="48"
            height="17"
            rx="4"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <text
            x={(userX + incidentX) / 2}
            y={(userY + incidentY) / 2 + 3}
            fill="#38bdf8"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {distanceKm} km
          </text>

          {/* Roadblock Point: KM-38 Checkpost */}
          <g transform={`translate(${roadblockX}, ${roadblockY})`}>
            <circle r="12" fill="#dc2626" opacity="0.3" className="animate-ping" />
            <circle r="8" fill="#dc2626" stroke="#ffffff" strokeWidth="1.8" />
            <rect x="-55" y="12" width="110" height="22" rx="4" fill="#1e293b" stroke="#dc2626" strokeWidth="1" />
            <text x="0" y="22" fill="#f87171" fontSize="8.5" fontWeight="bold" textAnchor="middle">
              ROAD CLOSED: KM-38
            </text>
            <text x="0" y="31" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
              SDRF Checkpost Alpha
            </text>
          </g>

          {/* Incident Epicenter */}
          <g transform={`translate(${incidentX}, ${incidentY})`}>
            <circle r="18" fill="#ef4444" opacity="0.3" className="animate-ping" />
            <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
            <rect x="-65" y="-30" width="130" height="22" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="1.2" />
            <text x="0" y="-19" fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle">
              LANDSLIDE: NH-13 KM-42
            </text>
            <text x="0" y="-10" fill="#cbd5e1" fontSize="7.5" textAnchor="middle">
              Active slope movement
            </text>
          </g>

          {/* Citizen Pin */}
          <g transform={`translate(${userX}, ${userY})`}>
            <circle r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle r="2.5" fill="#ffffff" />
            <rect x="-45" y="-26" width="90" height="20" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
            <text x="0" y="-17" fill="#a7f3d0" fontSize="8.5" fontWeight="bold" textAnchor="middle">
              YOU ARE HERE
            </text>
            <text x="0" y="-8" fill="#6ee7b7" fontSize="7.5" textAnchor="middle">
              {location.accuracyMeters ? `±${Math.round(location.accuracyMeters)}m` : "Current Location"}
            </text>
          </g>
        </svg>

        {/* Compass */}
        <div className="absolute top-2.5 right-2.5 bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[9px] font-mono text-slate-300">
          N ↑
        </div>
      </div>

      {/* Compact Plain-Language Legend */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
          <span className="text-slate-200">Incident Area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
          <span className="text-slate-200">Potential Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
            ⛔
          </span>
          <span className="text-slate-200">Road Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-200">Your Position</span>
        </div>
      </div>

      {/* Plain Language Explanations */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-start justify-between gap-2 text-[11px] text-slate-300">
        <div>
          Prototype-derived operational awareness area. It does not predict an exact future landslide location.
        </div>
        <button
          type="button"
          onClick={onOpenWhyAlertModal}
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold shrink-0"
        >
          Why this alert?
        </button>
      </div>
    </div>
  );
};
