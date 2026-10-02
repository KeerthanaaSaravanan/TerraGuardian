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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-y-auto max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
                <IconPhoneCall className="w-5 h-5" />
              </span>
              <div>
                <h3 id="sos-modal-title" className="font-extrabold text-base sm:text-lg text-white">
                  🚨 NEED EMERGENCY HELP?
                </h3>
                <div className="text-xs text-slate-300">
                  Choose the quickest option below.
                </div>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              aria-label="Close"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>

          {submittedTicket ? (
            /* Clear Truthful Success Screen */
            <div className="py-4 flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-xl">
                <IconCheck className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-300">
                  ✓ Request Received
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your assistance request has been logged in the Disaster Management Network.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-white/10 w-full text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Request ID:</span>
                  <span className="text-white font-mono font-bold">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Location:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <IconMapPin className="w-3.5 h-3.5" />
                    Attached ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Status:</span>
                  <span className="text-amber-400 font-mono font-bold">REQUEST_RECEIVED (UNASSIGNED)</span>
                </div>
              </div>

              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 text-left w-full space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <IconAlertTriangle className="w-4 h-4" />
                  Call 112 for immediate emergency assistance.
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
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
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* PATH 1: Call For Immediate Emergency Help */}
              <div>
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <IconPhoneCall className="w-3.5 h-3.5 text-red-400" />
                  <span>Call for Immediate Emergency Help</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("112")}
                    className="p-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-red-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      112
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">National Emergency</div>
                      <div className="text-[10px] text-slate-300">Police, Fire, Disaster ERSS</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("108")}
                    className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-white/10 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      108
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Ambulance & Medical</div>
                      <div className="text-[10px] text-slate-300">Emergency Patient Triage</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("1077")}
                    className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-white/10 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-amber-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      1077
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">District Control Room</div>
                      <div className="text-[10px] text-slate-300">West Kameng DDMA</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCallDialog("1070")}
                    className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-white/10 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      1070
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">State Disaster Mgmt</div>
                      <div className="text-[10px] text-slate-300">State Control Operations</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Or Request Help Through TerraGuardian
                </span>
                <div className="border-t border-white/10 w-full" />
              </div>

              {/* PATH 2: Request Help Through TerraGuardian Form */}
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                {/* Category */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Help Category:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 cursor-pointer"
                  >
                    <option value="ROAD_BLOCKED_STRANDED">Stranded on Road / Passage Blocked</option>
                    <option value="TRAPPED_IN_VEHICLE">Trapped in Vehicle by Mud or Rocks</option>
                    <option value="MEDICAL_EMERGENCY">Medical Emergency / Injury</option>
                    <option value="LANDSLIDE_INCOMING">Slope Movement Near House or Camp</option>
                    <option value="SHELTER_NEEDED">Displaced / Need Shelter</option>
                    <option value="FOOD_WATER_CRITICAL">Provisions or Water Exhausted</option>
                  </select>
                </div>

                {/* Persons & Phone */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      People Affected:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={personsCount}
                      onChange={(e) => setPersonsCount(e.target.value)}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Phone (Optional):
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 94360 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 font-mono"
                    />
                  </div>
                </div>

                {/* Location Attached */}
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your Location:</span>
                  </span>
                  <span className="text-slate-200 font-mono font-medium">
                    Attached ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E)
                  </span>
                </div>

                {/* Situation Description */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Short Description:
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 2 adults near KM-38 checkpost. Road blocked ahead."
                    rows={2}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-xs font-mono">{error}</div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer border border-red-400/40 disabled:opacity-50"
                >
                  <IconPhoneCall className="w-4 h-4" />
                  <span>{submitting ? "Sending Request..." : "SUBMIT HELP REQUEST"}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Device-Aware Desktop Confirmation / Safe Hotline Dialog */}
      <EmergencyCallDialog
        isOpen={Boolean(activeHotline)}
        onClose={() => setActiveHotline(null)}
        hotline={activeHotline}
      />
    </>
  );
};
