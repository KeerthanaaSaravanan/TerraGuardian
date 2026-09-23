import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import {
  IconCheckCircle2,
  IconArrowRight,
  IconMapPin,
  IconClock,
  IconShieldCheck,
  IconRadio,
  IconSend,
  IconUserCheck,
} from "../icons";

// IconCamera replacement helper
function IconCameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export const FieldVerificationView: React.FC = () => {
  const {
    setStep,
    isVerificationRequested,
    isFieldReportReceived,
    fieldReport,
    requestVerification,
    confidenceLevel,
    confidenceScore,
  } = useDemoScenario();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 5 OF 10</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">FIELD VERIFICATION & GROUND TRUTH WORKFLOW</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Ground Patrol Verification for Incident TG-2048
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Closing the gap between remote satellite/radar estimates and physical on-corridor reality.
          </p>
        </div>

        {isFieldReportReceived && (
          <button
            onClick={() => setStep(6)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
          >
            <span>Proceed to Authority Decision</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Verification Dispatch Control Box (Pre-Dispatch or Active) */}
      {!isFieldReportReceived ? (
        <div className="bg-white dark:bg-neutral-900 border-2 border-amber-500 rounded-xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              STATUS: PENDING PHYSICAL CONFIRMATION
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Request On-Site Verification from Nearest Patrol Unit
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-300 max-w-2xl leading-relaxed">
              Dispatching State Disaster Response Force (SDRF) Quick Response Team Bravo stationed at Bhalukpong outpost (4.2 km from slide zone).
              The patrol will perform visual inspection, photographic capture, and confirm asphalt encroachment.
            </p>
          </div>

          <button
            onClick={requestVerification}
            disabled={isVerificationRequested}
            className={`px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all ${
              isVerificationRequested
                ? "bg-amber-600/50 text-amber-200 cursor-wait animate-pulse"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/20"
            }`}
          >
            <IconSend className="w-4 h-4" />
            <span>{isVerificationRequested ? "Transmitting to Patrol..." : "Request Verification Now"}</span>
          </button>
        </div>
      ) : (
        /* Confidence Jump Banner */
        <div className="bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/80 dark:to-neutral-900 border-2 border-emerald-500 rounded-xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600">
              <IconShieldCheck className="w-7 h-7" />
            </span>
            <div>
              <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                CONFIDENCE LEVEL UPDATED VIA GROUND TRUTH
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                Evidence Confidence Elevated: <span className="text-slate-400 dark:text-neutral-400 line-through">MODERATE (54%)</span>{" "}
                → <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">HIGH ({confidenceScore}%)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1">
                Visual inspection by Sub-Inspector R. Thapa reconciles satellite optical ambiguity. Carriageway encroachment confirmed.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-neutral-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-neutral-800 text-center font-mono">
            <div className="text-[10px] text-slate-500 dark:text-neutral-400">INCIDENT STATE</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">VERIFIED (READY FOR DECISION)</div>
          </div>
        </div>
      )}

      {/* Field Report Details (Appears when received) */}
      {isFieldReportReceived && fieldReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Geo-tagged Photo & Telemetry (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <IconCameraIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                GEO-TAGGED EVIDENCE CAPTURE
              </h3>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-bold">
                EXIF VERIFIED
              </span>
            </div>

            {/* Simulated Geo-Tagged Photo View */}
            <div className="relative w-full h-64 bg-neutral-950 rounded-lg overflow-hidden border border-slate-300 dark:border-neutral-800 flex flex-col justify-end p-4">
              {/* Photo background rendering: realistic simulated landslide scene */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-85"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse at center, #78350f 0%, #451a03 50%, #171717 100%)",
                }}
              />
              {/* Graphic overlays representing mud slurry, debris boulders, and road tarmac */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
                {/* Asphalt road line */}
                <polygon points="0,200 400,160 400,240 0,240" fill="#171717" />
                <line x1="0" y1="210" x2="400" y2="185" stroke="#facc15" strokeWidth="2" strokeDasharray="15,10" />
                {/* Mud & rock slurry covering carriageway */}
                <path
                  d="M 60 140 Q 140 180, 220 170 T 360 210 L 400 240 L 0 240 L 0 160 Z"
                  fill="#78350f"
                  opacity="0.85"
                />
                <circle cx="180" cy="180" r="14" fill="#525252" stroke="#262626" />
                <circle cx="240" cy="190" r="18" fill="#404040" stroke="#171717" />
                <circle cx="120" cy="170" r="9" fill="#737373" />
                {/* Water drainage across road */}
                <path d="M 160 160 Q 190 200, 220 240" stroke="#38bdf8" strokeWidth="3" opacity="0.6" fill="none" />
              </svg>

              {/* Live HUD Overlay on photo */}
              <div className="relative z-10 bg-neutral-900/90 backdrop-blur-md p-2.5 rounded-lg border border-neutral-700 text-[11px] font-mono text-neutral-200 shadow-md">
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>LAT: {fieldReport.coordinates.lat}° N</span>
                  <span>LNG: {fieldReport.coordinates.lng}° E</span>
                </div>
                <div className="flex justify-between text-neutral-400 text-[10px] mt-0.5">
                  <span>ALT: {fieldReport.coordinates.altitude}</span>
                  <span>TIME: 04:48:12 IST</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 flex items-center justify-between px-1">
              <span>DEVICE: SDRF Rugged Tablet (IMEI #738)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Report Checksum: Logged (Demo)</span>
            </div>
          </div>

          {/* Right: Field Observations & Inspector Rationale (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <IconUserCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {fieldReport.officerName}
                    </h3>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                      {fieldReport.unit} | Callsign: {fieldReport.callsign}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {fieldReport.timestamp}
                </span>
              </div>

              {/* Summary */}
              <div className="mt-4 bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wider font-mono">
                  FIELD OFFICER SUMMARY:
                </div>
                <p className="text-xs text-slate-800 dark:text-neutral-200 mt-1.5 leading-relaxed font-sans">
                  "{fieldReport.summary}"
                </p>
              </div>

              {/* Key Findings List */}
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 uppercase">
                  VERIFIED PHYSICAL FINDINGS:
                </span>
                {fieldReport.keyFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-950/60 p-2.5 rounded border border-slate-200 dark:border-neutral-800/80"
                  >
                    <IconCheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Step CTA */}
            <div className="mt-2 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                Hazard verified. Operational threshold met for human authority decision.
              </span>
              <button
                onClick={() => setStep(6)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <span>Authorize Decision (Step 6)</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

