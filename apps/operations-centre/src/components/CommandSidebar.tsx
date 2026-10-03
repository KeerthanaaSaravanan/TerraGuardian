import React, { useState } from "react";
import { useDemoScenario, PrimaryNavTab } from "../context/DemoScenarioContext";
import {
  IconRadar,
  IconMapPin,
  IconLayers,
  IconActivity,
  IconShieldCheck,
  IconShieldAlert,
  IconAlertTriangle,
  IconRadio,
  IconFileText,
  IconMountain,
  IconBarChart,
  IconUsers,
  IconSettings,
} from "./icons";

interface NavItemConfig {
  id: PrimaryNavTab | "COMMUNITY" | "REPORTS" | "SETTINGS";
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  badgeType?: "red" | "amber" | "cyan" | "emerald";
  targetTab?: PrimaryNavTab;
  customAction?: "PUBLIC" | "REPORT" | "INCIDENT_TWIN";
}

interface CommandSidebarProps {
  onSwitchToPublic: () => void;
  onOpenReportModal: () => void;
  onExitToPortal?: () => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  onSwitchToPublic,
  onOpenReportModal,
  onExitToPortal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    activeNavTab,
    setActiveNavTab,
    openIncident,
    backendStatus,
  } = useDemoScenario();

  // Canonical 12-Item Information Architecture
  const navItems: NavItemConfig[] = [
    {
      id: "OPERATIONS",
      label: "Command Centre",
      icon: IconRadar,
      targetTab: "OPERATIONS",
    },
    {
      id: "QUEUE",
      label: "Incidents",
      icon: IconShieldAlert,
      badge: "4",
      badgeType: "red",
      targetTab: "QUEUE",
    },
    {
      id: "INCIDENTS",
      label: "Incident Twin",
      icon: IconMapPin,
      customAction: "INCIDENT_TWIN",
    },
    {
      id: "EVIDENCE",
      label: "Evidence Hub",
      icon: IconShieldCheck,
      targetTab: "EVIDENCE",
    },
    {
      id: "MAP",
      label: "Impact Analysis",
      icon: IconLayers,
      targetTab: "MAP",
    },
    {
      id: "FIELD",
      label: "Field Operations",
      icon: IconActivity,
      targetTab: "FIELD",
    },
    {
      id: "OUTCOMES",
      label: "Decisions & Actions",
      icon: IconRadio,
      targetTab: "OUTCOMES",
    },
    {
      id: "ALERTS",
      label: "Monitoring",
      icon: IconAlertTriangle,
      badge: "4",
      badgeType: "amber",
      targetTab: "ALERTS",
    },
    {
      id: "ADMIN",
      label: "Analytics",
      icon: IconBarChart,
      targetTab: "ADMIN",
    },
    {
      id: "COMMUNITY",
      label: "Community Insights",
      icon: IconUsers,
      customAction: "PUBLIC",
    },
    {
      id: "REPORTS",
      label: "Reports",
      icon: IconFileText,
      customAction: "REPORT",
    },
    {
      id: "SETTINGS",
      label: "Settings",
      icon: IconSettings,
      targetTab: "ADMIN",
    },
  ];

  const handleNavClick = (item: NavItemConfig) => {
    if (item.customAction === "PUBLIC") {
      onSwitchToPublic();
    } else if (item.customAction === "REPORT") {
      onOpenReportModal();
    } else if (item.customAction === "INCIDENT_TWIN") {
      openIncident("TG-2048");
    } else if (item.targetTab) {
      setActiveNavTab(item.targetTab);
    }
  };

  const isItemActive = (item: NavItemConfig): boolean => {
    if (item.id === "OPERATIONS" && activeNavTab === "OPERATIONS") return true;
    if (item.id === "QUEUE" && activeNavTab === "QUEUE") return true;
    if (item.id === "INCIDENTS" && activeNavTab === "INCIDENTS") return true;
    if (item.id === "EVIDENCE" && activeNavTab === "EVIDENCE") return true;
    if (item.id === "MAP" && activeNavTab === "MAP") return true;
    if (item.id === "FIELD" && activeNavTab === "FIELD") return true;
    if (item.id === "OUTCOMES" && activeNavTab === "OUTCOMES") return true;
    if (item.id === "ALERTS" && activeNavTab === "ALERTS") return true;
    if (item.id === "ADMIN" && activeNavTab === "ADMIN") return true;
    return false;
  };

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-200 z-40 shrink-0 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ── Top Identity Header ── */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 flex items-center justify-center p-1.5 shadow-md shadow-cyan-900/30 shrink-0">
            <IconMountain className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white truncate">
                  TerraGuardian
                </span>
                <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800">
                  OPS
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-semibold truncate">
                Command Centre
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer shrink-0"
        >
          <span className="font-mono text-xs font-bold">{isCollapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* ── 12-Item World-Class Command Navigation ── */}
      <nav aria-label="Operations Navigation" className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              title={isCollapsed ? `${item.label}` : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all duration-150 relative cursor-pointer group ${
                active
                  ? "bg-gradient-to-r from-cyan-950/80 to-blue-900/60 dark:from-cyan-950/90 dark:to-blue-950/90 text-cyan-200 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.18)] font-bold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-neutral-900/90 border border-transparent font-medium"
              } ${isCollapsed ? "justify-center px-0" : ""}`}
            >
              {/* Active Left Indicator Bar */}
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active
                    ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                    : "text-slate-500 dark:text-neutral-400 group-hover:text-slate-800 dark:group-hover:text-neutral-200"
                }`}
              />

              {!isCollapsed && (
                <span className="flex-1 text-left truncate tracking-tight text-[11px]">
                  {item.label}
                </span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold leading-none shrink-0 ${
                    item.badgeType === "red"
                      ? "bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse"
                      : item.badgeType === "amber"
                      ? "bg-amber-500 text-slate-950 font-extrabold"
                      : "bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Regional Context Card at Bottom ── */}
      {!isCollapsed ? (
        <div className="p-2.5 border-t border-slate-200 dark:border-neutral-800 space-y-2">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-neutral-950 rounded-xl p-2.5 border border-slate-800 dark:border-neutral-800/80 text-white shadow-xl relative overflow-hidden">
            {/* Topographical Grid Pattern & Contour Background */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="ner-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ner-grid)" />
              </svg>
            </div>

            {/* Region Title with Beacon */}
            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <div>
                  <h4 className="text-xs font-bold font-sans text-cyan-200 leading-tight">
                    NER Region
                  </h4>
                  <div className="text-[9px] font-mono text-slate-400">
                    7 States • 122 Districts
                  </div>
                </div>
              </div>

              {/* Simplified North-East Region Vector Silhouette */}
              <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-800/60 p-0.5 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-full h-full text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {/* Abstract outline of NER Himalayas */}
                  <path d="M 4 22 Q 10 12 16 16 T 28 8" strokeLinecap="round" />
                  <path d="M 8 26 Q 16 18 24 20" strokeLinecap="round" strokeDasharray="1 2" />
                  <circle cx="16" cy="16" r="1.8" fill="currentColor" />
                  <circle cx="22" cy="11" r="1.4" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* 4 Operational Metrics Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
                <div className="text-slate-400 text-[8px] uppercase">Monitoring Sites</div>
                <div className="text-cyan-300 font-bold text-xs mt-0.5">84</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
                <div className="text-slate-400 text-[8px] uppercase">Weather Stations</div>
                <div className="text-cyan-300 font-bold text-xs mt-0.5">216</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
                <div className="text-slate-400 text-[8px] uppercase">Active Incidents</div>
                <div className="text-rose-400 font-bold text-xs mt-0.5 flex items-center gap-1">
                  <span>4</span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-rose-950 text-rose-300">P1-P3</span>
                </div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
                <div className="text-slate-400 text-[8px] uppercase">Critical</div>
                <div className="text-amber-400 font-bold text-xs mt-0.5 flex items-center gap-1">
                  <span>1</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                </div>
              </div>
            </div>

            {/* Connection Status Indicator */}
            <div className="relative z-10 mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between font-mono text-[9px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === "CONNECTED" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {backendStatus === "CONNECTED" ? "TELEMETRY CONNECTED" : "DEGRADED MODE"}
              </span>
              <span className="text-cyan-400 font-bold">ONLINE</span>
            </div>
          </div>

          {/* Quick Exit to Main Portal */}
          {onExitToPortal && (
            <button
              onClick={onExitToPortal}
              title="Return to Main Portal"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-mono font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-neutral-800 cursor-pointer"
            >
              <span>← Exit to Portal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 dark:border-neutral-800 flex flex-col items-center gap-2">
          <div
            title="Telemetry Status: Online"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      )}
    </aside>
  );
};
