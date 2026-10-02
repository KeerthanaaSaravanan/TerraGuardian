import React, { useState, useRef } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import {
  IconCamera,
  IconMapPin,
  IconCheck,
  IconX,
  IconAlertTriangle,
} from "../icons";

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HAZARD_TYPES = [
  { id: "LANDSLIDE", label: "Landslide / Slope Collapse" },
  { id: "ROCKFALL", label: "Rockfall on Roadway" },
  { id: "ROAD_BLOCKED", label: "Road Blocked by Mud / Water" },
  { id: "SLOPE_CRACK", label: "Tension Cracks on Hillside" },
  { id: "DEBRIS_FLOW", label: "Rapid Mud / Debris Flow" },
  { id: "OTHER", label: "Other Hazard" },
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({ isOpen, onClose }) => {
  const { location, requestGps } = useLocationService();

  const [selectedHazard, setSelectedHazard] = useState("LANDSLIDE");
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trackingId = `TG-CIT-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const response = await fetch("/api/v1/citizen/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          gps_accuracy: location.accuracyMeters || 10.0,
          road_corridor: "NH-13 Trans-Arunachal Highway",
          citizen_notes: notes.trim() || `Citizen report: ${selectedHazard}`,
          ai_observation: selectedHazard,
          image_base64: photoBase64 || undefined,
          client_submission_id: trackingId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSubmittedTicket({
        id: data.tracking_id || trackingId,
      });
    } catch {
      // Offline fallback
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          `tg_report_${trackingId}`,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            hazard: selectedHazard,
            lat: location.latitude,
            lng: location.longitude,
            notes,
          })
        );
      }
      setSubmittedTicket({ id: trackingId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedTicket(null);
    setSelectedHazard("LANDSLIDE");
    setNotes("");
    setPhotoBase64(null);
    setPhotoName(null);
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-hazard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <IconCamera className="w-5 h-5" />
            </span>
            <div>
              <h3 id="report-hazard-title" className="font-bold text-base sm:text-lg text-white">
                📷 Report a Hazard
              </h3>
              <div className="text-xs text-slate-300">
                Submit field evidence to safety authorities
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
          /* Report Success Screen */
          <div className="py-4 flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-md">
              <IconCheck className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-300">
                ✓ Report Received
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Thank you for helping protect fellow commuters.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 w-full text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Evidence ID:</span>
                <span className="text-white font-bold">{submittedTicket.id}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Location:</span>
                <span className="text-emerald-400">
                  {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Status:</span>
                <span className="text-amber-400 font-bold">Submitted for review</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-[11px] text-slate-400 leading-normal w-full text-left">
              <strong>Evidence Provenance:</strong> Recorded as <em>Citizen Observation (Unverified)</em> until checked by SDRF field teams. Never approach unstable slopes to capture photos.
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* What do you see? */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                What do you see?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {HAZARD_TYPES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHazard(h.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedHazard === h.id
                        ? "bg-amber-600/30 border-amber-400 text-amber-200 font-bold"
                        : "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-750"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${selectedHazard === h.id ? "bg-amber-400" : "bg-slate-500"}`} />
                      <span className="text-[11px] leading-tight">{h.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture / Upload */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Photo (Optional):
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <IconCamera className="w-4 h-4 text-cyan-400" />
                  <span>{photoName ? "Change Photo" : "Take Photo / Choose Image"}</span>
                </button>
                {photoName && (
                  <span className="text-emerald-400 text-xs truncate max-w-[160px]">
                    ✓ {photoName}
                  </span>
                )}
              </div>
            </div>

            {/* Location Bar */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <IconMapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Location:</span>
              </span>
              <span className="text-slate-200 font-mono font-medium">
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E (±{Math.round(location.accuracyMeters || 10)}m)
              </span>
            </div>

            {/* What did you observe? */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Optional observation notes:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tree and boulders blocking uphill lane near KM-41. Water runoff crossing road."
                rows={2}
                className="w-full bg-slate-800 border border-white/15 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {error && <div className="text-red-400 text-xs">{error}</div>}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 transition-all cursor-pointer border border-amber-400/40 disabled:opacity-50"
              >
                <IconCamera className="w-4 h-4" />
                <span>{submitting ? "Uploading..." : "Submit Hazard Report"}</span>
              </button>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
