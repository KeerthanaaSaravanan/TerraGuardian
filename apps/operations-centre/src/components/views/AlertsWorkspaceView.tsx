import React, { useState, useEffect } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { AlertLifecycleBadge, TruthBadge, OperationalCard } from "../common";
import { apiClient } from "../../services/apiClient";
import {
  IconActivity,
  IconRadio,
  IconAlertTriangle,
  IconCheckCircle2,
  IconClock,
  IconShieldAlert,
  IconSend,
  IconLayers,
} from "../icons";

interface AlertRecord {
  id: string;
  code: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  headline: string;
  targetArea: string;
  stage: "ALERT_GENERATED" | "ALERT_AUTHORIZED" | "ALERT_SENT" | "ALERT_DELIVERED" | "ALERT_ACKNOWLEDGED" | string;
  channels: {
    name: string;
    type: "CAP" | "VHF" | "APP_PUSH" | "SMS_GATEWAY";
    status: "DELIVERED" | "SENT" | "PENDING" | "CHANNEL_NOT_CONNECTED";
    latency: string;
    details: string;
  }[];
  generatedAt: string;
  authorizedBy: string;
  actionRequired: string;
}

export const AlertsWorkspaceView: React.FC = () => {
  const { incidentCode, riskLevel, priorityLevel, backendStatus, backendIncidentId } = useDemoScenario();
  const [selectedAlertIndex, setSelectedAlertIndex] = useState<number>(0);
  const [liveAlerts, setLiveAlerts] = useState<AlertRecord[]>([]);

  // Authoritative alert records adhering to semantic invariant: Generated ≠ Authorized ≠ Sent ≠ Delivered ≠ Acknowledged
  const defaultAlerts: AlertRecord[] = [
    {
      id: "ALT-2048-01",
      code: "RED-ALERT-KM42-BCT",
      severity: "CRITICAL",
      headline: "FLASH RED: Active Slope Debris Flow & Carriageway Severance Threat",
      targetArea: "NH-13 Corridor KM-38 to KM-46 (Bhalukpong-Tenga Road), West Kameng",
      stage: "ALERT_DELIVERED",
      channels: [
        {
          name: "CAP / SACHET XML Protocol",
          type: "CAP",
          status: "DELIVERED",
          latency: "1.2s",
          details: "Standardized OASIS CAP v1.2 feed consumed by SDMA Emergency Portal [CONTROLLED_DEMO]",
        },
        {
          name: "TerraGuardian Safe Mobile PWA Push",
          type: "APP_PUSH",
          status: "DELIVERED",
          latency: "0.8s",
          details: "Hyper-local geo-fenced broadcast to registered mobile devices in West Kameng [CONTROLLED_DEMO]",
        },
        {
          name: "District Police Wireless VHF Channel 4",
          type: "VHF",
          status: "SENT",
          latency: "Manual",
          details: "VHF dispatch transmitted to Bhalukpong & Tenga Police Checkposts [CONTROLLED_DEMO]",
        },
        {
          name: "National Telecom SMS Gateway (C-DOT Cell Broadcast)",
          type: "SMS_GATEWAY",
          status: "CHANNEL_NOT_CONNECTED",
          latency: "N/A",
          details: "Carrier SMS SMPP gateway integration awaiting departmental telecom clearance (No synthetic SMS)",
        },
      ],
      generatedAt: "04:24 IST",
      authorizedBy: "District Magistrate West Kameng (Statutory Order #DDMA-WK-884)",
      actionRequired: "Immediate complete closure of NH-13 at KM-38 checkpost. Divert all non-emergency traffic via Rupa bypass.",
    },
    {
      id: "ALT-2048-02",
      code: "AMBER-SAT-SUBANSIRI",
      severity: "HIGH",
      headline: "AMBER WATCH: Soil Moisture Saturation Exceedance in Lower Subansiri",
      targetArea: "Yazali-Ziro Road (State Highway 11), Lower Subansiri District",
      stage: "ALERT_GENERATED",
      channels: [
        {
          name: "CAP / SACHET XML Protocol",
          type: "CAP",
          status: "DELIVERED",
          latency: "2.1s",
          details: "Advisory broadcast to State Disaster Management Authority queue [CONTROLLED_DEMO]",
        },
        {
          name: "TerraGuardian Safe Mobile PWA Push",
          type: "APP_PUSH",
          status: "PENDING",
          latency: "Queued",
          details: "Awaiting local magistrate statutory authorization before civilian dissemination",
        },
        {
          name: "National Telecom SMS Gateway",
          type: "SMS_GATEWAY",
          status: "CHANNEL_NOT_CONNECTED",
          latency: "N/A",
          details: "SMS carrier service not connected (Truth in delivery)",
        },
      ],
      generatedAt: "04:45 IST",
      authorizedBy: "System Dynamic Hazard Engine (Pre-authorization Draft)",
      actionRequired: "PWD road maintenance patrols placed on standby. Monitor culvert outflow at KM-18.",
    },
  ];

  useEffect(() => {
    if (!backendIncidentId) return;
    apiClient
      .getIncidentAlerts(backendIncidentId)
      .then((backendList) => {
        if (Array.isArray(backendList) && backendList.length > 0) {
          const mapped: AlertRecord[] = backendList.map((ba) => ({
            id: ba.id || `BA-${ba.alert_code}`,
            code: ba.alert_code || "LIVE-ALERT",
            severity: ba.severity === "CRITICAL" ? "CRITICAL" : ba.severity === "HIGH" ? "HIGH" : "MODERATE",
            headline: ba.headline || ba.title || "Disaster Emergency Advisory",
            targetArea: ba.target_area || "West Kameng Corridor",
            stage: ba.stage ? (ba.stage.startsWith("ALERT_") ? ba.stage : `ALERT_${ba.stage}`) : "ALERT_DELIVERED",
            channels: Array.isArray(ba.channels)
              ? ba.channels.map((c: any) => ({
                  name: c.channel_name || c.name || "Channel",
                  type: (c.channel_type || c.type || "CAP") as any,
                  status: c.status || "SENT",
                  latency: c.latency || "1.0s",
                  details: c.details || "Dispatched via live alert engine",
                }))
              : defaultAlerts[0].channels,
            generatedAt: ba.created_at ? new Date(ba.created_at).toLocaleTimeString() : "04:24 IST",
            authorizedBy: ba.authorized_by || "District Magistrate West Kameng",
            actionRequired: ba.action_required || "Enforce traffic diversion.",
          }));
          setLiveAlerts(mapped);
        }
      })
      .catch((err) => console.warn("Live alert fetch fallback:", err));
  }, [backendIncidentId]);

  const alerts = liveAlerts.length > 0 ? liveAlerts : defaultAlerts;
  const currentAlert = alerts[selectedAlertIndex] || alerts[0];

  const stageOrder = ["GENERATED", "AUTHORIZED", "SENT", "DELIVERED", "ACKNOWLEDGED"];
  const normStage = (currentAlert.stage || "").replace("ALERT_", "").toUpperCase();
  const activeIdx = stageOrder.indexOf(normStage) !== -1 ? stageOrder.indexOf(normStage) : 3;

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Banner: Warning Pipeline Architecture */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
            <IconRadio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>EARLY WARNING & PUBLIC ALERT DISSEMINATION</span>
              <TruthBadge truthClass="CONTROLLED_DEMO" />
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              Warning Pipeline Invariant: Alert Generated ≠ Alert Authorized ≠ Alert Sent ≠ Alert Delivered ≠ Alert Acknowledged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="bg-slate-100 dark:bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold">
            CHANNELS CONNECTED: 3 / 4 (SMS: CHANNEL_NOT_CONNECTED)
          </span>
        </div>
      </div>

      {/* Warning Pipeline 5-Stage Lifecycle Ribbon */}
      <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col gap-2">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Statutory Warning Pipeline Status (5 Discrete Stages)</span>
          <span className="text-emerald-400 font-bold">CURRENT STAGE: {currentAlert.stage}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
          {/* STAGE 1: GENERATED */}
          <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
            activeIdx >= 0
              ? "bg-slate-800/80 border-emerald-500/50"
              : "bg-slate-800/40 border-slate-700 text-slate-400"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400">STAGE 1</span>
              {activeIdx >= 0 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[10px] text-slate-500">PENDING</span>}
            </div>
            <div className="font-bold text-xs">GENERATED</div>
            <div className="text-[10px] text-slate-400">Triggered by ERA5 + IMD 74mm threshold</div>
          </div>

          {/* STAGE 2: AUTHORIZED */}
          <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
            activeIdx >= 1
              ? "bg-slate-800/80 border-purple-500/50"
              : "bg-slate-800/40 border-slate-700 text-slate-400"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-purple-400">STAGE 2</span>
              {activeIdx >= 1 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <span className="text-[10px] text-amber-400 animate-pulse">AWAITING MAGISTRATE</span>}
            </div>
            <div className="font-bold text-xs">AUTHORIZED</div>
            <div className="text-[10px] text-slate-400">Statutory sign-off by DDMA / DM</div>
          </div>

          {/* STAGE 3: SENT */}
          <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
            activeIdx >= 2
              ? "bg-slate-800/80 border-indigo-500/50"
              : "bg-slate-800/40 border-slate-700 text-slate-400"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400">STAGE 3</span>
              {activeIdx >= 2 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> : <span className="text-[10px] text-slate-500">QUEUED</span>}
            </div>
            <div className="font-bold text-xs">SENT</div>
            <div className="text-[10px] text-slate-400">Dispatched over CAP XML & VHF Net</div>
          </div>

          {/* STAGE 4: DELIVERED */}
          <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
            activeIdx >= 3
              ? "bg-slate-800/80 border-blue-500/50"
              : "bg-slate-800/40 border-slate-700 text-slate-400"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-400">STAGE 4</span>
              {activeIdx >= 3 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <span className="text-[10px] text-slate-500">IN TRANSIT</span>}
            </div>
            <div className="font-bold text-xs">DELIVERED</div>
            <div className="text-[10px] text-slate-400">Safe App PWA & SDMA Portal receipt</div>
          </div>

          {/* STAGE 5: ACKNOWLEDGED */}
          <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
            activeIdx >= 4
              ? "bg-slate-800/80 border-emerald-500/50"
              : "bg-slate-800/40 border-amber-500/50 text-amber-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400">STAGE 5</span>
              {activeIdx >= 4 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[10px] font-mono text-amber-400 animate-pulse">PENDING PATROL</span>}
            </div>
            <div className="font-bold text-xs">ACKNOWLEDGED</div>
            <div className="text-[10px] text-slate-400">Field patrol checkpost confirmation</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Alert List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Alert Queue (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
            Active Warning Queue ({alerts.length})
          </div>

          {alerts.map((alt, idx) => (
            <div
              key={alt.id}
              onClick={() => setSelectedAlertIndex(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                selectedAlertIndex === idx
                  ? "bg-white dark:bg-neutral-900 border-red-500 shadow-md ring-1 ring-red-500/20"
                  : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-400 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  {alt.code}
                </span>
                <AlertLifecycleBadge stage={alt.stage} />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                {alt.headline}
              </div>
              <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                Target: {alt.targetArea}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Detailed Dissemination Telemetry (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div>
                <div className="text-xs font-mono text-red-600 font-bold">{currentAlert.code}</div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {currentAlert.headline}
                </h2>
              </div>
              <AlertLifecycleBadge stage={currentAlert.stage} size="sm" />
            </div>

            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <div><strong>TARGET GEOGRAPHY:</strong> {currentAlert.targetArea}</div>
              <div><strong>AUTHORIZED BY:</strong> {currentAlert.authorizedBy}</div>
              <div><strong>GENERATED AT:</strong> {currentAlert.generatedAt}</div>
              <div className="text-red-700 dark:text-red-300"><strong>MANDATORY ACTION:</strong> {currentAlert.actionRequired}</div>
            </div>

            {/* Transmission Channels Table */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Dissemination Channels & Delivery Audit
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-lg overflow-hidden text-xs font-mono">
                {currentAlert.channels.map((chan, cidx) => (
                  <div key={cidx} className="p-3 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{chan.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">[{chan.type}]</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-neutral-400 mt-0.5 font-sans">
                        {chan.details}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {chan.status === "DELIVERED" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400 font-bold text-[10px] flex items-center gap-1.5">
                          {chan.details.includes("[CONTROLLED_DEMO]") && (
                            <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 px-1 rounded text-[9px] font-black tracking-wider">
                              CONTROLLED_DEMO
                            </span>
                          )}
                          <span>DELIVERED ({chan.latency})</span>
                        </span>
                      ) : chan.status === "SENT" ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-400 font-bold text-[10px] flex items-center gap-1.5">
                          {chan.details.includes("[CONTROLLED_DEMO]") && (
                            <span className="bg-blue-200 dark:bg-blue-900 text-blue-950 dark:text-blue-100 px-1 rounded text-[9px] font-black tracking-wider">
                              CONTROLLED_DEMO
                            </span>
                          )}
                          <span>SENT (VHF PTT)</span>
                        </span>
                      ) : chan.status === "CHANNEL_NOT_CONNECTED" ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-300 dark:border-neutral-700 font-bold text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-neutral-500" />
                          <span>CHANNEL NOT CONNECTED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-400 font-bold text-[10px]">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
