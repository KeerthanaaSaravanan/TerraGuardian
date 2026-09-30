import type { CitizenReportPayload, CitizenReportResponse } from "../types/citizen";

function normalizeApiBaseUrl(raw?: string): string {
  if (!raw || !raw.trim()) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/v1`;
    }
    return "/api/v1";
  }
  let clean = raw.trim().replace(/\/+$/, "");
  if (!clean.endsWith("/api/v1")) {
    clean = `${clean}/api/v1`;
  }
  return clean;
}

export const API_BASE = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);


export async function screenCitizenImage(imageBase64: string, filename: string = "observation.jpg"): Promise<any> {
  const response = await fetch(`${API_BASE}/citizen/screen-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: imageBase64, filename }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Screening failed: ${errorText}`);
  }
  return response.json();
}

export async function reverseGeocode(lat: number, lng: number): Promise<any> {
  const response = await fetch(`${API_BASE}/citizen/reverse-geocode?lat=${lat}&lng=${lng}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Geocoding failed: ${errorText}`);
  }
  return response.json();
}

export async function submitCitizenReport(payload: CitizenReportPayload): Promise<CitizenReportResponse> {
  // First try the durable citizen/report endpoint
  try {
    const citizenRes = await fetch(`${API_BASE}/citizen/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: payload.photo_url?.startsWith("data:") ? payload.photo_url : undefined,
        image_url: !payload.photo_url?.startsWith("data:") ? payload.photo_url : undefined,
        latitude: payload.latitude,
        longitude: payload.longitude,
        citizen_notes: payload.observation,
        ai_observation: payload.observation,
        reporter_contact: payload.reporter_contact,
        client_submission_id: payload.client_submission_id,
      }),
    });
    if (citizenRes.ok) {
      const data = await citizenRes.json();
      return {
        tracking_id: data.tracking_id,
        evidence_id: data.id,
        incident_id: data.incident_id || "00000000-0000-0000-0000-000000000000",
        incident_code: data.incident_code || "TG-CITIZEN",
        status: data.review_status,
        interpretation: "UNVERIFIED",
        message: "Observation recorded into district emergency queue.",
        preliminary_guidance: "Maintain 100m safe distance from unstable slope faces.",
        timestamp: data.created_at,
        is_duplicate: false,
      };
    }
  } catch {
    // Fallback to ingestion endpoint
  }

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

export async function fetchCitizenSafetyStatus(
  lat: number,
  lng: number,
  state: string = "Arunachal Pradesh",
  district: string = "West Kameng"
): Promise<any> {
  const url = `${API_BASE}/citizen/safety-status?lat=${lat}&lng=${lng}&state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch safety status: ${errorText}`);
  }
  return response.json();
}

export async function acknowledgeAlert(
  alertId: string,
  payload: {
    device_id: string;
    is_safe: boolean;
    safe_notes?: string;
    approx_lat?: number;
    approx_lng?: number;
  }
): Promise<any> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to acknowledge alert: ${errorText}`);
  }
  return response.json();
}

export async function fetchRoadStatuses(): Promise<any> {
  const response = await fetch(`${API_BASE}/roads/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch road statuses`);
  }
  return response.json();
}

export async function registerDevice(devicePayload: {
  device_id: string;
  fcm_token: string;
  platform?: string;
  app_version?: string;
  notification_permissions?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
  subscribed_districts?: string[];
  subscribed_corridors?: string[];
}): Promise<any> {
  const response = await fetch(`${API_BASE}/devices/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(devicePayload),
  });
  if (!response.ok) {
    throw new Error(`Failed to register device`);
  }
  return response.json();
}

