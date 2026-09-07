import React from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { InteractiveMap } from "../InteractiveMap";
import { OTHER_NER_INCIDENTS } from "../../data/deterministicScenario";
import {
  IconAlertTriangle,
  IconCloudRain,
  IconActivity,
  IconArrowRight,
  IconRadio,
  IconRadar,
  IconShieldAlert,
} from "../icons";

export const CommandCentreView: React.FC = () => {
  const { setStep, selectIncident, riskLevel, confidenceLevel, incidentStatus } = useDemoScenario();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Top Banner: Regional Hazard Intelligence Alert */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-red-950/40 border border-red-800/60 p-3.5 rounded-xl text-xs text-red-200 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-red-900/60 text-red-300 border border-red-700/50">
            <IconAlertTriangle className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <div className="font-bold uppercase tracking-wider text-red-300 text-[11px] font-mono">
              IMD & GSI REGIONAL ADVISORY: NORTH EASTERN REGION (ZONE-V)
            </div>
            <div className="text-sm font-semibold text-white">
              Cloudburst activity concentrated over Kameng and Subansiri basins. Multiple chronic landslide corridors triggered.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="bg-red-900/50 px-2.5 py-1 rounded border border-red-700/60 text-red-200">
            ACTIVE ALERTS: 4
          </span>
          <span className="bg-neutral-900 px-2.5 py-1 rounded border border-neutral-700 text-neutral-300">
            REFRESH: LIVE (AWS STREAM)
          </span>
        </div>
      </div>

      {/* Main Grid: Map & Operational Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[620px]">
        {/* Left Column: Interactive Map (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          <div className="flex-1 min-h-[480px]">
            <InteractiveMap detailedView={false} />
          </div>

          {/* Real-time Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                <span>IMD AWS RAINFALL</span>
                <IconCloudRain className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-white font-mono">184.6</span>
                <span className="text-xs text-neutral-400">mm / 24h</span>
              </div>
              <div className="text-[10px] text-red-400 font-mono mt-1">▲ Bhalukpong Peak</div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                <span>SLOPE STABILITY</span>
                <IconActivity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-300 font-mono">FoS 0.92</span>
                <span className="text-xs text-amber-400/80">(Unstable)</span>
              </div>
              <div className="text-[10px] text-amber-400 font-mono mt-1">KM-42 Critical Scarp</div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                <span>RADAR REFLECTIVITY</span>
                <IconRadar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-white font-mono">52 dBZ</span>
                <span className="text-xs text-neutral-400">Kameng Flank</span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1">DWR Mohanbari Feed</div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                <span>INTER-AGENCY STATUS</span>
                <IconRadio className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-400 font-mono">BRO + SDRF</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">TETRA Comms Active</div>
            </div>
          </div>
        </div>

        {/* Right Column: Incident Queue & TG-2048 Highlight (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Priority Focus Header */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
                <IconShieldAlert className="w-4 h-4 text-red-500" />
                ACTIVE HAZARD QUEUE (NER)
              </span>
              <span className="text-xs font-mono text-neutral-500">SORTED BY PRIORITY</span>
            </div>

            {/* TG-2048 FEATURED CARD */}
            <div className="relative bg-gradient-to-b from-red-950/60 to-neutral-900 border-2 border-red-500/80 rounded-xl p-4 shadow-xl shadow-red-950/40 flex flex-col gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded shadow">
                      TG-2048
                    </span>
                    <span className="bg-red-950 text-red-300 border border-red-700/60 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                      {riskLevel} RISK
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      CONF: {confidenceLevel}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    NH-13 KM-42 Slope Debris Flow
                  </h3>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5">
                    Bhalukpong-Tenga Corridor, West Kameng, AP
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-red-400 font-semibold">Operational Context:</span> Saturated mica-schist face above NH-13 trans-highway. Rain volume 184mm. Potential single-point cutoff for Tawang district lifeline.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                  <div className="text-[10px] text-neutral-500">STATE</div>
                  <div className="font-bold text-emerald-400">{incidentStatus}</div>
                </div>
                <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                  <div className="text-[10px] text-neutral-500">IMPACT PRIORITY</div>
                  <div className="font-bold text-red-400">CRITICAL (P1)</div>
                </div>
              </div>

              {/* Action Button to Launch Workspace */}
              <button
                onClick={() => setStep(2)}
                className="w-full mt-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 text-sm transition-all"
              >
                <span>Investigate TG-2048 Workspace</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Other Incidents in Queue */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="text-[11px] font-mono text-neutral-500 font-semibold px-1">
                OTHER ACTIVE MONITORED SITES
              </div>
              {OTHER_NER_INCIDENTS.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => selectIncident(inc.id)}
                  className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-300">{inc.code}</span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor:
                            inc.riskLevel === "HIGH"
                              ? "#451a03"
                              : inc.riskLevel === "MODERATE"
                              ? "#422006"
                              : "#052e16",
                          color:
                            inc.riskLevel === "HIGH"
                              ? "#fdba74"
                              : inc.riskLevel === "MODERATE"
                              ? "#fde047"
                              : "#86efac",
                        }}
                      >
                        {inc.riskLevel}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 truncate max-w-[200px] mt-0.5">
                      {inc.title}
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-neutral-500">
                    <div>{inc.status}</div>
                    <div className="text-[10px] text-neutral-600">{inc.priorityLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
