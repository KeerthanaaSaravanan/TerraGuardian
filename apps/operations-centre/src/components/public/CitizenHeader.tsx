import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { SupportedLanguage } from "../../services/citizenI18n";
import { ThemeToggle } from "../common";
import {
  IconShieldCheck,
  IconRadio,
  IconAlertTriangle,
  IconPhoneCall,
  IconGlobe,
  IconExternalLink,
} from "../icons";

interface CitizenHeaderProps {
  onSelectOperatorLogin: () => void;
  onOpenSOSModal: () => void;
  onOpenAlertsModal?: () => void;
  unreadAlertCount?: number;
}

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({
  onSelectOperatorLogin,
  onOpenSOSModal,
  onOpenAlertsModal,
  unreadAlertCount = 1,
}) => {
  const { lang, setLanguage, t, languages } = useCitizenI18n();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-white/10 bg-slate-900/90 backdrop-blur-md px-3 sm:px-5 py-2.5 flex items-center justify-between text-white shadow-lg">
      {/* Brand & Regional Context */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white border border-white/20 p-1 shadow-sm overflow-hidden shrink-0">
          <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
              {t("app_title")}
            </span>
            <span className="inline-block rounded bg-emerald-500/25 border border-emerald-400/40 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-300 font-mono tracking-wider">
              {t("portal_badge")}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Govt. of India • NER Disaster Intelligence Network</span>
          </div>
        </div>
      </div>

      {/* Header Controls: Language Selector, SOS, Alerts, Auth Switch */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Multilingual Dropdown Selector (Directly accessible in header) */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer shadow-sm"
            title="Change Interface Language"
            aria-label="Language selector"
          >
            <IconGlobe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-xs">
              {languages.find((l) => l.code === lang)?.nativeName || "English"}
            </span>
            <span className="text-[10px] text-slate-400 ml-0.5">▾</span>
          </button>

          {langMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 z-50 text-slate-200 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 font-semibold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>SELECT NER LANGUAGE</span>
                  <span className="text-[9px] text-emerald-400">8 DIALECTS</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        lang === l.code
                          ? "bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40"
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs leading-none">
                          {l.nativeName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {l.name} • {l.region}
                        </div>
                      </div>
                      {lang === l.code && (
                        <span className="text-emerald-400 text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* SOS / NEED HELP Urgent Action Button */}
        <button
          onClick={onOpenSOSModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-red-950/40 border border-red-400/40 transition-all cursor-pointer animate-pulse"
          title="Emergency SOS / Need Assistance"
        >
          <IconPhoneCall className="w-3.5 h-3.5" />
          <span className="tracking-wide">{t("btn_sos")}</span>
        </button>

        {/* Unread Alerts Counter */}
        {unreadAlertCount > 0 && onOpenAlertsModal && (
          <button
            onClick={onOpenAlertsModal}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold backdrop-blur-sm transition-all"
            title="Active Statutory Alerts"
          >
            <IconAlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Alerts</span>
            <span className="ml-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2">
              {unreadAlertCount}
            </span>
          </button>
        )}

        <ThemeToggle />

        {/* Authorized Operations Command Switch */}
        <button
          onClick={onSelectOperatorLogin}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all cursor-pointer"
          title="Switch to Authorized Incident Command System"
        >
          <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{t("btn_operator_switch")}</span>
          <span className="sm:hidden">Ops</span>
        </button>
      </div>
    </header>
  );
};
