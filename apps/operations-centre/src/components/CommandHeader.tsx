import React from "react";
import { useDemoScenario } from "../context/DemoScenarioContext";
import { useAuth } from "../context/AuthContext";
import { getApiBaseDisplayUrl } from "../services/apiClient";
import { ThemeToggle } from "./common";
import { IconRotateCcw, IconShieldCheck, IconAlertTriangle, IconSparkles } from "./icons";

interface CommandHeaderProps {
  onToggleCopilot?: () => void;
  isCopilotOpen?: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onToggleCopilot,
  isCopilotOpen = false,
}) => {
  const {
    resetDemo,
    incidentCode,
    incidentLocation,
    incidentStatus,
    hazardState,
    riskLevel,
    backendStatus,
  } = useDemoScenario();

  const { user, logout, isAuthorityUser } = useAuth();

  return (
    <header className="flex flex-col border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md sticky top-0 z-50 transition-colors w-full min-w-0">
      {/* Truthful Offline Warning Banner if backend fails */}
      {backendStatus === "DISCONNECTED" && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-xs font-mono flex items-center justify-between shadow-md border-b border-red-700 animate-pulse">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Backend Disconnected ({getApiBaseDisplayUrl()}). Operating in degraded offline state.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-red-800 px-2 py-0.5 rounded">
            Degraded Offline
          </span>
        </div>
      )}

      {backendStatus === "DEGRADED" && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-mono flex items-center justify-between shadow-md border-b border-amber-700">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Backend Degraded. FastAPI server reachable, but database connectivity is degraded.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-800 px-2 py-0.5 rounded">
            Database Degraded
          </span>
        </div>
      )}

      {/* 3-Zone Responsive Command Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 w-full min-w-0 gap-3">
        {/* LEFT ZONE: Brand & Platform Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs p-1 overflow-hidden">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight font-sans">
              TERRAGUARDIAN AI
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
              DISASTER INTELLIGENCE PLATFORM
            </span>
          </div>
        </div>

        {/* CENTER ZONE: Active Operational Context Pill */}
        <div className="hidden md:flex items-center justify-center min-w-0 flex-1 px-2">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 px-3 py-1.5 rounded-full font-mono text-xs shadow-2xs max-w-xl truncate">
            <span className="flex items-center gap-1.5 shrink-0 font-bold text-slate-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full shrink-0 ${backendStatus === "CONNECTED" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
              {incidentCode || "TG-2048"}
            </span>
            <span className="text-slate-300 dark:text-neutral-700 shrink-0">•</span>
            <span className="text-slate-600 dark:text-neutral-300 font-semibold truncate shrink">
              KM-42 • WEST KAMENG
            </span>
            <span className="text-slate-300 dark:text-neutral-700 shrink-0">•</span>
            <span className={`font-bold shrink-0 ${
              backendStatus === "CONNECTED" 
                ? "text-emerald-700 dark:text-emerald-400" 
                : backendStatus === "DEGRADED"
                ? "text-amber-700 dark:text-amber-400"
                : "text-amber-600 dark:text-amber-400"
            }`}>
              {backendStatus === "CONNECTED"
                ? `MONITORING (${hazardState || "ACTIVE"})`
                : backendStatus === "DEGRADED"
                ? `DEGRADED (${hazardState || "ACTIVE"})`
                : backendStatus === "CONNECTING"
                ? "CONNECTING..."
                : `CONTROLLED DEMO (${hazardState || "ACTIVE"})`}
            </span>
          </div>
        </div>

        {/* RIGHT ZONE: Health, User Role & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* System Health Indicators */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs shrink-0">
            <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1.5 text-[11px] ${
              backendStatus === "CONNECTED"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                : backendStatus === "DEGRADED"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                : "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                backendStatus === "CONNECTED"
                  ? "bg-emerald-500"
                  : backendStatus === "DEGRADED"
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`} />
              {backendStatus === "CONNECTED" ? "OPERATIONAL" : backendStatus === "DEGRADED" ? "DEGRADED" : "OFFLINE DEMO"}
            </span>

            {/* Dynamic Real Backend Connection Badge */}
            {backendStatus === "CONNECTED" ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                API CONNECTED
              </span>
            ) : backendStatus === "CONNECTING" ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                CONNECTING...
              </span>
            ) : backendStatus === "DEGRADED" ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 border border-amber-400 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                DATABASE DEGRADED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 border border-red-400 text-red-800 dark:text-red-300 font-bold flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                DISCONNECTED
              </span>
            )}
          </div>


          {/* User Session & Role */}
          {user && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isAuthorityUser ? "bg-purple-500" : "bg-emerald-500"}`} />
              <span className="font-semibold text-slate-800 dark:text-neutral-200 max-w-[80px] sm:max-w-[120px] truncate" title={user.full_name}>
                {user.full_name}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                isAuthorityUser 
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" 
                  : "bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200 border-slate-300 dark:border-neutral-600"
              }`}>
                {user.role}
              </span>
            </div>
          )}

          {/* Operational Copilot Trigger Button */}
          {onToggleCopilot && (
            <button
              onClick={onToggleCopilot}
              title="Toggle Operational Copilot (Command & Dialogue Layer)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                isCopilotOpen
                  ? "bg-indigo-600 text-white border border-indigo-400"
                  : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
              }`}
            >
              <IconSparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Copilot</span>
            </button>
          )}

          {/* Reset Baseline Action */}
          <button
            onClick={resetDemo}
            title="Reset Scenario to Initial Baseline"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono transition-colors border border-slate-300 dark:border-neutral-700 shrink-0 cursor-pointer"
          >
            <IconRotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Reset</span>
          </button>

          <ThemeToggle />

          {/* Standalone Sign Out Button */}
          {user && (
            <button
              onClick={logout}
              title="Sign out of Operations Session"
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-mono font-bold border border-red-300 dark:border-red-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
