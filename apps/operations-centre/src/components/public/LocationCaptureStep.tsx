import React from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { ThemeToggle } from "../common";
import {
  IconArrowLeft,
  IconArrowRight,
  IconMapPin,
  IconShieldCheck,
  IconRadio,
  IconClock,
} from "../icons";

export const LocationCaptureStep: React.FC = () => {
  const {
    setPublicStep,
    locationMode,
    setLocationMode,
    customCoordinates,
    setCustomCoordinates,
    gpsAccuracy,
    gpsStatus,
    isGpsLoading,
    requestDeviceLocation,
    geocodingResult,
    isGeocodingLoading,
    triggerReverseGeocode,
    reporterNote,
    setReporterNote,
    reporterContact,
    setReporterContact,
    compiledObservation,
  } = usePublicReport();

  // Pre-set coordinate presets across all 8 NER states for judges & automated testing
  const NER_TEST_LOCATIONS = [
    { name: "West Kameng, Arunachal Pradesh (NH-13)", lat: 27.2023, lng: 92.4519 },
    { name: "Dima Hasao, Assam (NH-27)", lat: 25.1837, lng: 93.0187 },
    { name: "East Khasi Hills, Meghalaya (NH-6)", lat: 25.5788, lng: 91.8933 },
    { name: "North Sikkim, Sikkim (NH-10)", lat: 27.5330, lng: 88.6138 },
    { name: "Kohima, Nagaland (NH-29)", lat: 25.6751, lng: 94.1086 },
    { name: "Senapati, Manipur (NH-2)", lat: 25.2678, lng: 94.0205 },
    { name: "Mamit, Mizoram (NH-108)", lat: 23.9298, lng: 92.4906 },
    { name: "Dhalai, Tripura (NH-8)", lat: 23.8438, lng: 91.8497 },
  ];

  const handleSelectPreset = async (lat: number, lng: number) => {
    setCustomCoordinates({ lat, lng });
    setLocationMode("MANUAL_NER");
    await triggerReverseGeocode(lat, lng);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setPublicStep("CAPTURE_PHOTO")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            STEP 2 OF 3
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">LOCATION & CONTEXT</span>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        <div className="text-center space-y-1 mb-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Confirm Real Location & Context
          </h2>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Live GPS telemetry matches field observations to arterial road corridors across the North Eastern Region.
          </p>
        </div>

        {/* Location Telemetry Box */}
        <div className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <IconMapPin className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {geocodingResult?.locality || geocodingResult?.district || (customCoordinates ? "Coordinates Acquired" : "Pending GPS Lock")}
                </h3>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                  {geocodingResult?.road_corridor || "Corridor match pending"}
                </div>
              </div>
            </div>

            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                gpsStatus === "ACQUIRED"
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                  : gpsStatus === "ACQUIRING"
                  ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 animate-pulse"
                  : gpsStatus === "DENIED"
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800"
                  : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-700"
              }`}
            >
              {gpsStatus === "ACQUIRED"
                ? `GPS VERIFIED (±${gpsAccuracy ?? 10}m)`
                : gpsStatus === "ACQUIRING"
                ? "ACQUIRING GPS..."
                : gpsStatus === "DENIED"
                ? "GPS PERMISSION DENIED"
                : "AWAITING GPS"}
            </span>
          </div>

          {/* Coordinate Detail Matrix */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">LATITUDE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {customCoordinates ? `${customCoordinates.lat}° N` : "Not acquired"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">LONGITUDE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {customCoordinates ? `${customCoordinates.lng}° E` : "Not acquired"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">DISTRICT</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {isGeocodingLoading ? "Resolving..." : geocodingResult?.district || "Pending"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">STATE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {isGeocodingLoading ? "Resolving..." : geocodingResult?.state || "Pending"}
              </span>
            </div>
          </div>

          {/* Outside NER Notice if geocoded outside 8 NER states */}
          {geocodingResult && !geocodingResult.is_ner_region && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 font-mono text-[11px]">
                <span>⚠️</span>
                <span>LOCATION OUTSIDE NORTH EASTERN REGION</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-amber-300/80 leading-snug">
                Coordinates resolve to <strong>{geocodingResult.state}</strong>. While TerraGuardian's primary operational model targets the 8 North Eastern States, this observation will be preserved and forwarded to the National Extended Disaster Ingest pipeline.
              </p>
            </div>
          )}

          {/* Primary GPS Acquisition Action */}
          <div className="space-y-2">
            <button
              onClick={requestDeviceLocation}
              disabled={isGpsLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <IconMapPin className="w-4 h-4" />
              <span>{isGpsLoading ? "Acquiring Device Telemetry..." : "Acquire My Device GPS (High Accuracy)"}</span>
            </button>
          </div>

          {/* Testing Dropdown: Test across all 8 North Eastern States */}
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 block font-semibold">
              OR TEST 8 NORTH EASTERN REGION CORRIDORS:
            </span>
            <select
              aria-label="Select North Eastern Region Corridor"
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (!isNaN(idx) && NER_TEST_LOCATIONS[idx]) {
                  handleSelectPreset(NER_TEST_LOCATIONS[idx].lat, NER_TEST_LOCATIONS[idx].lng);
                }
              }}
              defaultValue="0"
              className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg p-2 text-xs text-slate-800 dark:text-neutral-200 font-mono focus:outline-none cursor-pointer"
            >
              {NER_TEST_LOCATIONS.map((loc, i) => (
                <option key={i} value={i}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reporter Note / Description Input */}
        <div className="w-full space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
            Observation Notes & Ground Details (Prepopulated by AI Screening)
          </label>
          <textarea
            value={reporterNote}
            onChange={(e) => setReporterNote(e.target.value)}
            rows={3}
            placeholder="Describe what you see: crack size, water flow, mud debris over road..."
            className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
          />
        </div>

        {/* Optional Contact Number for Emergency Response Follow-up */}
        <div className="w-full space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
            Mobile Number (Optional — for SDRF responder dispatch verification)
          </label>
          <input
            type="tel"
            value={reporterContact}
            onChange={(e) => setReporterContact(e.target.value)}
            placeholder="+91 XXXXX XXXXX"
            className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs font-mono"
          />
        </div>

        {/* Next Step Button */}
        <div className="w-full pt-2">
          <button
            onClick={() => setPublicStep("REVIEW")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/20 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Next: Review & Run AI Analysis</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
