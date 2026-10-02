import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconInfo,
  IconCheck,
  IconX,
  IconShieldCheck,
  IconActivity,
  IconFileText,
} from "../icons";

interface WhyThisAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyThisAlertModal: React.FC<WhyThisAlertModalProps> = ({ isOpen, onClose }) => {
  const { location } = useLocationService();
  const { t } = useCitizenI18n();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
              <IconInfo className="w-5 h-5" />
            </span>
            <div>
              <h3 id="why-alert-title" className="font-extrabold text-base sm:text-lg">
                {t("why_this_alert_title")}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {t("why_this_alert_subtitle")}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Core Simple Explanation Checklist */}
        <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
          <p className="font-medium text-slate-600 dark:text-slate-300">
            {t("why_checklist_intro")}
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Active Incident:</strong> An active landslide/debris incident (TG-2048) is affecting the NH-13 Bhalukpong-Tenga corridor.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Your Monitored Location:</strong> Your device position ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E) is within or near the monitored corridor buffer.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Highway Restriction:</strong> The road near this area is restricted at KM-38 checkpost to prevent commuters from entering active debris runout.
              </div>
            </div>
          </div>

          {/* Source & Metadata Summary */}
          <div className="p-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>SOURCE PROVENANCE:</span>
              <span className="text-slate-900 dark:text-white font-bold">West Kameng Scenario (DDMA / SDRF)</span>
            </div>
            <div className="flex justify-between">
              <span>DATA STATUS:</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">PROTOTYPE OPERATIONAL ASSESSMENT</span>
            </div>
          </div>
        </div>

        {/* Technical Details Accordion */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-2">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-between w-full"
          >
            <span>{showTechnicalDetails ? "Hide Technical Evidence Lineage" : "Technical Details"}</span>
            <span>{showTechnicalDetails ? "▲" : "▼"}</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 font-mono text-[11px] space-y-1 text-slate-600 dark:text-slate-400 animate-in fade-in">
              <div>INCIDENT ID: TG-2048 (Slope Failure KM-42)</div>
              <div>SLOPE GRADIENT: 34° Dip Slope</div>
              <div>GEOLOGY: Bhalukpong Formation (Siwalik Sandstones)</div>
              <div>RAINFALL: 142mm Cumulative 72H Precipitation</div>
              <div>STATUS: Monitored Operational twin (West Kameng)</div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
        >
          {t("btn_close")}
        </button>
      </div>
    </div>
  );
};
