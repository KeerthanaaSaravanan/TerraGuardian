import React, { useState, useEffect } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { IconRadio, IconInfo, IconChevronRight, IconCheck } from "../icons";

interface SmsDeliveryStatus {
  provider: string;
  status: string;
  recipient_masked: string | null;
  timestamp: string;
  message: string;
  language_used: string;
  details?: string;
}

export const SmsNotificationCard: React.FC = () => {
  const { t, lang } = useCitizenI18n();

  const [smsConsent, setSmsConsent] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("tg_sms_consent") === "true";
    }
    return false;
  });

  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("tg_citizen_phone") || "";
    }
    return "";
  });

  const [deliveryStatus, setDeliveryStatus] = useState<SmsDeliveryStatus>({
    provider: "UNCONFIGURED_PROVIDER",
    status: "CHANNEL_NOT_CONFIGURED",
    recipient_masked: null,
    timestamp: new Date().toISOString(),
    message: t("sms_sample_alert"),
    language_used: lang,
    details: "Departmental telecom gateway not connected. Localized alerts previewed in prototype mode.",
  });

  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [consentSavedFeedback, setConsentSavedFeedback] = useState(false);
  const [isSavingConsent, setIsSavingConsent] = useState(false);

  // Fetch real status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/v1/notifications/sms/status");
        if (res.ok) {
          const data = await res.json();
          setDeliveryStatus(data);
        }
      } catch {
        // Keep initial truthful fallback
      }
    };
    fetchStatus();
  }, []);

  const handleToggleConsent = async (enabled: boolean) => {
    setSmsConsent(enabled);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tg_sms_consent", String(enabled));
      if (phoneNumber) {
        localStorage.setItem("tg_citizen_phone", phoneNumber);
      }
    }

    if (phoneNumber.length >= 10) {
      setIsSavingConsent(true);
      try {
        await fetch("/api/v1/notifications/sms/register-consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: phoneNumber,
            enabled,
            language: lang,
          }),
        });
        setConsentSavedFeedback(true);
        setTimeout(() => setConsentSavedFeedback(false), 3000);
      } catch (e) {
        console.warn("Offline consent registration stored locally:", e);
      } finally {
        setIsSavingConsent(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">DELIVERED</span>;
      case "SENT":
      case "PROVIDER_ACCEPTED":
        return <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold">SENT TO GATEWAY</span>;
      case "FAILED":
        return <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-[10px] font-bold">FAILED</span>;
      case "CHANNEL_NOT_CONFIGURED":
      default:
        return <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">CHANNEL NOT CONFIGURED</span>;
    }
  };

  return (
    <section aria-labelledby="alert-delivery-title" className="w-full">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
              <IconRadio className="w-4 h-4" />
            </span>
            <h2 id="alert-delivery-title" className="text-base font-extrabold tracking-tight">
              {t("sms_delivery_title")}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Gateway:</span>
            {getStatusBadge(deliveryStatus.status)}
          </div>
        </div>

        {/* SMS Consent / Registration Section */}
        <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                {t("sms_consent_label")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("sms_consent_desc")}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={smsConsent}
              onClick={() => handleToggleConsent(!smsConsent)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                smsConsent ? "bg-emerald-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
          </div>

          {smsConsent && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                disabled={isSavingConsent || phoneNumber.length < 10}
                onClick={() => handleToggleConsent(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSavingConsent ? "Saving..." : "Save Number"}
              </button>
              {consentSavedFeedback && (
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <IconCheck className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          )}
        </div>

        {/* Truth Disclosure Note */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {t("sms_truth_note")}
        </p>

        {/* View Message Drawer Actions */}
        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFullMessage((prev) => !prev)}
            className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showFullMessage ? "Hide Message Preview" : t("btn_view_sms_preview")}</span>
            <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${showFullMessage ? "rotate-90" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            {showTechnicalDetails ? "Hide technical data" : "Technical details"}
          </button>
        </div>

        {/* Localized Message Preview */}
        {showFullMessage && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 leading-relaxed shadow-inner animate-in fade-in duration-100">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between">
              <span>SENDER: DISASTER-ALERT (CAP/CB)</span>
              <span className="text-amber-700 dark:text-amber-400 font-mono text-[9px]">APPROVED DLT TEMPLATE</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
              {t("sms_sample_alert")}
            </div>
          </div>
        )}

        {/* Technical Details */}
        {showTechnicalDetails && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1 animate-in fade-in duration-100">
            <div>GATEWAY PROVIDER: {deliveryStatus.provider}</div>
            <div>STATUS: {deliveryStatus.status}</div>
            <div>BROADCAST PROTOCOL: Cell Broadcast 3GPP TS 23.041 / DLT Flow</div>
            <div>TARGET REGIONAL NODES: West Kameng Monitored BTS Cells</div>
            <div>DELIVERY RECEIPT: Supported via POST /api/v1/notifications/sms/webhook</div>
          </div>
        )}
      </div>
    </section>
  );
};
