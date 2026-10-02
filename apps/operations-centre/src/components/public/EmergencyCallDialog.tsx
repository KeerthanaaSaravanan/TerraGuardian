import React, { useState } from "react";
import { IconPhoneCall, IconCheck, IconX, IconInfo } from "../icons";

export interface EmergencyHotlineInfo {
  number: string;
  name: string;
  subtitle: string;
  category: "ERSS" | "AMBULANCE" | "DDMA" | "SDMA" | "HIGHWAY";
}

export const EMERGENCY_HOTLINES: Record<string, EmergencyHotlineInfo> = {
  "112": {
    number: "112",
    name: "National Emergency Response (ERSS)",
    subtitle: "24/7 Police, Fire, and Immediate Disaster Rescue",
    category: "ERSS",
  },
  "108": {
    number: "108",
    name: "Emergency Medical & Ambulance",
    subtitle: "Critical Medical Care and Patient Evacuation",
    category: "AMBULANCE",
  },
  "1077": {
    number: "1077",
    name: "District Disaster Control Room (DDMA)",
    subtitle: "West Kameng District Disaster Management Authority",
    category: "DDMA",
  },
  "1070": {
    number: "1070",
    name: "State Disaster Management (SDMA)",
    subtitle: "State Emergency Operations Centre Control Room",
    category: "SDMA",
  },
};

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchScreen = navigator.maxTouchPoints > 1 && window.innerWidth <= 820;
  return isMobileUA || isTouchScreen;
}

interface EmergencyCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotline: EmergencyHotlineInfo | null;
}

export const EmergencyCallDialog: React.FC<EmergencyCallDialogProps> = ({
  isOpen,
  onClose,
  hotline,
}) => {
  const [copied, setCopied] = useState(false);
  const mobile = isMobileDevice();

  if (!isOpen || !hotline) return null;

  const handleCopyNumber = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(hotline.number);
      } else {
        // Fallback for older browsers
        const el = document.createElement("textarea");
        el.value = hotline.number;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTryCall = () => {
    // Controlled safe trigger: do NOT use window.location which reloads or blanks desktop browsers
    try {
      const a = document.createElement("a");
      a.href = `tel:${hotline.number}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn("Direct telephone call trigger unavailable on this device:", e);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotline-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
              <IconPhoneCall className="w-5 h-5" />
            </span>
            <div>
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                Emergency Hotline
              </div>
              <h3 id="hotline-dialog-title" className="font-bold text-base text-white">
                {hotline.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Big Number Card */}
        <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 text-center space-y-1">
          <div className="text-3xl font-black tracking-wider text-emerald-400 font-mono">
            {hotline.number}
          </div>
          <div className="text-xs text-slate-300 font-medium">
            {hotline.subtitle}
          </div>
        </div>

        {/* Device Awareness Guidance */}
        <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <IconInfo className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            {mobile ? (
              <span>Tap below to call directly from your phone's dialer, or copy the number.</span>
            ) : (
              <span>
                You are on a desktop/laptop computer. Please dial <strong>{hotline.number}</strong> from your phone or mobile device, or copy it.
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleCopyNumber}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              copied
                ? "bg-emerald-600 text-white border-emerald-400"
                : "bg-slate-800 hover:bg-slate-700 text-white border-white/15"
            }`}
          >
            {copied ? (
              <>
                <IconCheck className="w-4 h-4" />
                <span>Number Copied ({hotline.number})</span>
              </>
            ) : (
              <>
                <span>📋 Copy Number ({hotline.number})</span>
              </>
            )}
          </button>

          <button
            onClick={handleTryCall}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer border border-red-400/40 shadow-md shadow-red-950/30"
          >
            <IconPhoneCall className="w-4 h-4" />
            <span>{mobile ? `Call ${hotline.number} Now` : `Try Call From Device`}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel / Return to Safety App
          </button>
        </div>
      </div>
    </div>
  );
};
