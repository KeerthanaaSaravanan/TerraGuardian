import React from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { IconShieldCheck, IconRadio, IconLayers, IconActivity } from "../icons";

export const AnalysisProgressStep: React.FC = () => {
  const { processingStage } = usePublicReport();

  const stages = [
    {
      title: "Verifying Device & Image Provenance",
      description: "Checking EXIF timestamp, sensor integrity, and optical sharpness.",
      status: processingStage >= 1 ? "COMPLETED" : "IN_PROGRESS",
    },
    {
      title: "Computer Vision Slope Feature Extraction",
      description: "Detecting tension cracks, scar boundaries, and active debris runoff.",
      status:
        processingStage >= 2 ? "COMPLETED" : processingStage === 1 ? "IN_PROGRESS" : "PENDING",
    },
    {
      title: "Corridor & Infrastructure Proximity Check",
      description: "Geofencing against NH-13 West Kameng high-susceptibility arterial corridor.",
      status:
        processingStage >= 3 ? "COMPLETED" : processingStage === 2 ? "IN_PROGRESS" : "PENDING",
    },
    {
      title: "Synthesizing Preliminary Safety Assessment",
      description: "Formulating citizen precautions and logging evidence into operations queue.",
      status:
        processingStage >= 4 ? "COMPLETED" : processingStage === 3 ? "IN_PROGRESS" : "PENDING",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
        {/* Pulsing processing icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <IconActivity className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Processing Observation
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Evaluating field visual evidence and georeferenced hazard proximity...
          </p>
        </div>

        {/* Sequential Stages List */}
        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                stage.status === "COMPLETED"
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
                  : stage.status === "IN_PROGRESS"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60"
                  : "bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 opacity-50"
              }`}
            >
              <span className="mt-0.5">
                {stage.status === "COMPLETED" && (
                  <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
                {stage.status === "IN_PROGRESS" && (
                  <span className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin block" />
                )}
                {stage.status === "PENDING" && (
                  <span className="h-4 w-4 rounded-full bg-slate-200 dark:bg-neutral-800 text-slate-400 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
              </span>

              <div className="flex-1 space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">{stage.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                  {stage.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calm footnote */}
        <div className="text-center font-mono text-[10px] text-slate-400 dark:text-neutral-500">
          SECURE PROTOCOL • GOVT OF INDIA NER HAZARD NETWORK
        </div>
      </div>
    </div>
  );
};
