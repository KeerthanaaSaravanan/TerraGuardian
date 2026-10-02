import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { SupportedLanguage } from "../../services/citizenI18n";
import { ThemeToggle } from "../common";
import {
  IconPhoneCall,
  IconAlertTriangle,
  IconGlobe,
  IconShieldCheck,
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
  const { lang, setLanguage, languages, t } = useCitizenI18n();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-3 sm:px-5 py-2.5 flex items-center justify-between text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Brand: Logo + Title */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 dark:border-white/20 p-1 shadow-sm overflow-hidden shrink-0">
          <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t("app_title")}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-sans flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{t("portal_badge")}</span>
          </div>
        </div>
      </div>

      {/* Header Controls: Language Selector, Alerts Bell, SOS */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Multilingual Selector */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Choose Language"
            aria-label="Language selector"
          >
            <IconGlobe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-semibold">
              {languages.find((l) => l.code === lang)?.nativeName || "English"}
            </span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>

          {langMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-50 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-xl animate-in fade-in duration-100">
                <div className="px-2.5 py-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 mb-1 flex justify-between">
                  <span>{t("select_language")}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{t("lang_ner_regions")}</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        lang === l.code
                          ? "bg-emerald-50 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/40"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{l.nativeName}</div>
                        <div className="text-[10px] text-slate-400">{l.name}</div>
                      </div>
                      {lang === l.code && <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Alerts Bell */}
        {unreadAlertCount > 0 && onOpenAlertsModal && (
          <button
            onClick={onOpenAlertsModal}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
            title="View Active Alert"
          >
            <IconAlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t("btn_alerts")}</span>
            <span className="rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2">
              {unreadAlertCount}
            </span>
          </button>
        )}

        <ThemeToggle />

        {/* SOS Button: Clear, Prominent, Safe (Opens NeedHelpModal) */}
        <button
          onClick={onOpenSOSModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black shadow-md shadow-red-950/40 border border-red-400/40 transition-all cursor-pointer"
          title="Emergency Help & Hotlines"
        >
          <IconPhoneCall className="w-3.5 h-3.5" />
          <span>{t("btn_sos")}</span>
        </button>

        {/* Operations Centre (Secondary on Desktop, hidden on mobile) */}
        <button
          onClick={onSelectOperatorLogin}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          title="Authorized Operations Command"
        >
          <IconShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{t("btn_ops")}</span>
        </button>
      </div>
    </header>
  );
};
