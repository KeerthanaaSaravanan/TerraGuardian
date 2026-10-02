import React from "react";
import { ThemeToggle, LanguageSelector } from "../common";
import { usePublicReport } from "../../context/PublicReportContext";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconShieldCheck,
  IconRadio,
  IconArrowRight,
  IconMapPin,
  IconRadar,
  IconCamera,
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
  const { t } = useCitizenI18n();

  const handleStartReport = () => {
    if (onStartObservationReport) {
      onStartObservationReport();
    } else {
      setPublicStep("ACCESS");
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors overflow-x-hidden font-sans">
      {/* Environmental Photographic Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Dynamic atmospheric gradient overlay & vignette */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/75 to-slate-950/95 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Government & Public Portal Header */}
      <header className="relative z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-white/20 p-1 shadow-md overflow-hidden shrink-0">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">{t("app_title") || "TERRAGUARDIAN AI"}</span>
              <span className="hidden sm:inline-block rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 font-mono tracking-wider">
                {t("landing_header_badge")}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              {t("landing_header_sub")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector variant="glass" />
          <ThemeToggle />
          <button
            onClick={onSelectOperatorLogin}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer"
          >
            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t("landing_header_signin")}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-6xl mx-auto w-full">
        {/* National / Regional Advisory Badge */}
        <div className="w-full max-w-3xl mb-6">
          <div className="bg-amber-500/15 border border-amber-400/30 backdrop-blur-xl rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 border border-amber-400/30">
                <IconRadio className="w-4 h-4 animate-pulse" />
              </span>
              <div className="text-xs min-w-0">
                <div className="font-extrabold text-amber-200 uppercase tracking-wider font-mono text-[11px]">
                  {t("landing_advisory_badge")}
                </div>
                <div className="text-amber-100/90 text-xs mt-0.5 truncate">
                  {t("landing_advisory_text")}
                </div>
              </div>
            </div>
            <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-200 text-[10px] font-mono font-bold shrink-0">
              {t("landing_advisory_level")}
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3.5 mb-8 sm:mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-mono font-semibold text-slate-200">
            <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t("landing_scope_badge")}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
            {t("landing_hero_title")} {t("landing_hero_amp")} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              {t("landing_hero_highlight")}
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed max-w-2xl mx-auto drop-shadow-md">
            {t("landing_hero_desc")}
          </p>
        </div>

        {/* THE TWO PRIMARY PATHWAYS (Desktop 2-Columns, Mobile Stacked) */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8">
          
          {/* PATHWAY 1: CITIZEN SAFE */}
          <div className="group relative bg-slate-900/75 hover:bg-slate-900/85 backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  <IconShieldCheck className="w-6 h-6" />
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                  {t("landing_card1_badge")}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {t("landing_card1_title")}
                </h2>
                <div className="text-xs text-emerald-400 font-mono font-semibold mt-0.5">
                  {t("landing_card1_subtitle")}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t("landing_card1_desc")}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{t("landing_card1_feat1")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{t("landing_card1_feat2")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{t("landing_card1_feat3")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{t("landing_card1_feat4")}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={onEnterCitizenSafe}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-950/50 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
              >
                <span>{t("landing_card1_cta")}</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PATHWAY 2: OPERATIONS CENTRE */}
          <div className="group relative bg-slate-900/75 hover:bg-slate-900/85 backdrop-blur-xl border border-indigo-500/40 hover:border-indigo-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
                  <IconRadar className="w-6 h-6" />
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                  {t("landing_card2_badge")}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {t("landing_card2_title")}
                </h2>
                <div className="text-xs text-indigo-400 font-mono font-semibold mt-0.5">
                  {t("landing_card2_subtitle")}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t("landing_card2_desc")}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{t("landing_card2_feat1")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{t("landing_card2_feat2")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{t("landing_card2_feat3")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{t("landing_card2_feat4")}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={onSelectOperatorLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-950/50 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/40"
              >
                <span>{t("landing_card2_cta")}</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* GUIDED FIELD EVIDENCE BANNER */}
        <div className="w-full max-w-4xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
              <IconCamera className="w-5 h-5" />
            </span>
            <div>
              <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                {t("landing_guided_flow_badge")}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {t("landing_guided_flow_title")}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {t("landing_guided_flow_desc")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartReport}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer border border-amber-400/40 shadow-md shadow-amber-950/30"
          >
            <span>{t("landing_guided_flow_cta")}</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Platform Integrity Metrics Footnote */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-4xl text-left">
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">REGION COVERAGE</div>
            <div className="font-extrabold text-white text-sm mt-0.5">8 NER States</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Full Himalayan foothill basin</div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">CORRIDOR FOCUS</div>
            <div className="font-extrabold text-white text-sm mt-0.5">NH-13 Lifeline</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bhalukpong-Tenga stretch</div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">DECISION GOVERNANCE</div>
            <div className="font-extrabold text-white text-sm mt-0.5">NDMA Act 2005</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Human statutory sign-off</div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">EVIDENCE FUSION</div>
            <div className="font-extrabold text-white text-sm mt-0.5">Incident Twin</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Multi-source correlation</div>
          </div>
        </div>
      </main>

      {/* Government Footer */}
      <footer className="relative z-30 border-t border-white/10 bg-slate-950/90 backdrop-blur-md px-4 sm:px-8 py-3.5 text-center text-xs text-slate-400 font-sans flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-[11px]">
          {t("landing_footer_text")}
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          Statutory Invariant: Prediction ≠ Ground Truth • Human Authorization Required
        </div>
      </footer>
    </div>
  );
};
