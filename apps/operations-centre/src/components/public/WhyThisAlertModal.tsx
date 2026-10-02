import React from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconInfo,
  IconShieldCheck,
  IconAlertTriangle,
  IconMapPin,
  IconFileText,
  IconActivity,
  IconClock,
} from "../icons";

interface WhyThisAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyThisAlertModal: React.FC<WhyThisAlertModalProps> = ({ isOpen, onClose }) => {
  const { location } = useLocationService();
  const { t } = useCitizenI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <IconInfo className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {t("why_this_alert_title")}
              </h3>
              <div className="text-[11px] font-mono text-slate-400">
                Statutory Evidence & Geospatial Correlation Trace
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Four-Factor Provenance Checklist */}
        <div className="space-y-3 text-xs leading-relaxed">
          {/* Factor 1: Location Overlap */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-cyan-300 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <IconMapPin className="w-4 h-4 text-emerald-400" />
                1. GEOSPATIAL CORRIDOR OVERLAP
              </span>
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded">
                MATCHED
              </span>
            </div>
            <p className="text-slate-300">
              {t("why_criterion_1")}
            </p>
            <div className="bg-slate-950/70 p-2 rounded text-[11px] font-mono text-slate-300">
              Detected Coordinates: {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E (West Kameng district boundary).
            </div>
          </div>

          {/* Factor 2: Active Incident TG-2048 */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-red-300 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <IconAlertTriangle className="w-4 h-4 text-red-400" />
                2. ACTIVE CRITICAL INCIDENT TG-2048
              </span>
              <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 px-1.5 py-0.5 rounded">
                CRITICAL HAZARD
              </span>
            </div>
            <p className="text-slate-300">
              {t("why_criterion_2")}
            </p>
            <div className="bg-slate-950/70 p-2 rounded text-[11px] font-mono text-slate-300">
              Formation: Weathered phyllites & mica schists on 64° hillside above NH-13 arterial lifeline.
            </div>
          </div>

          {/* Factor 3: Rainfall Saturation */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-amber-300 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <IconActivity className="w-4 h-4 text-amber-400" />
                3. GEOTECHNICAL SATURATION THRESHOLD
              </span>
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded">
                THRESHOLD EXCEEDED
              </span>
            </div>
            <p className="text-slate-300">
              {t("why_criterion_3")}
            </p>
            <div className="bg-slate-950/70 p-2 rounded text-[11px] font-mono text-slate-300 flex justify-between">
              <span>7-Day SMR Saturation: <strong>184.6 mm</strong></span>
              <span>Trigger Threshold: <strong>120.0 mm</strong></span>
            </div>
          </div>

          {/* Factor 4: Statutory Legal Order */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-indigo-300 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <IconFileText className="w-4 h-4 text-indigo-400" />
                4. STATUTORY EXECUTIVE AUTHORIZATION
              </span>
              <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-1.5 py-0.5 rounded">
                LEGALLY ENACTED
              </span>
            </div>
            <p className="text-slate-300">
              {t("why_criterion_4")}
            </p>
            <div className="bg-slate-950/70 p-2 rounded text-[11px] font-mono text-slate-300">
              Enacted under Disaster Management Act 2005 (Sec 30/34) by DC/DM West Kameng (#DDMA-WK-884). Dispatched SDRF Team Alpha (ASI Sonam) controlling access at KM-38 checkpost.
            </div>
          </div>
        </div>

        {/* Invariant Disclosure Banner */}
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-[11px] font-mono text-indigo-200">
          <strong>LEGAL INVARIANT:</strong> AI models generate risk predictions and corridor recommendations. They do not possess legal authority to restrict highways. This alert was broadcast following formal statutory sign-off by the District Magistrate.
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-white/10"
        >
          Understood & Close
        </button>
      </div>
    </div>
  );
};
