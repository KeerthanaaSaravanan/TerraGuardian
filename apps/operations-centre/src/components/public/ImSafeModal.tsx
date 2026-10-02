import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconShieldCheck,
  IconMapPin,
  IconCheck,
  IconX,
} from "../icons";

interface ImSafeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImSafeModal: React.FC<ImSafeModalProps> = ({ isOpen, onClose }) => {
  const { location } = useLocationService();
  const { t } = useCitizenI18n();

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const deviceId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("tg_device_id") || "cit-pwa-default"
        : "cit-pwa-default";

    try {
      const response = await fetch("/api/v1/citizen/im-safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          is_safe: true,
          safe_notes: notes.trim() || "Citizen safe confirmation.",
          approx_lat: location.latitude,
          approx_lng: location.longitude,
          alert_id: "tg-alert-2048",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setConfirmed(true);
    } catch {
      // Offline fallback
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "tg_im_safe_checkin",
          JSON.stringify({
            timestamp: new Date().toISOString(),
            lat: location.latitude,
            lng: location.longitude,
            notes,
          })
        );
      }
      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmed(false);
    setNotes("");
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="im-safe-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <IconShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 id="im-safe-dialog-title" className="font-extrabold text-base">
                {t("im_safe_title")}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {t("im_safe_subtitle")}
              </div>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {confirmed ? (
          /* Clean Confirmation Screen */
          <div className="py-4 flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-500 shadow-md">
              <IconCheck className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-300 font-mono">
                {t("im_safe_received_title")}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t("im_safe_received_desc")}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-normal w-full text-left space-y-1">
              <div><strong>Notice:</strong> This confirmation only records your personal self-report.</div>
              <div>It does NOT mean the incident is closed, the road reopened, or the landslide hazard removed. Continue to observe local police checkpost restrictions.</div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Confirm that you and your companions are currently out of immediate danger.
            </p>

            {/* Location Attached */}
            <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <IconMapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t("label_location")}:</span>
              </span>
              <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </span>
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-medium mb-1">
                Optional note (e.g. family count / shelter location):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2 people sheltered at Rupa town hall. Safe."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {error && <div className="text-red-500 text-xs font-bold">{error}</div>}

            {/* Submit / Cancel Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all cursor-pointer border border-emerald-400/40 disabled:opacity-50"
              >
                <IconShieldCheck className="w-4 h-4 text-white" />
                <span>{submitting ? "Sending..." : t("btn_im_safe")}</span>
              </button>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
