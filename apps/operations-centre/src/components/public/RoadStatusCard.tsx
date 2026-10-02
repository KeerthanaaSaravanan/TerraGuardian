import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { EmergencyCallDialog, EMERGENCY_HOTLINES, EmergencyHotlineInfo } from "./EmergencyCallDialog";
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconMapPin,
  IconClock,
  IconPhoneCall,
  IconChevronRight,
} from "../icons";

interface RoadStatusCardProps {
  onViewOnMap?: () => void;
}

export const RoadStatusCard: React.FC<RoadStatusCardProps> = ({ onViewOnMap }) => {
  const { t } = useCitizenI18n();
  const [activeHotline, setActiveHotline] = useState<EmergencyHotlineInfo | null>(null);

  return (
    <>
      <section aria-labelledby="road-conditions-title" id="citizen-roads-section" className="w-full">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors text-slate-900 dark:text-white">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <IconAlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h2 id="road-conditions-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                  {t("road_conditions_title")}
                </h2>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {t("road_conditions_subtitle")}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
              PROTOTYPE OPERATIONAL DATA
            </span>
          </div>

          {/* PRIMARY AFFECTED CORRIDOR: NH-13 */}
          <div className="mt-3.5 p-4 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-500/40 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white font-mono uppercase tracking-wider">
                  {t("road_corridor_restricted_badge")}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-red-950 dark:text-white">
                  NH-13 — KM-38 Corridor
                </h3>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                Trans-Arunachal Highway (BCT Section)
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {t("road_corridor_restricted_desc")}
            </p>

            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-white/10 text-xs space-y-1.5 shadow-sm">
              <div className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1.5">
                <span>⚠️ {t("road_action_avoid")}</span>
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                <span>✓ {t("road_suggested_bypass")}</span>
              </div>
            </div>

            {onViewOnMap && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={onViewOnMap}
                  className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{t("view_danger_map")}</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* COMPACT OTHER NEARBY CORRIDORS */}
          <div className="mt-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Other Regional Corridors:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* NH-10 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">NH-10 Sevoke-Teesta</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Sikkim Lifeline</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                  OPEN
                </span>
              </div>

              {/* NH-27 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">NH-27 Lumding-Haflong</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Dima Hasao Hill Section</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase font-mono">
                  CAUTION
                </span>
              </div>
            </div>
          </div>

          {/* Quick Highway Helpline Button */}
          <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Need immediate highway road assistance?
            </div>
            <button
              type="button"
              onClick={() => setActiveHotline(EMERGENCY_HOTLINES["1033"])}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-300 dark:border-white/10 flex items-center gap-1.5 cursor-pointer"
            >
              <IconPhoneCall className="w-3.5 h-3.5 text-indigo-500" />
              <span>Call 1033 (NHAI)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Emergency Call Dialog */}
      <EmergencyCallDialog
        isOpen={activeHotline !== null}
        onClose={() => setActiveHotline(null)}
        hotline={activeHotline}
      />
    </>
  );
};
