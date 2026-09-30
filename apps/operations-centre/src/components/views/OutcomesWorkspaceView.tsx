import React, { useState, useEffect, useCallback } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";
import { GoldenDemoView } from "./GoldenDemoView";
import { ConfirmationView } from "./ConfirmationView";
import { TruthBadge, MaturityBadge, PrincipleBanner } from "../common";
import {
  IconCheckCircle2,
  IconShieldCheck,
  IconAlertTriangle,
  IconClock,
  IconActivity,
  IconLayers,
  IconShieldAlert,
  IconArrowRight,
  IconRadio,
  IconFileText,
  IconRotateCcw,
} from "../icons";

interface ClosureGateReport {
  incident_id: string;
  current_status: string;
  closure_permitted: boolean;
  unmet_conditions: string[];
  critical_semantic_notice: string;
  residual_hazard_detected: boolean;
  gate_checks: {
    state_is_reassessing: boolean;
    actor_role_authorized: boolean;
    authority_order_code_provided: boolean;
    all_actions_physically_confirmed: boolean;
    unconfirmed_actions_count: number;
    unconfirmed_actions_list: string[];
    no_unresolved_conflicted_evidence: boolean;
    conflicted_evidence_count: number;
    has_verified_field_evidence: boolean;
    field_evidence_fresh: boolean;
    field_evidence_age_seconds: number | null;
    outcome_permits_closure: boolean;
    current_outcome_type: string | null;
    outcome_not_stale: boolean;
  };
}

interface RoadStatusData {
  incident_id: string;
  corridor_name: string;
  status: "OPEN" | "RESTRICTED" | "CLOSED" | "UNKNOWN" | "UNDER_VERIFICATION";
  supporting_evidence_id: string | null;
  supporting_evidence_desc: string | null;
  last_verified_by: string;
  last_verified_at: string;
  detour_available: boolean;
  detour_route: string;
  statutory_order_code: string | null;
  provenance: string;
}

export const OutcomesWorkspaceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"OUTCOME_HYPOTHESIS" | "PHYSICAL_CONFIRMATION" | "OPERATIONAL_CLOSURE">("OUTCOME_HYPOTHESIS");
  const { incidentCode, backendIncidentId, setIncidentStatus } = useDemoScenario();
  const { user, canAuthorizeDecisions, canCoordinateOperations } = useAuth();

  const [closureGate, setClosureGate] = useState<ClosureGateReport | null>(null);
  const [roadStatus, setRoadStatus] = useState<RoadStatusData | null>(null);
  const [isLoadingGate, setIsLoadingGate] = useState<boolean>(false);
  const [orderCodeInput, setOrderCodeInput] = useState<string>("DDMA-WK-2026/884-CLOSE");
  const [closureSuccessMessage, setClosureSuccessMessage] = useState<string | null>(null);
  const [closureErrorMessage, setClosureErrorMessage] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [escalationReason, setEscalationReason] = useState<string>("Precipitation surcharge exceeded threshold with active slope colluvium motion observed.");

  const incidentId = backendIncidentId || "TG-2048";

  const loadClosureAndRoadStatus = useCallback(async () => {
    setIsLoadingGate(true);
    setClosureErrorMessage(null);
    try {
      const [gateRes, roadRes] = await Promise.all([
        apiClient.getIncidentClosureGate(incidentId, user?.role, orderCodeInput).catch(() => null),
        apiClient.getIncidentRoadStatus(incidentId).catch(() => null),
      ]);
      if (gateRes) setClosureGate(gateRes);
      if (roadRes) setRoadStatus(roadRes);
    } catch (err: any) {
      console.warn("Failed to load closure gate / road status:", err);
    } finally {
      setIsLoadingGate(false);
    }
  }, [incidentId, user?.role, orderCodeInput]);

  useEffect(() => {
    if (activeSubTab === "OPERATIONAL_CLOSURE") {
      loadClosureAndRoadStatus();
    }
  }, [activeSubTab, loadClosureAndRoadStatus]);

  const handleUpdateRoadStatus = async (newStatus: "OPEN" | "RESTRICTED" | "CLOSED") => {
    try {
      const updated = await apiClient.updateIncidentRoadStatus(incidentId, {
        status: newStatus,
        supporting_evidence_desc: `Patrol checkpost status confirmed: ${newStatus}`,
        verified_by: user?.full_name || "Traffic Duty Officer",
        statutory_order_code: orderCodeInput,
        actor_role: user?.role || "OPERATOR",
      });
      setRoadStatus(updated);
    } catch (err: any) {
      setClosureErrorMessage(err?.message || "Failed to update corridor status");
    }
  };

  const handleEscalate = async () => {
    setIsEscalating(true);
    setClosureErrorMessage(null);
    setClosureSuccessMessage(null);
    try {
      const res = await apiClient.escalateIncident(incidentId, {
        reason: escalationReason,
        trigger_condition: "WORSENING_HAZARD",
        actor_role: user?.role || "OPERATOR",
        actor_name: user?.full_name || "Duty Operations Officer",
      });
      setClosureSuccessMessage(`Incident escalated to ${res.new_priority}. Explicit audit event recorded.`);
      loadClosureAndRoadStatus();
    } catch (err: any) {
      setClosureErrorMessage(err?.message || "Failed to escalate incident");
    } finally {
      setIsEscalating(false);
    }
  };

  const handleExecuteClosure = async () => {
    if (!canAuthorizeDecisions) {
      setClosureErrorMessage("Unauthorized: Only an AUTHORIZATION_OFFICER (Magistrate/DDMA) has statutory power to close an incident.");
      return;
    }
    setClosureErrorMessage(null);
    setClosureSuccessMessage(null);
    try {
      await apiClient.transitionIncidentState(incidentId, {
        target_status: "RESOLVED" as any,
        actor_role: user?.role as any,
        actor_name: user?.full_name || "District Magistrate",
        authority_order_code: orderCodeInput,
        reason: "Operational closure authorized: All physical response actions verified and evidentiary criteria satisfied.",
      });
      setClosureSuccessMessage(`Incident ${incidentCode} successfully closed under statutory order ${orderCodeInput}.`);
      setIncidentStatus("RESOLVED");
      loadClosureAndRoadStatus();
    } catch (err: any) {
      setClosureErrorMessage(err?.message || "Closure execution failed. Preconditions not met.");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <IconCheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>OUTCOMES, RESPONSE & REASSESSMENT INTELLIGENCE</span>
              <MaturityBadge level={4} />
            </h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
              Closed-Loop Operational Response • Hypothesis Arbitration • Governed Closure Gate
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg p-1 font-mono text-xs">
          <button
            onClick={() => setActiveSubTab("OUTCOME_HYPOTHESIS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "OUTCOME_HYPOTHESIS"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconActivity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hypothesis & Learning</span>
          </button>

          <button
            onClick={() => setActiveSubTab("PHYSICAL_CONFIRMATION")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "PHYSICAL_CONFIRMATION"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Physical Confirmation</span>
          </button>

          <button
            onClick={() => setActiveSubTab("OPERATIONAL_CLOSURE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === "OPERATIONAL_CLOSURE"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconFileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Closure & Transport Context</span>
          </button>
        </div>
      </div>

      {/* Render selected sub-view */}
      {activeSubTab === "OUTCOME_HYPOTHESIS" && <GoldenDemoView />}
      {activeSubTab === "PHYSICAL_CONFIRMATION" && <ConfirmationView />}

      {activeSubTab === "OPERATIONAL_CLOSURE" && (
        <div className="flex flex-col gap-5">
          {/* Critical Semantic Rule Banner */}
          <PrincipleBanner
            principle="OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION"
            title="Operational Closure Means Case Criteria Met — Not Permanent Slope Stability"
            explanation="A closed incident indicates that statutory response requirements, physical roadblock confirmations, and evidentiary thresholds have been satisfied. It does not establish hazard extinction. If residual mass or pore-water pressure remains perched, monitoring protocols must continue."
            variant="amber"
          />

          {closureSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 p-4 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-mono">
              <IconCheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{closureSuccessMessage}</span>
            </div>
          )}

          {closureErrorMessage && (
            <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 p-4 rounded-xl flex items-center gap-2 text-xs text-red-800 dark:text-red-200 font-mono">
              <IconAlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{closureErrorMessage}</span>
            </div>
          )}

          {/* Top Row: Transport Context & Governed Escalation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Transport Corridor Status (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    TRANSPORT NETWORK INTELLIGENCE
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {roadStatus?.corridor_name || "NH-13 Trans-Arunachal Highway (KM-38 to KM-46)"}
                  </h2>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                    roadStatus?.status === "CLOSED"
                      ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-400"
                      : roadStatus?.status === "RESTRICTED"
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                  }`}
                >
                  CORRIDOR {roadStatus?.status || "RESTRICTED"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500">SUPPORTING EVIDENCE</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {roadStatus?.supporting_evidence_desc || "Police Roadblock Checkpost Manning Record"}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-500">LAST VERIFIED BY</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {roadStatus?.last_verified_by || "Highway Patrol Sub-Inspector"}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg border border-slate-200 dark:border-neutral-800 sm:col-span-2">
                  <div className="text-[10px] text-slate-500">BYPASS DETOUR ROUTE</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 font-sans text-xs">
                    {roadStatus?.detour_route || "Balemu-Kalaktang single-lane unpaved bypass (+142 km, +4.8h)"}
                  </div>
                </div>
              </div>

              {canCoordinateOperations && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">Update Corridor Status:</span>
                  <button
                    onClick={() => handleUpdateRoadStatus("RESTRICTED")}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
                  >
                    Set RESTRICTED
                  </button>
                  <button
                    onClick={() => handleUpdateRoadStatus("CLOSED")}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                  >
                    Set FULL CLOSURE
                  </button>
                  <button
                    onClick={() => handleUpdateRoadStatus("OPEN")}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    Set OPEN
                  </button>
                </div>
              )}
            </div>

            {/* Governed Escalation Panel (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <IconShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white uppercase">
                  Governed Operational Escalation
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400 font-sans">
                Escalation requires explicit documented rationale. E.g., worsening pore-water pressure, scarp propagation, or failed field confirmation.
              </p>

              <div className="space-y-1.5 text-xs font-mono">
                <label className="text-[11px] text-slate-500 font-bold">ESCALATION RATIONALE</label>
                <textarea
                  rows={2}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-sans"
                />
              </div>

              <button
                onClick={handleEscalate}
                disabled={isEscalating}
                className="mt-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <IconRadio className="w-4 h-4 animate-pulse" />
                <span>{isEscalating ? "RECORDING ESCALATION..." : "TRIGGER GOVERNED ESCALATION"}</span>
              </button>
            </div>
          </div>

          {/* 9-Precondition Evidentiary Closure Gate Card */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  GOVERNED STATUTORY CLOSURE GATE
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                  <span>9-Factor Evidentiary Precondition Audit</span>
                  {closureGate?.closure_permitted ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-400">
                      GATE PASSED: READY FOR CLOSURE
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-100 text-red-800 border border-red-400">
                      CLOSURE BLOCKED ({closureGate?.unmet_conditions.length || 0} UNMET)
                    </span>
                  )}
                </h2>
              </div>

              <button
                onClick={loadClosureAndRoadStatus}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-neutral-700 text-xs font-mono flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <IconRotateCcw className="w-3.5 h-3.5" />
                <span>Re-Audit Gate</span>
              </button>
            </div>

            {/* Gate Checklist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.state_is_reassessing ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>1. Incident in REASSESSING</span>
                  <span>{closureGate?.gate_checks.state_is_reassessing ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">Current status: {closureGate?.current_status}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.actor_role_authorized ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>2. AUTHORIZATION_OFFICER</span>
                  <span>{closureGate?.gate_checks.actor_role_authorized ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">Role: {user?.role || "GUEST"}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.authority_order_code_provided ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>3. Order Reference Code</span>
                  <span>{closureGate?.gate_checks.authority_order_code_provided ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">{orderCodeInput || "Missing"}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.all_actions_physically_confirmed ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>4. All Actions Confirmed</span>
                  <span>{closureGate?.gate_checks.all_actions_physically_confirmed ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">{closureGate?.gate_checks.unconfirmed_actions_count ? `${closureGate.gate_checks.unconfirmed_actions_count} unconfirmed` : "Zero unconfirmed"}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.no_unresolved_conflicted_evidence ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>5. Zero Conflicted Evidence</span>
                  <span>{closureGate?.gate_checks.no_unresolved_conflicted_evidence ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">{closureGate?.gate_checks.conflicted_evidence_count ? `${closureGate.gate_checks.conflicted_evidence_count} conflicted` : "Reconciled"}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.has_verified_field_evidence ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>6. Verified Field Evidence</span>
                  <span>{closureGate?.gate_checks.has_verified_field_evidence ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">VERIFIED FRESH FIELD record</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.field_evidence_fresh ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>7. Freshness &lt;= 6.0 Hours</span>
                  <span>{closureGate?.gate_checks.field_evidence_fresh ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">Max: 21,600s</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.outcome_permits_closure ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>8. Outcome Engine Permits</span>
                  <span>{closureGate?.gate_checks.outcome_permits_closure ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">Type: {closureGate?.gate_checks.current_outcome_type || "None"}</div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col gap-1 ${closureGate?.gate_checks.outcome_not_stale ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200" : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200"}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>9. Outcome Evaluation Current</span>
                  <span>{closureGate?.gate_checks.outcome_not_stale ? "PASS" : "FAIL"}</span>
                </div>
                <div className="text-[11px] opacity-80">No unassessed evidence</div>
              </div>
            </div>

            {/* Unmet Conditions Breakdown */}
            {closureGate?.unmet_conditions && closureGate.unmet_conditions.length > 0 && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs font-mono space-y-1.5">
                <div className="font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                  <IconAlertTriangle className="w-4 h-4 text-red-600" />
                  <span>SPECIFIC BLOCKING CONDITIONS:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-red-800 dark:text-red-300 text-[11px]">
                  {closureGate.unmet_conditions.map((cond, i) => (
                    <li key={i}>{cond}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Authority Sign-Off Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Statutory Order Code:</span>
                <input
                  type="text"
                  value={orderCodeInput}
                  onChange={(e) => setOrderCodeInput(e.target.value)}
                  className="bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded px-2.5 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 w-52"
                />
              </div>

              {canAuthorizeDecisions ? (
                <button
                  onClick={handleExecuteClosure}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <IconShieldCheck className="w-4 h-4" />
                  <span>AUTHORIZE OPERATIONAL CLOSURE (DDMA SIGN-OFF)</span>
                </button>
              ) : (
                <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded border border-amber-300">
                  ⚠️ Sign-in as AUTHORIZATION_OFFICER (P. Tsering, IAS) required to execute operational closure.
                </div>
              )}
            </div>
          </div>

          {/* End-to-End Operational Lifecycle Ribbon */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                END-TO-END GOVERNED OPERATIONAL CLOSED-LOOP
              </span>
              <TruthBadge truthClass="CONTROLLED_DEMO" />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">HAZARD ASSESSED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">DECISION CREATED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-500 text-emerald-300">AUTHORIZATION</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">ACTION DISPATCHED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">FIELD ACKNOWLEDGED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">ACTION COMPLETED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-blue-950 border border-blue-500 text-blue-300 font-bold">PHYSICAL CONFIRMATION</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">OUTCOME OBSERVED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">HYPOTHESES UPDATED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">NBI IDENTIFIED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-amber-950 border border-amber-500 text-amber-300 font-bold">REASSESSMENT</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-purple-950 border border-purple-500 text-purple-300 font-bold">CLOSURE GATE AUDIT</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
