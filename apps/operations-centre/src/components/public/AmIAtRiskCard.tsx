import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconAlertTriangle,
  IconMapPin,
  IconCrosshair,
  IconChevronRight,
  IconInfo,
  IconShieldCheck,
} from "../icons";

interface AmIAtRiskCardProps {
  onOpenWhyAlertModal: () => void;
  onViewImpactMap: () => void;
}

// Distance calculation using Haversine formula (km)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
  onViewImpactMap,
}) => {
  const { location, requestGps, selectPreset, presets } = useLocationService();
  const { t } = useCitizenI18n();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  // Active TG-2048 Incident Coordinates (NH-13 KM-42 Bhalukpong-Tenga)
  const INCIDENT_LAT = 27.0842;
  const INCIDENT_LNG = 92.5681;

  const distanceKm = calculateDistanceKm(
    location.latitude,
    location.longitude,
    INCIDENT_LAT,
    INCIDENT_LNG
  );

  // Determine localized exposure based on distance & permissions
  // Invariant: Never say "You are safe."
  let exposureKey = "nearby";
  let badgeColor = "bg-sky-600 text-white";
  let cardBorder = "border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20";
  let isDenied = location.status === "error" && location.permission === "denied";

  if (isDenied) {
    exposureKey = "unknown";
    badgeColor = "bg-slate-700 text-white";
    cardBorder = "border-slate-300 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/40";
  } else if (distanceKm <= 2.5) {
    exposureKey = "directly";
    badgeColor = "bg-red-600 text-white";
    cardBorder = "border-red-500/50 bg-red-50/50 dark:bg-red-950/30";
  } else if (distanceKm <= 5.0) {
    exposureKey = "potentially";
    badgeColor = "bg-amber-600 text-white";
    cardBorder = "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/25";
  } else if (distanceKm <= 10.0 && location.localityLabel?.includes("NH-13")) {
    exposureKey = "road";
    badgeColor = "bg-orange-600 text-white";
    cardBorder = "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/25";
  } else if (distanceKm > 15.0) {
    exposureKey = "outside";
    badgeColor = "bg-slate-600 text-white";
    cardBorder = "border-slate-300 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/40";
  }

  const badgeText = t(`risk_${exposureKey === "directly" ? "directly_affected" : exposureKey === "potentially" ? "potentially_affected" : exposureKey === "road" ? "road_impacted" : exposureKey === "outside" ? "outside_alert" : exposureKey === "unknown" ? "unknown" : "nearby_monitored"}_badge`);
  const headlineText = t(`risk_${exposureKey === "directly" ? "directly_affected" : exposureKey === "potentially" ? "potentially_affected" : exposureKey === "road" ? "road_impacted" : exposureKey === "outside" ? "outside_alert" : exposureKey === "unknown" ? "unknown" : "nearby_monitored"}_title`);
  const whyText = t(`risk_${exposureKey === "directly" ? "directly_affected" : exposureKey === "potentially" ? "potentially_affected" : exposureKey === "road" ? "road_impacted" : exposureKey === "outside" ? "outside_alert" : exposureKey === "unknown" ? "unknown" : "nearby_monitored"}_desc`);
  const actionText = t(`risk_${exposureKey === "directly" ? "directly_affected" : exposureKey === "potentially" ? "potentially_affected" : exposureKey === "road" ? "road_impacted" : exposureKey === "outside" ? "outside_alert" : exposureKey === "unknown" ? "unknown" : "nearby_monitored"}_action`);

  const updatedTime = new Date(location.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section aria-labelledby="am-i-at-risk-title" className="w-full">
      <div className={`rounded-2xl border p-4 sm:p-5 shadow-xl backdrop-blur-xl transition-colors ${cardBorder} text-slate-900 dark:text-white`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <IconAlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h2 id="am-i-at-risk-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                {t("am_i_at_risk_title")}
              </h2>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {t("risk_assessment_subtitle")}
              </div>
            </div>
          </div>

          {/* Exposure State Badge */}
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider self-start sm:self-auto shadow-sm ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        {/* Location Permission Blocked Notice */}
        {isDenied && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️ {t("location_denied_banner")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={requestGps}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 cursor-pointer"
              >
                {t("btn_try_again")}
              </button>
              <button
                type="button"
                onClick={() => setShowPresetPicker(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                {t("btn_select_ner_corridor")}
              </button>
            </div>
          </div>
        )}

        {/* Core Plain-Language Risk Answer */}
        <div className="mt-3 space-y-2">
          <h3 className="font-extrabold text-sm sm:text-base leading-snug">
            {headlineText}
          </h3>

          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            {whyText}
          </p>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-xs space-y-1 shadow-sm">
            <div className="font-bold text-red-600 dark:text-red-400">
              👉 {actionText}
            </div>
          </div>
        </div>

        {/* Distance & Telemetry Bar */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t("label_distance")}</div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
              {distanceKm} km
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t("label_accuracy")}</div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
              ±{Math.round(location.accuracyMeters || location.accuracy || 15)}m
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t("label_last_updated")}</div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
              {updatedTime}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t("label_data_status")}</div>
            <div className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
              {location.source === "DEVICE_GEOLOCATION" ? "LIVE GPS" : "APPROXIMATE"}
            </div>
          </div>
        </div>

        {/* Action Controls & Modal Links */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestGps}
              disabled={location.status === "requesting"}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <IconCrosshair className="w-3.5 h-3.5" />
              <span>{location.status === "requesting" ? t("location_detecting") : t("btn_use_my_location")}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPresetPicker((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              {t("btn_select_ner_corridor")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenWhyAlertModal}
              className="font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              {t("why_this_alert")}
            </button>

            <button
              type="button"
              onClick={onViewImpactMap}
              className="font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
            >
              <span>{t("view_danger_map")}</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* NER Corridor Preset Dropdown */}
        {showPresetPicker && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1.5 animate-in fade-in">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Select Monitored Regional Corridor:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    selectPreset(p.id);
                    setShowPresetPicker(false);
                  }}
                  className="p-2 rounded-lg text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-indigo-400 text-xs transition-colors cursor-pointer"
                >
                  <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.district}, {p.state}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
