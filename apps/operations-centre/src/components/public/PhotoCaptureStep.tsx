import React, { useRef } from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { SAMPLE_OBSERVATION_PHOTOS } from "../../data/publicObservationDemo";
import { ThemeToggle } from "../common";
import {
  IconArrowLeft,
  IconArrowRight,
  IconRadio,
  IconShieldCheck,
  IconLayers,
  IconAlertTriangle,
} from "../icons";

export const PhotoCaptureStep: React.FC = () => {
  const {
    setPublicStep,
    selectedPhotoIndex,
    setSelectedPhotoIndex,
    customImageData,
    setCustomImageData,
    activeImage,
    handleImageUpload,
    isScreeningLoading,
    screeningResult,
    screeningError,
    clearScreeningError,
  } = usePublicReport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const loadTestImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      handleImageUpload(file);
    } catch (e) {
      console.warn("Failed to load test image:", e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setPublicStep("ACCESS")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            STEP 1 OF 3
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">CAPTURE PHOTO</span>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
        {/* Step Guide Title */}
        <div className="text-center space-y-1 mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Take or Upload Hazard Photo
          </h2>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Capture clear image of slope cut, tension crack, mudflow, or debris spill.
          </p>
        </div>

        {/* Active Photo Frame / Viewport */}
        <div className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 dark:border-neutral-800 shadow-lg relative flex flex-col items-center justify-center min-h-[260px] max-h-[340px]">
          <img
            src={activeImage}
            alt="Captured Hazard Observation"
            className="w-full h-full object-cover max-h-[340px]"
          />

          {/* AI Scanning Active Overlay Animation */}
          {isScreeningLoading && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 space-y-3">
              <div className="h-10 w-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <span className="font-bold text-sm font-mono tracking-wide text-emerald-400">
                  AI VISION SCREENING IN PROGRESS
                </span>
                <p className="text-[11px] text-slate-300 font-mono">
                  Analyzing soil displacement, slope morphology & image authenticity...
                </p>
              </div>
            </div>
          )}

          {/* Camera Viewfinder Overlay Indicators */}
          {!isScreeningLoading && (
            <>
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>AI VISION READY</span>
              </div>

              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
                <span>GEO-TAG INTEGRITY CHECK</span>
              </div>
            </>
          )}
        </div>

        {/* AI Screening Rejection Warning Banner */}
        {screeningError && !isScreeningLoading && (
          <div className="w-full mt-4 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800/80 rounded-xl p-4 shadow-sm text-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
              <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <span className="tracking-wide uppercase font-mono text-xs">AI Screening Rejected: Non-Hazard Object</span>
            </div>
            <p className="text-slate-700 dark:text-red-200/90 text-[11px] leading-relaxed">
              {screeningError}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-red-600 dark:text-red-400 font-mono">
              <span>Status: REJECTED_UNRELATED</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="underline font-bold hover:text-red-800 dark:hover:text-red-200 cursor-pointer"
              >
                Upload Valid Slope Photo
              </button>
            </div>
          </div>
        )}

        {/* AI Screening Success Feedback */}
        {screeningResult && screeningResult.is_hazard_relevant && !screeningError && !isScreeningLoading && (
          <div className="w-full mt-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-3.5 shadow-xs text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>AI SCREENING PASSED: {screeningResult.hazard_type}</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                {screeningResult.confidence}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-neutral-300">
              {screeningResult.visual_observations?.join(" • ")}
            </div>
          </div>
        )}

        {/* Primary Action: Capture or Upload Photo */}
        <div className="w-full grid grid-cols-1 gap-2.5 mt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <span>📷 Capture Camera / Upload Local Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>

        {/* Quick Testing Controls (Negative Laptop Test vs Positive Landslide Test) */}
        <div className="w-full mt-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-neutral-400 font-semibold">
            <span>QUICK AUDIT TEST CASES (EVALUATION / SIH):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => loadTestImage("/samples/sample-unrelated-laptop.jpg", "sample-unrelated-laptop.jpg")}
              className="px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[11px] font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
            >
              <span>❌</span>
              <span>Test Negative (Laptop Photo)</span>
            </button>
            <button
              onClick={() => {
                setCustomImageData(null);
                clearScreeningError();
                setSelectedPhotoIndex((selectedPhotoIndex + 1) % SAMPLE_OBSERVATION_PHOTOS.length);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
            >
              <span>✓</span>
              <span>Test Positive (Landslide Photo)</span>
            </button>
          </div>
        </div>

        {/* Next Step Button */}
        <div className="w-full mt-6">
          <button
            onClick={() => setPublicStep("LOCATION_CONTEXT")}
            disabled={!!screeningError || isScreeningLoading}
            className={`w-full font-bold py-3.5 px-6 rounded-xl shadow-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              screeningError || isScreeningLoading
                ? "bg-slate-300 dark:bg-neutral-800 text-slate-500 dark:text-neutral-600 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 active:scale-[0.98]"
            }`}
          >
            <span>Next: Confirm Location & Notes</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
