import React, { useState } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { CitizenHeader } from "./CitizenHeader";
import { AmIAtRiskCard } from "./AmIAtRiskCard";
import { WhereIsDangerMap } from "./WhereIsDangerMap";
import { RoadStatusCard } from "./RoadStatusCard";
import { SmsNotificationCard } from "./SmsNotificationCard";
import { WhyThisAlertModal } from "./WhyThisAlertModal";
import { ImSafeModal } from "./ImSafeModal";
import { NeedHelpModal } from "./NeedHelpModal";
import { CitizenReportModal } from "./CitizenReportModal";
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconPhoneCall,
  IconCamera,
  IconChevronRight,
} from "../icons";

interface CitizenPortalViewProps {
  onSelectOperatorLogin: () => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({ onSelectOperatorLogin }) => {
  const { t } = useCitizenI18n();

  // In-page Modals state
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isImSafeModalOpen, setIsImSafeModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleScrollToMap = () => {
    const mapEl = document.getElementById("citizen-danger-map");
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToRoads = () => {
    const roadsEl = document.getElementById("citizen-roads-section");
    if (roadsEl) {
      roadsEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors bg-slate-950 font-sans">
      {/* Environmental Photographic Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-20"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Dark gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950 pointer-events-none z-0" />

      {/* 1. CLEAN CITIZEN HEADER */}
      <CitizenHeader
        onSelectOperatorLogin={onSelectOperatorLogin}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
        onOpenAlertsModal={() => setIsWhyModalOpen(true)}
        unreadAlertCount={1}
      />

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 px-3 sm:px-5 py-4 sm:py-6 max-w-2xl mx-auto w-full space-y-4">
        {/* 2. ACTIVE SAFETY ALERT (Emergency Mode) */}
        <section aria-labelledby="active-alert-heading" className="w-full">
          <div className="bg-red-950/40 border border-red-500/40 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl text-white">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-600 text-white shrink-0">
                  <IconAlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[10px] font-bold text-red-400 font-mono uppercase tracking-wider">
                    ACTIVE SAFETY ALERT • LANDSLIDE (TG-2048)
                  </div>
                  <h2 id="active-alert-heading" className="font-bold text-base sm:text-lg text-white">
                    NH-13 KM-38 Corridor Restricted
                  </h2>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                10:42 AM
              </span>
            </div>

            {/* 5 Core Citizen Safety Questions */}
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-slate-400 font-semibold text-[11px]">WHAT HAPPENED?</div>
                <div className="text-slate-100 font-medium">Active slope failure with mud and boulder runout across carriageway.</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">WHERE?</div>
                  <div className="text-slate-100 font-medium">NH-13 KM-42 (Bhalukpong-Tenga Corridor, West Kameng).</div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">DOES IT AFFECT ME?</div>
                  <div className="text-amber-300 font-medium">Check your live location card below to see your corridor distance.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">WHAT SHOULD I DO?</div>
                  <div className="text-slate-100 font-medium">Halt transit toward KM-38. Divert light vehicles via Rupa bypass if safe.</div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">WHICH ROAD SHOULD I AVOID?</div>
                  <div className="text-red-300 font-bold">Avoid NH-13 KM-38 to KM-46 section.</div>
                </div>
              </div>
            </div>

            {/* Immediate 3 Action Buttons */}
            <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsImSafeModalOpen(true)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/30"
              >
                <IconShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>I'M SAFE</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSOSModalOpen(true)}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-950/30"
              >
                <IconPhoneCall className="w-4 h-4 text-red-200" />
                <span>NEED HELP</span>
              </button>

              <button
                type="button"
                onClick={handleScrollToMap}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>VIEW DANGER</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. LOCATION & "AM I AT RISK?" CARD */}
        <section aria-label="Risk assessment">
          <AmIAtRiskCard
            onOpenWhyAlertModal={() => setIsWhyModalOpen(true)}
            onViewImpactMap={handleScrollToMap}
          />
        </section>

        {/* 4. WHAT SHOULD I DO? (Concise Action Instructions & Emergency Buttons) */}
        <section aria-labelledby="safety-actions-heading" className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
          <h3 id="safety-actions-heading" className="text-base font-bold tracking-tight text-white mb-2">
            Safety Guidance Checklist
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed mb-4">
            <li>Do not attempt to cross the NH-13 KM-38 checkpost while restricted.</li>
            <li>If currently in transit, divert via the suggested Rupa-Kalaktang bypass if directed by local wardens.</li>
            <li>Confirm you are safe, or request assistance if stranded.</li>
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleScrollToRoads}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/15 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Get Detour Info</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImSafeModalOpen(true)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/30"
            >
              <IconShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>I'm Safe</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSOSModalOpen(true)}
              className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-950/30"
            >
              <IconPhoneCall className="w-4 h-4 text-red-200" />
              <span>Need Help</span>
            </button>
          </div>
        </section>

        {/* 5. SINGLE DANGER / IMPACT MAP */}
        <section id="citizen-danger-map" aria-label="Danger map">
          <WhereIsDangerMap onOpenWhyAlertModal={() => setIsWhyModalOpen(true)} />
        </section>

        {/* 6. ROAD CONDITIONS NEAR YOU */}
        <section id="citizen-roads-section" aria-label="Road conditions">
          <RoadStatusCard onViewOnMap={handleScrollToMap} />
        </section>

        {/* 7. REPORT A HAZARD CTA */}
        <section aria-label="Report hazard" className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <IconCamera className="w-4 h-4 text-amber-400" />
                <span>See Something Dangerous?</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Report a landslide, rockfall, or blocked passage directly to district responders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-400/40 shrink-0"
            >
              <IconCamera className="w-4 h-4" />
              <span>Report Landslide</span>
            </button>
          </div>
        </section>

        {/* 8. ALERT DELIVERY / SMS STATUS (Compact) */}
        <section aria-label="Alert delivery">
          <SmsNotificationCard />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950 px-4 py-3 text-center text-[11px] text-slate-400 font-sans">
        TerraGuardian Safe • Landslide Early Warning & Citizen Safety Interface (Prototype Assessment)
      </footer>

      {/* IN-PAGE MODALS */}
      <WhyThisAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
      />

      <ImSafeModal
        isOpen={isImSafeModalOpen}
        onClose={() => setIsImSafeModalOpen(false)}
      />

      <NeedHelpModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
      />

      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
