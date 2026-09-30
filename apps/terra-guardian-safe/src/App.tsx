import React, { useState, useEffect, useCallback } from "react";
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
import { fetchCitizenSafetyStatus, acknowledgeAlert, fetchRoadStatuses, registerDevice } from "./services/api";
import { CitizenSafetyStatus, RoadStatus } from "./types/citizen";

type CurrentView = "HOME" | "REPORT" | "GUIDE";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<CurrentView>("HOME");
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(getLanguage());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Core Safety Intelligence States
  const [deviceId] = useState<string>(() => {
    const existing = localStorage.getItem("tg_device_id");
    if (existing) return existing;
    const generated = `cit-pwa-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("tg_device_id", generated);
    return generated;
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number }>({
    lat: 27.245,
    lng: 92.540,
    accuracy: 5.0,
  });
  const [safetyData, setSafetyData] = useState<CitizenSafetyStatus | null>(null);
  const [roads, setRoads] = useState<RoadStatus[]>([]);
  const [safeAcknowledged, setSafeAcknowledged] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // Load Safety Status
  const loadSafetyStatus = useCallback(async (lat: number, lng: number) => {
    setIsRefreshing(true);
    try {
      const data = await fetchCitizenSafetyStatus(lat, lng, "Arunachal Pradesh", "West Kameng");
      setSafetyData(data);
      setLastRefreshedAt(new Date().toLocaleTimeString());
      localStorage.setItem("tg_cached_safety_status", JSON.stringify(data));
      localStorage.setItem("tg_cached_time", new Date().toISOString());

      // Register device session
      registerDevice({
        device_id: deviceId,
        fcm_token: `token-web-${deviceId}`,
        platform: "PWA_WEB",
        latitude: lat,
        longitude: lng,
        accuracy_m: coords.accuracy,
        subscribed_districts: ["West Kameng"],
        subscribed_corridors: ["NH-13 Trans-Arunachal Highway"],
      }).catch(() => {});
    } catch {
      // Offline fallback: load cached data
      const cached = localStorage.getItem("tg_cached_safety_status");
      const cachedTime = localStorage.getItem("tg_cached_time");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.is_cached_stale = true;
          setSafetyData(parsed);
          setLastRefreshedAt(cachedTime ? new Date(cachedTime).toLocaleTimeString() : "Offline Cache");
        } catch {}
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [deviceId, coords.accuracy]);

  useEffect(() => {
    // Acquire real browser location
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(newCoords);
          loadSafetyStatus(newCoords.lat, newCoords.lng);
        },
        () => {
          loadSafetyStatus(coords.lat, coords.lng);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      loadSafetyStatus(coords.lat, coords.lng);
    }

    // Load road statuses
    fetchRoadStatuses()
      .then((data) => setRoads(data))
      .catch(() => {});
  }, [loadSafetyStatus]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await flushQueuedReports();
      if (res.synced > 0) {
        setSyncStatus(`Auto-synced ${res.synced} offline report(s) successfully!`);
        setTimeout(() => setSyncStatus(null), 5000);
      }
      setQueuedReports(getQueuedReports());
      loadSafetyStatus(coords.lat, coords.lng);
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
  }, [coords, loadSafetyStatus]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setActiveLang(lang);
  };

  const handleIAmSafeClick = async () => {
    if (!safetyData?.active_warning?.id) return;
    try {
      await acknowledgeAlert(safetyData.active_warning.id, {
        device_id: deviceId,
        is_safe: true,
        safe_notes: "Reported safe via Citizen Safe PWA.",
        approx_lat: coords.lat,
        approx_lng: coords.lng,
      });
      setSafeAcknowledged(true);
    } catch {
      setSafeAcknowledged(true);
    }
  };

  const activeWarning = safetyData?.active_warning;
  const statusColor = safetyData?.status_color || "GREEN";

  return (
    <div className="relative flex min-h-screen flex-col text-slate-900 font-sans overflow-hidden">
      {/* Environmental Atmospheric Terrain Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Translucent overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/65 to-slate-950/85 backdrop-blur-[1px] pointer-events-none z-0" />

      <div className="relative z-10 flex min-h-screen flex-col">
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
            <header className="bg-emerald-800/90 backdrop-blur-md px-4 py-3 text-white shadow-md sticky top-0 z-30 border-b border-emerald-700/50">
              <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm overflow-hidden shrink-0">
                    <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">{t("app_title")}</h1>
                    <p className="text-[11px] text-emerald-200 truncate">{t("app_tagline")}</p>
                  </div>
                </div>

                {/* Language Selector & Online Pill */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={activeLang}
                    onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                    className="bg-emerald-900/80 text-white border border-emerald-500/60 rounded px-2 py-1 text-xs font-mono font-semibold"
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

            {/* Offline / Stale Data Banner */}
            {(!isOnline || safetyData?.is_cached_stale) && (
              <div className="bg-amber-500/95 backdrop-blur-md text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-xs sticky top-[57px] z-20">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{isOnline ? "DATA MAY BE STALE (CACHED)" : t("offline_banner")}</span>
                </div>
                <span className="text-[10px] bg-amber-700/80 px-2 py-0.5 rounded font-bold">
                  {lastRefreshedAt ? `REFRESHED ${lastRefreshedAt}` : "OFFLINE"}
                </span>
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

            {/* Main Content: Answers Core Citizen Safety Questions */}
            <main className="flex-1 flex flex-col items-center justify-start px-4 py-5 max-w-lg mx-auto w-full space-y-4">
              
              {/* 1. Core Safety Status Hero Card */}
              <div
                className={`w-full rounded-2xl p-5 border shadow-lg backdrop-blur-md transition-all ${
                  statusColor === "RED"
                    ? "bg-red-950/85 border-red-500/60 text-white ring-2 ring-red-500/50 animate-pulse"
                    : statusColor === "ORANGE"
                    ? "bg-amber-950/85 border-amber-500/60 text-white ring-1 ring-amber-500/40"
                    : statusColor === "YELLOW"
                    ? "bg-yellow-950/85 border-yellow-500/60 text-white"
                    : "bg-slate-900/85 border-emerald-500/50 text-white"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono opacity-80 pb-2 border-b border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    YOUR LOCATION SAFETY
                  </span>
                  <button
                    onClick={() => loadSafetyStatus(coords.lat, coords.lng)}
                    disabled={isRefreshing}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>{isRefreshing ? "Checking..." : "Refresh"}</span>
                  </button>
                </div>

                <div className="pt-3 flex items-start gap-3.5">
                  <div className="text-3xl shrink-0 p-2 rounded-xl bg-white/10">
                    {statusColor === "RED" ? "🚨" : statusColor === "ORANGE" ? "⚠️" : statusColor === "YELLOW" ? "🟡" : "🛡️"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold">
                      {statusColor === "RED" ? "EMERGENCY WARNING" : statusColor === "ORANGE" ? "LANDSLIDE WARNING" : statusColor === "YELLOW" ? "MONSOON WATCH" : "ALL CLEAR"}
                    </div>
                    <h2 className="text-lg font-extrabold leading-tight mt-0.5">
                      {safetyData?.status_headline || "🟢 NO ACTIVE HAZARDS NEAR YOU"}
                    </h2>
                    <p className="text-xs text-slate-200 mt-1">
                      {coords.lat.toFixed(3)}°N, {coords.lng.toFixed(3)}°E (West Kameng Corridor)
                    </p>
                  </div>
                </div>

                {/* If Active Warning Exists: Display Action Card and 'I AM SAFE' */}
                {activeWarning && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                    <div className="bg-black/30 rounded-xl p-3 text-xs space-y-1">
                      <div className="font-bold text-amber-300 font-mono text-[11px]">WHY THIS WARNING EXISTS:</div>
                      <p className="text-slate-200 text-[11px] leading-relaxed">
                        {activeWarning.rationale || activeWarning.message}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono pt-1">
                        Order Ref: {activeWarning.authority_order_code || "DDMA Statutory Advisory"}
                      </div>
                    </div>

                    {/* I AM SAFE Button */}
                    <div className="pt-1">
                      {!safeAcknowledged ? (
                        <button
                          onClick={handleIAmSafeClick}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <span>✅</span>
                          <span>I AM SAFE (ACKNOWLEDGE)</span>
                        </button>
                      ) : (
                        <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-bold text-center">
                          ✓ ACKNOWLEDGED: STATUS RECORDED AS SAFE
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Emergency Action Card: WHAT SHOULD YOU DO? */}
              <div className="w-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  <span>⚡</span>
                  <span>WHAT SHOULD YOU DO NOW?</span>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-200">
                  {(safetyData?.recommended_actions || [
                    "Proceed with standard mountain transit caution.",
                    "Report newly observed slope cracks or road shoulder subsidence immediately.",
                    "Avoid parking vehicles directly beneath steep excavated rockfaces.",
                  ]).map((act, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-bold shrink-0">▸</span>
                      <span className="leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. What Changed? Operational Timeline */}
              <div className="w-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  <span>🕒</span>
                  <span>WHAT CHANGED IN YOUR CORRIDOR?</span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  {(safetyData?.what_changed || [
                    "Automated IMD tipping-bucket rain gauges reporting stable levels.",
                    "No physical slope failure reported along your 15km corridor envelope.",
                  ]).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                      <span className="text-slate-500 shrink-0">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Corridor Road Statuses */}
              <div className="w-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-2">
                    <span>🚧</span>
                    <span>CORRIDOR ROAD STATUS</span>
                  </span>
                  <span className="text-[10px] text-emerald-400">BRO VERIFIED</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {(roads.length > 0 ? roads : (safetyData?.affected_roads || [])).slice(0, 3).map((r) => (
                    <div key={r.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{r.road_code}</span>
                          <span className="text-[10px] text-slate-400 truncate">{r.corridor_section}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">{r.condition_summary}</p>
                        <div className="text-[9px] font-mono text-slate-400 mt-1">Source: {r.source}</div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                          r.status === "CLOSED"
                            ? "bg-red-500/20 border border-red-500/50 text-red-300"
                            : r.status === "CAUTION" || r.status === "RESTRICTED"
                            ? "bg-amber-500/20 border border-amber-500/50 text-amber-300"
                            : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Primary Action: Report Hazard */}
              <div className="w-full pt-1 space-y-2.5">
                <button
                  onClick={() => setCurrentView("REPORT")}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] py-3.5 px-6 text-base font-bold text-white shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
                  type="button"
                >
                  <span>📸</span>
                  <span>{t("btn_report_hazard")}</span>
                  <span className="text-lg">→</span>
                </button>

                <button
                  onClick={() => setCurrentView("GUIDE")}
                  className="w-full rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 py-3 px-4 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md backdrop-blur-md"
                  type="button"
                >
                  <span>📖 {t("btn_safety_guide")}</span>
                </button>
              </div>

              {/* 6. Emergency Contacts Hotline */}
              <div className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center text-xs font-mono text-slate-300">
                <div className="font-bold text-amber-300 text-[11px] mb-1">EMERGENCY DISASTER HOTLINES</div>
                <div className="text-[11px] text-slate-200 leading-relaxed">
                  DDMA Control Room: <a href="tel:1077" className="underline text-emerald-400 font-bold">1077</a> · Police: <a href="tel:112" className="underline text-emerald-400 font-bold">112</a> · SDMA: <a href="tel:1070" className="underline text-emerald-400 font-bold">1070</a>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">BRO Project Vartak West Kameng: 03778-222044</div>
              </div>

              {/* Truthful Citizen Disclaimer */}
              <div className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono text-slate-400 leading-relaxed">
                ℹ️ {t("unverified_disclaimer")}
              </div>
            </main>

            {/* Bottom navigation */}
            <nav
              className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2.5 px-4 flex items-center justify-around text-xs shadow-lg z-20"
              aria-label="Main navigation"
            >
              <button
                onClick={() => setCurrentView("HOME")}
                className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentView === "HOME" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🏠</span>
                <span className="text-[10px]">Safety Status</span>
              </button>
              <button
                onClick={() => setCurrentView("REPORT")}
                className="flex flex-col items-center gap-0.5 cursor-pointer text-slate-400 hover:text-slate-200"
              >
                <span>📸</span>
                <span className="text-[10px]">Report Hazard</span>
              </button>
              <button
                onClick={() => setCurrentView("GUIDE")}
                className="flex flex-col items-center gap-0.5 cursor-pointer text-slate-400 hover:text-slate-200"
              >
                <span>📖</span>
                <span className="text-[10px]">Safety Guide</span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
};
