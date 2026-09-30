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
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors overflow-hidden">
      {/* Environmental Photographic Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Dynamic atmospheric gradient overlay & vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/65 to-slate-950/90 backdrop-blur-[1.5px] pointer-events-none" />

      {/* Government & Public Portal Header */}
      <header className="relative z-30 border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-white/20 p-1 shadow-sm overflow-hidden shrink-0">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">TerraGuardian Safe</span>
              <span className="hidden sm:inline-block rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 font-mono">
                PUBLIC CITIZEN ACCESS
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              Govt. of India • NER Disaster Intelligence Network
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onSelectOperatorLogin}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all"
          >
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized Sign-In</span>
          </button>
        </div>
      </header>

      {/* Main Content Area - Mobile & Desktop Glassmorphism */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-lg mx-auto w-full">
        {/* National / Regional Advisory Badge */}
        <div className="w-full mb-5">
          <div className="bg-amber-500/15 border border-amber-400/30 backdrop-blur-md rounded-xl p-3.5 flex items-start gap-3 shadow-lg">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 border border-amber-400/30">
              <IconRadio className="w-4 h-4 animate-pulse" />
            </span>
            <div className="text-xs">
              <div className="font-bold text-amber-200 uppercase tracking-wide">Monsoon Active Advisory</div>
              <div className="text-amber-100/90 text-[11px] mt-0.5">
                Heavy rainfall active across North Eastern Region hill corridors. Real-time community reporting is active.
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 mb-7">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1 text-xs font-medium text-slate-200">
            <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>8 NER States Rapid Hazard Reporting</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
            See a Landslide or Slope Hazard? <br />
            <span className="text-emerald-400">Report in 30 Seconds.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md mx-auto drop-shadow-sm">
            Your live camera and device GPS observation provides immediate field evidence to district emergency operations, SDRF response teams, and arterial corridor authorities.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full space-y-3 mb-7">
          <button
            onClick={() => setPublicStep("ACCESS")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-emerald-950/40 text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/30"
          >
            <span>Start Hazard Observation Report</span>
            <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={onSelectOperatorLogin}
            className="w-full bg-slate-900/70 hover:bg-slate-900/90 border border-white/20 active:scale-[0.98] text-white font-semibold py-3.5 px-6 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer"
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Operations Command Sign-In</span>
          </button>
        </div>

        {/* Feature Highlights Grid - Glass Translucent */}
        <div className="grid grid-cols-2 gap-3 w-full text-left">
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-md">
            <div className="font-bold text-xs text-white mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Instant AI Check</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Computer vision scans photo for soil displacement, tension scars & rockfalls.
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-md">
            <div className="font-bold text-xs text-white mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span>Corridor Protection</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Matches observation to critical highway lifelines and vulnerable habitations.
            </p>
          </div>
        </div>

        {/* Operational Safety Note */}
        <div className="mt-7 text-center">
          <p className="text-[11px] text-slate-300 max-w-sm drop-shadow-sm">
            <strong className="text-white">Safety First:</strong> Never put yourself in danger to take a photograph. Maintain safe distance from unstable slope faces and drainage cascades.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-30 border-t border-white/10 bg-slate-950/80 backdrop-blur-md px-4 py-3 text-center text-[10px] text-slate-400 font-mono">
        TerraGuardian AI • Smart India Hackathon 2026 • Production Incident Workflow
      </footer>
    </div>
  );
};
