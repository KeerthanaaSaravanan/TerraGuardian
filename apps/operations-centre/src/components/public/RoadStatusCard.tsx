import React, { useState, useEffect } from "react";
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
      <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <IconAlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Road Conditions Near You
              </h3>
              <div className="text-xs text-slate-300">
                Regional arterial corridor monitoring (current prototype data)
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
            DATA STATUS: PROTOTYPE OPERATIONAL DATA
          </span>
        </div>

        {/* PRIMARY AFFECTED CORRIDOR: NH-13 */}
        <div className="mt-3.5 p-4 rounded-xl bg-red-950/30 border border-red-500/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white font-mono uppercase tracking-wider">
                AFFECTED / RESTRICTED
              </span>
              <h4 className="font-bold text-sm sm:text-base text-white">
                NH-13 — KM-38 Corridor
              </h4>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              Trans-Arunachal Highway (BCT Section)
            </div>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            Landslide debris runout reported at KM-42. Prototype scenario indicates road restriction at KM-38 checkpost.
          </p>

          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/10 text-xs space-y-1">
            <div className="text-red-300 font-bold flex items-center gap-1.5">
              <span>⚠️ Action:</span>
              <span>Avoid this corridor. Do not attempt transit during active rainfall.</span>
            </div>
            <div className="text-emerald-300 font-medium">
              <span>✓ Suggested Alternate Corridor (Prototype Advisory):</span>{" "}
              <span className="text-slate-200">
                Divert via Rupa-Kalaktang Bypass (light vehicles only, subject to on-ground checkpost direction).
              </span>
            </div>
          </div>

          {onViewOnMap && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onViewOnMap}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Roadblock on Map</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* COMPACT OTHER NEARBY CORRIDORS */}
        <div className="mt-3 space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            Other Regional Corridors:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* NH-10 */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">NH-10 (Sevoke-Gangtok)</div>
                  <div className="text-[11px] text-slate-300">Prototype scenario: No current closure reported</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-300 font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                CLEAR
              </span>
            </div>

            {/* NH-29 */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">NH-29 (Dimapur-Kohima)</div>
                  <div className="text-[11px] text-slate-300">Prototype scenario: Caution advisory near Chumukedima</div>
                </div>
              </div>
              <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                CAUTION
              </span>
            </div>
          </div>
        </div>

        {/* Highway Helpline Assistance with Safe Dialog */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-300">
            Need highway assistance or route clarification?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveHotline(EMERGENCY_HOTLINES["1033"])}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <IconPhoneCall className="w-3.5 h-3.5" />
              <span>Highway Helpline (1033)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHotline(EMERGENCY_HOTLINES["1077"])}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <IconPhoneCall className="w-3.5 h-3.5" />
              <span>District Cell (1077)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Device-Aware Confirmation Dialog */}
      <EmergencyCallDialog
        isOpen={Boolean(activeHotline)}
        onClose={() => setActiveHotline(null)}
        hotline={activeHotline}
      />
    </>
  );
};
