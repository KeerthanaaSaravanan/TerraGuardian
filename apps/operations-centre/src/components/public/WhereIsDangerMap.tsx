import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconCrosshair,
  IconLayers,
  IconInfo,
  IconCompass,
  IconRadio,
} from "../icons";

interface WhereIsDangerMapProps {
  onOpenWhyAlertModal: () => void;
}

export const WhereIsDangerMap: React.FC<WhereIsDangerMapProps> = ({ onOpenWhyAlertModal }) => {
  const { location, requestGps } = useLocationService();
  const { t } = useCitizenI18n();

  // Active view target focus
  const [mapFocus, setMapFocus] = useState<"ALL" | "INCIDENT" | "USER" | "ROADBLOCK">("ALL");

  // Geospatial anchors (West Kameng NH-13 Corridor)
  const INCIDENT = { lat: 27.0842, lng: 92.5681, label: "TG-2048: NH-13 KM-42", status: "ACTIVE SLOPE FAILURE" };
  const ROADBLOCK = { lat: 27.0610, lng: 92.5510, label: "KM-38 Checkpost Closure", status: "CLOSED BY SDRF/POLICE" };
  const DETOUR = { lat: 27.1250, lng: 92.5120, label: "Rupa-Kalaktang Bypass", status: "OPEN (LIGHT VEHICLES ONLY)" };

  // Calculate distance from user to incident
  const dLat = (INCIDENT.lat - location.latitude) * 111;
  const dLng = (INCIDENT.lng - location.longitude) * 111 * Math.cos((INCIDENT.lat * Math.PI) / 180);
  const distanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;

  // Map coordinate transformation to 600x400 SVG canvas
  // Center roughly at 27.080, 92.550
  const centerLat = 27.080;
  const centerLng = 92.550;
  const scale = 1400; // pixels per degree

  const toSvgX = (lng: number) => 300 + (lng - centerLng) * scale;
  const toSvgY = (lat: number) => 200 - (lat - centerLat) * scale;

  // Scaled coordinates
  const incidentX = toSvgX(INCIDENT.lng);
  const incidentY = toSvgY(INCIDENT.lat);
  const roadblockX = toSvgX(ROADBLOCK.lng);
  const roadblockY = toSvgY(ROADBLOCK.lat);
  const detourX = toSvgX(DETOUR.lng);
  const detourY = toSvgY(DETOUR.lat);

  // User position clamped to viewport for safe visualization
  const rawUserX = toSvgX(location.longitude);
  const rawUserY = toSvgY(location.latitude);
  const userX = Math.max(30, Math.min(570, rawUserX));
  const userY = Math.max(30, Math.min(370, rawUserY));

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <IconLayers className="w-4 h-4" />
            </span>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase drop-shadow-sm">
              {t("impact_corridor_title")}
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {t("impact_corridor_subtitle")}
          </p>
        </div>

        {/* Focus Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-white/10 text-xs font-mono">
          <button
            onClick={() => setMapFocus("ALL")}
            className={`px-2.5 py-1 rounded transition-colors ${mapFocus === "ALL" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Corridor
          </button>
          <button
            onClick={() => setMapFocus("INCIDENT")}
            className={`px-2.5 py-1 rounded transition-colors ${mapFocus === "INCIDENT" ? "bg-red-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Danger Zone
          </button>
          <button
            onClick={() => setMapFocus("ROADBLOCK")}
            className={`px-2.5 py-1 rounded transition-colors ${mapFocus === "ROADBLOCK" ? "bg-amber-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Roadblock
          </button>
          <button
            onClick={() => {
              setMapFocus("USER");
              requestGps();
            }}
            className={`px-2.5 py-1 rounded transition-colors ${mapFocus === "USER" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            My Location
          </button>
        </div>
      </div>

      {/* Interactive Tactical Schematic Map */}
      <div className="mt-4 relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner flex items-center justify-center">
        {/* Topographic Background Grids & Contours */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* SVG Tactical Drawing */}
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Danger Zone Radial Gradient */}
            <radialGradient id="dangerGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </radialGradient>

            {/* Impact Buffer Radial Gradient */}
            <radialGradient id="impactGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </radialGradient>

            {/* User GPS Halo */}
            <radialGradient id="userHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* 15 km District Monitored Envelope */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="160"
            fill="none"
            stroke="#eab308"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-40 animate-[spin_60s_linear_infinite]"
          />
          <text
            x={incidentX - 150}
            y={incidentY - 145}
            fill="#eab308"
            fontSize="10"
            fontFamily="monospace"
            className="opacity-75 font-bold"
          >
            15 KM MONITORED DISASTER ENVELOPE (WEST KAMENG)
          </text>

          {/* 5 km Potential Impact Buffer */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="85"
            fill="url(#impactGradient)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <text
            x={incidentX + 65}
            y={incidentY - 60}
            fill="#fbbf24"
            fontSize="9"
            fontFamily="monospace"
            className="font-bold"
          >
            5.0 KM IMPACT BUFFER
          </text>

          {/* 2.5 km Immediate Hazard Runout Zone */}
          <circle
            cx={incidentX}
            cy={incidentY}
            r="45"
            fill="url(#dangerGradient)"
            stroke="#ef4444"
            strokeWidth="2"
          />

          {/* Arterial Highway Network: NH-13 Trans-Arunachal Highway */}
          <path
            d={`M 80,360 Q 220,290 ${roadblockX},${roadblockY} T ${incidentX},${incidentY} T 520,70`}
            fill="none"
            stroke="#64748b"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d={`M 80,360 Q 220,290 ${roadblockX},${roadblockY} T ${incidentX},${incidentY} T 520,70`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Blocked corridor segment on NH-13 */}
          <path
            d={`M ${roadblockX},${roadblockY} T ${incidentX},${incidentY}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="4"
            strokeDasharray="6 3"
          />
          <text
            x="130"
            y="330"
            fill="#cbd5e1"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            NH-13 TRANS-ARUNACHAL HIGHWAY
          </text>

          {/* Designated Detour Route: Rupa-Kalaktang Bypass */}
          <path
            d={`M 150,330 Q ${detourX},${detourY} 480,140`}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="5 3"
          />
          <text
            x={detourX - 50}
            y={detourY - 12}
            fill="#34d399"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            RUPA-KALAKTANG BYPASS (OPEN)
          </text>

          {/* Distance Vector from User Pin to Incident */}
          <line
            x1={userX}
            y1={userY}
            x2={incidentX}
            y2={incidentY}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <rect
            x={(userX + incidentX) / 2 - 28}
            y={(userY + incidentY) / 2 - 10}
            width="56"
            height="18"
            rx="4"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <text
            x={(userX + incidentX) / 2}
            y={(userY + incidentY) / 2 + 3}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            {distanceKm} km
          </text>

          {/* Roadblock Point: KM-38 Checkpost */}
          <g transform={`translate(${roadblockX}, ${roadblockY})`}>
            <circle r="14" fill="#dc2626" opacity="0.3" className="animate-ping" />
            <circle r="9" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <rect x="-65" y="14" width="130" height="26" rx="4" fill="#1e293b" stroke="#dc2626" strokeWidth="1" />
            <text x="0" y="26" fill="#f87171" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ROAD BLOCKED: KM-38
            </text>
            <text x="0" y="36" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
              SDRF Checkpost Alpha
            </text>
          </g>

          {/* Active Incident Epicenter TG-2048 */}
          <g transform={`translate(${incidentX}, ${incidentY})`}>
            <circle r="22" fill="#ef4444" opacity="0.4" className="animate-ping" />
            <circle r="12" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <polygon points="-4,-4 4,-4 0,5" fill="#ffffff" />
            <rect x="-80" y="-36" width="160" height="28" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" />
            <text x="0" y="-24" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              TG-2048: NH-13 KM-42
            </text>
            <text x="0" y="-12" fill="#e2e8f0" fontSize="8" fontFamily="monospace" textAnchor="middle">
              ACTIVE LANDSLIDE & DEBRIS SLIP
            </text>
          </g>

          {/* Citizen User Location Pin */}
          <g transform={`translate(${userX}, ${userY})`}>
            <circle r="24" fill="url(#userHalo)" className="animate-pulse" />
            <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle r="3" fill="#ffffff" />
            <rect x="-60" y="-32" width="120" height="24" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
            <text x="0" y="-21" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              YOU ARE HERE
            </text>
            <text x="0" y="-11" fill="#6ee7b7" fontSize="8" fontFamily="monospace" textAnchor="middle">
              {location.accuracyMeters ? `±${Math.round(location.accuracyMeters)}m accuracy` : "Corridor Preset"}
            </text>
          </g>
        </svg>

        {/* Real-time Map Compass Rose */}
        <div className="absolute top-3 right-3 bg-slate-900/80 border border-white/10 rounded-lg p-2 flex flex-col items-center shadow-lg font-mono text-[10px] text-slate-300">
          <span className="font-bold text-red-400">N ↑</span>
          <span className="text-[8px] text-slate-500">W • E</span>
          <span className="text-[8px] text-slate-500">S</span>
        </div>

        {/* Monitored Elevation & Slope Footnote */}
        <div className="absolute bottom-2 left-3 bg-slate-900/85 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-slate-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Catchment: Bhalukpong-Tenga Valley • Elevation: 1,480m MSL</span>
        </div>
      </div>

      {/* Map Legend */}
      <div className="mt-3.5 p-3 bg-slate-950/70 border border-white/10 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
          <span className="text-slate-200">Danger Zone (2.5 km)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
          <span className="text-slate-200">Impact Buffer (5.0 km)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-600 shrink-0 flex items-center justify-center text-[8px] text-white font-bold">⛔</span>
          <span className="text-slate-200">KM-38 Roadblock</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-200">Citizen Pin (You)</span>
        </div>
      </div>

      {/* Geotechnical Catchment Disclaimer per requirements */}
      <div className="mt-2.5 flex items-start gap-2 text-[11px] text-slate-400 leading-tight">
        <IconInfo className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <p>{t("corridor_warning_note")}</p>
      </div>
    </div>
  );
};
