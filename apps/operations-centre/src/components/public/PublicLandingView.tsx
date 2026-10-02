import React from "react";
import { ThemeToggle } from "../common";
import { usePublicReport } from "../../context/PublicReportContext";
import {
  IconShieldCheck,
  IconRadio,
  IconArrowRight,
  IconMapPin,
} from "../icons";

interface PublicLandingViewProps {
  onEnterCitizenSafe: () => void;
  onSelectOperatorLogin: () => void;
  onStartObservationReport?: () => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onEnterCitizenSafe,
  onSelectOperatorLogin,
  onStartObservationReport,
}) => {
  const { setPublicStep } = usePublicReport();

  const handleStartReport = () => {
    if (onStartObservationReport) {
      onStartObservationReport();
    } else if (onEnterCitizenSafe) {
      onEnterCitizenSafe();
    } else {
      setPublicStep("CAPTURE_PHOTO");
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-100 font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Environmental Photographic Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Dark atmospheric gradient overlay & vignette */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90 pointer-events-none z-0" />

      {/* Government & Public Portal Header */}
      <header className="relative z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between text-white">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 p-1 shadow-md overflow-hidden shrink-0">
            <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                TerraGuardian Safe
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-400 font-mono tracking-wider uppercase">
                PUBLIC CITIZEN ACCESS
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
              Govt. of India • NER Disaster Intelligence Network
            </div>
          </div>
        </div>

        {/* Top Right Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            onClick={onSelectOperatorLogin}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl border border-white/20 bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md transition-all cursor-pointer shadow-sm"
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Sign-In</span>
          </button>
        </div>
      </header>

      {/* Main Hero Container (Centered) */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto w-full my-auto text-center">
        {/* 1. Monsoon Active Advisory Card */}
        <div className="w-full bg-[#3d2c16]/75 border border-[#855f24]/60 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 text-left mb-6 shadow-xl">
          <span className="p-2.5 rounded-xl bg-[#996c1e]/30 border border-[#b88628]/40 text-amber-400 shrink-0">
            <IconRadio className="w-5 h-5 animate-pulse" />
          </span>
          <div className="text-xs min-w-0">
            <div className="font-extrabold text-[#facc15] uppercase tracking-wider font-mono text-[11px] sm:text-xs">
              MONSOON ACTIVE ADVISORY
            </div>
            <div className="text-amber-100/90 text-xs sm:text-[13px] mt-0.5 leading-relaxed font-sans">
              Heavy rainfall active across North Eastern Region hill corridors. Real-time community reporting is active.
            </div>
          </div>
        </div>

        {/* 2. Region Scope Pill Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md px-4 py-1 text-xs font-medium text-slate-300 mb-5 shadow-sm">
          <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>8 NER States Rapid Hazard Reporting</span>
        </div>

        {/* 3. Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-[44px] font-black text-white tracking-tight leading-tight mb-4 drop-shadow-lg">
          See a Landslide or Slope Hazard?
          <br />
          <span className="text-[#10b981]">Report in 30 Seconds.</span>
        </h1>

        {/* 4. Subtext Description */}
        <p className="text-xs sm:text-sm md:text-[15px] text-slate-300 leading-relaxed max-w-xl mx-auto mb-8 drop-shadow">
          Your live camera and device GPS observation provides immediate field evidence to district emergency operations, SDRF response teams, and arterial corridor authorities.
        </p>

        {/* 5. Primary Action Buttons Group */}
        <div className="w-full max-w-md flex flex-col gap-3 mb-8">
          <button
            type="button"
            onClick={handleStartReport}
            className="w-full bg-[#059669] hover:bg-[#10b981] active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-xl shadow-xl shadow-emerald-950/60 text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
          >
            <span>Start Hazard Observation Report</span>
            <IconArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSelectOperatorLogin}
            className="w-full bg-[#131d2e]/85 hover:bg-[#1e293b] text-white font-semibold py-3 px-6 rounded-xl border border-slate-700/80 shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Operations Command Sign-In</span>
          </button>
        </div>

        {/* 6. Bottom 2 Value Cards */}
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* Card 1: Instant AI Check */}
          <div className="bg-[#111927]/85 border border-slate-800/80 backdrop-blur-md rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Instant AI Check</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Computer vision scans photo for soil displacement, tension scars & rockfalls.
            </p>
          </div>

          {/* Card 2: Corridor Protection */}
          <div className="bg-[#111927]/85 border border-slate-800/80 backdrop-blur-md rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
              <span>Corridor Protection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Matches observation to critical highway lifelines and vulnerable habitations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
