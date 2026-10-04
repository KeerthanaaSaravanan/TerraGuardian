import React from "react";
import { ThemeToggle } from "../common";
import { useTheme } from "../../context/ThemeContext";
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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { setPublicStep } = usePublicReport();

  const handleEnterCitizenPortal = () => {
    setPublicStep("LANDING");
    if (onEnterCitizenSafe) {
      onEnterCitizenSafe();
    } else if (onStartObservationReport) {
      onStartObservationReport();
    } else {
      window.location.href = "/citizen";
    }
  };

  return (
    <div
      className={[
        "relative flex flex-col min-h-screen font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-white",
        isLight ? "bg-slate-100/95 text-slate-900" : "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
      ].join(" ")}
    >
      {/* Environmental photographic background */}
      <div
        className={[
          "fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0",
          isLight ? "opacity-100" : "opacity-100 dark:opacity-100",
        ].join(" ")}
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      <div
        className={[
          "fixed inset-0 bg-gradient-to-b pointer-events-none z-0",
          isLight
            ? "from-slate-100/10 via-slate-100/25 to-slate-200/45"
            : "from-slate-950/65 via-slate-950/75 to-slate-950/90",
        ].join(" ")}
      />

      <header
        className={[
          "relative z-30 border-b backdrop-blur-md px-3 sm:px-5 lg:px-8 py-3 flex items-center justify-between gap-3",
          isLight
            ? "border-slate-200 bg-white/80 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
            : "border-slate-200/80 bg-slate-950/80 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-sm overflow-hidden shrink-0 dark:border-slate-700 dark:bg-slate-900">
            <img src="/logo.png" alt="TerraGuardian AI logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={[
                "text-base sm:text-lg lg:text-xl font-bold tracking-tight truncate",
                isLight ? "text-slate-900" : "text-slate-900 dark:text-white",
              ].join(" ")}>
                TerraGuardian AI
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-300 font-mono tracking-[0.18em] uppercase">
                OPERATIONS
              </span>
            </div>
            <div className={[
              "text-[10px] sm:text-[11px] font-mono mt-0.5 truncate",
              isLight ? "text-slate-700" : "text-slate-600 dark:text-slate-300",
            ].join(" ")}>
              From Warning to Verified Response • NER Disaster Intelligence Network
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <button
            onClick={onSelectOperatorLogin}
            className={[
              "flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer shadow-sm",
              isLight
                ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-300 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Sign-In</span>
          </button>
        </div>
      </header>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto w-full my-auto text-center">
        <div
          className={[
            "w-full border backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 text-left mb-6 shadow-xl",
            isLight
              ? "border-[#d1b27d]/80 bg-[#efe0bb]/90"
              : "bg-[#2d2014]/90 border-[#a77a2b]/70",
          ].join(" ")}
        >
          <span className="p-2.5 rounded-xl bg-[#996c1e]/30 border border-[#b88628]/40 text-amber-500 shrink-0">
            <IconRadio className="w-5 h-5 animate-pulse" />
          </span>
          <div className="text-xs min-w-0">
            <div className={[
              "font-extrabold uppercase tracking-wider font-mono text-[11px] sm:text-xs",
              isLight ? "text-[#6a4a1f]" : "text-[#facc15]",
            ].join(" ")}>
              MONSOON ACTIVE ADVISORY
            </div>
            <div className={[
              "text-xs sm:text-[13px] mt-0.5 leading-relaxed font-sans",
              isLight ? "text-slate-700" : "text-amber-100/90",
            ].join(" ")}>
              Heavy rainfall active across North Eastern Region hill corridors. Real-time community reporting is active.
            </div>
          </div>
        </div>

        <div
          className={[
            "inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-4 py-1 text-xs font-medium mb-5 shadow-sm",
            isLight
              ? "bg-white/80 border border-white/90 text-slate-700"
              : "bg-slate-900/90 border border-slate-700/90 text-slate-200",
          ].join(" ")}
        >
          <IconMapPin className={[
            "w-3.5 h-3.5",
            isLight ? "text-emerald-600" : "text-emerald-400",
          ].join(" ")} />
          <span>8 NER States Rapid Hazard Reporting</span>
        </div>

        <h1
          className={[
            "text-3xl sm:text-4xl md:text-[44px] font-black tracking-[-0.03em] leading-[1.08] mb-4 drop-shadow-lg",
            isLight
              ? "text-slate-950 [text-shadow:0_1px_2px_rgba(255,255,255,0.95)]"
              : "text-white [text-shadow:0_2px_10px_rgba(2,6,23,0.85)]",
          ].join(" ")}
        >
          See a Landslide or Slope Hazard?
          <br />
          <span className="text-[#10b981] [text-shadow:0_1px_5px_rgba(2,6,23,0.55)]">Report in 30 Seconds.</span>
        </h1>

        <p
          className={[
            "text-xs sm:text-sm md:text-[15px] leading-relaxed max-w-xl mx-auto mb-8 drop-shadow",
            isLight
              ? "text-slate-950 font-medium [text-shadow:0_1px_2px_rgba(255,255,255,0.98)]"
              : "text-slate-100 [text-shadow:0_1px_6px_rgba(2,6,23,0.85)]",
          ].join(" ")}
        >
          Your live camera and device GPS observation provides immediate field evidence to district emergency operations, SDRF response teams, and arterial corridor authorities.
        </p>

        <div className="w-full max-w-md flex flex-col gap-3 mb-8">
          <button
            type="button"
            onClick={handleEnterCitizenPortal}
            className="w-full bg-[#059669] hover:bg-[#10b981] active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-xl shadow-xl shadow-emerald-950/60 text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
          >
            <span>Enter Citizen Safe Portal</span>
            <IconArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSelectOperatorLogin}
            className={[
              "w-full font-semibold py-3 px-6 rounded-xl border shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
              isLight
                ? "bg-slate-900/90 text-white border-slate-900 hover:bg-slate-800"
                : "bg-[#131d2e]/85 hover:bg-[#1e293b] text-white border-slate-700/80",
            ].join(" ")}
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Operations Command Sign-In</span>
          </button>
        </div>

        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div
            className={[
              "border backdrop-blur-md rounded-xl p-3.5 space-y-1 shadow-md",
              isLight ? "border-white/90 bg-white/80" : "bg-[#111927]/95 border-slate-800/80",
            ].join(" ")}
          >
            <div className={[
              "flex items-center gap-2 text-xs font-bold",
              isLight ? "text-slate-800" : "text-white",
            ].join(" ")}>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Instant AI Check</span>
            </div>
            <p className={[
              "text-[11px] leading-relaxed",
              isLight ? "text-slate-600" : "text-slate-400",
            ].join(" ")}>
              Computer vision scans photo for soil displacement, tension scars & rockfalls.
            </p>
          </div>

          <div
            className={[
              "border backdrop-blur-md rounded-xl p-3.5 space-y-1 shadow-md",
              isLight ? "border-white/90 bg-white/80" : "bg-[#111927]/95 border-slate-800/80",
            ].join(" ")}
          >
            <div className={[
              "flex items-center gap-2 text-xs font-bold",
              isLight ? "text-slate-800" : "text-white",
            ].join(" ")}>
              <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
              <span>Corridor Protection</span>
            </div>
            <p className={[
              "text-[11px] leading-relaxed",
              isLight ? "text-slate-600" : "text-slate-400",
            ].join(" ")}>
              Matches observation to critical highway lifelines and vulnerable habitations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
