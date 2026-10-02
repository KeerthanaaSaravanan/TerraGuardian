import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconAlertTriangle,
  IconMapPin,
  IconCrosshair,
  IconChevronRight,
  IconInfo,
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

  // Active TG-2048 Incident Coordinates (NH-13 KM-42 Bhalukpong-Tenga)
  const INCIDENT_LAT = 27.0842;
  const INCIDENT_LNG = 92.5681;

  const distanceKm = calculateDistanceKm(
    location.latitude,
    location.longitude,
    INCIDENT_LAT,
    INCIDENT_LNG
  );

  // Plain-Language Exposure Determination adhering strictly to invariant (never say "you are safe")
  let exposure = {
    badge: "DIRECTLY_AFFECTED",
    badgeColor: "bg-red-600 text-white",
    bgColor: "bg-red-950/40 border-red-500/40",
    headline: "Active landslide incident reported in your immediate vicinity.",
    why: "Your location is within the immediate active debris runout and tension crack zone.",
    affectedRoad: "NH-13 KM-38 to KM-42 Corridor",
    action: "Do not travel toward this sector. Cease transit and remain in stable shelter.",
    isAffected: true,
  };

  if (location.status === "error" && location.permission === "denied") {
    exposure = {
      badge: "UNKNOWN",
      badgeColor: "bg-slate-700 text-slate-200",
      bgColor: "bg-slate-800/40 border-white/10",
      headline: "Location permission required to assess personal risk.",
      why: "Device coordinates could not be retrieved because location permission was denied.",
      affectedRoad: "Location required to assess road exposure",
      action: "Enable location in browser settings or select an NER corridor manually.",
      isAffected: false,
    };
  } else if (distanceKm <= 2.5) {
    exposure = {
      badge: "DIRECTLY_AFFECTED",
      badgeColor: "bg-red-600 text-white",
      bgColor: "bg-red-950/40 border-red-500/40",
      headline: "Active landslide runout and rockfall reported near your current location.",
      why: "Your position is within 2.5 km of the active slope failure at KM-42.",
      affectedRoad: "NH-13 KM-38 to KM-42 Corridor",
      action: "Do not enter this corridor. Move to stable ground away from steep hillside cuts.",
      isAffected: true,
    };
  } else if (distanceKm <= 5.0) {
    exposure = {
      badge: "POTENTIALLY_AFFECTED",
      badgeColor: "bg-amber-600 text-white",
      bgColor: "bg-amber-950/30 border-amber-500/40",
      headline: "A landslide incident has been reported near your current corridor.",
      why: "Your position is within the 5 km potential impact buffer of the KM-42 scarp.",
      affectedRoad: "NH-13 KM-38 Checkpost closure",
      action: "Avoid the affected corridor. Route traffic via Rupa bypass if traveling.",
      isAffected: true,
    };
  } else if (distanceKm <= 10.0 && location.localityLabel?.includes("NH-13")) {
    exposure = {
      badge: "ROAD_IMPACTED",
      badgeColor: "bg-orange-600 text-white",
      bgColor: "bg-orange-950/30 border-orange-500/40",
      headline: "Your transit route approaches the restricted NH-13 sector.",
      why: "You are traveling along the Trans-Arunachal corridor toward the KM-38 police checkpost.",
      affectedRoad: "NH-13 restricted at KM-38 checkpost",
      action: "Do not attempt to cross KM-38 checkpost. Divert via Rupa bypass.",
      isAffected: true,
    };
  } else if (distanceKm <= 15.0) {
    exposure = {
      badge: "NEARBY_MONITORED",
      badgeColor: "bg-yellow-600 text-slate-950 font-bold",
      bgColor: "bg-yellow-950/20 border-yellow-500/30",
      headline: "Your position is within the 15 km monitored district weather envelope.",
      why: "Regional monsoon saturation and hillside runoff are active across this valley basin.",
      affectedRoad: "NH-13 restricted at KM-38",
      action: "Maintain caution during mountain transit. Monitor local emergency alerts.",
      isAffected: true,
    };
  } else {
    // INVARIANT ENFORCED: Never say "You are safe"
    exposure = {
      badge: "OUTSIDE_CURRENT_ALERT_AREA",
      badgeColor: "bg-slate-700 text-slate-200",
      bgColor: "bg-slate-800/40 border-white/10",
      headline: "No direct impact is currently identified at your reported location.",
      why: "Your reported position is outside the active 15 km West Kameng alert envelope.",
      affectedRoad: "Regional highways normal",
      action: "Anticipate hill monsoon changes. Confirm road status before travel.",
      isAffected: false,
    };
  }

  const isLiveGps = location.source === "DEVICE_GEOLOCATION" && location.accuracy !== null;
  const isDenied = location.permission === "denied";

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
      {/* Location Bar & Accuracy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${isLiveGps ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"}`}>
            <IconMapPin className="w-4 h-4" />
          </span>
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>{isLiveGps ? "LIVE DEVICE LOCATION" : location.source === "MANUAL_PIN" ? "SELECTED PIN" : "CORRIDOR APPROXIMATION"}</span>
              {isLiveGps && location.accuracy ? (
                <span className="text-emerald-400 font-mono text-[11px]">
                  (±{Math.round(location.accuracy)}m)
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">(Manual/Preset)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E • Updated {new Date(location.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* GPS Refresh & Quick Preset Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => requestGps()}
            disabled={location.status === "requesting"}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <IconCrosshair className={`w-3.5 h-3.5 text-cyan-400 ${location.status === "requesting" ? "animate-spin" : ""}`} />
            <span>{location.status === "requesting" ? "Locating..." : "Use My Location"}</span>
          </button>

          <select
            aria-label="Corridor preset"
            onChange={(e) => selectPreset(e.target.value)}
            value={location.localityLabel ? presets.find(p => p.name === location.localityLabel)?.id || "" : "tg-2048-km42"}
            className="bg-slate-800 border border-white/15 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[150px] sm:max-w-none truncate"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LOCATION ACCESS REQUIRED BANNER (When Permission Denied) */}
      {isDenied && (
        <div className="mt-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <IconAlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>LOCATION ACCESS REQUIRED</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            TerraGuardian needs your device location to determine whether the current alert may affect you.
          </p>
          <div className="text-[11px] text-slate-400">
            Browser permission is currently denied. To allow live GPS, open your browser's site settings and set Location to "Allow".
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => requestGps()}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-sm"
            >
              ENABLE LOCATION
            </button>
            <button
              type="button"
              onClick={() => requestGps()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-white/15 cursor-pointer"
            >
              RETRY
            </button>
            <button
              type="button"
              onClick={() => selectPreset("tg-2048-km42")}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-xs border border-white/15 cursor-pointer"
            >
              SELECT LOCATION MANUALLY
            </button>
          </div>
        </div>
      )}

      {/* AM I AT RISK? Result Card */}
      <div className={`mt-3.5 p-4 rounded-xl border ${exposure.bgColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${exposure.badgeColor}`}>
              {exposure.badge}
            </span>
            <span className="font-extrabold text-sm sm:text-base text-white">
              {exposure.headline}
            </span>
          </div>
          <span className="text-[11px] text-slate-300 font-mono">
            {distanceKm} km from incident
          </span>
        </div>

        <div className="text-xs text-slate-200 space-y-1 mt-2">
          <div>
            <strong className="text-slate-100">Affected corridor:</strong> {exposure.affectedRoad}
          </div>
          <div>
            <strong className="text-amber-300">What to do:</strong> {exposure.action}
          </div>
        </div>

        {/* Action Links */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onViewImpactMap}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Danger Area</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenWhyAlertModal}
              className="text-xs font-medium text-slate-300 hover:text-white underline cursor-pointer"
            >
              Why this result?
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <IconInfo className="w-3 h-3" />
            <span>{showTechnicalDetails ? "Hide technical data" : "Technical details"}</span>
          </button>
        </div>

        {/* Progressive Disclosure: Technical Invariants (Collapsed by default) */}
        {showTechnicalDetails && (
          <div className="mt-3 p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-2 animate-in fade-in duration-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
              Operational Incident Invariants (TG-2048)
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-2 rounded border border-white/10">
                <div className="text-[10px] text-slate-400">Risk Assessment</div>
                <div className="font-bold text-red-400 mt-0.5">High (86/100)</div>
                <div className="text-[9px] text-slate-400">Rain 184mm</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-white/10">
                <div className="text-[10px] text-slate-400">Confidence</div>
                <div className="font-bold text-emerald-400 mt-0.5">High (94%)</div>
                <div className="text-[9px] text-slate-400">SDRF Verified</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-white/10">
                <div className="text-[10px] text-slate-400">Priority</div>
                <div className="font-bold text-amber-400 mt-0.5">Critical (P1)</div>
                <div className="text-[9px] text-slate-400">Lifeline Corridor</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
