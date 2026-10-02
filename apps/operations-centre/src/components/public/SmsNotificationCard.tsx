import React from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconRadio,
  IconAlertTriangle,
  IconShieldCheck,
  IconInfo,
  IconClock,
} from "../icons";

export const SmsNotificationCard: React.FC = () => {
  const { lang, t } = useCitizenI18n();

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
            <IconRadio className="w-4 h-4 animate-pulse" />
          </span>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase drop-shadow-sm">
            {t("sms_broadcast_title")}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400">{t("sms_status_label")}</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
            CHANNEL_NOT_CONNECTED (DEMO_SIMULATED)
          </span>
        </div>
      </div>

      {/* Truth Disclosure Callout */}
      <div className="mt-3.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5 leading-relaxed">
        <IconInfo className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          {t("sms_truth_disclosure")}
        </p>
      </div>

      {/* Simulated Phone SMS Bubble */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-white/15 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/10 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <strong className="text-slate-200">SENDER: GOV-DISASTER-ALERT (CAP/CB)</strong>
          </div>
          <span className="flex items-center gap-1">
            <IconClock className="w-3 h-3" />
            <span>Active Broadcast</span>
          </span>
        </div>

        {/* Localized Message Text */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm font-sans leading-relaxed text-slate-100 shadow-md">
          {t("sms_sample_alert")}
        </div>

        {/* Message Footnotes */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
          <span>Target Corridor: West Kameng • Cell IDs: 404-20-884, 404-20-885</span>
          <span>Broadcast Protocol: Cell Broadcast 3GPP TS 23.041</span>
        </div>
      </div>
    </div>
  );
};
