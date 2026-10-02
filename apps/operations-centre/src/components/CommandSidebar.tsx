import React, { useState } from "react";
import { useDemoScenario, PrimaryNavTab } from "../context/DemoScenarioContext";
import {
  IconRadar,
  IconMapPin,
  IconLayers,
  IconActivity,
  IconShieldCheck,
  IconShieldAlert,
  IconClock,
  IconAlertTriangle,
  IconRadio,
  IconFileText,
} from "./icons";

interface NavItem {
  id: PrimaryNavTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  onClickCustom?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
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
    incidentViewMode,
    setIncidentViewMode,
    backendStatus,
  } = useDemoScenario();

  const sections: NavSection[] = [
    {
      title: "COMMAND",
      items: [
        {
          id: "OPERATIONS",
          label: "Situational Overview",
          icon: IconRadar,
        },
        {
          id: "QUEUE",
          label: "Priority Queue",
          icon: IconShieldAlert,
          badge: "4",
        },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        {
          id: "MAP",
          label: "NER Tactical Map",
          icon: IconLayers,
        },
        {
          id: "INCIDENTS",
          label: "Incident Twin",
          icon: IconMapPin,
        },
        {
          id: "EVIDENCE",
          label: "Evidence Lineage",
          icon: IconShieldCheck,
        },
      ],
    },
    {
      title: "RESPONSE",
      items: [
        {
          id: "ALERTS",
          label: "Alerts Pipeline",
          icon: IconAlertTriangle,
          badge: "4",
        },
        {
          id: "FIELD",
          label: "Field Operations",
          icon: IconActivity,
        },
      ],
    },
    {
      title: "OUTCOMES",
      items: [
        {
          id: "OUTCOMES",
          label: "Hypotheses & NBI",
          icon: IconRadio,
        },
        {
          id: "REVIEW",
          label: "Forensic Review",
          icon: IconClock,
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          id: "ADMIN",
          label: "Data & Admin",
          icon: IconFileText,
        },
        {
          id: "REPLAY",
          label: "Replay Showcase",
          icon: IconClock,
        },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-200 z-40 shrink-0 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-neutral-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>DISASTER OPS OS</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition-colors mx-auto cursor-pointer"
        >
          <span className="font-mono text-xs font-bold">{isCollapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* Semantic Navigation Groups */}
      <nav aria-label="Operations Navigation" className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-neutral-500 uppercase">
                {sec.title}
              </div>
            )}
            <div className="space-y-0.5">
              {sec.items.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeNavTab === item.id;

                return (
                  <button
                    key={`${sec.title}-${item.label}-${idx}`}
                    onClick={() => {
                      if (item.id === "INCIDENTS") {
                        openIncident("TG-2048");
                      } else {
                        setActiveNavTab(item.id);
                      }
                    }}
                    title={isCollapsed ? `${item.label} [${item.id}]` : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    <span className="sr-only">{item.id}</span>
                    {!isCollapsed && (
                      <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                        isActive
                          ? "bg-emerald-700 text-emerald-100"
                          : "text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800"
                      }`}>
                        {item.id}
                      </span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isActive
                            ? "bg-emerald-800 text-white"
                            : "bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Utilities & System Connection */}
      <div className="p-2 border-t border-slate-200 dark:border-neutral-800 space-y-2">
        {/* Switch to Citizen Safe Portal */}
        <button
          onClick={onSwitchToPublic}
          title="Switch to Public Citizen Companion (TerraGuardian Safe)"
          className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-mono transition-colors border border-emerald-300/60 dark:border-emerald-700/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <IconRadio className="w-4 h-4 text-emerald-600 shrink-0" />
          {!isCollapsed && <span className="font-bold truncate">Citizen Safe</span>}
        </button>

        {/* Exit to Main Portal */}
        {onExitToPortal && (
          <button
            onClick={onExitToPortal}
            title="Exit Operations Centre and Return to Main Landing Portal"
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-mono transition-colors border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <IconShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span className="font-semibold truncate">Exit to Portal</span>}
          </button>
        )}

        {/* Executive Incident Briefing */}
        <button
          onClick={onOpenReportModal}
          title="Executive Incident Briefing Report"
          className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-mono transition-colors text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <IconFileText className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Briefing Doc</span>}
        </button>

        {/* Live Status indicator */}
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded font-mono text-[10px] border ${
            backendStatus === "CONNECTED"
              ? "bg-emerald-50/60 dark:bg-neutral-950 border-emerald-200 dark:border-neutral-800 text-emerald-700 dark:text-emerald-400"
              : backendStatus === "DEGRADED"
              ? "bg-amber-50/60 dark:bg-neutral-950 border-amber-200 dark:border-neutral-800 text-amber-700 dark:text-amber-400"
              : backendStatus === "CONNECTING"
              ? "bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400"
              : "bg-red-50/60 dark:bg-neutral-950 border-red-200 dark:border-neutral-800 text-red-700 dark:text-red-400"
          } ${isCollapsed ? "justify-center" : ""}`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              backendStatus === "CONNECTED"
                ? "bg-emerald-500 animate-ping"
                : backendStatus === "DEGRADED"
                ? "bg-amber-500 animate-pulse"
                : backendStatus === "CONNECTING"
                ? "bg-amber-400 animate-pulse"
                : "bg-red-500 animate-ping"
            }`}
          />
          {!isCollapsed && (
            <span className="font-bold truncate">
              {backendStatus === "CONNECTED"
                ? "ONLINE"
                : backendStatus === "DEGRADED"
                ? "DEGRADED"
                : backendStatus === "CONNECTING"
                ? "CONNECTING..."
                : "DISCONNECTED"}
            </span>
          )}
        </div>
      </div>

    </aside>
  );
};
