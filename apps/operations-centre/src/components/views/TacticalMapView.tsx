/**
 * Tactical Map View for TerraGuardian Operations Centre.
 *
 * Dedicated Geospatial Intelligence Workspace integrating:
 * - Real EPSG:4326 WGS 84 geodetic vector layers via Leaflet.
 * - Authoritative backend layers: Administrative Boundary, NH-13 Lifeline Highway, Settlements, Facilities.
 * - Live Spatial Incident Twins with risk/confidence/priority state.
 * - Interactive Spatial Association Evaluation query engine (POST /api/v1/gis/spatial-association).
 * - Truthful provenance disclosure (REAL_HISTORICAL, REPLAY, SYNTHETIC).
 */

import React, { useState } from "react";
import { InteractiveMap } from "../InteractiveMap";
import { apiClient, ApiError } from "../../services/apiClient";
import type { SpatialAssociationResult } from "../../types/gis";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import {
  IconMapPin,
  IconLayers,
  IconAlertTriangle,
  IconShieldCheck,
  IconActivity,
  IconRefreshCw,
  IconArrowRight,
} from "../icons";

export const TacticalMapView: React.FC = () => {
  const { setActiveNavTab, selectIncident, selectedIncidentCode, backendIncidentId } = useDemoScenario();

  // Spatial Association Test State
  const [evalLat, setEvalLat] = useState<string>("27.0842");
  const [evalLng, setEvalLng] = useState<string>("92.5681");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [associationResult, setAssociationResult] = useState<SpatialAssociationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const handleEvaluateAssociation = async () => {
    const lat = parseFloat(evalLat);
    const lng = parseFloat(evalLng);
    if (isNaN(lat) || isNaN(lng)) {
      setEvalError("Please enter valid numeric coordinates.");
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    try {
      const res = await apiClient.getGISSpatialAssociation({ latitude: lat, longitude: lng, incident_id: backendIncidentId || undefined });
      setAssociationResult(res);
    } catch (err) {
      setEvalError(err instanceof ApiError ? err.detail : "Failed to calculate spatial association.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Whole-NER Geographic State & Analytical Lens Selection
  const [selectedState, setSelectedState] = useState<string>("ARUNACHAL_PRADESH");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("WEST_KAMENG");
  const [activeLens, setActiveLens] = useState<"RISK" | "CONFIDENCE" | "COVERAGE" | "CONSEQUENCE" | "PRIORITY">("RISK");

  return (
    <div className="flex flex-col gap-3 p-3 lg:p-4 w-full max-w-[1700px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Advisory Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <IconLayers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>TACTICAL GEOSPATIAL INTELLIGENCE COMMAND</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 font-bold">
                EPSG:4326
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              West Kameng District • NH-13 Bhalukpong-Tenga Lifeline Corridor • Rendered Vector Geometries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="bg-slate-100 dark:bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold">
            PROVENANCE: GEOGRAPHICALLY GROUNDED FIXTURES & HISTORICAL REPLAY
          </span>
        </div>
      </div>

      {/* Whole-NER Geographic Hierarchy & Analytical Lens Bar (Phase 0 North Star Section 0.7 & 0.9) */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3.5 rounded-xl shadow-sm flex flex-col gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-bold uppercase">GEOGRAPHIC SCOPE:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold">
              INDIA
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold">
              NORTH EASTERN REGION (8 STATES)
            </span>
            <span className="text-slate-400">→</span>
            <select
              aria-label="State Selector"
              value={selectedState}
              onChange={(e) => {
                const s = e.target.value;
                setSelectedState(s);
                if (s === "ARUNACHAL_PRADESH") setSelectedDistrict("WEST_KAMENG");
                else setSelectedDistrict("REGIONAL_SECTOR");
              }}
              className="bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded px-2 py-0.5 font-bold text-slate-900 dark:text-white"
            >
              <option value="ARUNACHAL_PRADESH">Arunachal Pradesh (Active Deep Corridor)</option>
              <option value="ASSAM">Assam</option>
              <option value="MANIPUR">Manipur</option>
              <option value="MEGHALAYA">Meghalaya</option>
              <option value="MIZORAM">Mizoram</option>
              <option value="NAGALAND">Nagaland</option>
              <option value="SIKKIM">Sikkim</option>
              <option value="TRIPURA">Tripura</option>
            </select>
            <span className="text-slate-400">→</span>
            <select
              aria-label="District Selector"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded px-2 py-0.5 font-bold text-slate-900 dark:text-white"
            >
              {selectedState === "ARUNACHAL_PRADESH" ? (
                <>
                  <option value="WEST_KAMENG">West Kameng (Deep Real-Data Corridor)</option>
                  <option value="TAWANG">Tawang (No Live Feed)</option>
                  <option value="SUBANSIRI">Lower Subansiri (No Live Feed)</option>
                  <option value="EAST_SIANG">East Siang (No Live Feed)</option>
                </>
              ) : selectedState === "SIKKIM" ? (
                <>
                  <option value="EAST_SIKKIM">East Sikkim / Gangtok (Historical Catalog Available)</option>
                  <option value="NORTH_SIKKIM">North Sikkim / Mangan (No Live Feed)</option>
                </>
              ) : (
                <option value="REGIONAL_SECTOR">{selectedState.replace("_", " ")} Regional Sector (No Live Feed)</option>
              )}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
            {selectedState === "ARUNACHAL_PRADESH" && selectedDistrict === "WEST_KAMENG" ? (
              <span>Active Corridor: <strong className="text-emerald-600 dark:text-emerald-400">NH-13 Bhalukpong-Tenga (KM-38 to KM-52)</strong></span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold">SOURCE AVAILABLE / ADAPTER NOT CONNECTED (NO LIVE FEED)</span>
            )}
          </div>
        </div>

        {/* State Coverage Alert Banner if outside West Kameng */}
        {selectedState !== "ARUNACHAL_PRADESH" && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-3 py-2 rounded-lg text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>GEOGRAPHIC SCOPE DISCLOSURE:</strong> {selectedState.replace("_", " ")} administrative boundary is modeled in spatial catalog. External telemetry adapters are not connected for this sector. Deep demonstration substrate remains in West Kameng, Arunachal Pradesh.
              </span>
            </div>
            <button
              onClick={() => { setSelectedState("ARUNACHAL_PRADESH"); setSelectedDistrict("WEST_KAMENG"); }}
              className="text-xs underline font-bold hover:text-amber-950 dark:hover:text-amber-100 ml-3 flex-shrink-0 cursor-pointer"
            >
              Switch to West Kameng Corridor
            </button>
          </div>
        )}

        {/* 5 Analytical Lenses (Risk ≠ Confidence ≠ Coverage ≠ Consequence ≠ Priority) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-bold uppercase mr-1">ANALYTICAL LENS:</span>
            <button
              onClick={() => setActiveLens("RISK")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeLens === "RISK"
                  ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-400 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
              }`}
              title="Where is the hazard? Displays slope shear stress and dynamic rainfall trigger."
            >
              1. RISK (Where is the hazard?)
            </button>
            <button
              onClick={() => setActiveLens("CONFIDENCE")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeLens === "CONFIDENCE"
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-400 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
              }`}
              title="How confident are we? Displays multi-sensor concordance and field verification."
            >
              2. CONFIDENCE (How certain are we?)
            </button>
            <button
              onClick={() => setActiveLens("COVERAGE")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeLens === "COVERAGE"
                  ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-400 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
              }`}
              title="How much evidence coverage exists? Displays spatial telemetry gaps."
            >
              3. COVERAGE (What data exists?)
            </button>
            <button
              onClick={() => setActiveLens("CONSEQUENCE")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeLens === "CONSEQUENCE"
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-400 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
              }`}
              title="What is exposed? Displays settlements, roads, bridges, and hospitals."
            >
              4. CONSEQUENCE (What is exposed?)
            </button>
            <button
              onClick={() => setActiveLens("PRIORITY")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeLens === "PRIORITY"
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
              }`}
              title="What is the operational priority? Consequence-aware operational urgency."
            >
              5. PRIORITY (What comes first?)
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {activeLens === "RISK" && "Active Lens: Physical hazard shear stress & rainfall triggers"}
            {activeLens === "CONFIDENCE" && "Active Lens: Multi-source agreement & evidential certainty"}
            {activeLens === "COVERAGE" && "Active Lens: Spatial telemetry coverage & sensor gaps"}
            {activeLens === "CONSEQUENCE" && "Active Lens: Exposed settlements & lifeline infrastructure"}
            {activeLens === "PRIORITY" && "Active Lens: Consequence-aware operational urgency (P1 to P4)"}
          </div>
        </div>
      </div>

      {/* Main Map + GIS Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[360px]">
        {/* Left Column: Full Interactive Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-w-0 min-h-[360px] h-[calc(100vh-420px)] max-h-[620px]">
          <InteractiveMap detailedView={false} className="flex-1 w-full h-full shadow-md" />
        </div>

        {/* Right Column: Spatial Intelligence Tools & Association Engine (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-w-0">
          {/* Spatial Association Engine Query Card */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <IconMapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                SPATIAL ASSOCIATION QUERY
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                REST API
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-sans">
              Test whether a geocoded field observation or citizen report falls within the active corridor envelope (&le;5 km: Auto-Attach, 5-10 km: Review Required, &gt;10 km: Unassigned).
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-neutral-500 font-bold block mb-1">
                  LATITUDE (°N)
                </label>
                <input
                  type="text"
                  value={evalLat}
                  onChange={(e) => setEvalLat(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="27.0842"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-neutral-500 font-bold block mb-1">
                  LONGITUDE (°E)
                </label>
                <input
                  type="text"
                  value={evalLng}
                  onChange={(e) => setEvalLng(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="92.5681"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEvalLat("27.0842");
                  setEvalLng("92.5681");
                }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                TG-2048 Scarp
              </button>
              <button
                onClick={() => {
                  setEvalLat("27.0920");
                  setEvalLng("92.5850");
                }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                Corridor Buffer
              </button>
              <button
                onClick={() => {
                  setEvalLat("27.2500");
                  setEvalLng("92.7000");
                }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                Out-of-Bounds
              </button>
            </div>

            <button
              onClick={handleEvaluateAssociation}
              disabled={isEvaluating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <IconRefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
              <span>{isEvaluating ? "Evaluating Geodesic Projection..." : "Query Spatial Association"}</span>
            </button>

            {evalError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-mono">
                {evalError}
              </div>
            )}

            {/* Association Evaluation Result Card */}
            {associationResult && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">ASSOCIATION:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      associationResult.association_status === "ATTACHED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400"
                        : associationResult.association_status === "REVIEW_REQUIRED"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400"
                        : "bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 border border-slate-400"
                    }`}
                  >
                    {associationResult.association_status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">DISTANCE TO CORRIDOR:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {associationResult.distance_to_corridor_meters.toFixed(1)} m
                  </span>
                </div>
                {associationResult.matched_road_segment && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-neutral-400">ROAD SEGMENT:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {associationResult.matched_road_segment.road_code} ({associationResult.matched_road_segment.chainage_start_km} - {associationResult.matched_road_segment.chainage_end_km} km)
                    </span>
                  </div>
                )}
                {associationResult.closest_settlement && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-neutral-400">NEAREST SETTLEMENT:</span>
                    <span className="text-slate-800 dark:text-neutral-200">
                      {associationResult.closest_settlement.name} ({associationResult.closest_settlement.distance_meters.toFixed(0)}m)
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-[11px] font-sans text-slate-600 dark:text-neutral-400">
                  <strong className="font-mono text-slate-800 dark:text-neutral-200">Guidance: </strong>
                  {associationResult.guidance}
                </div>
              </div>
            )}
          </div>

          {/* Authoritative Layers Summary */}
          {/* Spatial Layers Catalogue (Truthful Categorization) */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <IconShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              GEOSPATIAL LAYER CATALOGUE (PROVENANCE AUDITED)
            </span>

            <div className="space-y-3 text-xs font-mono">
              {/* Category 1: REAL HISTORICAL */}
              <div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>REAL HISTORICAL DATA</span>
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded text-[9px] border border-emerald-500">AUTHORITATIVE</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Copernicus GLO-30 DEM</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">30m Posting • Horn (1981) Slope & Aspect Derivation</div>
                    </div>
                    <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-bold">
                      REAL DEM
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">GSI NLSM Landslide Ground Truth</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">5 Verified Field Landslides (KM-38 to KM-52)</div>
                    </div>
                    <span className="text-[9px] bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold">
                      REAL GSI
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">ECMWF ERA5 / NASA GPM Monsoon</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">June 2024 Reanalysis • 7-day Weighted ARI Engine</div>
                    </div>
                    <span className="text-[9px] bg-blue-700 text-white px-1.5 py-0.5 rounded font-bold">
                      CALIBRATED
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 2: GEOGRAPHICALLY GROUNDED FIXTURES */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>GEOGRAPHICALLY GROUNDED FIXTURES</span>
                  <span className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-1.5 py-0.2 rounded text-[9px] border border-slate-300 dark:border-neutral-700">REFERENCE ONLY</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Admin Boundary (District)</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">West Kameng • Survey of India Reference Polygon</div>
                    </div>
                    <span className="text-[9px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-1.5 py-0.5 rounded font-bold border border-slate-300 dark:border-neutral-700">
                      FIXTURE
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">NH-13 Lifeline Highway</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">Bhalukpong-Tenga • Geodetic Polyline Alignment</div>
                    </div>
                    <span className="text-[9px] bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 px-1.5 py-0.5 rounded font-bold border border-orange-400">
                      FIXTURE
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Census Settlements & Infrastructure</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">4 Settlements • 4 Critical Lifelines</div>
                    </div>
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-400">
                      FIXTURE
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 3: NO LIVE FEED */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>UNAVAILABLE TELEMETRY</span>
                  <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 px-1.5 py-0.2 rounded text-[9px] border border-red-300 dark:border-red-800">OFFLINE</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between opacity-75">
                    <div>
                      <div className="font-bold text-slate-700 dark:text-neutral-300">Doppler Weather Radar (DWR)</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-500">Cherrapunji/Guwahati DWR Beam Blocked</div>
                    </div>
                    <span className="text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded font-bold">
                      NO LIVE FEED
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 4: EXPERIMENTAL MODEL LAYER (NOT VALIDATED) */}
              <div>
                <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>EXPERIMENTAL MODEL LAYER</span>
                  <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-1.5 py-0.2 rounded text-[9px] border border-rose-500 font-bold">
                    NOT VALIDATED
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Corridor Susceptibility Grid</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">131 Points (~500m Spacing) • Logistic Baseline v0.1-exp</div>
                    </div>
                    <span className="text-[9px] bg-rose-700 text-white px-1.5 py-0.5 rounded font-bold">
                      EXPERIMENTAL
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Jump to TG-2048 Incident Workspace */}
          <div className="bg-gradient-to-r from-red-950/20 to-orange-950/20 border border-red-500/50 rounded-xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-red-600 dark:text-red-400">FEATURED INCIDENT TWIN</span>
              <span className="bg-red-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">TG-2048</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              NH-13 KM-42 Slope Debris Flow
            </div>
            <p className="text-[11px] text-slate-600 dark:text-neutral-400">
              Coordinated multi-agency response, evidence reconciliation, and authority decision gate.
            </p>
            <button
              onClick={() => {
                selectIncident("TG-2048");
                setActiveNavTab("INCIDENTS");
              }}
              className="mt-1 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <span>Open TG-2048 Workspace</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
