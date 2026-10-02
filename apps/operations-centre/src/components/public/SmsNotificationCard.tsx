import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { IconRadio, IconInfo, IconChevronRight } from "../icons";

export const SmsNotificationCard: React.FC = () => {
  const { t } = useCitizenI18n();
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
            <IconRadio className="w-4 h-4" />
          </span>
          <h3 className="text-base font-bold tracking-tight text-white">
            📱 Alert Delivery
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Cell-Broadcast SMS:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
            DEMO — PROVIDER NOT CONNECTED
          </span>
        </div>
      </div>

      {/* Truth Disclosure Note */}
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
        This prototype demonstrates localized alert message content across 8 NER dialects. No commercial telecom delivery is claimed without departmental gateway clearance.
      </p>

      {/* View Message Button / Drawer */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFullMessage((prev) => !prev)}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
        >
          <span>{showFullMessage ? "Hide Message Preview" : "View Message Preview"}</span>
          <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${showFullMessage ? "rotate-90" : ""}`} />
        </button>

        <button
          type="button"
          onClick={() => setShowTechnicalDetails((prev) => !prev)}
          className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          {showTechnicalDetails ? "Hide technical data" : "Technical details"}
        </button>
      </div>

      {/* Message Preview */}
      {showFullMessage && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 leading-relaxed shadow-inner animate-in fade-in duration-100">
          <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex justify-between">
            <span>SENDER: DISASTER-ALERT (CAP/CB)</span>
            <span className="text-amber-400 font-mono text-[9px]">SIMULATED PROTOTYPE CONTENT</span>
          </div>
          <div className="p-2.5 bg-slate-900 rounded-lg border border-white/10 text-slate-200">
            {t("sms_sample_alert")}
          </div>
        </div>
      )}

      {/* Technical Details */}
      {showTechnicalDetails && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-[10px] font-mono text-slate-400 space-y-1 animate-in fade-in duration-100">
          <div>BROADCAST PROTOCOL: Cell Broadcast 3GPP TS 23.041</div>
          <div>TARGET CELL IDS: 404-20-884, 404-20-885 (West Kameng)</div>
          <div>GATEWAY INTEGRATION: Awaiting Department of Telecommunications clearance</div>
        </div>
      )}
    </div>
  );
};
