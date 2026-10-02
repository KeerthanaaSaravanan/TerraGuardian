/**
 * Authoritative Spatial Citizen Hazard Map for TerraGuardian Safe.
 *
 * Implements real GIS mapping with Leaflet:
 * - Esri Himalayan World Topo & elevation contours
 * - True geodetic coordinate projections
 * - Distinct visual layers: Citizen (YOU), Predicted Critical Area, Observed Scarp, Roadblock (KM-38)
 * - Three clear modes: [ ALL HAZARDS ], [ PREDICTED RISK ], [ CURRENT INCIDENT ]
 * - Interactive tap callouts (Bottom Sheet)
 * - Interactive map pin placement ([ Select on Map ])
 * - Recenter & Fit Hazard extent controls
 * - Full multilingual support (t(...)) and Dark / Light theme awareness.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { useTheme } from "../../context/ThemeContext";
import {
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconLayers,
  IconInfo,
  IconCrosshair,
  IconMaximize2,
  IconX,
  IconCompass,
  IconChevronRight,
} from "../icons";

interface WhereIsDangerMapProps {
  onOpenWhyAlertModal?: () => void;
}

interface MapFeatureCallout {
  id: string;
  type: "USER" | "OBSERVED" | "PREDICTED" | "ROADBLOCK" | "BYPASS";
  title: string;
  subtitle: string;
  distanceKm: number | null;
  status: string;
  action: string;
  color: string;
}

// Geospatial Reference Anchors (West Kameng NH-13 Arterial Corridor)
const ANCHORS = {
  OBSERVED_INCIDENT: {
    lat: 27.0842,
    lng: 92.5681,
    id: "TG-2048",
    title: "TG-2048: NH-13 KM-42 Scarp",
    desc: "Active slope failure with rockfall runout across carriageway.",
  },
  ROADBLOCK: {
    lat: 27.0610,
    lng: 92.5510,
    id: "KM-38-BLOCK",
    title: "KM-38 Checkpost Roadblock",
    desc: "Traffic halted by administration. No vehicle transit toward KM-42.",
  },
  PREDICTED_BOUNDS: [
    [27.094, 92.558] as [number, number],
    [27.098, 92.576] as [number, number],
    [27.076, 92.582] as [number, number],
    [27.070, 92.562] as [number, number],
  ],
  OBSERVED_SCARP_POLYGON: [
    [27.0865, 92.5665] as [number, number],
    [27.0872, 92.5710] as [number, number],
    [27.0820, 92.5715] as [number, number],
    [27.0815, 92.5660] as [number, number],
  ],
  NH13_ROAD_POLYLINE: [
    [27.042, 92.535] as [number, number],
    [27.051, 92.542] as [number, number],
    [27.0610, 92.5510] as [number, number], // KM-38 Checkpost
    [27.0720, 92.5600] as [number, number],
    [27.0842, 92.5681] as [number, number], // KM-42 Landslide
    [27.0980, 92.5740] as [number, number],
    [27.1120, 92.5790] as [number, number],
    [27.1260, 92.5820] as [number, number],
  ],
  BYPASS_ROAD_POLYLINE: [
    [27.0610, 92.5510] as [number, number], // Detour begins before roadblock
    [27.0680, 92.5320] as [number, number],
    [27.0850, 92.5200] as [number, number],
    [27.1080, 92.5150] as [number, number],
    [27.1250, 92.5400] as [number, number],
    [27.1260, 92.5820] as [number, number], // Reconnects past KM-46
  ],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export const WhereIsDangerMap: React.FC<WhereIsDangerMapProps> = ({ onOpenWhyAlertModal }) => {
  const { location, setManualPin, requestGps } = useLocationService();
  const { t } = useCitizenI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layers
  const userLayerGroup = useRef<L.LayerGroup>(L.layerGroup());
  const observedLayerGroup = useRef<L.LayerGroup>(L.layerGroup());
  const predictedLayerGroup = useRef<L.LayerGroup>(L.layerGroup());
  const roadLayerGroup = useRef<L.LayerGroup>(L.layerGroup());

  // Interactive UI State
  const [mapMode, setMapMode] = useState<"ALL" | "PREDICTED" | "OBSERVED">("ALL");
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const [activeCallout, setActiveCallout] = useState<MapFeatureCallout | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Distance from user to active incident
  const distanceToIncident = haversineKm(
    location.latitude,
    location.longitude,
    ANCHORS.OBSERVED_INCIDENT.lat,
    ANCHORS.OBSERVED_INCIDENT.lng
  );

  // ── 1. Initialize Map Instance ──
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [27.080, 92.562],
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Add layer groups
    roadLayerGroup.current.addTo(map);
    predictedLayerGroup.current.addTo(map);
    observedLayerGroup.current.addTo(map);
    userLayerGroup.current.addTo(map);

    // Click handler for manual location pinning
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (isPinningMode) {
        setPendingPinCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isPinningMode]);

  // ── 2. Handle Basemap Tiles & Theme ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // OpenStreetMap provides continuous complete topographic and road coverage without any missing data tiles
    const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    const tile = L.tileLayer(tileUrl, {
      maxZoom: 18,
      className: isDark ? "leaflet-tile-tactical-dark" : "",
    });

    tile.addTo(map);
    tile.bringToBack();
    tileLayerRef.current = tile;
  }, [isDark]);

  // ── 3. Render Static Road Infrastructure Layers ──
  const renderRoadLayers = useCallback(() => {
    const group = roadLayerGroup.current;
    group.clearLayers();

    // NH-13 Base Line
    const nh13 = L.polyline(ANCHORS.NH13_ROAD_POLYLINE, {
      color: isDark ? "#475569" : "#64748b",
      weight: 6,
      opacity: 0.9,
      lineCap: "round",
    });
    group.addLayer(nh13);

    // Affected Section Highlight (KM-38 to KM-46)
    const affectedSection = L.polyline(
      ANCHORS.NH13_ROAD_POLYLINE.slice(2, 6),
      {
        color: "#ef4444",
        weight: 6,
        dashArray: "8, 6",
        opacity: 0.95,
      }
    );
    affectedSection.on("click", () => {
      setActiveCallout({
        id: "NH-13-AFFECTED",
        type: "ROADBLOCK",
        title: "NH-13: Restricted Corridor",
        subtitle: "KM-38 to KM-46 Section",
        distanceKm: distanceToIncident,
        status: "CLOSED TO TRANSIT",
        action: "Halt travel toward KM-38 checkpost. Divert via Rupa-Kalaktang bypass.",
        color: "red",
      });
    });
    group.addLayer(affectedSection);

    // Alternate Corridor (Rupa-Kalaktang Detour)
    const bypass = L.polyline(ANCHORS.BYPASS_ROAD_POLYLINE, {
      color: "#10b981",
      weight: 4,
      dashArray: "6, 6",
      opacity: 0.85,
    });
    bypass.on("click", () => {
      setActiveCallout({
        id: "BYPASS-ROUTE",
        type: "BYPASS",
        title: "Rupa-Kalaktang Alternate Bypass",
        subtitle: "Advisory detour for light vehicles",
        distanceKm: null,
        status: "PASSABLE WITH CAUTION",
        action: "Follow on-ground checkpost directives. Avoid heavy transport.",
        color: "emerald",
      });
    });
    group.addLayer(bypass);

    // KM-38 Checkpost Roadblock Marker
    const roadblockIcon = L.divIcon({
      className: "custom-roadblock-marker",
      html: `
        <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-600 text-white font-mono font-black text-[11px] shadow-lg border-2 border-white cursor-pointer select-none">
          <span>⛔</span>
          <span>KM-38</span>
        </div>
      `,
      iconSize: [80, 28],
      iconAnchor: [40, 14],
    });

    const roadblockMarker = L.marker([ANCHORS.ROADBLOCK.lat, ANCHORS.ROADBLOCK.lng], {
      icon: roadblockIcon,
    });
    roadblockMarker.on("click", () => {
      const dist = haversineKm(location.latitude, location.longitude, ANCHORS.ROADBLOCK.lat, ANCHORS.ROADBLOCK.lng);
      setActiveCallout({
        id: "ROADBLOCK-38",
        type: "ROADBLOCK",
        title: ANCHORS.ROADBLOCK.title,
        subtitle: "Police & SDRF Traffic Restriction Point",
        distanceKm: dist,
        status: "ACTIVE CHECKPOST",
        action: "Vehicles traveling toward Tawang/Dirang must hold or take the bypass.",
        color: "red",
      });
    });
    group.addLayer(roadblockMarker);
  }, [isDark, location.latitude, location.longitude, distanceToIncident]);

  // ── 4. Render Hazard Layers by Mode ──
  const renderHazardLayers = useCallback(() => {
    const obsGroup = observedLayerGroup.current;
    const predGroup = predictedLayerGroup.current;
    obsGroup.clearLayers();
    predGroup.clearLayers();

    const showObserved = mapMode === "ALL" || mapMode === "OBSERVED";
    const showPredicted = mapMode === "ALL" || mapMode === "PREDICTED";

    // A. PREDICTED CRITICAL AREA (Amber polygon + label)
    if (showPredicted) {
      const predPolygon = L.polygon(ANCHORS.PREDICTED_BOUNDS, {
        color: "#f59e0b",
        weight: 2,
        dashArray: "6, 6",
        fillColor: "#f59e0b",
        fillOpacity: 0.22,
      });

      predPolygon.on("click", () => {
        setActiveCallout({
          id: "PRED-AREA",
          type: "PREDICTED",
          title: "Predicted Critical Area",
          subtitle: "KM-40 to KM-44 Slope Sector",
          distanceKm: distanceToIncident,
          status: "ELEVATED RISK ZONE",
          action: "Model identifies high pore-pressure saturation and tension crack expansion.",
          color: "amber",
        });
      });
      predGroup.addLayer(predPolygon);

      // Predicted Area Center Pill
      const predIcon = L.divIcon({
        className: "custom-pred-marker",
        html: `
          <div class="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-bold text-[10px] uppercase tracking-wider border border-white/60 shadow-md flex items-center gap-1 cursor-pointer">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-950 animate-ping"></span>
            <span>${t("layer_predicted_area")}</span>
          </div>
        `,
        iconSize: [140, 22],
        iconAnchor: [70, 11],
      });
      const predMarker = L.marker([27.089, 92.569], { icon: predIcon });
      predMarker.on("click", () => {
        setActiveCallout({
          id: "PRED-AREA",
          type: "PREDICTED",
          title: "Predicted Critical Area",
          subtitle: "KM-40 to KM-44 Slope Sector",
          distanceKm: distanceToIncident,
          status: "ELEVATED RISK ZONE",
          action: "Model identifies high pore-pressure saturation and tension crack expansion.",
          color: "amber",
        });
      });
      predGroup.addLayer(predMarker);
    }

    // B. OBSERVED INCIDENT (Red polygon + Pulsing Landmark)
    if (showObserved) {
      const scarpPolygon = L.polygon(ANCHORS.OBSERVED_SCARP_POLYGON, {
        color: "#ef4444",
        weight: 2.5,
        fillColor: "#ef4444",
        fillOpacity: 0.45,
      });
      scarpPolygon.on("click", () => {
        setActiveCallout({
          id: "OBS-SCARP",
          type: "OBSERVED",
          title: ANCHORS.OBSERVED_INCIDENT.title,
          subtitle: "Active Slope Failure Runout (TG-2048)",
          distanceKm: distanceToIncident,
          status: "ACTIVE HAZARD",
          action: "Debris and rockfall active on road. Stay clear of the slope toe.",
          color: "red",
        });
      });
      obsGroup.addLayer(scarpPolygon);

      // Observed Landmark Icon
      const obsIcon = L.divIcon({
        className: "custom-obs-marker",
        html: `
          <div class="relative flex flex-col items-center cursor-pointer">
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600 text-white font-extrabold text-xs shadow-2xl border-2 border-white">
              <span class="h-2 w-2 rounded-full bg-white animate-ping"></span>
              <span>🔴 TG-2048</span>
            </div>
            <div class="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-red-600"></div>
          </div>
        `,
        iconSize: [110, 36],
        iconAnchor: [55, 36],
      });

      const obsMarker = L.marker([ANCHORS.OBSERVED_INCIDENT.lat, ANCHORS.OBSERVED_INCIDENT.lng], {
        icon: obsIcon,
      });
      obsMarker.on("click", () => {
        setActiveCallout({
          id: "OBS-SCARP",
          type: "OBSERVED",
          title: ANCHORS.OBSERVED_INCIDENT.title,
          subtitle: "Active Slope Failure Runout (TG-2048)",
          distanceKm: distanceToIncident,
          status: "ACTIVE HAZARD",
          action: "Debris and rockfall active on road. Stay clear of the slope toe.",
          color: "red",
        });
      });
      obsGroup.addLayer(obsMarker);
    }
  }, [mapMode, distanceToIncident, t]);

  // ── 5. Render Citizen Location (YOU) ──
  const renderUserLayer = useCallback(() => {
    const group = userLayerGroup.current;
    group.clearLayers();

    const lat = location.latitude;
    const lng = location.longitude;
    const accuracy = location.accuracyMeters || location.accuracy || 15;

    // Accuracy Circle
    const accuracyCircle = L.circle([lat, lng], {
      radius: Math.min(accuracy, 250),
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.15,
      weight: 1.5,
    });
    group.addLayer(accuracyCircle);

    // Citizen Pulse Marker
    const userIcon = L.divIcon({
      className: "custom-user-pin",
      html: `
        <div class="relative flex flex-col items-center cursor-pointer select-none">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xl border-2 border-white">
            <span class="h-2 w-2 rounded-full bg-white"></span>
            <span>${t("layer_you")} (±${Math.round(accuracy)}m)</span>
          </div>
          <div class="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-emerald-600"></div>
        </div>
      `,
      iconSize: [120, 36],
      iconAnchor: [60, 36],
    });

    const userMarker = L.marker([lat, lng], { icon: userIcon });
    userMarker.on("click", () => {
      setActiveCallout({
        id: "YOU",
        type: "USER",
        title: `${t("layer_you")} (Current Device)`,
        subtitle: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
        distanceKm: distanceToIncident,
        status: location.source === "DEVICE_GEOLOCATION" ? "LIVE GPS TELEMETRY" : "APPROXIMATE / MANUAL PIN",
        action: `${distanceToIncident} km from active slope failure at KM-42.`,
        color: "emerald",
      });
    });
    group.addLayer(userMarker);
  }, [location, distanceToIncident, t]);

  // ── 6. Effect to Re-render Layers on State Updates ──
  useEffect(() => {
    renderRoadLayers();
    renderHazardLayers();
    renderUserLayer();
  }, [renderRoadLayers, renderHazardLayers, renderUserLayer]);

  // ── 7. Map Navigation Controls ──
  const handleRecenterMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([location.latitude, location.longitude], 14, { duration: 0.8 });
  };

  const handleFitHazard = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([
      ...ANCHORS.PREDICTED_BOUNDS,
      [location.latitude, location.longitude],
      [ANCHORS.ROADBLOCK.lat, ANCHORS.ROADBLOCK.lng],
    ]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  };

  const handleConfirmPin = () => {
    if (pendingPinCoords) {
      setManualPin(pendingPinCoords.lat, pendingPinCoords.lng, "Manual Map Selection");
      setPendingPinCoords(null);
      setIsPinningMode(false);
    }
  };

  return (
    <section aria-labelledby="citizen-hazard-map-title" id="citizen-danger-map" className="w-full">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 sm:p-5 shadow-xl transition-colors text-slate-900 dark:text-white">
        
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                <IconLayers className="w-4 h-4" />
              </span>
              <h2 id="citizen-hazard-map-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                {t("danger_map_title")}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {t("danger_map_subtitle")}
            </p>
          </div>

          {/* 3 Clear Modes: ALL | PREDICTED | OBSERVED */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMapMode("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mapMode === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("map_mode_all")}
            </button>
            <button
              type="button"
              onClick={() => setMapMode("PREDICTED")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mapMode === "PREDICTED"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("map_mode_predicted")}
            </button>
            <button
              type="button"
              onClick={() => setMapMode("OBSERVED")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mapMode === "OBSERVED"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("map_mode_observed")}
            </button>
          </div>
        </div>

        {/* Map Canvas Container */}
        <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-100 dark:bg-slate-950">
          <div
            ref={mapContainerRef}
            className="w-full h-[380px] sm:h-[430px] z-0 focus:outline-none"
            aria-label="Interactive Hazard Map"
          />

          {/* Map Floating Tool Overlay: Compass & Quick Nav */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/15 text-[11px] font-bold shadow-md">
              <IconCompass className="w-3.5 h-3.5 text-indigo-500" />
              <span>N</span>
            </div>
          </div>

          {/* Floating Map Actions: Recenter, Fit Hazard, Drop Pin */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleRecenterMe}
              title={t("btn_recenter")}
              className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-white/15 shadow-md transition-all cursor-pointer"
            >
              <IconCrosshair className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitHazard}
              title={t("btn_fit_hazard")}
              className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/15 shadow-md transition-all cursor-pointer"
            >
              <IconMaximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPinningMode((prev) => !prev)}
              title={t("btn_select_map")}
              className={`p-2 rounded-xl border shadow-md transition-all cursor-pointer ${
                isPinningMode
                  ? "bg-cyan-600 text-white border-cyan-400"
                  : "bg-white/90 dark:bg-slate-900/90 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-white/15"
              }`}
            >
              <IconMapPin className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Manual Pin Dropping Confirmation Bar */}
          {isPinningMode && (
            <div className="absolute top-3 left-12 right-14 z-20 bg-cyan-950/90 border border-cyan-400 text-white rounded-xl p-2 px-3 shadow-2xl flex items-center justify-between text-xs backdrop-blur-md animate-in fade-in">
              <span className="font-semibold truncate">
                {pendingPinCoords
                  ? `Pin: ${pendingPinCoords.lat.toFixed(4)}°, ${pendingPinCoords.lng.toFixed(4)}°`
                  : "Tap anywhere on the map to set your location"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {pendingPinCoords && (
                  <button
                    onClick={handleConfirmPin}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsPinningMode(false);
                    setPendingPinCoords(null);
                  }}
                  className="p-1 text-slate-300 hover:text-white"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Feature Callout (Slide-up Bottom Sheet on Tap) */}
          {activeCallout && (
            <div className="absolute bottom-2 left-2 right-2 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-300 dark:border-white/20 rounded-xl p-3 sm:p-4 shadow-2xl animate-in slide-in-from-bottom duration-150">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {activeCallout.status}
                    </span>
                    {activeCallout.distanceKm !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold">
                        {activeCallout.distanceKm} km {t("label_distance")}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {activeCallout.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {activeCallout.subtitle}
                  </p>
                </div>
                <button
                  onClick={() => setActiveCallout(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200">
                👉 {activeCallout.action}
              </div>
            </div>
          )}
        </div>

        {/* Clean, Large Accessible Map Legend */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {t("map_legend_title")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t("legend_you")}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
              <span className="h-3 w-3 rounded-full bg-red-600 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t("legend_observed")}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
              <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t("legend_predicted")}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
              <span className="h-3 w-3 rounded-full bg-yellow-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t("legend_impact")}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
              <span className="text-xs">⛔</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t("legend_roadblock")}</span>
            </div>
          </div>
        </div>

        {/* Expandable "What do these areas mean?" */}
        <div className="mt-3 pt-2">
          <button
            type="button"
            onClick={() => setShowExplanation((prev) => !prev)}
            className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t("map_explain_title")}</span>
            <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${showExplanation ? "rotate-90" : ""}`} />
          </button>

          {showExplanation && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs space-y-2 text-slate-700 dark:text-slate-300 animate-in fade-in">
              <div>
                <strong className="text-amber-600 dark:text-amber-400">{t("layer_predicted_area")}:</strong>{" "}
                {t("map_explain_predicted")}
              </div>
              <div>
                <strong className="text-red-600 dark:text-red-400">{t("layer_observed_incident")}:</strong>{" "}
                {t("map_explain_observed")}
              </div>
              <div>
                <strong className="text-emerald-600 dark:text-emerald-400">{t("layer_you")}:</strong>{" "}
                {t("map_explain_you")}
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                PROVENANCE: {t("map_provenance")}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
