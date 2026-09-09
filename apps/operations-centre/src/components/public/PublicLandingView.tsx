import React from "react";
import { ThemeToggle } from "../common";
import { usePublicReport } from "../../context/PublicReportContext";
import { IconShieldCheck, IconRadio, IconArrowRight, IconMapPin, IconActivity } from "../icons";

interface PublicLandingViewProps {
  onSelectOperatorLogin: () => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({ onSelectOperatorLogin }) => {
  const { setPublicStep } = usePublicReport();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Government & Public Portal Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-md shadow-emerald-950/20 text-sm">
            TG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">TerraGuardian Safe</span>
              <span className="hidden sm:inline-block rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                PUBLIC CITIZEN ACCESS
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              Govt. of India • NER Disaster Intelligence Network
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onSelectOperatorLogin}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 transition-all"
          >
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Authorized Sign-In</span>
          </button>
        </div>
      </header>

      {/* Main Content Area - Mobile Optimized */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-lg mx-auto w-full">
        {/* National / Regional Advisory Badge */}
        <div className="w-full mb-6">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 shrink-0">
              <IconRadio className="w-4 h-4 animate-pulse" />
            </span>
            <div className="text-xs">
              <div className="font-bold text-amber-900 dark:text-amber-200">MONSOON ACTIVE ADVISORY</div>
              <div className="text-slate-600 dark:text-amber-300/80 text-[11px] mt-0.5">
                Heavy rainfall active along West Kameng, NH-13, and Tawang road sectors. Exercise caution.
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-neutral-300">
            <IconMapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>North Eastern Region Rapid Reporting</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            See a Landslide or Slope Hazard? <br />
            <span className="text-emerald-600 dark:text-emerald-400">Report in 30 Seconds.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
            Your camera and GPS observation provides immediate field evidence to district emergency operations, SDRF response teams, and highway safety authorities.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full space-y-3 mb-8">
          <button
            onClick={() => setPublicStep("ACCESS")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-950/20 text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
          >
            <span>Start Hazard Observation Report</span>
            <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={onSelectOperatorLogin}
            className="w-full bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-300 dark:border-neutral-700 active:scale-[0.98] text-slate-800 dark:text-neutral-200 font-semibold py-3.5 px-6 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Authorized Operations Command Sign-In</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 w-full text-left">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3.5 rounded-xl shadow-xs">
            <div className="font-bold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Instant AI Check</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Computer vision scans photo for soil displacement, tension scars & rockfalls.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3.5 rounded-xl shadow-xs">
            <div className="font-bold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Corridor Protection</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Matches observation to critical highway lifelines and vulnerable habitations.
            </p>
          </div>
        </div>

        {/* Operational Safety Note */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-500 dark:text-neutral-500 max-w-sm">
            <strong>Safety First:</strong> Never put yourself in danger to take a photograph. Maintain safe distance from unstable slope faces and drainage cascades.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-center text-[10px] text-slate-500 dark:text-neutral-500 font-mono">
        TerraGuardian AI • Smart India Hackathon 2026 • Production Incident Workflow
      </footer>
    </div>
  );
};
