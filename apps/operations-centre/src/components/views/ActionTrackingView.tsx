import React, { useState, useEffect, useCallback } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";
import type { OperationalAction, ActionState, ActorRole } from "../../types/incident";
import { PrincipleBanner } from "../common";
import {
  IconCheckCircle2,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
  IconActivity,
  IconShieldAlert,
  IconShieldCheck,
  IconUserCheck,
  IconRadio,
  IconTruck,
  IconX,
} from "../icons";

export const ActionTrackingView: React.FC = () => {
  const { setStep, setIncidentSubTab, incidentTwin, backendIncidentId, reassessWithRealEnvironmentalData } = useDemoScenario();
  const { user, canAuthorizeDecisions, canConfirmActions, canCoordinateOperations } = useAuth();

  const [actions, setActions] = useState<OperationalAction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Physical ground confirmation modal state
  const [confirmModalAction, setConfirmModalAction] = useState<OperationalAction | null>(null);
  const [confirmingOfficer, setConfirmingOfficer] = useState<string>("Insp. R. Dorjee (BRO / SDRF Patrol Lead)");
  const [confirmingAgency, setConfirmingAgency] = useState<string>("BRO");
  const [locationConfirmed, setLocationConfirmed] = useState<string>("NH-13 KM-42.3 Carriageway");
  const [confirmationNotes, setConfirmationNotes] = useState<string>("Ground inspection physically confirmed barricades locked, freight halted, and slope toe monitored.");
  const [commChannel, setCommChannel] = useState<string>("VHF_RADIO");

  const incidentId = backendIncidentId || incidentTwin?.id || "TG-2048";

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getIncidentActions(incidentId);
      setActions(data);
    } catch (err) {
      console.warn("Could not fetch real actions from backend, falling back to empty:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to load operational actions");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Generate recommended actions
  const handleRecommendActions = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await apiClient.recommendIncidentActions(incidentId);
      setActions(created);
      setSuccessMessage(`Generated ${created.length} coordinated multi-agency operational actions for incident.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate recommended actions");
    } finally {
      setIsSubmitting(false);
    }
  };

  // State transitions
  const handleTransition = async (action: OperationalAction, targetState: ActionState) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let payload: Parameters<typeof apiClient.transitionActionState>[1];

      if (targetState === "APPROVED") {
        if (action.requires_authorization) {
          payload = {
            target_state: "APPROVED",
            actor_role: (user?.role || "AUTHORIZATION_OFFICER") as ActorRole,
            actor_name: user?.full_name || "P. Tsering, IAS (District Magistrate / DDMA Chairman)",
            authority_order_code: "DDMA-WK-2026/884-A",
            authorization_reason: "Statutory emergency hazard intervention approved under DM Act Sec 30",
          };
        } else {
          payload = {
            target_state: "APPROVED",
            actor_role: (user?.role || "OPERATOR") as ActorRole,
            actor_name: user?.full_name || "Control Room Operator",
            reason: "Routine operational task approved for dispatch",
          };
        }
      } else if (targetState === "DISPATCHED") {
        payload = {
          target_state: "DISPATCHED",
          actor_role: (user?.role || "OPERATOR") as ActorRole,
          actor_name: user?.full_name || "Duty Dispatch Officer",
          dispatch_channel: "ERSS-112 / VHF Radio Net",
          target_agency: action.agency,
          dispatch_reference: `DISP-${action.agency}-${action.task_code}`,
        };
      } else if (targetState === "ACKNOWLEDGED") {
        payload = {
          target_state: "ACKNOWLEDGED",
          actor_role: (user?.role || "FIELD_RESPONDER") as ActorRole,
          actor_name: user?.full_name || `${action.agency} Field Duty Officer`,
          acknowledgement_status: "ACCEPTED",
          acknowledgement_reason: "Task order acknowledged via tactical VHF; personnel mobilized to sector",
        };
      } else if (targetState === "IN_PROGRESS") {
        payload = {
          target_state: "IN_PROGRESS",
          actor_role: (user?.role || "FIELD_RESPONDER") as ActorRole,
          actor_name: user?.full_name || `${action.agency} Field Lead`,
          execution_location: action.affected_area || "NH-13 Corridor",
          execution_notes: "Deployment operations underway on site",
        };
      } else if (targetState === "COMPLETED") {
        payload = {
          target_state: "COMPLETED",
          actor_role: (user?.role || "FIELD_RESPONDER") as ActorRole,
          actor_name: user?.full_name || `${action.agency} Field Lead`,
          execution_location: action.affected_area || "NH-13 Corridor",
          execution_notes: "Tactical task execution completed on site",
        };
      } else {
        throw new Error(`Unhandled transition target: ${targetState}`);
      }

      await apiClient.transitionActionState(action.id, payload);
      setSuccessMessage(`Task ${action.task_code} transitioned to ${targetState}.`);
      await loadActions();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Action transition failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit physical ground confirmation
  const handleConfirmSubmit = async () => {
    if (!confirmModalAction) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.confirmAction(confirmModalAction.id, {
        confirming_officer: confirmingOfficer,
        confirming_agency: confirmingAgency,
        location_confirmed: locationConfirmed,
        confirmation_notes: confirmationNotes,
        communication_channel: commChannel,
      });

      setSuccessMessage(`Action ${confirmModalAction.task_code} PHYSICALLY CONFIRMED on ground. Living hazard risk assessment dynamically updated.`);
      setConfirmModalAction(null);
      await loadActions();
      // Re-sync incident twin
      if (reassessWithRealEnvironmentalData) {
        await reassessWithRealEnvironmentalData();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Physical confirmation submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Blocking Conditions & Next Required Decision
  const waitingForAuth = actions.some(
    (a) => a.state === "PROPOSED" && a.requires_authorization
  );
  const readyForDispatch = actions.some((a) => a.state === "APPROVED");
  const waitingForAck = actions.some((a) => a.state === "DISPATCHED");
  const waitingForExecution = actions.some((a) => a.state === "ACKNOWLEDGED");
  const waitingForConfirmation = actions.some(
    (a) => (a.state === "IN_PROGRESS" || a.state === "COMPLETED") && a.state !== "PHYSICALLY_CONFIRMED"
  );
  const allConfirmed = actions.length > 0 && actions.every((a) => a.state === "PHYSICALLY_CONFIRMED");

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
              OPERATIONAL DISPATCH & MULTI-AGENCY EXECUTION LOOP
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700 dark:text-neutral-300">
              INCIDENT: {incidentTwin?.code || "TG-2048"}
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              VER: {incidentTwin?.assessment_version || "v1"}
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Coordinated Multi-Agency Action Board
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Full operational lifecycle tracking: PROPOSED → APPROVED → DISPATCHED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED → PHYSICALLY_CONFIRMED.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadActions}
            disabled={isLoading || isSubmitting}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            {isLoading ? "Refreshing..." : "Refresh Queue"}
          </button>

          {actions.length === 0 && (
            <button
              onClick={handleRecommendActions}
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <IconTruck className="w-4 h-4" />
              <span>Recommend Coordinated Actions</span>
            </button>
          )}

          <button
            onClick={() => {
              setIncidentSubTab("OUTCOME");
              setStep(9);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Proceed to Outcome Assessment</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 p-3.5 rounded-xl flex items-center gap-2 text-xs text-red-800 dark:text-red-200">
          <IconAlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 p-3.5 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <IconCheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── NEXT REQUIRED DECISION & BLOCKING CONDITIONS BANNER ── */}
      <div className="flex flex-col gap-2">
        {waitingForAuth && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <IconShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 uppercase">
                  WAITING FOR STATUTORY AUTHORIZATION
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Magistrate Sign-Off Required under Disaster Management Act (DM Act Sec 30)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                Critical tactical interventions (Traffic Diversion, Carriageway Closure, Population Evacuation) require statutory authorization. Operators cannot dispatch these tasks without authorized decision-maker sign-off.
              </p>
            </div>
          </div>
        )}

        {readyForDispatch && !waitingForAuth && (
          <div className="bg-blue-500/10 border-2 border-blue-500/40 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <IconRadio className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 uppercase">
                  READY FOR DISPATCH
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Statutory Authorization Recorded — Pending Tactical Radio/Net Transmission
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                Orders have been legally authorized. Transmit assignments to designated agencies (BRO, State Police, Geotechnical Field Survey, DDMA) via ERSS-112 or VHF radio channel.
              </p>
            </div>
          </div>
        )}

        {waitingForAck && !readyForDispatch && !waitingForAuth && (
          <div className="bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <IconClock className="w-6 h-6 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 uppercase">
                  WAITING FOR FIELD ACKNOWLEDGEMENT
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Dispatched Orders Awaiting Field Receipt Confirmation
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                Orders transmitted to field units. Waiting for field commanding officers to acknowledge receipt and confirm tactical deployment towards the affected corridor.
              </p>
            </div>
          </div>
        )}

        {waitingForConfirmation && !waitingForAck && !readyForDispatch && !waitingForAuth && (
          <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <IconActivity className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 uppercase">
                  WAITING FOR PHYSICAL GROUND CONFIRMATION
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  ACTION COMPLETED ≠ HAZARD RESOLVED
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                Executing units have reported tactical completion, but safety closure cannot be declared without independent physical ground inspection and evidence ingestion.
              </p>
            </div>
          </div>
        )}

        {allConfirmed && (
          <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <IconShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 uppercase">
                  ALL ACTIONS PHYSICALLY CONFIRMED
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Field Confirmation Ingested — Living Hazard Risk Recalculated
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                All tactical response measures have been verified on the ground by authorized officers. The predictive engine has updated the incident twin with post-containment stability metrics.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Governing Principles Banner */}
      <PrincipleBanner
        principle="GOVERNED OPERATIONAL INVARIANTS"
        title="RECOMMENDATION ≠ AUTHORIZATION ≠ DISPATCH ≠ ACKNOWLEDGEMENT ≠ EXECUTION ≠ PHYSICAL CONFIRMATION"
        explanation="In paper disaster management, issuing an order is often confused with safety. In TerraGuardian, every action is tracked across statutory authorization, tactical dispatch, field acknowledgement, on-site execution, and independent physical ground confirmation."
        variant="cyan"
      />

      {/* ── ACTION BOARD TABLE ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200">
              ACTION BOARD QUEUE ({actions.length} ACTIONS)
            </span>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 font-semibold">
              PERSISTENT DATABASE BACKED
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-500">
            CHANNELS: TETRA VHF • ERSS-112 • POLICE NET
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-sm font-semibold text-slate-600 dark:text-neutral-400">
              No operational actions currently registered for this incident.
            </div>
            <button
              onClick={handleRecommendActions}
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition-all cursor-pointer"
            >
              Generate Standard Multi-Agency Response Package (BRO / Geotech / DDMA / SDRF)
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-100/70 dark:bg-neutral-950/70 text-slate-600 dark:text-neutral-400 text-[11px]">
                  <th className="py-3 px-3">Task Code</th>
                  <th className="py-3 px-3">Agency</th>
                  <th className="py-3 px-3">Action Type</th>
                  <th className="py-3 px-3">Priority / Urgency</th>
                  <th className="py-3 px-3">State</th>
                  <th className="py-3 px-3">Authorization</th>
                  <th className="py-3 px-3">Dispatch Ref</th>
                  <th className="py-3 px-3">Ground Confirmation</th>
                  <th className="py-3 px-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {actions.map((action) => {
                  const isBlocked = action.state === "PROPOSED" && action.requires_authorization;
                  const isConfirmed = action.state === "PHYSICALLY_CONFIRMED";

                  return (
                    <tr
                      key={action.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-neutral-950/40 transition-colors ${
                        isBlocked
                          ? "bg-amber-50/40 dark:bg-amber-950/10"
                          : isConfirmed
                          ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                          : ""
                      }`}
                    >
                      {/* Task Code */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{action.task_code}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-neutral-300 font-sans font-medium line-clamp-1 mt-0.5">
                          {action.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-500 font-sans line-clamp-1">
                          {action.description}
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="py-3 px-3 align-top">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700">
                          {action.agency}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">
                          {action.assigned_to}
                        </div>
                      </td>

                      {/* Action Type */}
                      <td className="py-3 px-3 align-top">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-neutral-300">
                          {action.action_type || "OPERATIONAL_RESPONSE"}
                        </span>
                        {action.workflow_type && (
                          <div className="text-[9px] text-slate-500 dark:text-neutral-500 mt-0.5">
                            {action.workflow_type}
                          </div>
                        )}
                      </td>

                      {/* Priority / Urgency */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              action.priority === "P1"
                                ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {action.priority || "P1"}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-neutral-400">
                            {action.urgency || "IMMEDIATE"}
                          </span>
                        </div>
                      </td>

                      {/* State */}
                      <td className="py-3 px-3 align-top">
                        {action.state === "PROPOSED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700">
                            PROPOSED
                          </span>
                        )}
                        {action.state === "APPROVED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                            APPROVED
                          </span>
                        )}
                        {action.state === "DISPATCHED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800">
                            DISPATCHED
                          </span>
                        )}
                        {action.state === "ACKNOWLEDGED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800">
                            ACKNOWLEDGED
                          </span>
                        )}
                        {action.state === "IN_PROGRESS" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 animate-pulse">
                            IN PROGRESS
                          </span>
                        )}
                        {action.state === "COMPLETED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            COMPLETED (UNCONFIRMED)
                          </span>
                        )}
                        {action.state === "PHYSICALLY_CONFIRMED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
                            <IconCheckCircle2 className="w-3 h-3" />
                            CONFIRMED
                          </span>
                        )}
                      </td>

                      {/* Authorization */}
                      <td className="py-3 px-3 align-top">
                        {action.requires_authorization ? (
                          action.authorized_by ? (
                            <div>
                              <div className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                                <IconShieldCheck className="w-3 h-3" />
                                <span>{action.authority_order_code || "AUTHORIZED"}</span>
                              </div>
                              <div className="text-[9px] text-slate-500 dark:text-neutral-500 font-sans">
                                By {action.authorized_by}
                              </div>
                            </div>
                          ) : (
                            <div className="font-bold text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1">
                              <IconShieldAlert className="w-3 h-3" />
                              <span>REQ: MAGISTRATE</span>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                            {action.authorized_by ? `Authorized by ${action.authorized_by}` : "ROUTINE (OPERATOR)"}
                          </span>
                        )}
                      </td>

                      {/* Dispatch Reference */}
                      <td className="py-3 px-3 align-top">
                        {action.dispatch_reference ? (
                          <div>
                            <div className="font-bold text-cyan-700 dark:text-cyan-400 text-[10px]">
                              {action.dispatch_reference}
                            </div>
                            <div className="text-[9px] text-slate-500 dark:text-neutral-500">
                              {action.dispatch_channel || "RADIO_NET"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Physical Ground Confirmation */}
                      <td className="py-3 px-3 align-top">
                        {action.confirmed_at ? (
                          <div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                              <IconCheckCircle2 className="w-3 h-3" />
                              <span>CONFIRMED ON GROUND</span>
                            </div>
                            <div className="text-[9px] text-slate-500 dark:text-neutral-500">
                              {new Date(action.confirmed_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 dark:text-neutral-500">
                            {action.state === "COMPLETED" ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">AWAITING PATROL</span>
                            ) : (
                              <span>PENDING</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Controls */}
                      <td className="py-3 px-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* PROPOSED -> APPROVED */}
                          {action.state === "PROPOSED" && (
                            action.requires_authorization ? (
                              canAuthorizeDecisions ? (
                                <button
                                  onClick={() => handleTransition(action, "APPROVED")}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                  Magistrate Approve
                                </button>
                              ) : (
                                <span
                                  title="Statutory order authorization is restricted to AUTHORIZATION_OFFICER (District Magistrate)"
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  AWAITING MAGISTRATE
                                </span>
                              )
                            ) : (
                              canCoordinateOperations ? (
                                <button
                                  onClick={() => handleTransition(action, "APPROVED")}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 dark:text-neutral-500">
                                  PENDING APPROVAL
                                </span>
                              )
                            )
                          )}

                          {/* APPROVED -> DISPATCHED */}
                          {action.state === "APPROVED" && (
                            canCoordinateOperations ? (
                              <button
                                onClick={() => handleTransition(action, "DISPATCHED")}
                                disabled={isSubmitting}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1"
                              >
                                <IconRadio className="w-3 h-3" />
                                <span>Dispatch</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                                AWAITING DISPATCH
                              </span>
                            )
                          )}

                          {/* DISPATCHED -> ACKNOWLEDGED */}
                          {action.state === "DISPATCHED" && (
                            <button
                              onClick={() => handleTransition(action, "ACKNOWLEDGED")}
                              disabled={isSubmitting}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1"
                            >
                              <IconClock className="w-3 h-3" />
                              <span>Field Ack</span>
                            </button>
                          )}

                          {/* ACKNOWLEDGED -> IN_PROGRESS */}
                          {action.state === "ACKNOWLEDGED" && (
                            <button
                              onClick={() => handleTransition(action, "IN_PROGRESS")}
                              disabled={isSubmitting}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1"
                            >
                              <IconActivity className="w-3 h-3" />
                              <span>Start Work</span>
                            </button>
                          )}

                          {/* IN_PROGRESS -> COMPLETED */}
                          {action.state === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleTransition(action, "COMPLETED")}
                              disabled={isSubmitting}
                              className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all"
                            >
                              Mark Completed
                            </button>
                          )}

                          {/* COMPLETED or IN_PROGRESS or ACKNOWLEDGED -> CONFIRM PHYSICAL EXECUTION */}
                          {action.state !== "PHYSICALLY_CONFIRMED" &&
                            action.state !== "PROPOSED" &&
                            action.state !== "APPROVED" && (
                              canConfirmActions ? (
                                <button
                                  onClick={() => {
                                    setConfirmModalAction(action);
                                    setConfirmingAgency(user?.agency || action.agency);
                                    setConfirmingOfficer(user?.full_name || "ASI D. Sonam");
                                  }}
                                  disabled={isSubmitting}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <IconUserCheck className="w-3 h-3" />
                                  <span>Ground Confirm</span>
                                </button>
                              ) : (
                                <span
                                  title="Execution ≠ Confirmation: Physical ground confirmation is strictly reserved for FIELD_RESPONDER personnel"
                                  className="text-[10px] font-mono text-slate-500 dark:text-neutral-500"
                                >
                                  AWAITING PATROL CONFIRMATION
                                </span>
                              )
                            )}

                          {/* PHYSICALLY_CONFIRMED */}
                          {action.state === "PHYSICALLY_CONFIRMED" && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              LOCKED (AUDITED)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PHYSICAL GROUND CONFIRMATION MODAL ── */}
      {confirmModalAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <IconShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  PHYSICAL GROUND CONFIRMATION
                </h3>
              </div>
              <button
                onClick={() => setConfirmModalAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs font-sans text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold font-mono">
                Task: {confirmModalAction.task_code} — {confirmModalAction.title}
              </div>
              <div className="text-[11px]">
                Submitting this confirmation injects high-confidence verified fresh field evidence into the incident twin and triggers living hazard reassessment.
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                  CONFIRMING OFFICER & BADGE:
                </label>
                <input
                  type="text"
                  value={confirmingOfficer}
                  onChange={(e) => setConfirmingOfficer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    AGENCY:
                  </label>
                  <input
                    type="text"
                    value={confirmingAgency}
                    onChange={(e) => setConfirmingAgency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    COMMUNICATION CHANNEL:
                  </label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="VHF_RADIO">Tactical VHF Radio</option>
                    <option value="TETRA_NET">TETRA Emergency Net</option>
                    <option value="ERSS_112">ERSS-112 CAD</option>
                    <option value="SATELLITE_VOICE">Satellite Handset</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                  PHYSICAL LOCATION CONFIRMED:
                </label>
                <input
                  type="text"
                  value={locationConfirmed}
                  onChange={(e) => setLocationConfirmed(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                  FIELD VERIFICATION NOTES:
                </label>
                <textarea
                  rows={3}
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModalAction(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconCheckCircle2 className="w-4 h-4" />
                <span>Submit Physical Ground Confirmation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
