import React, { useState } from "react";
import { useDemoScenario, PrimaryNavTab } from "../context/DemoScenarioContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
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
  const { t } = useI18n();
  const { theme } = useTheme();
    const isDark = theme === "dark";
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
      title: t("nav_group_command", undefined, "COMMAND"),
      items: [
        {
          id: "OPERATIONS",
          label: t("nav_situational_overview", undefined, "Command Centre"),
          icon: IconRadar,
        },
        {
          id: "QUEUE",
          label: t("nav_priority_queue", undefined, "Incident Queue"),
          icon: IconShieldAlert,
          badge: "4",
        },
      ],
    },
    {
      title: t("nav_group_intelligence", undefined, "INCIDENT INTELLIGENCE"),
      items: [
        {
          id: "MAP",
          label: t("nav_tactical_map", undefined, "NER Tactical Map"),
          icon: IconLayers,
        },
        {
          id: "INCIDENTS",
          label: t("nav_incident_twin", undefined, "Incident Twin"),
          icon: IconMapPin,
        },
        {
          id: "EVIDENCE",
          label: t("nav_evidence_lineage", undefined, "Evidence Hub"),
          icon: IconShieldCheck,
        },
      ],
    },
    {
      title: t("nav_group_response", undefined, "RESPONSE"),
      items: [
        {
          id: "ALERTS",
          label: t("nav_alerts_pipeline", undefined, "Monitoring & Alerts"),
          icon: IconAlertTriangle,
          badge: "4",
        },
        {
          id: "FIELD",
          label: t("nav_field_operations", undefined, "Field Operations"),
          icon: IconActivity,
        },
      ],
    },
    {
      title: t("nav_group_outcomes", undefined, "ASSESS & GOVERN"),
      items: [
        {
          id: "OUTCOMES",
          label: t("nav_hypotheses_nbi", undefined, "Impact Analysis"),
          icon: IconRadio,
        },
        {
          id: "REVIEW",
          label: t("nav_forensic_review", undefined, "Decisions & Review"),
          icon: IconClock,
        },
      ],
    },
    {
      title: t("nav_group_system", undefined, "SYSTEM"),
      items: [
        {
          id: "ADMIN",
          label: t("nav_data_admin", undefined, "Reports & Data"),
          icon: IconFileText,
        },
        {
          id: "REPLAY",
          label: t("nav_replay_showcase", undefined, "Replay Showcase"),
          icon: IconClock,
        },
      ],
    },
  ];
  const navItems = sections.flatMap((section) => section.items);
  return (
    <aside
      className={`hidden md:flex h-screen min-h-0 flex-col overflow-hidden border-r transition-all duration-200 z-40 shrink-0 ${
        isDark ? "border-emerald-950/80 bg-[#071711]" : "border-emerald-200 bg-emerald-50"
      } ${
        isCollapsed ? "w-[68px]" : "w-[264px]"
      }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className={`flex items-center justify-between px-3 py-3.5 border-b ${isDark ? "border-emerald-950/80" : "border-emerald-200"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg bg-white p-1 object-contain border border-slate-200 dark:border-emerald-900/60" />
            <div className="min-w-0">
              <div className={`text-[10px] font-mono font-bold tracking-[0.16em] ${isDark ? "text-slate-100" : "text-slate-900"}`}>TERRAGUARDIAN</div>
              <div className={`text-[9px] font-mono tracking-wider ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>DISASTER OPS OS</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"}`}
        >
          <span className="font-mono text-xs font-bold">{isCollapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* Semantic Navigation Groups */}
      <nav
        aria-label={t("nav_operations_shortcuts", undefined, "Operations Shortcuts")}
        className={`overflow-hidden px-2 pt-1.5 pb-1 ${isCollapsed ? "flex-none" : "flex-1 min-h-0 flex flex-col"}`}
      >
        {isCollapsed ? (
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => item.id === "INCIDENTS" ? openIncident("TG-2048") : setActiveNavTab(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative flex w-full items-center justify-center rounded-lg border py-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-700 text-white shadow-[0_4px_14px_rgba(5,150,105,0.22)]"
                      : isDark
                        ? "border-transparent text-slate-300 hover:border-emerald-900/70 hover:bg-emerald-950/50"
                        : "border-transparent text-slate-700 hover:border-emerald-200 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.badge && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </button>
              );
            })}
          </div>
        ) : (
        <div className="min-h-0 flex-1 flex flex-col justify-evenly">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!isCollapsed && (
                <div className={`px-2.5 pb-0.5 text-[9px] font-mono font-bold tracking-[0.14em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNavTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "INCIDENTS") {
                          openIncident("TG-2048");
                        } else {
                          setActiveNavTab(item.id);
                        }
                      }}
                      title={isCollapsed ? `${item.label} [${item.id}]` : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-[13px] leading-[18px] font-mono font-semibold transition-all cursor-pointer border ${
                        isActive
                          ? "bg-emerald-700 text-white border-emerald-400/60 shadow-[0_6px_18px_rgba(5,150,105,0.24)] font-bold"
                          : isDark
                            ? "border-transparent text-slate-300 hover:bg-emerald-950/50 hover:border-emerald-900/70"
                            : "border-transparent text-slate-700 hover:bg-white hover:border-emerald-200"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      )}
                      <span className="sr-only">{item.id}</span>
                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
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
        </div>
        )}
      </nav>

      {/* ── Compact NER Region Box with India Map (Matching Reference Screenshot) ── */}
      {!isCollapsed && (
        <div className={`mx-2 mb-1.5 flex-none rounded-xl border px-2.5 py-1.5 font-mono shadow-md ${isDark ? "border-emerald-900/60 bg-[#0b1c14] text-white" : "border-emerald-200 bg-white text-slate-800"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className={`truncate text-[12px] font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{t("ner_region_title", undefined, "NER Region")}</div>
              <div className={`truncate text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("ner_region_sub", undefined, "7 States • 122 Districts")}</div>
            </div>
            <div className="w-7 h-7 shrink-0" title="North Eastern Region, India">
              <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor">
                <path d="M18 8 L22 12 L20 18 L16 22 L14 26 L12 32 L16 38 L20 44 L22 40 L24 34 L26 28 L24 22 L28 18 L32 20 L30 14 L24 10 Z" fill="#334155" stroke="#475569" strokeWidth="0.8" />
                <path d="M32 18 Q38 14 42 16 L44 20 L42 24 L38 26 L34 22 Z" fill="#10b981" stroke="#34d399" strokeWidth="1.2" />
                <circle cx="38" cy="20" r="1.2" fill="#34d399" />
              </svg>
            </div>
          </div>

          <div className={`mt-1 grid grid-cols-2 gap-x-2 gap-y-0 border-t pt-1 ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <div className="flex items-baseline gap-1.5"><strong className={`text-xs ${isDark ? "text-white" : "text-slate-900"}`}>298</strong><span className={`truncate text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("ner_stat_sites", undefined, "Monitoring Sites")}</span></div>
            <div className="flex items-baseline gap-1.5"><strong className={`text-xs ${isDark ? "text-white" : "text-slate-900"}`}>84</strong><span className={`truncate text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("ner_stat_stations", undefined, "Weather Stations")}</span></div>
            <div className="flex items-baseline gap-1.5"><strong className={`text-xs ${isDark ? "text-white" : "text-slate-900"}`}>12</strong><span className={`truncate text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("ner_stat_active", undefined, "Active Incidents")}</span></div>
            <div className="flex items-baseline gap-1.5"><strong className="text-xs text-red-500">3</strong><span className={`truncate text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("ner_stat_critical", undefined, "Critical")}</span></div>
          </div>

          <div className={`mt-1 flex items-center justify-between gap-2 border-t pt-1 text-[9px] font-mono ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <span className={`flex min-w-0 items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${backendStatus === "CONNECTED" ? "bg-emerald-400" : backendStatus === "DEGRADED" ? "bg-amber-400" : backendStatus === "CONNECTING" ? "bg-amber-300" : "bg-rose-400"}`} />
              <span className="truncate">{backendStatus === "CONNECTED" ? "ONLINE" : backendStatus === "DEGRADED" ? "DEGRADED" : backendStatus === "CONNECTING" ? "CONNECTING" : "OFFLINE"}</span>
            </span>
            <span className={`truncate text-right italic ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t("ner_motto", undefined, "Resilient Mountains, Safer Communities")}</span>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div
          className={`relative mx-2 mt-auto mb-2 h-[72px] flex-none overflow-hidden rounded-lg border bg-cover bg-center ${isDark ? "border-emerald-900/60" : "border-emerald-200"}`}
          style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
          aria-label="Eastern Himalayan mountain landscape"
        >
          <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-t from-[#06150f]/90 to-[#06150f]/20" : "bg-gradient-to-t from-white/90 to-white/10"}`} />
          <div className={`absolute inset-x-2 bottom-1 text-[9px] leading-tight font-mono ${isDark ? "text-white/90" : "text-slate-900"}`}>
            RESILIENT MOUNTAINS<br />
            <span className={isDark ? "text-emerald-300" : "text-emerald-800"}>SAFER COMMUNITIES</span>
          </div>
        </div>
      )}

    </aside>
  );
};
