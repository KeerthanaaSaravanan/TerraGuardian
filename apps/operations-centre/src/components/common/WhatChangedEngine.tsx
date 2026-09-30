import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle2,
  IconClock,
  IconRefreshCw,
  IconShieldAlert,
  IconShieldCheck,
} from "../icons";

export interface ChangeEventItem {
  change_type: string;
  previous_value: string;
  current_value: string;
  delta?: string | null;
  observed_at: string;
  source: string;
  evidence_reference: string;
  severity: "CRITICAL" | "ELEVATED" | "MODERATE" | "INFORMATIONAL";
  explanation: string;
}

export interface WhatChangedData {
  incident_id: string;
  current_version: number;
  previous_version: number;
  evaluated_at: string;
  total_changes: number;
  summary_narrative: string;
  provenance: string;
  changes: ChangeEventItem[];
}

interface WhatChangedEngineProps {
  incidentId: string;
  onNavigateToEvidence?: () => void;
  onNavigateToActions?: () => void;
}

export const WhatChangedEngine: React.FC<WhatChangedEngineProps> = ({
  incidentId,
  onNavigateToEvidence,
  onNavigateToActions,
}) => {
  const [data, setData] = useState<WhatChangedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  const fetchReport = async () => {
    if (!incidentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getIncidentWhatChanged(incidentId);
      setData(res);
    } catch (err: any) {
      console.warn("Failed to load What Changed report:", err);
      setError(err?.message || "Unable to fetch What Changed comparison");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [incidentId]);

  const filteredChanges = (data?.changes || []).filter((c) => {
    if (filterSeverity === "ALL") return true;
    return c.severity === filterSeverity;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800";
      case "ELEVATED":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "MODERATE":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      default:
        return "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-700";
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800/60">
            <IconActivity className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                WHAT CHANGED DELTA ENGINE
              </h3>
              {data && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold">
                  v{data.previous_version} → v{data.current_version}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
              Live dimensional delta tracking between incident assessment iterations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filters */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
            {["ALL", "CRITICAL", "ELEVATED"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  filterSeverity === sev
                    ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white font-bold shadow-2xs"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            title="Refresh What Changed calculation"
          >
            <IconRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Narrative Banner */}
      {data?.summary_narrative && (
        <div className="p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-700 dark:text-neutral-300 flex items-center justify-between gap-3">
          <span className="leading-relaxed">{data.summary_narrative}</span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 whitespace-nowrap shrink-0">
            {data.total_changes} deltas logged
          </span>
        </div>
      )}

      {/* Truthful Error state with Retry */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs font-mono text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold">WHAT CHANGED: Unable to retrieve the latest delta.</div>
            <div className="text-[10px] text-red-600 dark:text-red-400 opacity-80">
              The service encountered a temporary synchronization issue. Historical state remains preserved.
            </div>
          </div>
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Changes list */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredChanges.length > 0 ? (
          filteredChanges.map((change, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50/70 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/80 rounded-xl hover:border-slate-300 dark:hover:border-neutral-700 transition-all space-y-2"
            >
              {/* Change Top Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getSeverityBadge(
                      change.severity
                    )}`}
                  >
                    {change.severity}
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                    {change.change_type.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-500 line-through text-[11px]">
                    {change.previous_value}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {change.current_value}
                  </span>
                  {change.delta && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 ml-1">
                      {change.delta}
                    </span>
                  )}
                </div>
              </div>

              {/* Authoritative WHY & Evidence Driver */}
              <div className="text-xs text-slate-700 dark:text-neutral-300 font-sans leading-relaxed">
                <strong className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 uppercase mr-1">
                  WHY:
                </strong>
                {change.explanation}
              </div>

              {/* Source & Reference Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500 dark:text-neutral-400 pt-1 border-t border-slate-200/60 dark:border-neutral-800/60">
                <span className="truncate max-w-sm">
                  Source: <strong>{change.source}</strong> ({change.evidence_reference})
                </span>
                <span className="text-slate-400">
                  Observed: {new Date(change.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs font-mono text-slate-500 dark:text-neutral-400 space-y-2 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl p-4 bg-slate-50/50 dark:bg-neutral-950/40">
            <div className="font-bold text-slate-700 dark:text-neutral-300">
              {isLoading ? "ANALYZING MULTI-VERSION ASSESSMENT DELTAS..." : "NO CHANGES DETECTED"}
            </div>
            {data && (
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 space-y-0.5">
                <div>CURRENT ASSESSMENT: v{data.current_version} • PREVIOUS: v{data.previous_version}</div>
                <div>LAST EVALUATED: {new Date(data.evaluated_at).toLocaleString()}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800 text-xs font-mono">
        <span className="text-[10px] text-slate-400 dark:text-neutral-500">
          Source Engine: {data?.provenance || "TERRAGUARDIAN_WHAT_CHANGED_ENGINE"}
        </span>
        <div className="flex items-center gap-2">
          {onNavigateToEvidence && (
            <button
              onClick={onNavigateToEvidence}
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Inspect Evidence Lineage →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
