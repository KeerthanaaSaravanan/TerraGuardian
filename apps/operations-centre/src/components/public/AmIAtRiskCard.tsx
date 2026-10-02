import React from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconAlertTriangle,
  IconMapPin,
  IconCrosshair,
  IconShieldCheck,
  IconPhoneCall,
  IconCamera,
  IconInfo,
  IconActivity,
  IconCompass,
} from "../icons";

interface AmIAtRiskCardProps {
  onOpenWhyAlertModal: () => void;
  onOpenImSafeModal: () => void;
  onOpenSOSModal: () => void;
  onStartReport: () => void;
  onViewImpactMap: () => void;
}

// Distance calculation using Haversine formula (km)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const AmIAtRiskCard: React.FC<AmIAtRiskCardProps> = ({
  onOpenWhyAlertModal,
  onOpenImSafeModal,
  onOpenSOSModal,
  onStartReport,
  onViewImpactMap,
}) => {
  const { location, requestGps, selectPreset, presets } = useLocationService();
  const { t } = useCitizenI18n();

  // Active TG-2048 Incident Coordinates (NH-13 KM-42 Bhalukpong-Tenga)
  const INCIDENT_LAT = 27.0842;
  const INCIDENT_LNG = 92.5681;

  const distanceKm = calculateDistanceKm(
    location.latitude,
    location.longitude,
    INCIDENT_LAT,
    INCIDENT_LNG
  );

  // Exposure determination
  let exposureBadge = {
    level: "CRITICAL",
    title: t("within_alert_zone_title"),
    subtitle: t("within_alert_zone_body"),
    bgColor: "bg-red-500/15 border-red-500/40 text-red-300",
    badgeColor: "bg-red-600 text-white",
    pulse: true,
  };

  if (distanceKm <= 2.5) {
    exposureBadge = {
      level: "CRITICAL",
      title: "INSIDE IMMEDIATE HAZARD RUNOUT ZONE (0 - 2.5 KM)",
      subtitle: "High probability of active slope deformation, debris flow, or rockfall on roadway. Cease transit immediately.",
      bgColor: "bg-red-500/20 border-red-500/50 text-red-200",
      badgeColor: "bg-red-600 text-white",
      pulse: true,
    };
  } else if (distanceKm <= 5.0) {
    exposureBadge = {
      level: "POTENTIAL",
      title: "INSIDE POTENTIAL IMPACT CORRIDOR (2.5 - 5.0 KM)",
      subtitle: "Adjacent drainage channels and cut slopes saturated. Roadway may be blocked ahead at KM-38 checkpost.",
      bgColor: "bg-amber-500/20 border-amber-500/40 text-amber-200",
      badgeColor: "bg-amber-600 text-white",
      pulse: false,
    };
  } else if (distanceKm <= 15.0) {
    exposureBadge = {
      level: "MONITORED",
      title: "WITHIN 15 KM MONITORED DISASTER ENVELOPE",
      subtitle: "Regional geotechnical sensors active. Heavy rainfall active across West Kameng district.",
      bgColor: "bg-yellow-500/15 border-yellow-500/30 text-yellow-200",
      badgeColor: "bg-yellow-600 text-white",
      pulse: false,
    };
  } else {
    exposureBadge = {
      level: "STANDBY",
      title: "OUTSIDE IMMEDIATE DISASTER CORRIDOR (> 15 KM)",
      subtitle: "No active hazard detected at your coordinates. Monsoon vigilance advised for all mountain travel.",
      bgColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
      badgeColor: "bg-emerald-600 text-white",
      pulse: false,
    };
  }

  return (
    <div className="w-full bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl text-white">
      {/* Title Header with AM I AT RISK? Question */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400">
              <IconAlertTriangle className="w-4 h-4 animate-bounce" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase drop-shadow-md">
              {t("btn_am_i_at_risk")}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time geospatial hazard evaluation for your current position along North Eastern Region corridors.
          </p>
        </div>

        {/* Location Controls: GPS Toggle & Preset Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => requestGps()}
            disabled={location.status === "acquiring" || location.status === "requesting"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer border border-emerald-400/40 disabled:opacity-50"
            title="Acquire live GPS satellite fix from device"
          >
            <IconCrosshair className={`w-3.5 h-3.5 ${location.status === "acquiring" ? "animate-spin" : ""}`} />
            <span>{location.status === "acquiring" ? "Acquiring GPS..." : t("btn_use_location")}</span>
          </button>

          {/* Quick Preset Selector for NER Scenarios */}
          <div className="relative">
            <select
              aria-label="Simulate NER Hazard Corridor"
              onChange={(e) => selectPreset(e.target.value)}
              value={location.localityLabel ? presets.find(p => p.name === location.localityLabel)?.id || "" : "tg-2048-km42"}
              className="bg-slate-800/90 border border-white/20 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400 font-mono cursor-pointer"
            >
              <option value="" disabled>Simulate Corridor...</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.state})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exposure Status Banner */}
      <div className={`mt-4 rounded-xl border p-4 backdrop-blur-md ${exposureBadge.bgColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase font-mono ${exposureBadge.badgeColor}`}>
              {exposureBadge.level}
            </span>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              {exposureBadge.title}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
            <IconCompass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Distance to TG-2048: <strong className="text-white font-bold">{distanceKm} km</strong></span>
          </div>
        </div>
        <p className="text-xs text-slate-200 mt-2 leading-relaxed">
          {exposureBadge.subtitle}
        </p>
      </div>

      {/* GPS Telemetry & Accuracy Metric */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
        <div className="bg-slate-800/60 border border-white/10 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
            Coordinates:
          </span>
          <span className="font-bold text-slate-100">
            {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
          </span>
        </div>

        <div className="bg-slate-800/60 border border-white/10 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <IconCrosshair className="w-3.5 h-3.5 text-cyan-400" />
            Accuracy:
          </span>
          <span className="font-bold text-emerald-300">
            {location.accuracyMeters ? `±${Math.round(location.accuracyMeters)} m` : "Preset Baseline"}
          </span>
        </div>

        <div className="bg-slate-800/60 border border-white/10 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <IconShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Source:
          </span>
          <span className="font-bold text-slate-200 truncate max-w-[120px]">
            {location.source === "DEVICE_GEOLOCATION" ? "Live Device GPS" : location.localityLabel || "Corridor Preset"}
          </span>
        </div>
      </div>

      {/* Invariant Truth Metrics Grid */}
      <div className="mt-4 p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <IconActivity className="w-3 h-3 text-cyan-400" />
            Active Incident Twin Invariants (TG-2048)
          </span>
          <button
            onClick={onOpenWhyAlertModal}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <IconInfo className="w-3 h-3" />
            <span>Why am I receiving this alert?</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-red-500/30">
            <div className="text-[10px] text-slate-400 font-mono">HAZARD RISK</div>
            <div className="font-black text-red-400 text-sm mt-0.5">HIGH (86/100)</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">Saturation 184mm</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-emerald-500/30">
            <div className="text-[10px] text-slate-400 font-mono">CONFIDENCE</div>
            <div className="font-black text-emerald-400 text-sm mt-0.5">HIGH (94%)</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">SDRF Field Verified</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-amber-500/30">
            <div className="text-[10px] text-slate-400 font-mono">PRIORITY</div>
            <div className="font-black text-amber-400 text-sm mt-0.5">CRITICAL (P1)</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">Sole Arterial Lifeline</div>
          </div>
        </div>
      </div>

      {/* Action Buttons: I'm Safe | Need Help | Report Landslide | View Corridor */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={onOpenImSafeModal}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3 px-3 rounded-xl shadow-lg shadow-emerald-950/40 text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border border-emerald-400/40"
        >
          <IconShieldCheck className="w-5 h-5 text-emerald-200" />
          <span>{t("btn_im_safe")}</span>
        </button>

        <button
          onClick={onOpenSOSModal}
          className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold py-3 px-3 rounded-xl shadow-lg shadow-red-950/40 text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border border-red-400/40 animate-pulse"
        >
          <IconPhoneCall className="w-5 h-5 text-red-200" />
          <span>{t("btn_need_help")}</span>
        </button>

        <button
          onClick={onStartReport}
          className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold py-3 px-3 rounded-xl shadow-lg shadow-amber-950/40 text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border border-amber-400/40"
        >
          <IconCamera className="w-5 h-5 text-amber-200" />
          <span>{t("btn_report_landslide")}</span>
        </button>

        <button
          onClick={onViewImpactMap}
          className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold py-3 px-3 rounded-xl shadow-lg text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
        >
          <IconMapPin className="w-5 h-5 text-cyan-400" />
          <span>{t("btn_view_map")}</span>
        </button>
      </div>
    </div>
  );
};
