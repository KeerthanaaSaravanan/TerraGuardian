import React, { useEffect, useState } from "react";
import { useDemoScenario } from "../context/DemoScenarioContext";
import { COMMAND_DEMO_ACCOUNTS, useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { getApiBaseDisplayUrl } from "../services/apiClient";
import { ThemeToggle } from "./common";
import { IconAlertTriangle, IconRadio, IconChevronRight } from "./icons";

interface CommandHeaderProps {
  onToggleCopilot?: () => void;
  isCopilotOpen?: boolean;
  onExitToPortal?: () => void;
  onGoToLogin?: () => void;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onToggleCopilot,
  isCopilotOpen = false,
  onExitToPortal,
  onGoToLogin,
}) => {
  const { t } = useI18n();
  const {
    incidentCode,
    incidentStatus,
    hazardState,
    backendStatus,
    setActiveNavTab,
  } = useDemoScenario();

  const { user, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(now);
  const initials = (user?.full_name || user?.username || "TG")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex flex-col border-b border-slate-200 dark:border-cyan-950/70 bg-white/95 dark:bg-[#071421]/95 backdrop-blur-md sticky top-0 z-50 transition-colors w-full min-w-0">
      {backendStatus === "DISCONNECTED" && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-xs font-mono flex items-center justify-between shadow-md border-b border-red-700 animate-pulse">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Backend disconnected on {getApiBaseDisplayUrl()}. Operating in degraded mode.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-red-800 px-2 py-0.5 rounded">DEGRADED</span>
        </div>
      )}

      {backendStatus === "DEGRADED" && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-mono flex items-center justify-between shadow-md border-b border-amber-700">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Backend available but database latency is elevated.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-800 px-2 py-0.5 rounded">DEGRADED</span>
        </div>
      )}

      <div className="relative flex items-center justify-between px-3 sm:px-4 lg:px-5 py-2 w-full min-w-0 gap-2.5 min-h-[68px]">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs p-1 overflow-hidden dark:border-cyan-900/60 dark:bg-[#102437]">
            <img src="/logo.png" alt="TerraGuardian AI Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight font-sans truncate">
              {t("brand_title", undefined, "TERRAGUARDIAN AI")}
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              {incidentCode || "TG-2048"} • {incidentStatus || "MONITORING"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#102437] px-2.5 py-1.5">
            <span className={`h-2 w-2 rounded-full ${backendStatus === "CONNECTED" ? "bg-emerald-500 animate-pulse" : backendStatus === "DEGRADED" ? "bg-amber-500" : "bg-slate-400"}`} />
            <span className={`text-[9px] font-mono font-bold tracking-wider ${backendStatus === "CONNECTED" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}>
              {backendStatus === "CONNECTED" ? "LIVE" : backendStatus === "DEGRADED" ? "DEGRADED" : "CONNECTING"}
            </span>
            <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="leading-tight">
              <span className="block whitespace-nowrap text-[10px] font-semibold text-slate-700 dark:text-slate-200">{dateLabel}</span>
              <span className="block whitespace-nowrap text-[9px] font-mono text-slate-500 dark:text-slate-400">{timeLabel} IST</span>
            </span>
          </div>
          <button
            onClick={() => setActiveNavTab("ALERTS")}
            title="Open alerts"
            aria-label="Open alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#102437] text-slate-600 dark:text-slate-200 hover:border-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <IconAlertTriangle className="w-4 h-4" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">4</span>
          </button>
          <button
            onClick={() => setActiveNavTab("QUEUE")}
            title="Open priority queue"
            aria-label="Open priority queue"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#102437] text-slate-600 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-500 transition-colors cursor-pointer"
          >
            <IconRadio className="w-4 h-4" />
          </button>
          <ThemeToggle />

          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen((open) => !open);
                }}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#102437] px-2 py-1.5 hover:border-cyan-500/60 transition-colors cursor-pointer max-w-[210px]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white dark:bg-cyan-900 dark:text-cyan-100">{initials}</span>
                <span className="hidden sm:block min-w-0 text-left">
                  <span className="block truncate text-[11px] font-bold text-slate-900 dark:text-white">{user.full_name || user.username}</span>
                  <span className="block truncate text-[9px] text-slate-500 dark:text-slate-400">{user.role.replaceAll("_", " ")} · {user.agency || "Operations"}</span>
                </span>
                <IconChevronRight className="hidden sm:block h-3.5 w-3.5 rotate-90 text-slate-500 dark:text-slate-400" />
              </button>

              {isProfileOpen && (
                <div role="menu" aria-label="Choose an operations role" className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-24px))] rounded-xl border border-slate-200 dark:border-cyan-900/70 bg-white dark:bg-[#0b1b2a] p-2 shadow-2xl shadow-slate-950/20 z-[70]">
                  <div className="border-b border-slate-100 dark:border-slate-800 px-2 pb-2 mb-1.5">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Choose role</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Continue to secure sign-in</div>
                    </div>
                  </div>
                  <div className="max-h-[min(55vh,360px)] overflow-y-auto space-y-1">
                    {COMMAND_DEMO_ACCOUNTS.map((account) => {
                      return (
                        <button
                          key={account.username}
                          role="menuitem"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onGoToLogin?.();
                          }}
                          className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">{account.roleLabel}</span>
                              <span className="block truncate text-[9px] text-slate-500 dark:text-slate-400">{account.role.replaceAll("_", " ")} · {account.agency}</span>
                            </span>
                            <span className="shrink-0 text-[9px] font-mono font-bold text-cyan-700 dark:text-cyan-300">SIGN IN</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="mt-2 w-full rounded-lg border border-rose-200 dark:border-rose-900/60 px-2.5 py-2 text-left text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    {t("ops_btn_signout", undefined, "Sign Out")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
