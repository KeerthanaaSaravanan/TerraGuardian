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
    badge: "DIRECTLY AFFECTED",
    badgeColor: "bg-red-600 text-white",
    bgColor: "bg-red-950/40 border-red-500/40",
    headline: "Active landslide incident reported in your immediate vicinity.",
    affectedRoad: "NH-13 KM-38 to KM-42 Corridor",
    action: "Do not travel toward this sector. Cease transit and remain in stable shelter.",
    isAffected: true,
  };

  if (location.status === "error" || (location.latitude === 0 && location.longitude === 0)) {
    exposure = {
      badge: "UNKNOWN",
      badgeColor: "bg-slate-700 text-slate-200",
      bgColor: "bg-slate-800/40 border-white/10",
      headline: "Location unavailable — unable to determine exposure.",
      affectedRoad: "Corridor selection required",
      action: "Enable GPS location access or choose your corridor section from the menu.",
      isAffected: false,
    };
  } else if (distanceKm <= 2.5) {
    exposure = {
      badge: "DIRECTLY AFFECTED",
      badgeColor: "bg-red-600 text-white",
      bgColor: "bg-red-950/40 border-red-500/40",
      headline: "Active landslide runout and rockfall reported near your current location.",
      affectedRoad: "NH-13 KM-38 to KM-42 Corridor",
      action: "Do not enter this corridor. Move to stable ground away from steep hillside cuts.",
      isAffected: true,
    };
  } else if (distanceKm <= 5.0) {
    exposure = {
      badge: "POTENTIALLY AFFECTED",
      badgeColor: "bg-amber-600 text-white",
      bgColor: "bg-amber-950/30 border-amber-500/40",
      headline: "A landslide incident has been reported near your current corridor.",
      affectedRoad: "NH-13 KM-38 Checkpost closure",
      action: "Avoid the affected corridor. Route traffic via Rupa bypass if traveling.",
      isAffected: true,
    };
  } else if (distanceKm <= 15.0) {
    exposure = {
      badge: "NEARBY / MONITORED",
      badgeColor: "bg-yellow-600 text-slate-950 font-bold",
      bgColor: "bg-yellow-950/20 border-yellow-500/30",
      headline: "Your position is within the 15 km monitored district weather envelope.",
      affectedRoad: "NH-13 restricted at KM-38",
      action: "Maintain caution during mountain transit. Monitor local emergency alerts.",
      isAffected: true,
    };
  } else {
    // INVARIANT ENFORCED: Never say "You are safe"
    exposure = {
      badge: "OUTSIDE CURRENT ALERT AREA",
      badgeColor: "bg-slate-700 text-slate-200",
      bgColor: "bg-slate-800/40 border-white/10",
      headline: "No direct impact is currently identified at your reported location.",
      affectedRoad: "Regional highways normal",
      action: "Anticipate hill monsoon changes. Confirm road status before travel.",
      isAffected: false,
    };
  }

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
      {/* Location Bar & Accuracy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <IconMapPin className="w-4 h-4" />
          </span>
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Location available</span>
              <span className="text-emerald-400 font-mono text-[11px]">
                {location.accuracyMeters ? `(±${Math.round(location.accuracyMeters)} m)` : "(Preset)"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
            </div>
          </div>
        </div>

        {/* GPS Refresh & Quick Preset Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => requestGps()}
            disabled={location.status === "acquiring"}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <IconCrosshair className={`w-3.5 h-3.5 text-cyan-400 ${location.status === "acquiring" ? "animate-spin" : ""}`} />
            <span>{location.status === "acquiring" ? "Locating..." : "Refresh GPS"}</span>
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
