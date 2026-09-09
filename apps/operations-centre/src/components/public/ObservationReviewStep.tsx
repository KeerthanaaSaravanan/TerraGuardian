import React from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { ThemeToggle } from "../common";
import {
  IconArrowLeft,
  IconArrowRight,
  IconMapPin,
  IconShieldCheck,
  IconRadio,
  IconAlertTriangle,
} from "../icons";

export const ObservationReviewStep: React.FC = () => {
  const {
    setPublicStep,
    activeImage,
    compiledObservation,
    reporterNote,
    startProcessingSequence,
  } = usePublicReport();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setPublicStep("LOCATION_CONTEXT")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            STEP 3 OF 3
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">CONFIRM & SUBMIT</span>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center space-y-1 mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Review Hazard Observation
          </h2>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Verify image quality and telemetry before processing AI inference.
          </p>
        </div>

        {/* Verification Summary Card */}
        <div className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm space-y-4">
          {/* Photo Preview Thumbnail */}
          <div className="h-44 w-full bg-slate-900 relative">
            <img
              src={activeImage}
              alt="Hazard Review"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{compiledObservation.location.locationName}</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Telemetry Row */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">TARGET CORRIDOR</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">
                  {compiledObservation.location.corridorName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">COORDINATES</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200 text-[11px]">
                  {compiledObservation.location.lat}°N, {compiledObservation.location.lng}°E
                </span>
              </div>
            </div>

            {/* Note Display */}
            {reporterNote && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-neutral-300">Observation Notes:</span>
                <p className="text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-[11px] italic">
                  "{reporterNote}"
                </p>
              </div>
            )}

            {/* Safety Protocol Reminder */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl flex items-start gap-2.5">
              <IconShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                <strong>Citizen Evidence Feed:</strong> This observation will be logged into the district emergency operations twin for rapid responder verification.
              </div>
            </div>
          </div>
        </div>

        {/* Submit and Run Analysis Button */}
        <div className="w-full mt-6">
          <button
            onClick={startProcessingSequence}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-950/20 text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Analyze Observation & Submit</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
