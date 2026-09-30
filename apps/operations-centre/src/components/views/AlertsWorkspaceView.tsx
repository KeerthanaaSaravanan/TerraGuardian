import React, { useState, useEffect, useCallback } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { TruthBadge, OperationalCard } from "../common";
import { apiClient } from "../../services/apiClient";
import {
  IconRadio,
  IconCheckCircle2,
  IconClock,
  IconShieldAlert,
  IconSend,
  IconLayers,
  IconAlertTriangle,
  IconActivity,
  IconUsers,
} from "../icons";

interface AlertRecord {
  id: string;
  code: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "ADVISORY";
  warning_level?: string;
  headline: string;
  targetArea: string;
  stage: string;
  authorized: boolean;
  authorizedBy: string;
  authorityOrderCode?: string;
  actionRequired: string;
  rationale?: string;
  generatedAt: string;
  validUntil?: string;
  channels: {
    name: string;
    type: "CAP" | "VHF" | "APP_PUSH" | "SMS_GATEWAY";
    status: "DELIVERED" | "SENT" | "PENDING" | "CHANNEL_NOT_CONNECTED";
    latency: string;
    details: string;
  }[];
  acknowledgements_count?: number;
  safe_count?: number;
}

interface DataSourceHealth {
  source_id: string;
  name: string;
  provider: string;
  status: string;
  maturity: string;
  freshness_seconds?: number;
  notes: string;
}

export const AlertsWorkspaceView: React.FC = () => {
  const { backendIncidentId, currentRole } = useDemoScenario();
  const [selectedAlertIndex, setSelectedAlertIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [sourcesHealth, setSourcesHealth] = useState<DataSourceHealth[]>([]);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [orderCodeInput, setOrderCodeInput] = useState<string>("DDMA-WK-2026-904");
  const [signerNameInput, setSignerNameInput] = useState<string>("District Magistrate West Kameng");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState<boolean>(false);

  // New Alert Composer Form State
  const [composerForm, setComposerForm] = useState({
    headline: "FLASH WARNING: Active Slope Failure along NH-13 Corridor",
    warning_level: "WARNING",
    hazard_type: "LANDSLIDE",
    target_area: "KM-38 to KM-46 (Sessa Corridor), West Kameng",
    message: "High landslide hazard detected. Carriageway closure advised at KM-38 checkpost.",
    action_required: "Divert non-emergency vehicular traffic via Rupa bypass.",
    rationale: "IMD AWS precipitation exceedance (78mm/24h) combined with verified citizen slope crack report.",
    authority_order: "DDMA-WK-2026-905",
  });

  const loadAlerts = useCallback(async () => {
    try {
      let list: any[] = [];
      if (backendIncidentId) {
        list = await apiClient.getIncidentAlerts(backendIncidentId);
      } else {
        list = await apiClient.getAllAlerts();
      }

      if (Array.isArray(list) && list.length > 0) {
        const mapped: AlertRecord[] = list.map((ba) => ({
          id: ba.id,
          code: ba.alert_code || "LIVE-ALERT",
          severity: ba.severity || "HIGH",
          warning_level: ba.warning_level || "WARNING",
          headline: ba.headline || "Disaster Emergency Advisory",
          targetArea: ba.target_area || "West Kameng Corridor",
          stage: ba.stage || "ALERT_DELIVERED",
          authorized: Boolean(ba.authorized),
          authorizedBy: ba.authorized_by || "Pending Magistrate Authorization",
          authorityOrderCode: ba.authority_order_code,
          actionRequired: ba.action_required || "Follow official traffic diversion instructions.",
          rationale: ba.rationale || "Multi-sensor threshold exceedance and slope saturation.",
          generatedAt: ba.generated_at ? new Date(ba.generated_at).toLocaleTimeString() : "04:24 IST",
          validUntil: ba.valid_until ? new Date(ba.valid_until).toLocaleTimeString() : undefined,
          channels: Array.isArray(ba.channels)
            ? ba.channels.map((c: any) => ({
                name: c.channel_name || "Channel",
                type: c.channel_type,
                status: c.status,
                latency: c.latency || "1.0s",
                details: c.details || "Dispatched via early warning engine",
              }))
            : [],
          acknowledgements_count: Math.floor(Math.random() * 4) + 1,
          safe_count: Math.floor(Math.random() * 3) + 1,
        }));
        setAlerts(mapped);
      }
    } catch (err) {
      console.warn("Failed to load alerts:", err);
    }
  }, [backendIncidentId]);

  useEffect(() => {
    loadAlerts();
    apiClient
      .getDataSourcesHealth()
      .then((res) => {
        if (res && res.sources) setSourcesHealth(res.sources);
      })
      .catch(() => {});
  }, [loadAlerts]);

  // Authorization action
  const handleAuthorizeAlert = async (alertId: string) => {
    setIsAuthorizing(true);
    setActionFeedback(null);
    try {
      await apiClient.authorizeIncidentAlert(alertId, {
        authority_order_code: orderCodeInput,
        signer_name: signerNameInput,
        signer_role: currentRole === "MAGISTRATE" ? "AUTHORIZATION_OFFICER" : currentRole,
        is_controlled_demo: true,
      });
      setActionFeedback("✓ Alert authorized and broadcast dispatched across connected channels.");
      await loadAlerts();
    } catch (err: any) {
      setActionFeedback(`Authorization failed: ${err.message || err}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Evaluate triggers with Early Warning Engine
  const handleEvaluateTriggers = async () => {
    if (!backendIncidentId) {
      setActionFeedback("Please select an active incident from Command Overview first.");
      return;
    }
    setActionFeedback("Evaluating physical telemetry and trigger thresholds...");
    try {
      const res = await apiClient.evaluateAlertsForIncident(backendIncidentId);
      if (res.status === "ALERT_CANDIDATE_GENERATED") {
        setActionFeedback(`✓ Early Warning Engine generated new candidate: ${res.alert.alert_code}`);
        await loadAlerts();
      } else {
        setActionFeedback("ℹ Hazard metrics currently within normal operational limits.");
      }
    } catch (err: any) {
      setActionFeedback(`Evaluation error: ${err.message || err}`);
    }
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return a.stage === "ALERT_DELIVERED" || a.stage === "DELIVERED" || a.stage === "SENT";
    if (activeTab === "CANDIDATES") return a.stage === "ALERT_GENERATED" || a.stage === "GENERATED";
    if (activeTab === "AUTH_REQUIRED") return !a.authorized;
    if (activeTab === "ACKNOWLEDGED") return a.stage === "ALERT_ACKNOWLEDGED" || a.stage === "ACKNOWLEDGED";
    return true;
  });

  const currentAlert = filteredAlerts[selectedAlertIndex] || filteredAlerts[0] || alerts[0];

  const stageOrder = ["GENERATED", "AUTHORIZED", "SENT", "DELIVERED", "ACKNOWLEDGED"];
  const normStage = (currentAlert?.stage || "").replace("ALERT_", "").toUpperCase();
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
              <span>EARLY WARNING & PUBLIC ALERT OPERATIONS</span>
              <TruthBadge truthClass="CONTROLLED_DEMO" />
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              Warning Pipeline Invariant: Alert Generated ≠ Alert Authorized ≠ Alert Sent ≠ Alert Delivered ≠ Alert Acknowledged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleEvaluateTriggers}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <span>⚡</span>
            <span>Evaluate Early Warning Engine</span>
          </button>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <span>✍</span>
            <span>{showComposer ? "Close Composer" : "Alert Composer"}</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-slate-900 text-emerald-300 border border-emerald-500/50 p-3 rounded-xl text-xs font-mono flex items-center justify-between shadow-sm">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Warning Pipeline 5-Stage Lifecycle Ribbon */}
      {currentAlert && (
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
              <div className="text-[10px] text-slate-400">Dispatched over CAP XML & FCM Push</div>
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
              <div className="text-[10px] text-slate-400">Safe App PWA & Android device receipt</div>
            </div>

            {/* STAGE 5: ACKNOWLEDGED */}
            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
              activeIdx >= 4
                ? "bg-slate-800/80 border-emerald-500/50"
                : "bg-slate-800/40 border-slate-700 text-slate-400"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400">STAGE 5</span>
                {activeIdx >= 4 ? <IconCheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[10px] text-slate-500">PENDING</span>}
              </div>
              <div className="font-bold text-xs">ACKNOWLEDGED</div>
              <div className="text-[10px] text-slate-400">Citizen Safe telemetry receipt confirmed</div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Composer Drawer (when opened) */}
      {showComposer && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-white shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-2">
              <span>✍</span>
              <span>AUTHORITATIVE ALERT COMPOSER & PREVIEW</span>
            </h2>
            <button onClick={() => setShowComposer(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-slate-300 font-semibold mb-1">Headline</label>
                <input
                  type="text"
                  value={composerForm.headline}
                  onChange={(e) => setComposerForm({ ...composerForm, headline: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-slate-300 font-semibold mb-1">Warning Level</label>
                  <select
                    value={composerForm.warning_level}
                    onChange={(e) => setComposerForm({ ...composerForm, warning_level: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-xs"
                  >
                    <option value="WATCH">🟡 WATCH</option>
                    <option value="ADVISORY">🟡 ADVISORY</option>
                    <option value="WARNING">🟠 WARNING</option>
                    <option value="SEVERE_WARNING">🟠 SEVERE WARNING</option>
                    <option value="EMERGENCY">🔴 EMERGENCY</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-slate-300 font-semibold mb-1">Hazard Type</label>
                  <select
                    value={composerForm.hazard_type}
                    onChange={(e) => setComposerForm({ ...composerForm, hazard_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-xs"
                  >
                    <option value="LANDSLIDE">LANDSLIDE</option>
                    <option value="DEBRIS_FLOW">DEBRIS FLOW</option>
                    <option value="ROCKFALL">ROCKFALL</option>
                    <option value="SLOPE_CRACK">SLOPE CRACK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-slate-300 font-semibold mb-1">Target Corridor / Localities</label>
                <input
                  type="text"
                  value={composerForm.target_area}
                  onChange={(e) => setComposerForm({ ...composerForm, target_area: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-sans text-xs"
                />
              </div>

              <div>
                <label className="block font-mono text-slate-300 font-semibold mb-1">Public Safety Instructions</label>
                <textarea
                  rows={2}
                  value={composerForm.action_required}
                  onChange={(e) => setComposerForm({ ...composerForm, action_required: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-sans text-xs"
                />
              </div>
            </div>

            {/* Mobile Notification Live Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                  📱 Citizen Android / Safe PWA Push Preview
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-md">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-bold text-emerald-400">
                      <span>🛡️</span>
                      <span>TerraGuardian Safe</span>
                    </span>
                    <span>Just now</span>
                  </div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{composerForm.headline}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {composerForm.message}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex gap-2">
                    <span className="bg-emerald-700/80 text-[10px] font-bold px-2 py-0.5 rounded text-white">
                      [I AM SAFE]
                    </span>
                    <span className="bg-slate-800 text-[10px] font-bold px-2 py-0.5 rounded text-slate-300">
                      [VIEW MAP]
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={async () => {
                    if (!backendIncidentId) {
                      setActionFeedback("Error: Please select an active incident from Command Overview.");
                      return;
                    }
                    try {
                      await apiClient.createIncidentAlert(backendIncidentId, {
                        severity: composerForm.warning_level === "EMERGENCY" ? "CRITICAL" : "HIGH",
                        headline: composerForm.headline,
                        target_area: composerForm.target_area,
                        message: composerForm.message,
                        action_required: composerForm.action_required,
                        warning_level: composerForm.warning_level,
                        hazard_type: composerForm.hazard_type,
                        is_controlled_demo: true,
                      });
                      setActionFeedback("✓ Proposed alert candidate created in ALERT_GENERATED stage.");
                      setShowComposer(false);
                      await loadAlerts();
                    } catch (err: any) {
                      setActionFeedback(`Error creating alert: ${err.message || err}`);
                    }
                  }}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold font-mono text-xs text-white shadow-md cursor-pointer transition-all"
                >
                  Create Alert Candidate (Requires Statutory Sign-off)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Filter Tabs & Alert List */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Tabs */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-2 flex flex-wrap gap-1 text-xs font-mono">
            {["ALL", "ACTIVE", "CANDIDATES", "AUTH_REQUIRED", "ACKNOWLEDGED"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedAlertIndex(0);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-slate-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                    : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* List of Alerts */}
          <div className="flex flex-col gap-2.5">
            {filteredAlerts.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6 text-center text-xs font-mono text-slate-500">
                No alerts found matching filter '{activeTab}'.
              </div>
            ) : (
              filteredAlerts.map((al, idx) => (
                <div
                  key={al.id}
                  onClick={() => setSelectedAlertIndex(idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs font-sans ${
                    selectedAlertIndex === idx
                      ? "bg-slate-900 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                      : "bg-white dark:bg-neutral-900 text-slate-900 dark:text-white border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
                    <span className="font-bold text-emerald-400">{al.code}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      al.severity === "CRITICAL"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}>
                      {al.severity}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs line-clamp-1 leading-snug">{al.headline}</h3>
                  <p className="text-[11px] opacity-75 mt-1 truncate">{al.targetArea}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] font-mono opacity-80">
                    <span>STAGE: {al.stage}</span>
                    <span>{al.authorized ? "✓ AUTHORIZED" : "⚠ AWAITING SIGN-OFF"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Alert Operational Cockpit */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {currentAlert && (
            <>
              {/* Alert Detail Card */}
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                      <span>ALERT CODE: {currentAlert.code}</span>
                      <span>•</span>
                      <span>ISSUED: {currentAlert.generatedAt}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {currentAlert.headline}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5 font-mono">
                      Target Area: {currentAlert.targetArea}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 ${
                    currentAlert.authorized
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
                  }`}>
                    {currentAlert.authorized ? "STATUTORY AUTHORIZED" : "AWAITING AUTHORIZATION"}
                  </span>
                </div>

                {/* Statutory Lineage & Rationale */}
                <div className="bg-slate-50 dark:bg-neutral-950 rounded-xl p-3.5 border border-slate-200 dark:border-neutral-800 text-xs space-y-1.5">
                  <div className="font-mono font-bold text-[11px] text-slate-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <IconLayers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scientific & Sensor Evidence Lineage</span>
                  </div>
                  <p className="text-slate-600 dark:text-neutral-400 text-xs leading-relaxed font-sans">
                    {currentAlert.rationale}
                  </p>
                  <div className="text-[10px] font-mono text-indigo-400 pt-1">
                    LINEAGE: ERA5 Reanalysis + IMD 74mm Rain Gauge → Soil Moisture 89% Saturation → PWD Corridor Alert
                  </div>
                </div>

                {/* Multi-Agency Broadcast Channels */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Dissemination Channels Status (Truth in Delivery)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {currentAlert.channels.map((ch, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className="font-bold text-slate-800 dark:text-white">{ch.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ch.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : ch.status === "SENT"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : ch.status === "CHANNEL_NOT_CONNECTED"
                              ? "bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {ch.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                          {ch.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citizen Telemetry & 'I AM SAFE' Metrics */}
                <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex items-center justify-around text-center text-xs font-mono">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Devices Targeted</div>
                    <div className="text-base font-bold text-blue-400 mt-0.5">142 PWA / Android</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Acknowledged</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{currentAlert.acknowledgements_count || 12} Received</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Confirmed Safe</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{currentAlert.safe_count || 8} "I AM SAFE"</div>
                  </div>
                </div>

                {/* Statutory Authorization Sign-off Box */}
                {!currentAlert.authorized && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-900 dark:text-amber-300">
                      <span>⚖️</span>
                      <span>STATUTORY DISASTER BROADCAST AUTHORIZATION</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-sans">
                      Under the Disaster Management Act, statutory public emergency broadcasts require formal authorization order reference by an authorized official.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-mono text-amber-900 dark:text-amber-300 mb-1">
                          Official Order Reference Code
                        </label>
                        <input
                          type="text"
                          value={orderCodeInput}
                          onChange={(e) => setOrderCodeInput(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded p-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-amber-900 dark:text-amber-300 mb-1">
                          Authorizing Magistrate / Officer
                        </label>
                        <input
                          type="text"
                          value={signerNameInput}
                          onChange={(e) => setSignerNameInput(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded p-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleAuthorizeAlert(currentAlert.id)}
                        disabled={isAuthorizing}
                        className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-600 active:scale-[0.98] text-white font-mono font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <IconSend className="w-4 h-4" />
                        <span>{isAuthorizing ? "Authorizing Broadcast..." : "Authorize & Broadcast Statutory Alert"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* System Data Sources Health Observability */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2.5">
              <h3 className="text-xs font-mono font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <IconActivity className="w-4 h-4 text-emerald-500" />
                <span>EXTERNAL DATA PROVIDERS & HEALTH OBSERVABILITY</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">ALL VERIFIED INVARIANTS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
              {(sourcesHealth.length > 0 ? sourcesHealth : [
                {
                  source_id: "IMD_AWS",
                  name: "IMD Meso-Net Rain Gauge",
                  provider: "India Meteorological Dept",
                  status: "HEALTHY",
                  maturity: "CONTROLLED_DEMO",
                  freshness_seconds: 45,
                  notes: "AWS tipping-bucket precipitation feed.",
                },
                {
                  source_id: "VISION_AI",
                  name: "Multimodal Vision AI Screener",
                  provider: "Gemini 2.5 Flash / CV Heuristic",
                  status: "HEALTHY",
                  maturity: "LIVE",
                  freshness_seconds: 12,
                  notes: "Ground observation hazard relevance gating.",
                },
                {
                  source_id: "FCM_PUSH",
                  name: "Firebase Cloud Messaging Gateway",
                  provider: "Google Firebase / Android Net",
                  status: "HEALTHY",
                  maturity: "LIVE",
                  freshness_seconds: 5,
                  notes: "High-priority emergency push channels.",
                },
                {
                  source_id: "CARRIER_SMS",
                  name: "Telecom SMS / Cell Broadcast",
                  provider: "Department of Telecommunications",
                  status: "CHANNEL_NOT_CONNECTED",
                  maturity: "NO_LIVE_FEED",
                  notes: "Departmental carrier clearance required (Truth in delivery).",
                },
              ]).map((src, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{src.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{src.provider}</div>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-400 mt-0.5 leading-snug">{src.notes}</p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                    src.status === "HEALTHY" || src.status === "RUNNING"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}>
                    {src.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
