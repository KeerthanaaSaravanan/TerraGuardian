import React, { useState, useRef } from "react";
import { useLocationService } from "../../hooks/useLocationService";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
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
  onStartGuidedFlow?: () => void;
}

const HAZARD_TYPES = [
  { id: "LANDSLIDE", labelKey: "hazard_type_landslide" },
  { id: "ROCKFALL", labelKey: "hazard_type_rockfall" },
  { id: "ROAD_BLOCKED", labelKey: "hazard_type_road_blocked" },
  { id: "SLOPE_CRACK", labelKey: "hazard_type_slope_crack" },
  { id: "DEBRIS_FLOW", labelKey: "hazard_type_debris_flow" },
  { id: "OTHER", labelKey: "hazard_type_other" },
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({ isOpen, onClose }) => {
  const { location, requestGps } = useLocationService();
  const { t } = useCitizenI18n();

  const [selectedHazard, setSelectedHazard] = useState("LANDSLIDE");
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    incidentCode?: string | null;
    status: string;
  } | null>(null);
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
          gps_accuracy: location.accuracy || 10.0,
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
        incidentCode: data.incident_code || "TG-2048",
        status: data.maturity_status || "UNVERIFIED CITIZEN OBSERVATION",
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
      setSubmittedTicket({
        id: trackingId,
        incidentCode: "TG-2048",
        status: "UNVERIFIED CITIZEN OBSERVATION",
      });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <IconCamera className="w-5 h-5" />
            </span>
            <div>
              <h3 id="report-hazard-title" className="font-extrabold text-base sm:text-lg">
                {t("report_hazard_title")}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {t("report_hazard_subtitle")}
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
          /* Report Success Screen */
          <div className="py-4 flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-500 shadow-md">
              <IconCheck className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
                {t("report_success_title")}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t("report_success_desc")}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-white/10 w-full text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{t("report_evidence_id")}:</span>
                <span className="text-slate-900 dark:text-white font-bold">{submittedTicket.id}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Associated Incident:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{submittedTicket.incidentCode || "TG-2048"}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Location:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Status:</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">UNVERIFIED CITIZEN OBSERVATION</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-normal w-full text-left">
              <strong>Evidence Provenance:</strong> Recorded as <em>Citizen Observation (Unverified)</em> until checked by SDRF field teams. Never approach unstable slopes to capture photos.
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Guided 6-Stage AI Hazard Analysis Launch Banner */}
            {onStartGuidedFlow && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <IconCamera className="w-4 h-4 text-amber-500" />
                    <span>Guided 6-Stage AI Evidence Flow</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    Optical sharpness validation, tension crack detection, and corridor geofencing.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleResetAndClose();
                    onStartGuidedFlow();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  Start Guided Flow →
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* What do you see? */}
              <div>
                <div className="text-[11px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Or Quick Hazard Submission:
                </div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                {t("report_what_see")}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {HAZARD_TYPES.map((h) => {
                  const isSelected = selectedHazard === h.id;
                  const label = t(h.labelKey) || h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHazard(h.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/15 dark:bg-amber-600/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-amber-500" : "bg-slate-400"}`} />
                        <span className="text-[11px] leading-tight">{label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Capture / Upload */}
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                {t("report_photo_label")}:
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
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <IconCamera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>{photoName ? "Change Photo" : t("btn_take_photo")}</span>
                </button>
                {photoName && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs truncate max-w-[160px] font-medium">
                    ✓ {photoName}
                  </span>
                )}
              </div>
              {photoBase64 && (
                <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-white/20 bg-slate-950">
                  <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Location Bar */}
            <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <IconMapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t("label_location")}:</span>
              </span>
              <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E (±{Math.round(location.accuracy || 10)}m)
              </span>
            </div>

            {/* What did you observe? */}
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1">
                {t("label_notes")}:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tree and boulders blocking uphill lane near KM-41. Water runoff crossing road."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {error && <div className="text-red-500 text-xs font-bold">{error}</div>}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-black py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 transition-all cursor-pointer border border-amber-400/40 disabled:opacity-50"
              >
                <IconCamera className="w-4 h-4" />
                <span>{submitting ? "Uploading..." : t("btn_submit_report")}</span>
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
        </div>
      )}
      </div>
    </div>
  );
};
