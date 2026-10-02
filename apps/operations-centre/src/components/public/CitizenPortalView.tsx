import React, { useState } from "react";
import { usePublicReport } from "../../context/PublicReportContext";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { CitizenHeader } from "./CitizenHeader";
import { AmIAtRiskCard } from "./AmIAtRiskCard";
import { WhereIsDangerMap } from "./WhereIsDangerMap";
import { RoadStatusCard } from "./RoadStatusCard";
import { SmsNotificationCard } from "./SmsNotificationCard";
import { WhyThisAlertModal } from "./WhyThisAlertModal";
import { ImSafeModal } from "./ImSafeModal";
import { NeedHelpModal } from "./NeedHelpModal";
import {
  IconRadio,
  IconAlertTriangle,
  IconShieldCheck,
  IconCamera,
  IconPhoneCall,
  IconMapPin,
  IconInfo,
} from "../icons";

interface CitizenPortalViewProps {
  onSelectOperatorLogin: () => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({ onSelectOperatorLogin }) => {
  const { setPublicStep } = usePublicReport();
  const { t } = useCitizenI18n();

  // Modals state
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isImSafeModalOpen, setIsImSafeModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);

  const handleStartReport = () => {
    setPublicStep("ACCESS");
  };

  const handleScrollToMap = () => {
    const mapElement = document.getElementById("impact-corridor-map");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Environmental Photographic Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/backgrounds/ner_himalayan_monsoon_terrain.jpg')" }}
      />
      {/* Atmospheric gradient overlay & vignette */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/95 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Multilingual Citizen Safe 2.0 Header */}
      <CitizenHeader
        onSelectOperatorLogin={onSelectOperatorLogin}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
        onOpenAlertsModal={() => setIsWhyModalOpen(true)}
        unreadAlertCount={1}
      />

      {/* Main Body Container */}
      <main className="relative z-10 flex-1 px-3 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto w-full space-y-6">
        {/* National / Regional Emergency Advisory Banner */}
        <div className="w-full">
          <div className="bg-amber-500/20 border border-amber-400/40 backdrop-blur-md rounded-2xl p-4 flex items-start gap-3.5 shadow-xl text-white">
            <span className="p-2 rounded-xl bg-amber-500/25 text-amber-300 shrink-0 border border-amber-400/40">
              <IconRadio className="w-5 h-5 animate-pulse" />
            </span>
            <div className="text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-amber-300 uppercase tracking-wider font-mono">
                  {t("active_monsoon_advisory")}
                </span>
                <span className="rounded bg-red-600/80 border border-red-400/50 px-1.5 py-0.2 text-[10px] font-bold text-white uppercase font-mono">
                  CRITICAL P1
                </span>
              </div>
              <div className="text-slate-200 mt-1 leading-relaxed">
                {t("advisory_body")}
              </div>
            </div>
          </div>
        </div>

        {/* 1. "AM I AT RISK?" Geospatial Evaluation Card */}
        <AmIAtRiskCard
          onOpenWhyAlertModal={() => setIsWhyModalOpen(true)}
          onOpenImSafeModal={() => setIsImSafeModalOpen(true)}
          onOpenSOSModal={() => setIsSOSModalOpen(true)}
          onStartReport={handleStartReport}
          onViewImpactMap={handleScrollToMap}
        />

        {/* 2. "WHERE IS THE DANGER?" Interactive Tactical Corridor Map */}
        <div id="impact-corridor-map">
          <WhereIsDangerMap onOpenWhyAlertModal={() => setIsWhyModalOpen(true)} />
        </div>

        {/* 3. "WHICH ROAD SHOULD I AVOID?" Arterial Highway Status */}
        <RoadStatusCard />

        {/* 4. Localized Emergency SMS Cell-Broadcast Preview with Truth Disclosure */}
        <SmsNotificationCard />

        {/* 5. Citizen Observation Reporting CTA Box */}
        <div className="w-full bg-slate-900/85 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                <IconCamera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Camera + GPS Field Observation</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                See a Landslide, Rockfall, or Slope Tension Crack?
              </h3>
              <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                Your photograph and location are analyzed by AI and immediately verified by district emergency teams to safeguard commuters.
              </p>
            </div>

            <button
              onClick={handleStartReport}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl shadow-emerald-950/40 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/40 shrink-0"
            >
              <IconCamera className="w-4 h-4 text-emerald-200" />
              <span>{t("btn_report_landslide")}</span>
            </button>
          </div>
        </div>

        {/* Safety First Reminder */}
        <div className="p-4 bg-slate-950/80 border border-white/10 rounded-2xl text-center text-xs text-slate-400 font-sans leading-relaxed">
          <strong className="text-slate-200">Life Safety Advisory:</strong> Never approach unstable escarpments or active debris flows to capture photographs. Keep safe distance from roadside revetments during active monsoon surges.
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/90 backdrop-blur-md px-4 py-3 text-center text-[10px] text-slate-400 font-mono">
        TerraGuardian Safe 2.0 • Government of India • National Disaster Management Authority (NDMA) & NER Inter-Agency Network
      </footer>

      {/* Modals */}
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
    </div>
  );
};
