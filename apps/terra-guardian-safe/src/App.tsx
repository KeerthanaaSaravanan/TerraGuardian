import React, { useState, useEffect } from "react";
import { ReportWizard } from "./components/ReportWizard";
import { SafetyGuideView } from "./components/SafetyGuideView";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  setLanguage,
  t,
  SupportedLanguage,
} from "./services/i18n";
import { getQueuedReports, flushQueuedReports, QueuedReport } from "./services/offlineSync";

type CurrentView = "HOME" | "REPORT" | "GUIDE";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<CurrentView>("HOME");
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(getLanguage());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await flushQueuedReports();
      if (res.synced > 0) {
        setSyncStatus(`Auto-synced ${res.synced} offline report(s) successfully!`);
        setTimeout(() => setSyncStatus(null), 5000);
      }
      setQueuedReports(getQueuedReports());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQueuedReports(getQueuedReports());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setQueuedReports(getQueuedReports());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setActiveLang(lang);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* ── Active Wizard View ── */}
      {currentView === "REPORT" && (
        <ReportWizard
          onComplete={() => {
            setCurrentView("HOME");
            setQueuedReports(getQueuedReports());
          }}
          onCancel={() => setCurrentView("HOME")}
        />
      )}

      {/* ── Safety Guidelines View ── */}
      {currentView === "GUIDE" && (
        <SafetyGuideView onBack={() => setCurrentView("HOME")} />
      )}

      {/* ── Home / Landing View ── */}
      {currentView === "HOME" && (
        <>
          {/* Header with Multilingual Selector & Network Status */}
          <header className="bg-emerald-700 px-4 py-3 text-white shadow-md sticky top-0 z-30">
            <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm overflow-hidden shrink-0">
                  <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold leading-tight truncate">{t("app_title")}</h1>
                  <p className="text-[11px] text-emerald-100 truncate">{t("app_tagline")}</p>
                </div>
              </div>

              {/* Language Selector & Online Pill */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={activeLang}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="bg-emerald-800 text-white border border-emerald-500/60 rounded px-2 py-1 text-xs font-mono font-semibold"
                  aria-label="Select Language"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.code.toUpperCase()})
                    </option>
                  ))}
                </select>

                <span
                  title={isOnline ? "Connected to Network" : "Operating in Offline Queue Mode"}
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400 ring-2 ring-amber-300"
                  }`}
                />
              </div>
            </div>
          </header>

          {/* Offline / Sync Notification Strip */}
          {!isOnline && (
            <div className="bg-amber-500 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-xs">
              <span>⚠️ {t("offline_banner")}</span>
              <span className="text-[10px] bg-amber-700 px-2 py-0.5 rounded font-bold">OFFLINE</span>
            </div>
          )}

          {syncStatus && (
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-mono text-center shadow-xs">
              {syncStatus}
            </div>
          )}

          {queuedReports.length > 0 && isOnline && (
            <div className="bg-blue-600 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-xs">
              <span>{queuedReports.length} {t("sync_pending")}</span>
              <button
                onClick={async () => {
                  const res = await flushQueuedReports();
                  setSyncStatus(`Synced ${res.synced} report(s).`);
                  setQueuedReports(getQueuedReports());
                  setTimeout(() => setSyncStatus(null), 4000);
                }}
                className="bg-blue-800 hover:bg-blue-900 px-2.5 py-0.5 rounded text-[10px] font-bold underline"
              >
                Sync Now
              </button>
            </div>
          )}

          {/* Main Home Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-lg mx-auto w-full space-y-5">
            {/* Active Monsoon Alert */}
            <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800 text-lg shrink-0">
                🌧️
              </span>
              <div className="text-xs">
                <div className="font-bold text-amber-900">{t("active_monsoon_advisory")}</div>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  {t("advisory_body")}
                </p>
              </div>
            </div>

            {/* Road Status Notification */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
              <span className="p-2 rounded-xl bg-slate-100 text-base shrink-0">🚧</span>
              <div className="text-xs min-w-0">
                <div className="font-bold text-slate-800 font-mono text-[11px] uppercase tracking-wider">
                  {t("road_status_title")}
                </div>
                <div className="text-slate-600 text-xs font-sans mt-0.5">
                  {t("road_status_bct")}
                </div>
              </div>
            </div>

            {/* Hero / Quick Action Banner */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl shadow-inner">
                🛡️
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {t("stay_safe_title")}
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                {t("stay_safe_subtitle")}
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="w-full space-y-2.5 pt-1">
              <button
                onClick={() => setCurrentView("REPORT")}
                className="w-full rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] py-3.5 px-6 text-base font-bold text-white shadow-md shadow-emerald-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span>{t("btn_report_hazard")}</span>
                <span className="text-lg">→</span>
              </button>

              <button
                onClick={() => setCurrentView("GUIDE")}
                className="w-full rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 py-3 px-4 text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                type="button"
              >
                <span>📖 {t("btn_safety_guide")}</span>
              </button>
            </div>

            {/* Emergency Hotline Strip */}
            <div className="w-full bg-slate-100 border border-slate-200 p-3 rounded-xl text-center text-xs font-mono text-slate-600">
              <div className="font-bold text-slate-800 text-[11px]">{t("emergency_contacts")}</div>
              <div className="text-[11px] mt-0.5 text-slate-700">{t("ddma_helpline")}</div>
            </div>

            {/* How It Works Grid */}
            <div className="w-full grid grid-cols-2 gap-3 text-left pt-1">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-base mb-1">📸</div>
                <div className="font-bold text-xs text-slate-800">{t("step_photo_title")}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t("step_photo_desc")}</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-base mb-1">📍</div>
                <div className="font-bold text-xs text-slate-800">{t("step_gps_title")}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t("step_gps_desc")}</div>
              </div>
            </div>

            {/* Truthful Citizen Disclaimer */}
            <div className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-500 leading-relaxed">
              ℹ️ {t("unverified_disclaimer")}
            </div>
          </main>

          {/* Bottom navigation */}
          <nav
            className="sticky bottom-0 bg-white border-t border-slate-200 py-2.5 px-4 flex items-center justify-around text-xs shadow-md z-20"
            aria-label="Main navigation"
          >
            <button
              onClick={() => setCurrentView("HOME")}
              className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                currentView === "HOME" ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={() => setCurrentView("REPORT")}
              className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <span>🚨</span>
              <span>Report</span>
            </button>
            <button
              onClick={() => setCurrentView("GUIDE")}
              className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <span>ℹ️</span>
              <span>Guide</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
};
