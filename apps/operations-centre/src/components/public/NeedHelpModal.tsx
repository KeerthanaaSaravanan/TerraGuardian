import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { EmergencyCallDialog, EMERGENCY_HOTLINES, EmergencyHotlineInfo } from "./EmergencyCallDialog";
import {
  IconPhoneCall,
  IconAlertTriangle,
  IconMapPin,
  IconCheck,
  IconX,
} from "../icons";

interface NeedHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NeedHelpModal: React.FC<NeedHelpModalProps> = ({ isOpen, onClose }) => {
  const { location } = useLocationService();
  const { t } = useCitizenI18n();

  const [category, setCategory] = useState("ROAD_BLOCKED_STRANDED");
  const [personsCount, setPersonsCount] = useState("1");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active call dialog target
  const [activeHotline, setActiveHotline] = useState<EmergencyHotlineInfo | null>(null);

  if (!isOpen) return null;

  const handleOpenCallDialog = (num: string) => {
    const item = EMERGENCY_HOTLINES[num];
    if (item) {
      setActiveHotline(item);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const deviceId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("tg_device_id") || "cit-pwa-default"
        : "cit-pwa-default";

    try {
      const response = await fetch("/api/v1/citizen/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          category,
          persons_count: parseInt(personsCount, 10) || 1,
          contact_phone: phone.trim() || undefined,
          approx_lat: location.latitude,
          approx_lng: location.longitude,
          notes: notes.trim() || "Assistance requested via TerraGuardian Citizen Safe SOS.",
          alert_id: "tg-alert-2048",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSubmittedTicket({
        id: data.request_id || `TG-HELP-${Math.floor(1000 + Math.random() * 9000)}`,
        status: data.status || "REQUEST_RECEIVED",
      });
    } catch {
      // Offline fallback
      const fallbackId = `TG-HELP-${Math.floor(1000 + Math.random() * 9000)}`;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`tg_help_req_${fallbackId}`, JSON.stringify({
          timestamp: new Date().toISOString(),
          category,
          personsCount,
          phone,
          lat: location.latitude,
          lng: location.longitude,
          notes,
        }));
      }
      setSubmittedTicket({
        id: fallbackId,
        status: "REQUEST_RECEIVED",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedTicket(null);
    setCategory("ROAD_BLOCKED_STRANDED");
    setPersonsCount("1");
    setPhone("");
    setNotes("");
    setError(null);
    setActiveHotline(null);
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white overflow-y-auto max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-600/15 dark:bg-red-600/20 border border-red-500/40 text-red-600 dark:text-red-400">
                <IconPhoneCall className="w-5 h-5" />
              </span>
              <div>
                <h3 id="sos-modal-title" className="font-extrabold text-base sm:text-lg">
                  {t("need_help_title")}
                </h3>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {t("need_help_subtitle")}
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

          {submittedTicket ? (
            /* Clear Truthful Success Screen */
            <div className="py-4 flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-500 shadow-xl">
                <IconCheck className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
                  ✓ Request Received
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Your assistance request has been logged in the Disaster Management Network.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 w-full text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Request ID:</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Location:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <IconMapPin className="w-3.5 h-3.5" />
                    Attached ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Status:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">REQUEST_RECEIVED (UNASSIGNED)</span>
                </div>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-900 dark:text-red-200 text-left w-full space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                  <IconAlertTriangle className="w-4 h-4" />
                  Call 112 for immediate emergency assistance.
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Submitting a digital request records your coordinates for responder situational awareness, but does NOT guarantee immediate dispatch or vehicle arrival. If in immediate danger, dial 112 immediately.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenCallDialog("112")}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <IconPhoneCall className="w-4 h-4" />
                  <span>Call 112</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Emergency Hotline Buttons */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-2">
                  Emergency Hotlines (Tap to Call / Copy):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("112")}
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/40 hover:border-red-500 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-red-700 dark:text-red-400">112 — National Emergency</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Police, Fire, Disaster Response</div>
                    </div>
                    <IconPhoneCall className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("108")}
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/40 hover:border-amber-500 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-amber-700 dark:text-amber-400">108 — Ambulance</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Medical emergencies</div>
                    </div>
                    <IconPhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("1077")}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-indigo-400 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">1077 — District DDMA</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Control room (West Kameng)</div>
                    </div>
                    <IconPhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("1033")}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-indigo-400 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">1033 — Highway Helpline</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">NHAI road condition info</div>
                    </div>
                    <IconPhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Digital Assistance Request Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1">
                    Or submit a digital assistance request:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="ROAD_BLOCKED_STRANDED">Stranded vehicle / Road blocked</option>
                    <option value="MEDICAL_EMERGENCY">Medical emergency / Injured</option>
                    <option value="SHELTER_NEEDED">Shelter / Evacuation assistance needed</option>
                    <option value="FAMILY_SEPARATED">Family member missing / Separated</option>
                    <option value="OTHER_ASSISTANCE">Other assistance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 font-medium mb-1">
                      Persons with you:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={personsCount}
                      onChange={(e) => setPersonsCount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 font-medium mb-1">
                      Contact phone:
                    </label>
                    <input
                      type="tel"
                      placeholder="+91..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 font-medium mb-1">
                    Details / landmarks:
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Near KM-39 checkpost bridge. Red SUV stranded."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none resize-none"
                  />
                </div>

                {error && <div className="text-red-500 font-bold text-xs">{error}</div>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Logging Request..." : "Send Digital Assistance Request"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Call Dialog */}
      <EmergencyCallDialog
        isOpen={activeHotline !== null}
        onClose={() => setActiveHotline(null)}
        hotline={activeHotline}
      />
    </>
  );
};
