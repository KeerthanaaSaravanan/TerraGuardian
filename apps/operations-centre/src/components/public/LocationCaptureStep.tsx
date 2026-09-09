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
    isGpsLoading,
    requestDeviceLocation,
    reporterNote,
    setReporterNote,
    compiledObservation,
  } = usePublicReport();

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
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center space-y-1 mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Confirm Location & Context
          </h2>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Accurate coordinate telemetry matches reports to arterial road corridors.
          </p>
        </div>

        {/* Location Telemetry Box */}
        <div className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <IconMapPin className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {locationMode === "DEVICE_GPS" && customCoordinates
                    ? "Live Device GPS"
                    : compiledObservation.location.locationName}
                </h3>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                  {compiledObservation.location.corridorName}
                </div>
              </div>
            </div>

            <span className="font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              {locationMode === "DEVICE_GPS" ? "LIVE GPS" : "DEMO CORRIDOR"}
            </span>
          </div>

          {/* Coordinate Detail */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">LATITUDE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {compiledObservation.location.lat}° N
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">LONGITUDE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {compiledObservation.location.lng}° E
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">DISTRICT</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {compiledObservation.location.district}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">STATE</span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {compiledObservation.location.state}
              </span>
            </div>
          </div>

          {/* Location Mode Buttons */}
          <div className="flex gap-2">
            <button
              onClick={requestDeviceLocation}
              disabled={isGpsLoading}
              className="flex-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <IconMapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isGpsLoading ? "Acquiring GPS..." : "Acquire My Real GPS"}</span>
            </button>

            <button
              onClick={() => {
                setLocationMode("DEMO_PRESET");
                setCustomCoordinates(null);
              }}
              className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 transition-colors"
            >
              Reset to NH-13
            </button>
          </div>
        </div>

        {/* Reporter Note / Description Input */}
        <div className="w-full mt-4 space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
            Observation Notes & Details (Optional)
          </label>
          <textarea
            value={reporterNote}
            onChange={(e) => setReporterNote(e.target.value)}
            rows={3}
            placeholder="Describe what you see: crack size, water flow, mud debris over road..."
            className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
          />
        </div>

        {/* Next Step Button */}
        <div className="w-full mt-6">
          <button
            onClick={() => setPublicStep("REVIEW")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/20 text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Next: Review & Run AI Analysis</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
