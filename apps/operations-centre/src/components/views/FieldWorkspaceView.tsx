import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { FieldVerificationView } from "./FieldVerificationView";
import { TruthBadge, OperationalCard, OperationalStateBadge } from "../common";
import {
  IconTruck,
  IconMapPin,
  IconShieldCheck,
  IconClock,
  IconActivity,
  IconCamera,
} from "../icons";

export const FieldWorkspaceView: React.FC = () => {
  const { incidentCode, verificationStatus, isFieldReportReceived, fieldReport } = useDemoScenario();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Banner: Field Response Intelligence */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
            <IconTruck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>FIELD RESPONDER DISPATCH & TELEMETRY</span>
              <TruthBadge truthClass="CONTROLLED_DEMO" />
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              Patrol Tasking • Ground Verification • Geo-Tagged Telemetry • Physical Confirmation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500 dark:text-neutral-400">PATROL STATUS:</span>
          <OperationalStateBadge state={verificationStatus === "VERIFIED" ? "PHYSICALLY_CONFIRMED" : "IN_PROGRESS"} />
        </div>
      </div>

      {/* Primary Field Verification Experience */}
      <div className="w-full">
        <FieldVerificationView />
      </div>
    </div>
  );
};
