import React from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { ThemeToggle } from "../common";
import {
  IconShieldCheck,
  IconRadio,
  IconMapPin,
  IconAlertTriangle,
  IconArrowRight,
  IconClock,
} from "../icons";

interface PreliminaryResultStepProps {
  onGoToOperationsCentre: () => void;
}

export const PreliminaryResultStep: React.FC<PreliminaryResultStepProps> = ({
  onGoToOperationsCentre,
}) => {
  const { compiledObservation, activeImage, resetReport, persistedReport } = usePublicReport();

  const trackingId = persistedReport?.tracking_id || compiledObservation.observationId;
  const stateName = persistedReport?.state || compiledObservation.location.state;
  const districtName = persistedReport?.district || compiledObservation.location.district;
  const corridorName = persistedReport?.road_corridor || compiledObservation.location.corridorName;
  const latCoord = persistedReport ? persistedReport.latitude : compiledObservation.location.lat;
  const lngCoord = persistedReport ? persistedReport.longitude : compiledObservation.location.lng;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </span>
          <span className="font-bold text-xs text-slate-900 dark:text-white">Observation Analysis</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={resetReport}
            className="text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded cursor-pointer"
          >
            New Report
          </button>
        </div>
      </header>

      {/* Main Result Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        {/* Submission Confirmation Banner */}
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ✓
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
              Observation Successfully Persisted & Queued
            </div>
            <div className="text-slate-600 dark:text-emerald-300/80 text-[11px] font-mono mt-0.5">
              TRACKING ID: <span className="font-bold text-emerald-700 dark:text-emerald-400">{trackingId}</span>
            </div>
            <div className="text-slate-500 dark:text-neutral-400 text-[11px] mt-1">
              Logged into {districtName}, {stateName} emergency responder review queue. Status: <strong className="text-amber-600 font-mono">UNVERIFIED (PENDING FIELD REVIEW)</strong>.
            </div>
          </div>
        </div>

        {/* Preliminary AI Assessment Card */}
        <div className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 block font-semibold">
                PRELIMINARY COMPUTER VISION SCREENING
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                Potential Slope Failure Indicators Detected
              </h3>
            </div>
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800/60 shrink-0">
              MODERATE CONFIDENCE
            </span>
          </div>

          {/* Scientific Transparency & Field Verification Disclaimer */}
          <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-[11px] font-mono text-slate-600 dark:text-neutral-400 leading-snug">
            <strong>Provenance:</strong> REAL_USER_SUBMITTED • Automated Edge Feature Extraction (Zero automated road closures; human authorization required under NDMA Section 30/34).
          </div>

          {/* Photo & Detected Features */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="h-28 rounded-xl overflow-hidden bg-slate-900">
              <img
                src={activeImage}
                alt="Analyzed"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-700 dark:text-neutral-300 text-[11px]">
                Detected Features:
              </span>
              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-neutral-400">
                {compiledObservation.imageAnalysis.detectedFeatures.map((feat, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Critical Infrastructure Match */}
          <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 uppercase">INFRASTRUCTURE CORRIDOR MATCH</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">PROXIMITY: ARTERIAL CORRIDOR</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-xs">
              {corridorName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">
              Coordinates: {latCoord.toFixed(4)}°N, {lngCoord.toFixed(4)}°E • Jurisdiction: {districtName}, {stateName}
            </div>
          </div>

          {/* Mandatory Safety Guidance for Public */}
          <div className="space-y-2 pt-1">
            <div className="font-bold text-xs text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
              <IconAlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Recommended Immediate Citizen Precautions:</span>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-[11px] text-slate-700 dark:text-neutral-300 space-y-1.5">
              {compiledObservation.preliminaryAssessment.safetyPrecautions.map((prec, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>{prec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operator Handoff Demonstration Action */}
        <div className="w-full bg-slate-900 text-white rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-xs">OPERATOR BRIDGE (SIH EVALUATION)</span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              DURABLE QUEUE
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            See how this real citizen observation (<strong>{trackingId}</strong>) is durably stored in the database and surfaced in the Operations Centre Evidence Review Queue.
          </p>
          <button
            onClick={onGoToOperationsCentre}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <span>View in Operations Centre Evidence Queue</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={resetReport}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <span>Return to Citizen Safe</span>
          </button>
        </div>
      </main>
    </div>
  );
};
