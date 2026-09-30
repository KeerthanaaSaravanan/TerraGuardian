import { CitizenReportPayload, CitizenReportResponse } from "../types/citizen";
import { submitCitizenReport } from "./api";

const OFFLINE_QUEUE_KEY = "tg_safe_offline_reports";

export type OfflineSyncState = "QUEUED" | "SYNCING" | "SYNCED" | "FAILED";

export interface QueuedReport {
  id: string;
  payload: CitizenReportPayload;
  queuedAt: string;
  capturedAt: string;
  status: OfflineSyncState;
  syncError?: string;
  syncedResponse?: CitizenReportResponse;
}

export function getQueuedReports(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReportOffline(payload: CitizenReportPayload): QueuedReport {
  const now = new Date().toISOString();
  const submissionId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const payloadWithMeta: CitizenReportPayload = {
    ...payload,
    client_submission_id: submissionId,
    captured_at: payload.captured_at || now,
  };

  const queued: QueuedReport = {
    id: submissionId,
    payload: payloadWithMeta,
    queuedAt: now,
    capturedAt: payloadWithMeta.captured_at || now,
    status: "QUEUED",
  };
  const list = getQueuedReports();
  list.push(queued);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
  return queued;
}

export async function flushQueuedReports(): Promise<{ synced: number; failed: number }> {
  const list = getQueuedReports();
  if (list.length === 0) return { synced: 0, failed: 0 };

  const remaining: QueuedReport[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of list) {
    if (item.status === "SYNCED") continue;
    item.status = "SYNCING";
    try {
      const response = await submitCitizenReport(item.payload);
      item.status = "SYNCED";
      item.syncedResponse = response;
      synced++;
    } catch (err: any) {
      item.status = "FAILED";
      item.syncError = err?.message || "Network offline or transmission failure";
      failed++;
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

