import React, { useState, useRef } from "react";
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
  IconRadio,
  IconCheck,
  IconClock,
  IconActivity,
  IconLayers,
  IconShieldAlert,
  IconFileText,
} from "../icons";

export type CitizenTab = "home" | "alerts" | "report" | "my-reports" | "safety" | "community" | "profile";

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

  // Active top/bottom navigation tab
  const [activeTab, setActiveTab] = useState<CitizenTab>("home");

  // In-page Modals state
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isImSafeModalOpen, setIsImSafeModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Progressive disclosure for 5 Core Citizen Safety Questions
  const [showFiveQuestions, setShowFiveQuestions] = useState(false);

  // -------------------------------------------------------------
  // GUIDED 5-STEP HAZARD REPORTING STATE (media_1790946143295.jpg)
  // -------------------------------------------------------------
  const [reportStep, setReportStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [reportPhoto, setReportPhoto] = useState<string>("/backgrounds/ner_himalayan_monsoon_terrain.jpg");
  const [reportNotes, setReportNotes] = useState("");
  const [reportLocality, setReportLocality] = useState("NH-13, Near Seijosa, Arunachal Pradesh");
  const [aiScanProgress, setAiScanProgress] = useState(1);
  const [reportTrackingId, setReportTrackingId] = useState("TG-2026-0914-00123");
  const [isAiScanning, setIsAiScanning] = useState(false);

  // Alerts sub-tab filter
  const [alertsFilter, setAlertsFilter] = useState<"for-you" | "nearby">("for-you");

  // Safety Tips sub-tab
  const [safetyTipsFilter, setSafetyTipsFilter] = useState<"before" | "during" | "after">("during");

  // Community sub-tab
  const [communityFilter, setCommunityFilter] = useState<"updates" | "stories">("updates");

  // Profile offline mode toggle
  const [offlineMode, setOfflineMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartReport = () => {
    setActiveTab("report");
    setReportStep(1);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReportPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiAnalysis = () => {
    setReportStep(3);
    setIsAiScanning(true);
    setAiScanProgress(1);

    setTimeout(() => setAiScanProgress(2), 700);
    setTimeout(() => setAiScanProgress(3), 1400);
    setTimeout(() => setAiScanProgress(4), 2100);
    setTimeout(() => setAiScanProgress(5), 2800);
    setTimeout(() => {
      setIsAiScanning(false);
      setReportStep(4);
    }, 3400);
  };

  const handleFinalSubmitReport = () => {
    const newId = `TG-2026-0914-00${Math.floor(100 + Math.random() * 900)}`;
    setReportTrackingId(newId);
    setReportStep(5);
  };

  const handleScrollToMap = () => {
    if (activeTab !== "home") setActiveTab("home");
    setTimeout(() => {
      const mapEl = document.getElementById("citizen-danger-map");
      if (mapEl) mapEl.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleScrollToRisk = () => {
    if (activeTab !== "home") setActiveTab("home");
    setTimeout(() => {
      const riskEl = document.getElementById("citizen-risk-section");
      if (riskEl) riskEl.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleScrollToRoads = () => {
    if (activeTab !== "home") setActiveTab("home");
    setTimeout(() => {
      const roadsEl = document.getElementById("citizen-roads-section");
      if (roadsEl) roadsEl.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors bg-slate-50 dark:bg-slate-950 font-sans pb-20 md:pb-6">
      {/* Environmental Photographic Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-10 dark:opacity-20 transition-opacity"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Theme-Adaptive gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-100/90 via-slate-50/95 to-slate-100/90 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-950 pointer-events-none z-0 transition-colors" />

      {/* 1. CITIZEN HEADER */}
      <CitizenHeader
        onSelectOperatorLogin={onSelectOperatorLogin}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
        onOpenAlertsModal={() => setIsWhyModalOpen(true)}
        onGoHome={onGoHome}
        unreadAlertCount={1}
      />

      {/* 2. RESPONSIVE TAB STRIP (Desktop / Tablet) */}
      <div className="relative z-10 hidden md:block border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 font-medium text-xs">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "home"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_home")}</span>
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "alerts"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_alerts")}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">3</span>
            </button>
            <button
              onClick={handleStartReport}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "report"
                  ? "bg-amber-600 text-white font-bold shadow-sm"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
            >
              <IconCamera className="w-3.5 h-3.5" />
              <span>{t("tab_report")}</span>
            </button>
            <button
              onClick={() => setActiveTab("my-reports")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "my-reports"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_my_reports")}</span>
            </button>
            <button
              onClick={() => setActiveTab("safety")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "safety"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_safety_tips")}</span>
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "community"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_community")}</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "profile"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t("tab_profile")}</span>
            </button>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {location.localityLabel || "NH-13 West Kameng"}
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="relative z-10 flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full">
        
        {/* ========================================================= */}
        {/* TAB 1: SAFETY & MAP (HOME) */}
        {/* ========================================================= */}
        {activeTab === "home" && (
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

              {/* 2. ACTIVE SAFETY ALERT */}
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

                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-2.5 leading-relaxed">
                    {t("active_safety_alert_summary")}
                  </p>

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
                    <button
                      type="button"
                      onClick={handleStartReport}
                      className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-400/40 shadow-md shadow-amber-950/30"
                    >
                      <IconCamera className="w-3.5 h-3.5" />
                      <span>Guided AI Report</span>
                    </button>
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

            {/* RIGHT COLUMN: Interactive Hazard Map & Road Conditions */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-14">
              <WhereIsDangerMap onOpenWhyAlertModal={() => setIsWhyModalOpen(true)} />
              <RoadStatusCard onViewOnMap={handleScrollToMap} />
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIVE ALERTS (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "alerts" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <IconAlertTriangle className="w-5 h-5 text-red-500" />
                  <span>{t("tab_alerts")}</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Real-time monitored warnings across North Eastern corridors
                </p>
              </div>
              <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs font-bold">
                <button
                  onClick={() => setAlertsFilter("for-you")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    alertsFilter === "for-you" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  For You
                </button>
                <button
                  onClick={() => setAlertsFilter("nearby")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    alertsFilter === "nearby" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Nearby
                </button>
              </div>
            </div>

            {/* Alert Cards */}
            <div className="space-y-3">
              {/* Alert 1 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-lg flex items-start gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <IconAlertTriangle className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Heavy Rainfall Warning
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Medium
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                    West Kameng • IMD • 2 hours ago
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Intense antecedent precipitation (184mm cumulative) exceeding slope saturation limits. Exercise caution on hill stretches.
                  </p>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-red-400 dark:border-red-800/80 rounded-2xl p-4 shadow-lg flex items-start gap-3">
                <span className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                  <IconAlertTriangle className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Landslide Risk Increased
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                      High
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                    Seijosa - NH-13 • 2 hours ago
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Active slope movement detected near KM-42. High debris runout hazard towards highway corridor.
                  </p>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-red-400 dark:border-red-800/80 rounded-2xl p-4 shadow-lg flex items-start gap-3">
                <span className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                  <IconShieldAlert className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Road Blocked
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                      High
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                    Dirang - Sela Route • 4 hours ago
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Carriageway blocked by rockfall at KM-38 checkpost. Border Roads Organisation (Project Vartak) clearing debris. Use Rupa bypass.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GUIDED 5-STEP HAZARD REPORT (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "report" && (
          <div className="max-w-lg mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl transition-colors">
            
            {/* STEP 1: WELCOME */}
            {reportStep === 1 && (
              <div className="space-y-6 text-center py-4">
                <div className="relative rounded-2xl overflow-hidden shadow-lg h-48 bg-slate-900 border border-white/10">
                  <img
                    src="/backgrounds/ner_himalayan_monsoon_terrain.jpg"
                    alt="Himalayan Valley"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4 text-left">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      {t("report_step1_badge")}
                    </span>
                    <h2 className="text-xl font-black text-white leading-tight">
                      TerraGuardian Safe
                    </h2>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {t("report_step1_title")}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                    {t("report_step1_desc")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReportStep(2)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  {t("report_step1_cta")}
                </button>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                  <div>{t("report_step1_pill1")}</div>
                  <div>{t("report_step1_pill2")}</div>
                  <div>{t("report_step1_pill3")}</div>
                </div>
              </div>
            )}

            {/* STEP 2: CAPTURE / UPLOAD */}
            {reportStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    {t("report_step2_badge")}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {t("report_step2_title")}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {t("report_step2_subtitle")}
                  </p>
                </div>

                {/* Photo Preview Frame */}
                <div className="relative rounded-2xl overflow-hidden h-44 bg-slate-900 border border-slate-300 dark:border-neutral-800 shadow-md">
                  <img
                    src={reportPhoto}
                    alt="Hazard View"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white cursor-pointer" onClick={() => setReportPhoto("/backgrounds/ner_himalayan_monsoon_terrain.jpg")}>
                    ✕
                  </div>
                </div>

                {/* Photo Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                  >
                    <IconCamera className="w-4 h-4 text-emerald-500" />
                    <span>{t("report_step2_take_photo")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                  >
                    <span>{t("report_step2_choose_gallery")}</span>
                  </button>
                </div>

                {/* Details input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("report_step2_details_label")}
                  </label>
                  <textarea
                    rows={2}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder={t("report_step2_details_placeholder")}
                    className="w-full text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Location Pill */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <IconMapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase">
                        {t("report_step2_location_auto")}
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {reportLocality}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestGps}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {t("report_step2_location_change")}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  {t("report_step2_btn_next")}
                </button>
              </div>
            )}

            {/* STEP 3: AI ANALYSIS (Radar Scan Overlay) */}
            {reportStep === 3 && (
              <div className="space-y-6 text-center py-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t("report_step3_badge")}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {t("report_step3_title")}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t("report_step3_subtitle")}
                  </p>
                </div>

                {/* Radar Image Preview Container */}
                <div className="relative mx-auto rounded-2xl overflow-hidden h-44 w-60 bg-slate-900 border-2 border-emerald-500/50 shadow-xl">
                  <img
                    src={reportPhoto}
                    alt="Radar Target"
                    className="w-full h-full object-cover"
                  />
                  {/* Glowing Radar Sweep Overlay */}
                  <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-2xs flex items-center justify-center">
                    <div className="relative h-28 w-28 rounded-full border-2 border-emerald-400/60 flex items-center justify-center animate-pulse">
                      <div className="h-16 w-16 rounded-full border border-emerald-400/80" />
                      <div className="absolute inset-0 border-t-2 border-emerald-300 rounded-full animate-spin" />
                    </div>
                  </div>
                </div>

                {/* Progressive Checklist */}
                <div className="space-y-2 text-left max-w-xs mx-auto text-xs font-semibold">
                  <div className="flex items-center gap-2.5">
                    {aiScanProgress >= 1 ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-400" />
                    )}
                    <span className={aiScanProgress >= 1 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                      {t("report_step3_scan1")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {aiScanProgress >= 2 ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    ) : aiScanProgress === 1 ? (
                      <span className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-400" />
                    )}
                    <span className={aiScanProgress >= 2 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                      {t("report_step3_scan2")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {aiScanProgress >= 3 ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    ) : aiScanProgress === 2 ? (
                      <span className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-400" />
                    )}
                    <span className={aiScanProgress >= 3 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                      {t("report_step3_scan3")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {aiScanProgress >= 4 ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    ) : aiScanProgress === 3 ? (
                      <span className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-400" />
                    )}
                    <span className={aiScanProgress >= 4 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                      {t("report_step3_scan4")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {aiScanProgress >= 5 ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-400" />
                    )}
                    <span className={aiScanProgress >= 5 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                      {t("report_step3_scan5")}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {t("report_step3_footer")}
                </div>
              </div>
            )}

            {/* STEP 4: RESULT */}
            {reportStep === 4 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    {t("report_step4_badge")}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {t("report_step4_title")}
                  </h2>
                </div>

                {/* Risk Banner */}
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-red-600 text-white">
                      <IconAlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {t("report_step4_hazard_detected")}
                      </div>
                      <div className="text-[11px] font-mono text-red-700 dark:text-red-300">
                        {t("report_step4_confidence")}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-600 text-white">
                    {t("report_step4_risk_level")}
                  </span>
                </div>

                {/* Thumbnail & Location */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
                  <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-slate-900">
                    <img src={reportPhoto} alt="Captured" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs truncate">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {reportLocality}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Analysed 2 min ago
                    </div>
                  </div>
                </div>

                {/* What We Found? */}
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wide">
                    {t("report_step4_found_title")}
                  </div>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> {t("report_step4_found_1")}</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> {t("report_step4_found_2")}</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> {t("report_step4_found_3")}</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> {t("report_step4_found_4")}</li>
                  </ul>
                </div>

                {/* Recommended Precautions */}
                <div className="space-y-1.5 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-300 dark:border-amber-800/60 text-xs">
                  <div className="font-bold text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <IconAlertTriangle className="w-3.5 h-3.5" />
                    <span>{t("report_step4_precautions_title")}</span>
                  </div>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    <li>• {t("report_step4_prec_1")}</li>
                    <li>• {t("report_step4_prec_2")}</li>
                    <li>• {t("report_step4_prec_3")}</li>
                    <li>• {t("report_step4_prec_4")}</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleFinalSubmitReport}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  {t("report_step4_btn_submit")}
                </button>
              </div>
            )}

            {/* STEP 5: CONFIRMATION */}
            {reportStep === 5 && (
              <div className="space-y-6 text-center py-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl font-bold shadow-xl shadow-emerald-500/30">
                  ✓
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {t("report_step5_title")}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                    {t("report_step5_subtitle")}
                  </p>
                </div>

                {/* Report ID Card */}
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 font-mono text-xs">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                    {t("report_step5_id_label")}
                  </div>
                  <div className="font-black text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {reportTrackingId}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    UNVERIFIED CITIZEN OBSERVATION (PENDING SDRF REVIEW)
                  </div>
                </div>

                {/* What Happens Next? */}
                <div className="text-left bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2 text-xs">
                  <div className="font-extrabold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                    {t("report_step5_next_title")}
                  </div>
                  <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>✓</span> {t("report_step5_next_1")}
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                      <span>⏳</span> {t("report_step5_next_2")}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>○</span> {t("report_step5_next_3")}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>○</span> {t("report_step5_next_4")}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("my-reports")}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  {t("report_step5_btn_my_reports")}
                </button>

                <div className="text-[11px] italic text-slate-500 dark:text-slate-400">
                  {t("report_step5_quote")}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MY REPORTS (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "my-reports" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t("tab_my_reports")}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Track your observations and operational review status
                </p>
              </div>
              <button
                onClick={handleStartReport}
                className="py-2 px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + New Report
              </button>
            </div>

            <div className="space-y-3">
              {/* Report 1 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img src="/backgrounds/ner_himalayan_monsoon_terrain.jpg" alt="Report 1" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Landslide Risk</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        In Review
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      NH-13, Seijosa • 2 min ago
                    </div>
                  </div>
                </div>
                <IconChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Report 2 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img src="/backgrounds/ner_himalayan_monsoon_terrain.jpg" alt="Report 2" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Possible Road Crack</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Verified
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      West Kameng • 1 day ago
                    </div>
                  </div>
                </div>
                <IconChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Report 3 */}
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img src="/backgrounds/ner_himalayan_monsoon_terrain.jpg" alt="Report 3" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Rockfall</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Verified
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tawang • 3 days ago
                    </div>
                  </div>
                </div>
                <IconChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SAFETY TIPS (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "safety" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t("tab_safety_tips")}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Be prepared. Stay safe in hill terrain.
                </p>
              </div>
              <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs font-bold">
                <button
                  onClick={() => setSafetyTipsFilter("before")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    safetyTipsFilter === "before" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setSafetyTipsFilter("during")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    safetyTipsFilter === "during" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  During
                </button>
                <button
                  onClick={() => setSafetyTipsFilter("after")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    safetyTipsFilter === "after" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  After
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <IconShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Avoid travel during heavy rain
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Most mountain slope failures occur during continuous precipitation exceeding 60mm in 24 hours. Wait until rainfall subsides.
                  </p>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <IconAlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Stay away from steep slopes
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Steep road cuttings and hill faces with saturated topsoil can fail without prior auditory warning. Keep clear of scarp edges.
                  </p>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <IconRadio className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Follow official alerts & checkposts
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Never attempt to drive around barricades or checkpoints. Follow SDRF and BRO highway instructions.
                  </p>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="p-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                  <IconPhoneCall className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Keep emergency contacts handy
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Dial 112 for national emergency services or 1077 for District Disaster Management Authorities in Arunachal Pradesh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: COMMUNITY (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "community" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {t("tab_community")}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Stronger together across 8 North Eastern States
              </p>
            </div>

            {/* Local Hero Story Card */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-md">
              <div className="h-44 bg-slate-900 relative">
                <img src="/backgrounds/ner_himalayan_monsoon_terrain.jpg" alt="Community Hero" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-emerald-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Local Hero
                </div>
              </div>
              <div className="p-4 space-y-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Villager's early report helped prevent an accident on NH-13
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  A resident near KM-42 noticed fresh tension cracks above the carriageway at 06:00 IST. The early alert allowed BRO to halt morning convoy traffic before major slide collapse.
                </p>
              </div>
            </div>

            {/* Live Citizen Impact Stats */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-lg">
              <div>
                <div className="text-2xl font-black font-mono">1,284</div>
                <div className="text-xs font-medium text-emerald-100">Reports from citizens across Northeast</div>
              </div>
              <div className="text-xs italic font-medium bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                "Your reports create real change."
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: CITIZEN PROFILE (media_1790946143295.jpg) */}
        {/* ========================================================= */}
        {activeTab === "profile" && (
          <div className="max-w-lg mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                👤
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Citizen Contributor
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Arunachal Pradesh • Zone-V
                </div>
              </div>
            </div>

            {/* Impact Metric Counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">12</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Reports</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">8</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Verified</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
                <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">1</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Lives Impacted</div>
              </div>
            </div>

            {/* Settings & Offline Mode */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Offline Mode</div>
                  <div className="text-[10px] text-slate-500">Save reports without internet connection</div>
                </div>
                <input
                  type="checkbox"
                  checked={offlineMode}
                  onChange={(e) => setOfflineMode(e.target.checked)}
                  className="h-5 w-5 rounded text-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Location Updates</div>
                  <div className="text-[10px] text-slate-500">Auto-refresh GPS in background</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-5 w-5 rounded text-emerald-600 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Emergency Helplines</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">National Emergency: 112</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">Disaster Management: 1077</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">BRO Highway Helpline: 03782-222144</div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 4. MOBILE FIXED BOTTOM NAVIGATION BAR (media_1790946143295.jpg) */}
      <nav aria-label="Citizen Mobile Navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl cursor-pointer ${
            activeTab === "home" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <IconRadio className="w-5 h-5" />
          <span className="text-[10px]">{t("tab_home")}</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`relative flex flex-col items-center gap-0.5 p-1 rounded-xl cursor-pointer ${
            activeTab === "alerts" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <IconAlertTriangle className="w-5 h-5" />
          <span className="text-[10px]">{t("tab_alerts")}</span>
          <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-red-500" />
        </button>

        <button
          onClick={handleStartReport}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl cursor-pointer ${
            activeTab === "report" ? "text-amber-500 font-bold scale-110" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          <div className="p-1 rounded-full bg-amber-500 text-white shadow-md">
            <IconCamera className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold">{t("tab_report")}</span>
        </button>

        <button
          onClick={() => setActiveTab("my-reports")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl cursor-pointer ${
            activeTab === "my-reports" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <IconFileText className="w-5 h-5" />
          <span className="text-[10px]">{t("tab_my_reports")}</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl cursor-pointer ${
            activeTab === "profile" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center font-bold text-sm">👤</span>
          <span className="text-[10px]">{t("tab_profile")}</span>
        </button>
      </nav>

      {/* FOOTER (Desktop only) */}
      <footer className="relative z-10 hidden md:block border-t border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950 px-4 py-3 text-center text-[11px] text-slate-500 dark:text-slate-400 font-sans">
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
        onStartGuidedFlow={handleStartReport}
      />
    </div>
  );
};
