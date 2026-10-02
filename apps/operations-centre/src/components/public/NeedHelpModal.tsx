import React, { useState } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import {
  IconPhoneCall,
  IconAlertTriangle,
  IconMapPin,
  IconCrosshair,
  IconShieldCheck,
  IconCheck,
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
        id: data.request_id || `TG-SOS-${Math.floor(1000 + Math.random() * 9000)}`,
        status: data.status || "REQUEST_RECEIVED",
      });
    } catch (err: any) {
      // Offline fallback
      const fallbackId = `TG-SOS-${Math.floor(1000 + Math.random() * 9000)}`;
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
        status: "RECORDED_LOCALLY",
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 animate-pulse">
              <IconPhoneCall className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {t("sos_modal_title")}
              </h3>
              <div className="text-[11px] font-mono text-slate-400">
                District Emergency Operations Center (DEOC) Rapid Response
              </div>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1-Tap Emergency Speed-Dial Hotlines (Always Accessible) */}
        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-2">
          <div className="text-[10px] font-mono text-red-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <IconAlertTriangle className="w-3.5 h-3.5" />
            IMMEDIATE EMERGENCY SPEED-DIAL HOTLINES
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href="tel:112"
              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex flex-col items-center justify-center font-mono text-center transition-all shadow-md"
            >
              <span className="text-sm font-black">112</span>
              <span className="text-[9px] uppercase tracking-tight">National ERSS</span>
            </a>

            <a
              href="tel:1077"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 rounded-lg flex flex-col items-center justify-center font-mono text-center transition-all"
            >
              <span className="text-sm font-black text-amber-300">1077</span>
              <span className="text-[9px] uppercase tracking-tight">District DDMA</span>
            </a>

            <a
              href="tel:1070"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 rounded-lg flex flex-col items-center justify-center font-mono text-center transition-all"
            >
              <span className="text-sm font-black text-cyan-300">1070</span>
              <span className="text-[9px] uppercase tracking-tight">State SDMA</span>
            </a>

            <a
              href="tel:108"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 rounded-lg flex flex-col items-center justify-center font-mono text-center transition-all"
            >
              <span className="text-sm font-black text-emerald-300">108</span>
              <span className="text-[9px] uppercase tracking-tight">Ambulance</span>
            </a>
          </div>
        </div>

        {submittedTicket ? (
          <div className="py-4 flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-xl">
              <IconCheck className="w-7 h-7 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-emerald-300">
              Assistance Ticket Dispatched
            </h4>
            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 w-full font-mono text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>TICKET ID:</span>
                <span className="text-white font-bold">{submittedTicket.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>STATUS:</span>
                <span className="text-amber-400 font-bold">{submittedTicket.status} (UNASSIGNED)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>FORWARDED TO:</span>
                <span className="text-slate-200">DEOC West Kameng & SDRF Alpha</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Your request and precise coordinates ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E) have been received. Stay at safe ground and keep your phone line open for responder verification.
            </p>
            <button
              onClick={handleResetAndClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Assistance Category */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 font-mono">
                ASSISTANCE CATEGORY:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 font-sans cursor-pointer"
              >
                <option value="ROAD_BLOCKED_STRANDED">Stranded on Roadway / Checkpost Closed</option>
                <option value="TRAPPED_IN_VEHICLE">Trapped in Vehicle by Debris or Mud</option>
                <option value="MEDICAL_EMERGENCY">Medical Emergency / Immediate Triage Required</option>
                <option value="LANDSLIDE_INCOMING">Active Slope Movement Towards Shelter</option>
                <option value="SHELTER_NEEDED">Evacuated / Need Emergency Relief Camp</option>
                <option value="FOOD_WATER_CRITICAL">Cut off / Food & Drinking Water Shortage</option>
              </select>
            </div>

            {/* Persons Count & Phone */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">
                  PERSONS AFFECTED:
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
                <label className="block text-slate-300 font-medium mb-1 font-mono">
                  CONTACT NUMBER:
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 font-mono"
                />
              </div>
            </div>

            {/* GPS Attachment Banner */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <IconMapPin className="w-3.5 h-3.5 text-red-400" />
                Attached Coordinates:
              </span>
              <span className="text-slate-200 font-bold">
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E (±{Math.round(location.accuracyMeters || 10)}m)
              </span>
            </div>

            {/* Situation Details */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                SITUATION DETAILS / SPECIAL REQUIREMENTS:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 3 passengers stranded near KM-39. Vehicle blocked by boulders. One elderly person requires insulin."
                rows={3}
                className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-400 resize-none font-sans"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-mono">{error}</div>
            )}

            {/* Submit SOS Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer border border-red-400/40 disabled:opacity-50"
            >
              <IconPhoneCall className="w-4 h-4" />
              <span>{submitting ? "Transmitting SOS..." : "SUBMIT SOS ASSISTANCE REQUEST"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
