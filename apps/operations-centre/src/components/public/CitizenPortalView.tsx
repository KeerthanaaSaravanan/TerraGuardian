import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { useLocationService } from "../../hooks/useLocationService";
import { CitizenHeader } from "./CitizenHeader";
import { AmIAtRiskCard } from "./AmIAtRiskCard";
import { WhereIsDangerMap } from "./WhereIsDangerMap";
import { RoadStatusCard } from "./RoadStatusCard";
import { SmsNotificationCard } from "./SmsNotificationCard";
import { WhyThisAlertModal } from "./WhyThisAlertModal";
import { ImSafeModal } from "./ImSafeModal";
import { NeedHelpModal } from "./NeedHelpModal";
import { CitizenReportModal } from "./CitizenReportModal";
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconPhoneCall,
  IconCamera,
  IconChevronRight,
  IconCrosshair,
  IconMapPin,
} from "../icons";

interface CitizenPortalViewProps {
  onSelectOperatorLogin: () => void;
  onGoHome?: () => void;
  onStartGuidedReport?: () => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  onSelectOperatorLogin,
  onGoHome,
  onStartGuidedReport,
}) => {
  const { t } = useCitizenI18n();
  const { location, requestGps } = useLocationService();

  // In-page Modals state
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isImSafeModalOpen, setIsImSafeModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Progressive disclosure for 5 Core Citizen Safety Questions
  const [showFiveQuestions, setShowFiveQuestions] = useState(false);

  const handleScrollToMap = () => {
    const mapEl = document.getElementById("citizen-danger-map");
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToRisk = () => {
    const riskEl = document.getElementById("citizen-risk-section");
    if (riskEl) {
      riskEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToRoads = () => {
    const roadsEl = document.getElementById("citizen-roads-section");
    if (roadsEl) {
      roadsEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Environmental Photographic Background (subdued Himalayan terrain) */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-10 dark:opacity-20 transition-opacity"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Theme-Adaptive gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-100/90 via-slate-50/95 to-slate-100/90 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-950 pointer-events-none z-0 transition-colors" />

      {/* 1. CLEAN CITIZEN HEADER */}
      <CitizenHeader
        onSelectOperatorLogin={onSelectOperatorLogin}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
        onOpenAlertsModal={() => setIsWhyModalOpen(true)}
        onGoHome={onGoHome}
        unreadAlertCount={1}
      />

      {/* MAIN CONTAINER: Responsive 2-column on desktop (lg:grid), mobile stacked */}
      <main className="relative z-10 flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: Hero, Personal Risk, Core Alert, Quick Actions, Evidence CTA, SMS */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* HERO BANNER & LOCATION TELEMETRY PILL */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                    {t("app_title")}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                    {t("hero_tagline")}
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {t("hero_subtagline")}
                  </p>
                </div>

                {/* Location Status Pill + GPS button */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span className={`h-2 w-2 rounded-full ${location.source === "DEVICE_GEOLOCATION" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="truncate max-w-[140px] sm:max-w-[180px]">
                      {location.localityLabel || "NH-13 West Kameng"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={requestGps}
                    disabled={location.status === "requesting"}
                    title={t("btn_use_my_location")}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <IconCrosshair className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QUICK CITIZEN ACTION BUTTONS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleScrollToRisk}
                  className="py-2.5 px-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <span>{t("btn_am_i_at_risk")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImSafeModalOpen(true)}
                  className="py-2.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <IconShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("btn_im_safe")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSOSModalOpen(true)}
                  className="py-2.5 px-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <IconPhoneCall className="w-3.5 h-3.5 text-red-500" />
                  <span>{t("btn_need_help")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleScrollToMap}
                  className="py-2.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <span>{t("view_danger_map")}</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. ACTIVE SAFETY ALERT (With Progressive 5 Questions) */}
            <section aria-labelledby="active-alert-heading" className="w-full">
              <div className="bg-red-50/70 dark:bg-red-950/40 border border-red-500/40 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl transition-colors">
                <div className="flex items-start justify-between gap-2 border-b border-red-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-red-600 text-white shrink-0 shadow-sm">
                      <IconAlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-[10px] font-bold text-red-700 dark:text-red-400 font-mono uppercase tracking-wider">
                        {t("active_safety_alert_badge")}
                      </div>
                      <h2 id="active-alert-heading" className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                        {t("active_safety_alert_title")}
                      </h2>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    10:42 AM IST
                  </span>
                </div>

                {/* Compressed Alert Summary */}
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-2.5 leading-relaxed">
                  {t("active_safety_alert_summary")}
                </p>

                {/* Progressive Disclosure: [ VIEW DETAILS ▾ ] */}
                <div className="mt-3 pt-2 border-t border-red-200/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowFiveQuestions((prev) => !prev)}
                    className="text-xs font-extrabold text-red-700 dark:text-red-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{showFiveQuestions ? t("btn_hide_details") : t("btn_view_details")}</span>
                    <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${showFiveQuestions ? "rotate-90" : ""}`} />
                  </button>

                  {showFiveQuestions && (
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs animate-in fade-in">
                      <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-white/5 space-y-0.5">
                        <div className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">{t("question_what_happened")}</div>
                        <div className="text-slate-900 dark:text-slate-100 font-medium">{t("answer_what_happened")}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-white/5 space-y-0.5">
                          <div className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">{t("question_where")}</div>
                          <div className="text-slate-900 dark:text-slate-100 font-medium">{t("answer_where")}</div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-white/5 space-y-0.5">
                          <div className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">{t("question_does_it_affect_me")}</div>
                          <div className="text-amber-700 dark:text-amber-300 font-bold">{t("answer_does_it_affect_me")}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-white/5 space-y-0.5">
                          <div className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">{t("question_what_should_i_do")}</div>
                          <div className="text-slate-900 dark:text-slate-100 font-medium">{t("answer_what_should_i_do")}</div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-white/5 space-y-0.5">
                          <div className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">{t("question_which_road_avoid")}</div>
                          <div className="text-red-700 dark:text-red-300 font-bold">{t("answer_which_road_avoid")}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. LOCATION & "AM I AT RISK?" CARD */}
            <div id="citizen-risk-section">
              <AmIAtRiskCard
                onOpenWhyAlertModal={() => setIsWhyModalOpen(true)}
                onViewImpactMap={handleScrollToMap}
              />
            </div>

            {/* 4. SAFETY GUIDANCE CHECKLIST */}
            <section aria-labelledby="safety-actions-heading" className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors">
              <h3 id="safety-actions-heading" className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                {t("safety_checklist_title")}
              </h3>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed mb-4">
                <li>{t("safety_checklist_item1")}</li>
                <li>{t("safety_checklist_item2")}</li>
                <li>{t("safety_checklist_item3")}</li>
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleScrollToRoads}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{t("btn_get_detour")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImSafeModalOpen(true)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/30"
                >
                  <IconShieldCheck className="w-4 h-4 text-emerald-100" />
                  <span>{t("btn_im_safe")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSOSModalOpen(true)}
                  className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-950/30"
                >
                  <IconPhoneCall className="w-4 h-4 text-red-100" />
                  <span>{t("btn_need_help")}</span>
                </button>
              </div>
            </section>

            {/* 5. REPORT A HAZARD CTA */}
            <section aria-label="Report hazard" className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconCamera className="w-4 h-4 text-amber-500" />
                    <span>{t("cta_report_title")}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {t("cta_report_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {onStartGuidedReport && (
                    <button
                      type="button"
                      onClick={onStartGuidedReport}
                      className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-extrabold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-400/40 shadow-md shadow-amber-950/30"
                    >
                      <IconCamera className="w-3.5 h-3.5" />
                      <span>Guided AI Report</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                  >
                    <span>Quick Report</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 6. ALERT DELIVERY / SMS STATUS */}
            <SmsNotificationCard />
          </div>

          {/* RIGHT COLUMN: Interactive Hazard Map & Road Conditions (Desktop Sticky) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-14">
            
            {/* SPATIAL CITIZEN HAZARD MAP */}
            <WhereIsDangerMap onOpenWhyAlertModal={() => setIsWhyModalOpen(true)} />

            {/* ROAD CONDITIONS */}
            <RoadStatusCard onViewOnMap={handleScrollToMap} />
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950 px-4 py-3 text-center text-[11px] text-slate-500 dark:text-slate-400 font-sans">
        TerraGuardian Safe • Citizen Disaster Early Warning & Safety System (Prototype Operational Assessment)
      </footer>

      {/* IN-PAGE MODALS */}
      <WhyThisAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
      />

      <ImSafeModal
        isOpen={isImSafeModalOpen}
        onClose={() => setIsImSafeModalOpen(false)}
      />

      <NeedHelpModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
      />

      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onStartGuidedFlow={onStartGuidedReport}
      />
    </div>
  );
};
