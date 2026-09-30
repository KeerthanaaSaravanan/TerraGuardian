import type { CitizenReportPayload, CitizenReportResponse } from "../types/citizen";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export async function submitCitizenReport(payload: CitizenReportPayload): Promise<CitizenReportResponse> {
  const response = await fetch(`${API_BASE}/ingestion/citizen-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Report submission failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
