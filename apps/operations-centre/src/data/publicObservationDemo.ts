/**
 * TerraGuardian Safe — Public Observation Demo Data and Fixtures
 * 
 * Provides deterministic simulation fixtures and contracts for citizen hazard observations:
 * - Deterministic observation payloads
 * - Simulated camera captures / preview presets
 * - Geolocation presets (NH-13 corridor West Kameng)
 * - AI image observation rules
 * - Critical infrastructure corridor matching
 */

export interface PublicObservationData {
  observationId: string; // e.g. "TG-OBS-7294"
  capturedAt: string;
  image: string; // base64 or SVG data URI representation
  location: {
    lat: number;
    lng: number;
    altitudeMeters: number;
    accuracyMeters: number;
    locationName: string;
    corridorName: string;
    district: string;
    state: string;
    isLiveDeviceGps: boolean;
  };
  reporterNote?: string;
  imageAnalysis: {
    detectedFeatures: string[];
    soilExposureLevel: "HIGH" | "MODERATE" | "LOW";
    slopeDeformationDetected: boolean;
    waterRunoffDetected: boolean;
    rockfallRisk: "ELEVATED" | "MODERATE" | "LOW";
    qualityScore: number; // 0-100
    authenticityStatus: "VERIFIED_DEVICE_METADATA" | "UNVERIFIED";
  };
  criticalAreaMatch: {
    isNearCriticalArea: boolean;
    criticalAreaName: string;
    corridorCode: string;
    distanceMeters: number;
    associatedIncidentCode: string; // e.g. "TG-2048"
    infrastructureType: string;
  };
  preliminaryAssessment: {
    category: "POTENTIAL_LANDSLIDE_OBSERVED";
    severityIndicator: "ELEVATED_VULNERABILITY";
    confidenceLevel: "MODERATE";
    confidenceScore: 58;
    humanVerificationRequired: boolean;
    safetyPrecautions: string[];
  };
  operationalHandoff: {
    status: "FORWARDED_TO_OPERATIONS_CENTRE";
    assignedAgency: string;
    forwardedAt: string;
    evidenceTargetIncidentId: string;
  };
}

// Preset realistic demonstration photos (deterministic SVGs with realistic slope/debris graphics)
export const SAMPLE_OBSERVATION_PHOTOS = [
  {
    id: "photo-active-slope",
    name: "Active Roadside Slope Failure & Mud Slump (NH-13 KM-41.8)",
    thumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%2364748b"/><stop offset="100%" stop-color="%2394a3b8"/></linearGradient><linearGradient id="hill" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2314532d"/><stop offset="100%" stop-color="%23052e16"/></linearGradient><linearGradient id="scar" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2378350f"/><stop offset="50%" stop-color="%2392400e"/><stop offset="100%" stop-color="%23451a03"/></linearGradient><linearGradient id="road" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23334155"/><stop offset="100%" stop-color="%231e293b"/></linearGradient></defs><rect width="600" height="400" fill="url(%23sky)"/><path d="M0,220 Q180,90 380,160 T600,120 L600,400 L0,400 Z" fill="url(%23hill)"/><path d="M210,155 Q290,190 260,260 T350,330 L160,340 Z" fill="url(%23scar)"/><polygon points="220,270 280,265 310,320 240,330" fill="%23b45309" opacity="0.8"/><rect x="0" y="320" width="600" height="80" fill="url(%23road)"/><line x1="0" y1="360" x2="600" y2="360" stroke="%23f59e0b" stroke-width="4" stroke-dasharray="16,16"/><polygon points="260,320 370,330 390,365 240,360" fill="%2378350f"/><text x="20" y="30" fill="white" font-family="monospace" font-size="12" font-weight="bold">FIELD CAPTURE: LAT 27.234°N LON 92.568°E (NH-13 KM-41.8)</text><text x="20" y="48" fill="%23fef08a" font-family="monospace" font-size="10">ACTIVE RUNOFF &amp; TENSION SCARP OBSERVED</text></svg>`,
    description: "Tension scarp and debris accumulation on western cut slope blocking half carriageway.",
    detectedFeatures: [
      "Exposed Soil Scar (35m height)",
      "Uncontrolled Mud Runoff",
      "Partial Asphalt Encroachment",
      "Tension Cracks on Upper Bench"
    ]
  },
  {
    id: "photo-rockfall-drain",
    name: "Culvert Clogging & Muddy Overtopping (NH-13 KM-43.2)",
    thumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="sky2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23475569"/><stop offset="100%" stop-color="%2364748b"/></linearGradient><linearGradient id="hill2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23166534"/><stop offset="100%" stop-color="%2314532d"/></linearGradient></defs><rect width="600" height="400" fill="url(%23sky2)"/><path d="M0,180 Q300,100 600,200 L600,400 L0,400 Z" fill="url(%23hill2)"/><polygon points="120,210 240,250 200,340 90,320" fill="%23854d0e"/><rect x="0" y="310" width="600" height="90" fill="%231e293b"/><line x1="0" y1="355" x2="600" y2="355" stroke="%23e2e8f0" stroke-width="3" stroke-dasharray="12,12"/><text x="20" y="30" fill="white" font-family="monospace" font-size="12" font-weight="bold">FIELD CAPTURE: WATERWAY OVERTOPPING</text></svg>`,
    description: "Drainage blockage with active surface water flooding road shoulder.",
    detectedFeatures: [
      "Drainage Culvert Overflow",
      "Shoulder Erosion",
      "Saturated Soil Surcharge"
    ]
  }
];

export const DEMO_PUBLIC_OBSERVATION: PublicObservationData = {
  observationId: "TG-OBS-7294",
  capturedAt: "2026-09-07T05:22:18Z",
  image: SAMPLE_OBSERVATION_PHOTOS[0].thumbnail,
  location: {
    lat: 27.2341,
    lng: 92.5684,
    altitudeMeters: 1482,
    accuracyMeters: 4.2,
    locationName: "KM-41.8 West Kameng Escarpment",
    corridorName: "NH-13 Trans-Arunachal Highway (Bhalukpong-Tenga)",
    district: "West Kameng",
    state: "Arunachal Pradesh",
    isLiveDeviceGps: false
  },
  reporterNote: "Continuous sliding mud and stones observed since 04:30 hrs. Heavy rainwater cascading over retaining breast wall.",
  imageAnalysis: {
    detectedFeatures: [
      "Fresh Shear Scarp (~35m)",
      "High Soil Moisture Surcharge",
      "Toe Debris Spilling on Carriageway",
      "Exposed Fractured Gneissic Bedrock"
    ],
    soilExposureLevel: "HIGH",
    slopeDeformationDetected: true,
    waterRunoffDetected: true,
    rockfallRisk: "ELEVATED",
    qualityScore: 94,
    authenticityStatus: "VERIFIED_DEVICE_METADATA"
  },
  criticalAreaMatch: {
    isNearCriticalArea: true,
    criticalAreaName: "NH-13 Arterial Corridor (High Susceptibility Zone)",
    corridorCode: "NH-13-WK-C4",
    distanceMeters: 38,
    associatedIncidentCode: "TG-2048",
    infrastructureType: "Strategic Military & Civilian Transport Lifeline"
  },
  preliminaryAssessment: {
    category: "POTENTIAL_LANDSLIDE_OBSERVED",
    severityIndicator: "ELEVATED_VULNERABILITY",
    confidenceLevel: "MODERATE",
    confidenceScore: 58,
    humanVerificationRequired: true,
    safetyPrecautions: [
      "DO NOT attempt to cross active toe debris zones on foot or vehicle.",
      "Maintain minimum 150m setback distance from upper tension scarp line.",
      "Follow advisory notices from DDMA West Kameng & Traffic Police.",
      "Stay clear of roadside concrete drains experiencing sudden overflow."
    ]
  },
  operationalHandoff: {
    status: "FORWARDED_TO_OPERATIONS_CENTRE",
    assignedAgency: "DDMA West Kameng / SDRF Quick Response Unit",
    forwardedAt: "2026-09-07T05:23:01Z",
    evidenceTargetIncidentId: "TG-2048"
  }
};
