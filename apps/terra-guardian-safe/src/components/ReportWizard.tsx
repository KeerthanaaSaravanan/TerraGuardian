import React, { useState } from "react";
import {
  CORRIDOR_PRESETS,
  SAMPLE_HAZARD_PHOTOS,
  type HazardType,
  type HazardSeverity,
  type CitizenReportResponse,
} from "../types/citizen";
import { submitCitizenReport } from "../services/api";

interface ReportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const ReportWizard: React.FC<ReportWizardProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedSample, setSelectedSample] = useState<import("../types/citizen").SampleHazardPhoto | null>(null);
  const [customPhotoFile, setCustomPhotoFile] = useState<string | null>(null);
  
  // Location
  const [locationMode, setLocationMode] = useState<"PRESET" | "GPS">("PRESET");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [deviceGps, setDeviceGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Observation Details & Voice Dictation
  const [hazardType, setHazardType] = useState<HazardType>("SLOPE_DEBRIS");
  const [severity, setSeverity] = useState<HazardSeverity>("MEDIUM");
  const [observation, setObservation] = useState<string>(
    "Cracks expanding and mud debris spilling onto roadside."
  );
  const [reporterContact, setReporterContact] = useState<string>("");
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const toggleVoiceNote = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("VOICE UNAVAILABLE — TEXT ENTRY MODE");
      setTimeout(() => setVoiceStatus(null), 4000);
      return;
    }

    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceStatus("Listening... Speak your observation...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setObservation((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsVoiceListening(false);
        setVoiceStatus(null);
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
        setVoiceStatus("VOICE UNAVAILABLE — TEXT ENTRY MODE");
        setTimeout(() => setVoiceStatus(null), 4000);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognition.start();
    } catch {
      setIsVoiceListening(false);
      setVoiceStatus("VOICE UNAVAILABLE — TEXT ENTRY MODE");
      setTimeout(() => setVoiceStatus(null), 4000);
    }
  };

  const handleAppendTag = (tag: string) => {
    setObservation((prev) => (prev ? `${prev}. ${tag}` : tag));
  };

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<CitizenReportResponse | null>(null);

  const activePhoto = customPhotoFile || selectedSample?.url || "";
  const activePreset = CORRIDOR_PRESETS[selectedPresetIndex] ?? CORRIDOR_PRESETS[0]!;
  const currentCoords =
    locationMode === "GPS" && deviceGps
      ? deviceGps
      : {
          lat: activePreset.lat,
          lng: activePreset.lng,
        };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Using corridor preset.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceGps({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLocationMode("GPS");
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`Unable to fetch GPS: ${err.message}. Using corridor preset.`);
        setLocationMode("PRESET");
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomPhotoFile(event.target?.result as string);
        setSelectedSample(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const photoProvenanceNote = customPhotoFile
        ? "CITIZEN_DEVICE_UPLOAD: REAL_CITIZEN_SUBMISSION (RECEIVED -> UNVERIFIED)"
        : selectedSample
        ? `REFERENCE_SAMPLE_IMAGE: Source ${selectedSample.source} (${selectedSample.attribution}) [NOT LIVE FIELD EVIDENCE]`
        : "NO_PHOTO_ATTACHED";

      const res = await submitCitizenReport({
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        observation: observation.trim() || "Active slope hazard reported by citizen.",
        hazard_type: hazardType,
        severity: severity,
        photo_url: activePhoto || undefined,
        reporter_note: `Reported by citizen traveler. Location: ${
          locationMode === "GPS" ? "Live GPS Coordinates" : activePreset.name
        }. Contact: ${reporterContact || "Anonymous"}. Photo Provenance: ${photoProvenanceNote}.`,
        reporter_contact: reporterContact,
      });
      setSubmissionResult(res);
      setStep(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to emergency portal.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Wizard Header */}
      <header className="sticky top-0 z-30 bg-emerald-700 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step < 5 && (
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
              className="text-xs bg-emerald-800/80 hover:bg-emerald-900 px-2.5 py-1 rounded font-medium"
            >
              ← Back
            </button>
          )}
          <span className="font-bold text-sm">
            {step === 5 ? "Report Confirmed" : `Step ${step} of 4: Hazard Report`}
          </span>
        </div>
        {step < 5 && (
          <button onClick={onCancel} className="text-xs text-emerald-200 hover:text-white">
            Cancel
          </button>
        )}
      </header>

      {/* Progress Bar */}
      {step < 5 && (
        <div className="w-full bg-emerald-950/20 h-1.5">
          <div
            className="bg-emerald-500 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      )}

      {/* Main Step Body */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-between">
        {/* STEP 1: Photo Capture */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Evidence Photo</h2>
              <p className="text-xs text-slate-600 mt-1">
                Provide a photo of the road obstruction or slope failure, or select a reference hazard type.
              </p>
            </div>

            <div className="border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-2xl p-4 text-center">
              {activePhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-sm max-h-64 bg-slate-900">
                  <img src={activePhoto} alt="Hazard Observation" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => {
                      setCustomPhotoFile(null);
                      setSelectedSample(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded"
                  >
                    Reset Photo
                  </button>

                  {/* Provenance badge on image */}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-xs text-white p-2 text-left font-mono text-[10px] border-t border-white/10">
                    {customPhotoFile ? (
                      <div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 font-bold mr-1.5">REAL_CITIZEN_SUBMISSION</span>
                        <span className="text-slate-300">RECEIVED → UNVERIFIED (Local device upload)</span>
                      </div>
                    ) : selectedSample ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-amber-700 font-bold">REFERENCE IMAGE</span>
                          <span className="text-amber-300 font-semibold">NOT LIVE FIELD EVIDENCE</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                          SOURCE: {selectedSample.source} • {selectedSample.attribution}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-slate-500 text-xs font-mono">
                  <div className="text-2xl mb-1">📷</div>
                  No photo attached yet. Take a photo or select a reference example below.
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2">
                <label className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-sm text-center flex items-center justify-center gap-2">
                  <span>Take Photo / Upload File</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Reference Hazard Examples (GSI Records):</span>
                <span className="text-[10px] text-slate-500 font-mono">Tap to select sample</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_HAZARD_PHOTOS.map((sp) => {
                  const isSelected = selectedSample?.id === sp.id && !customPhotoFile;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setCustomPhotoFile(null);
                        setSelectedSample(sp);
                        if (sp.category === "LANDSLIDE") setHazardType("LANDSLIDE");
                        else if (sp.category === "ROCKFALL") setHazardType("ROCKFALL");
                        else if (sp.category === "ROAD_DEBRIS") setHazardType("SLOPE_DEBRIS");
                        else if (sp.category === "SLOPE_CRACK") setHazardType("CRACKS");
                      }}
                      className={`p-2 rounded-xl border text-left text-xs transition-all relative overflow-hidden ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="relative">
                        <img src={sp.url} alt={sp.title} className="w-full h-16 object-cover rounded-lg mb-1" />
                        <span className="absolute top-1 left-1 text-[8px] font-mono px-1 py-0.5 rounded bg-slate-900/80 text-amber-300 font-bold">
                          REF
                        </span>
                      </div>
                      <span className="block truncate font-semibold text-[11px]">{sp.title}</span>
                      <span className="text-[9px] text-slate-500 block truncate font-mono">{sp.attribution}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 font-mono text-center">
                Reference imagery provided for hazard identification only. Distinct from live field evidence.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Location Context</h2>
              <p className="text-xs text-slate-600 mt-1">
                Pinpoint where along the highway corridor the hazard is located.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Device GPS:</span>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                >
                  {gpsLoading ? "Acquiring GPS..." : "📍 Acquire Live GPS"}
                </button>
              </div>

              {locationMode === "GPS" && deviceGps && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-mono flex items-center justify-between">
                  <span>GPS Fixed: Lat {deviceGps.lat.toFixed(4)}°, Lng {deviceGps.lng.toFixed(4)}°</span>
                  {deviceGps.accuracy !== undefined && (
                    <span className="bg-emerald-200/70 text-emerald-950 px-2 py-0.5 rounded text-[10px] font-bold">
                      ±{Math.round(deviceGps.accuracy)}m accuracy
                    </span>
                  )}
                </div>
              )}
              {gpsError && <div className="text-[11px] text-amber-700 font-mono">{gpsError}</div>}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">Or Select a Known Corridor Landmark:</span>
              <div className="flex flex-col gap-2">
                {CORRIDOR_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setLocationMode("PRESET");
                      setSelectedPresetIndex(idx);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      locationMode === "PRESET" && selectedPresetIndex === idx
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-slate-900">{preset.name}</div>
                    <div className="text-slate-500 text-[11px]">{preset.description}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {preset.lat}° N, {preset.lng}° E
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Hazard Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">3. Observation Details</h2>
              <p className="text-xs text-slate-600 mt-1">
                Describe the type of slope movement and current road condition.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Hazard Category:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "SLOPE_DEBRIS", label: "Slope Debris" },
                  { id: "MUDFLOW", label: "Mudflow / Slurry" },
                  { id: "ROCKFALL", label: "Rockfall" },
                  { id: "ROAD_CRACK", label: "Pavement Subsidence" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHazardType(t.id as HazardType)}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      hazardType === t.id
                        ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Observed Severity:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "LOW", label: "Minor" },
                  { id: "MEDIUM", label: "Moderate" },
                  { id: "HIGH", label: "Severe / Cutoff" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id as HazardSeverity)}
                    className={`p-2 rounded-lg border text-xs text-center font-medium transition-all ${
                      severity === s.id
                        ? "border-amber-600 bg-amber-50 font-bold text-amber-950"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Observation Tag Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Quick Observation Tags:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Active rockfall",
                  "Water seepage",
                  "Mud flow",
                  "Road cracked",
                  "Trees leaning",
                  "Culvert blocked",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAppendTag(tag)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-full font-medium transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Observation Notes:</label>
                <button
                  type="button"
                  onClick={toggleVoiceNote}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1 transition-all ${
                    isVoiceListening
                      ? "bg-red-500 text-white border-red-600 animate-pulse font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  }`}
                >
                  <span>{isVoiceListening ? "🔴 Recording..." : "🎙️ Voice Note"}</span>
                </button>
              </div>

              {voiceStatus && (
                <div className="text-[10px] font-mono px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  {voiceStatus}
                </div>
              )}

              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                placeholder="Describe road blockage, water runoff, or visible slope cracks..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Number (Optional):</label>
              <input
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="+91 Mobile number for verification"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Review and Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">4. Review Observation</h2>
              <p className="text-xs text-slate-600 mt-1">
                Please verify your observation before transmitting to emergency operations.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold text-slate-800">
                  {locationMode === "GPS" ? "Live Device GPS" : activePreset.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-slate-800">
                  {currentCoords.lat}° N, {currentCoords.lng}° E
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Hazard:</span>
                <span className="font-bold text-emerald-700">{hazardType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Severity:</span>
                <span className="font-bold text-amber-700">{severity}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Observation:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {observation}
                </p>
              </div>

              {activePhoto && (
                <div className="py-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1 font-semibold">Attached Media:</span>
                  <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-900">
                    <img src={activePhoto} alt="Attached Evidence" className="w-full h-32 object-cover" />
                    <div className="p-2 bg-slate-950 text-white font-mono text-[10px] flex items-center justify-between">
                      {customPhotoFile ? (
                        <>
                          <span className="text-emerald-400 font-bold">REAL_CITIZEN_SUBMISSION</span>
                          <span className="text-slate-400">STATUS: RECEIVED → UNVERIFIED</span>
                        </>
                      ) : selectedSample ? (
                        <>
                          <span className="text-amber-400 font-bold">REFERENCE SAMPLE (NOT FIELD EVIDENCE)</span>
                          <span className="text-slate-400 truncate ml-1">{selectedSample.source}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Honest CV Analysis Disclaimer */}
            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">CV ANALYSIS: NOT CONNECTED / EXPERIMENTAL</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">MANUAL VERIFICATION REQUIRED</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Automated computer-vision inference is disabled on live public submission channels. All citizen photos undergo human operator review in the State Emergency Operations Centre prior to action authorization.
              </p>
            </div>

            {/* Authoritative Safety Boundary Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 space-y-1">
              <div className="font-bold">⚠️ Public Safety Boundary Notice</div>
              <p className="text-[11px] leading-relaxed">
                Your report will enter emergency systems as <strong>UNVERIFIED</strong> evidence. It will be reviewed by district disaster management authorities before operational highway action or dispatch is authorized.
              </p>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-300 text-xs text-red-800">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Confirmation / Success */}
        {step === 5 && submissionResult && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-sm">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Observation Transmitted</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Thank you. Your observation has been logged directly into the emergency operations centre.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-left space-y-2.5 text-xs shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Tracking Reference:</span>
                <span className="font-mono font-bold text-emerald-700">{submissionResult.tracking_id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Associated Incident:</span>
                <span className="font-mono font-bold text-slate-800">{submissionResult.incident_code}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Review Status:</span>
                <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                  {submissionResult.status} ({submissionResult.interpretation})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Automated CV Action:</span>
                <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                  DISABLED (AWAITING SEOC OPERATOR REVIEW)
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Preliminary Safety Guidance:</span>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                  {submissionResult.preliminary_guidance}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onComplete}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-md text-sm transition-all"
              >
                Return to Safe Home
              </button>
            </div>
          </div>
        )}

        {/* Wizard Footer Nav Buttons */}
        {step < 5 && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all text-center"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all text-center flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Transmitting..." : "Submit to Operations Centre ✓"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
