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
  } = usePublicReport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImageData(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
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
            Take or Select Hazard Photo
          </h2>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Capture clear image of slope cut, tension crack, or debris spill.
          </p>
        </div>

        {/* Active Photo Frame / Viewport */}
        <div className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 dark:border-neutral-800 shadow-lg relative flex flex-col items-center justify-center min-h-[260px] max-h-[340px]">
          <img
            src={activeImage}
            alt="Captured Hazard Observation"
            className="w-full h-full object-cover max-h-[340px]"
          />

          {/* Camera Viewfinder Overlay Indicators */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>AI SCAN READY</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
            <span>HD RESOLUTION</span>
          </div>
        </div>

        {/* Capture / Upload Actions */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-xs transition-all"
          >
            <span>📱 Take / Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => {
              setCustomImageData(null);
              setSelectedPhotoIndex((selectedPhotoIndex + 1) % SAMPLE_OBSERVATION_PHOTOS.length);
            }}
            className="flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold py-3 px-4 rounded-xl shadow-xs transition-all"
          >
            <span>🔄 Switch Demo Preset</span>
          </button>
        </div>

        {/* Selected Preset Info */}
        <div className="w-full mt-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs text-xs space-y-1.5">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Selected Observation:</span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
              VERIFIED HAZARD FRAME
            </span>
          </div>
          <p className="text-slate-600 dark:text-neutral-400 text-[11px] leading-relaxed">
            {customImageData
              ? "Custom user-uploaded photograph with client metadata embedded."
              : SAMPLE_OBSERVATION_PHOTOS[selectedPhotoIndex]?.description}
          </p>
        </div>

        {/* Next Step Button */}
        <div className="w-full mt-6">
          <button
            onClick={() => setPublicStep("LOCATION_CONTEXT")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/20 text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Next: Confirm Location & Notes</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
