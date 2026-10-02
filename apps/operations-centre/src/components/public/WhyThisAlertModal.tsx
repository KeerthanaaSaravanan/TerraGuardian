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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <IconInfo className="w-5 h-5" />
            </span>
            <div>
              <h3 id="why-alert-title" className="font-extrabold text-base sm:text-lg text-white">
                Why Am I Receiving This?
              </h3>
              <div className="text-xs text-slate-300">
                Transparent alert criteria for your area
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Core Simple Explanation Checklist */}
        <div className="space-y-2.5 text-xs text-slate-200">
          <p className="text-slate-300">
            You are receiving this safety alert because:
          </p>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-white/10 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-white">Active Incident:</strong> An active landslide/debris incident (TG-2048) is affecting the NH-13 Bhalukpong-Tenga corridor.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-white">Your Reported Location:</strong> Your location ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E) is within or near the monitored operational awareness area.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-white">Highway Restriction:</strong> The road near this area is restricted at KM-38 checkpost to prevent commuters from entering active debris runout.
              </div>
            </div>
          </div>

          {/* Source & Metadata Summary */}
          <div className="p-3 bg-slate-950/70 border border-white/10 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span>SOURCE AUTHORITY:</span>
              <span className="text-white font-bold">DDMA West Kameng & SDRF</span>
            </div>
            <div className="flex justify-between">
              <span>DATA STATUS:</span>
              <span className="text-cyan-400 font-bold">OPERATIONAL ASSESSMENT</span>
            </div>
            <div className="flex justify-between">
              <span>CORRIDOR:</span>
              <span className="text-slate-200">NH-13 Trans-Arunachal Highway</span>
            </div>
            <div className="flex justify-between">
              <span>LAST UPDATED:</span>
              <span className="text-slate-200">Live telemetry</span>
            </div>
          </div>
        </div>

        {/* Expandable Technical Details */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <IconInfo className="w-3.5 h-3.5" />
            <span>{showTechnicalDetails ? "Hide technical data" : "View technical criteria & statutory provenance"}</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-white/10 text-[11px] space-y-2 font-mono text-slate-300 animate-in fade-in duration-100">
              <div>
                <strong className="text-amber-300">RAINFALL SATURATION:</strong> 184.6 mm recorded over 7 days (geotechnical trigger threshold is 120.0 mm).
              </div>
              <div>
                <strong className="text-indigo-300">STATUTORY ORDER:</strong> Enacted by DC/DM West Kameng (#DDMA-WK-884) under Disaster Management Act 2005.
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
                <strong>LEGAL INVARIANT:</strong> AI models generate risk predictions; statutory orders require administrative executive enactment.
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-white/10"
        >
          Close
        </button>
      </div>
    </div>
  );
};
