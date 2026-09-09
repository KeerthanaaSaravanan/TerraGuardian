import React from "react";
import { ThemeToggle } from "../common";
import { usePublicReport } from "../../context/PublicReportContext";
import { IconShieldCheck, IconRadio, IconArrowRight, IconArrowLeft, IconMapPin } from "../icons";

interface PublicAccessViewProps {
  onSelectOperatorLogin: () => void;
}

export const PublicAccessView: React.FC<PublicAccessViewProps> = ({ onSelectOperatorLogin }) => {
  const { setPublicStep } = usePublicReport();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setPublicStep("LANDING")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
          SELECT ENTRY PATH
        </div>

        <ThemeToggle />
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Choose Access Mode
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400">
            Select the appropriate gateway according to your role.
          </p>
        </div>

        <div className="w-full space-y-4">
          {/* Public Citizen Reporter Card */}
          <div
            onClick={() => setPublicStep("CAPTURE_PHOTO")}
            className="cursor-pointer group bg-white dark:bg-neutral-900 border-2 border-emerald-500/50 hover:border-emerald-500 rounded-2xl p-5 shadow-md hover:shadow-lg transition-all flex flex-col gap-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-emerald-600 text-white font-mono text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              No Login Required
            </div>

            <div className="flex items-center gap-3">
              <span className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <IconRadio className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Citizen Hazard Reporter
                </h3>
                <div className="text-xs text-slate-500 dark:text-neutral-400">
                  Public mobile workflow for local slope hazards
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
              Capture a field photo, verify your GPS location, receive instant preliminary safety guidance, and submit directly to emergency operations.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Continue as Citizen</span>
              <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Authorized Operator Access Card */}
          <div
            onClick={onSelectOperatorLogin}
            className="cursor-pointer group bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-600 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                <IconShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Authorized Operations Centre
                </h3>
                <div className="text-xs text-slate-500 dark:text-neutral-400">
                  SDMA / DDMA / SDRF / NDMA Responders
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
              Access the complete multi-agency Command Centre, Incident Twins (TG-2048), Multi-Source Fusion Engine, and Authority Decision gates.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300">
              <span>Enter Command Console</span>
              <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
