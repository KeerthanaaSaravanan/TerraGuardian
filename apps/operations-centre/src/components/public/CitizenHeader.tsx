import React from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { ThemeToggle, LanguageSelector } from "../common";
import {
  IconPhoneCall,
  IconAlertTriangle,
  IconShieldCheck,
} from "../icons";

interface CitizenHeaderProps {
  onSelectOperatorLogin: () => void;
  onOpenSOSModal: () => void;
  onOpenAlertsModal?: () => void;
  unreadAlertCount?: number;
  onGoHome?: () => void;
}

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({
  onSelectOperatorLogin,
  onOpenSOSModal,
  onOpenAlertsModal,
  unreadAlertCount = 1,
  onGoHome,
}) => {
  const { t } = useCitizenI18n();

  return (
    <header className="relative z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-3 sm:px-5 py-2.5 flex items-center justify-between text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Brand: Logo + Title */}
      <div
        onClick={onGoHome}
        className={`flex items-center gap-2.5 ${onGoHome ? "cursor-pointer group" : ""}`}
        title={onGoHome ? "Return to TerraGuardian Portal Home" : undefined}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 dark:border-white/20 p-1 shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
          <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
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
        <LanguageSelector variant="standard" />

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
