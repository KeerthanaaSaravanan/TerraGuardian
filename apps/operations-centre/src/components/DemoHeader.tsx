import React from "react";
import { useDemoScenario, PrimaryNavTab } from "../context/DemoScenarioContext";
import { getApiBaseDisplayUrl } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./common";
import {
  IconRotateCcw,
  IconShieldCheck,
  IconAlertTriangle,
  IconMapPin,
  IconLayers,
  IconActivity,
  IconRadar,
  IconClock,
  IconRadio,
} from "./icons";

export const DemoHeader: React.FC = () => {
  const {
    resetDemo,
    incidentStatus,
    backendStatus,
    activeNavTab,
    setActiveNavTab,
  } = useDemoScenario();

  const { user, logout, isAuthorityUser } = useAuth();

  return (
    <header className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 transition-colors w-full min-w-0">
      {/* ── Truthful Backend Offline Alert Banner ── */}
      {backendStatus === "OFFLINE_FALLBACK" && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-xs font-mono flex items-center justify-between shadow-md border-b border-red-700 animate-pulse">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Unable to connect to TerraGuardian API at {getApiBaseDisplayUrl()}. Operational data unavailable. Reconnecting...
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-red-800 px-2 py-0.5 rounded">
            Degraded Offline State
          </span>
        </div>
      )}

      {/* ── Top Command Header Bar ── */}
      <div className="flex items-center justify-between px-2.5 sm:px-4 lg:px-6 py-2 border-b border-slate-200/80 dark:border-slate-800/80 w-full min-w-0 gap-2 sm:gap-3 xl:gap-4 overflow-hidden">
        {/* LEFT ZONE: Brand & Core Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs p-1 overflow-hidden">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white shrink-0">
                TERRAGUARDIAN AI
              </span>
              <span className="hidden xl:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-semibold shrink-0">
                Operational Disaster Intelligence Platform
              </span>
              <span className="inline-block xl:hidden text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 font-bold shrink-0">
                OPS COMMAND
              </span>
            </div>
            <div className="text-[10px] font-mono tracking-wide text-slate-500 dark:text-slate-400 font-medium truncate hidden 2xl:block">
              FROM WARNING TO ACTION • <span className="opacity-90">MONITORING WATCHES THE HAZARD. TERRAGUARDIAN MANAGES THE INCIDENT.</span>
            </div>
          </div>
        </div>

        {/* CENTER ZONE: Operational Status & API Connection */}
        <div className="hidden md:flex items-center justify-center gap-1.5 lg:gap-2.5 shrink-0 font-mono text-xs">
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 font-bold flex items-center gap-1.5 shadow-2xs shrink-0 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            OPERATIONAL
          </span>

          {backendStatus === "CONNECTED" ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 shrink-0 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              API CONNECTED
            </span>
          ) : backendStatus === "CONNECTING" ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold shrink-0 text-[11px]">
              CONNECTING...
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 border border-red-400 text-red-800 dark:text-red-300 font-bold flex items-center gap-1.5 shrink-0 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              OFFLINE
            </span>
          )}

          {/* Incident Context */}
          <span className="hidden lg:inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shrink-0 text-[11px]">
            INCIDENT: <strong className="text-slate-900 dark:text-white ml-1">TG-2048</strong>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold ml-1">({incidentStatus})</span>
          </span>
        </div>

        {/* RIGHT ZONE: User Identity, Role, Actions (SIGN OUT ALWAYS ACCESSIBLE) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* User Session & Role Pill */}
          {user && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-lg text-xs font-mono shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isAuthorityUser ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[90px] sm:max-w-[120px] lg:max-w-[140px] truncate" title={user.full_name}>
                {user.full_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600 shrink-0">
                {user.role}
              </span>
            </div>
          )}

          {/* Standalone Sign Out Button: ALWAYS visible and accessible */}
          {user && (
            <button
              onClick={logout}
              title="Sign out of Operations Session"
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-mono font-bold border border-red-300 dark:border-red-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Sign Out</span>
            </button>
          )}

          <ThemeToggle />

          <button
            onClick={resetDemo}
            title="Reset to Initial Operational Baseline"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition-colors border border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
          >
            <IconRotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Workspace Badge */}
          <span className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-emerald-700 text-white font-mono text-xs font-bold shadow-2xs shrink-0 items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
            Workspace
          </span>
        </div>
      </div>

      {/* ── Primary Navigation Bar ── */}
      <nav
        aria-label="Operational Workspace Navigation"
        className="flex items-center justify-between py-1.5 px-3 sm:px-6 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200/50 dark:border-slate-800/50 w-full min-w-0"
      >
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 w-full min-w-0">
          {[
            { id: "OPERATIONS", label: "OPERATIONS", icon: IconRadar },
            { id: "MAP", label: "MAP", icon: IconLayers },
            { id: "INCIDENTS", label: "INCIDENTS", icon: IconMapPin, badge: "4" },
            { id: "EVIDENCE", label: "EVIDENCE", icon: IconShieldCheck },
            { id: "ALERTS", label: "ALERTS", icon: IconAlertTriangle },
            { id: "FIELD", label: "FIELD", icon: IconActivity },
            { id: "OUTCOMES", label: "OUTCOMES", icon: IconRadio },
            { id: "REVIEW", label: "REVIEW", icon: IconClock },
            { id: "ADMIN", label: "ADMIN" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveNavTab(tab.id as PrimaryNavTab)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/50"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400 shrink-0 ml-4">
          <span>WEST KAMENG DDMA CONTROL HUB</span>
        </div>
      </nav>
    </header>
  );
};
