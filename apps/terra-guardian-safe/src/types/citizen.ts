export type HazardType =
  | "LANDSLIDE"
  | "SLOPE_MOVEMENT"
  | "CRACKS"
  | "FALLING_DEBRIS"
  | "ROAD_BLOCKAGE"
  | "MUD_WATER_FLOW"
  | "INFRASTRUCTURE_DAMAGE"
  | "OTHER"
  | "SLOPE_DEBRIS"
  | "MUDFLOW"
  | "ROCKFALL"
  | "ROAD_CRACK"
  | "EROSION";

export type HazardSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CitizenVerificationState =
  | "SUBMITTED"
  | "UNVERIFIED"
  | "VERIFIED"
  | "ASSOCIATED_WITH_INCIDENT"
  | "REJECTED_INVALID"
  | "CONFLICTED";

export interface CitizenReportPayload {
  latitude: number;
  longitude: number;
  observation: string;
  hazard_type?: HazardType;
  severity?: HazardSeverity;
  photo_url?: string;
  reporter_note?: string;
  reporter_contact?: string;
  incident_id?: string;
  client_submission_id?: string;
  captured_at?: string;
}

export type WarningLevel =
  | "NORMAL"
  | "WATCH"
  | "ADVISORY"
  | "WARNING"
  | "SEVERE_WARNING"
  | "EMERGENCY";

export interface RoadStatus {
  id: string;
  road_code: string;
  road_name: string;
  corridor_section: string;
  state: string;
  district: string;
  status: "OPEN" | "CAUTION" | "RESTRICTED" | "CLOSED" | "UNKNOWN";
  condition_summary: string;
  closure_reason?: string;
  source: string;
  verified_by?: string;
  observed_at: string;
  updated_at: string;
}

export interface CitizenSafetyStatus {
  safety_status: WarningLevel;
  status_color: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  status_headline: string;
  current_location: {
    latitude: number;
    longitude: number;
    state?: string;
    district?: string;
    distance_to_nearest_hazard_km?: number | null;
  };
  active_warning?: {
    id: string;
    alert_code: string;
    severity: string;
    warning_level: string;
    headline: string;
    target_area: string;
    message: string;
    stage: string;
    action_required: string;
    rationale?: string;
    valid_from: string;
    valid_until?: string;
    authorized_by?: string;
    authority_order_code?: string;
  } | null;
  what_changed: string[];
  recommended_actions: string[];
  affected_roads: RoadStatus[];
  nearby_incidents: {
    id: string;
    code: string;
    title: string;
    distance_km: number;
    corridor?: string;
    status: string;
    priority_level: string;
    hazard_state: string;
  }[];
  emergency_contacts: Record<string, string>;
  last_updated: string;
  is_cached_stale?: boolean;
}

export interface CitizenReportResponse {
  tracking_id: string;
  evidence_id: string;
  incident_id: string;
  incident_code: string;
  status: string;
  interpretation: string;
  message: string;
  preliminary_guidance: string;
  timestamp: string;
  is_duplicate?: boolean;
}


export interface CorridorLocationPreset {
  name: string;
  description: string;
  lat: number;
  lng: number;
}

export const CORRIDOR_PRESETS: CorridorLocationPreset[] = [
  {
    name: "NH-13 KM-42 (West Kameng)",
    description: "Bhalukpong-Tenga Sector, Arunachal Pradesh",
    lat: 27.0842,
    lng: 92.5681,
  },
  {
    name: "NH-13 KM-48 (Dedza Section)",
    description: "Tenga Valley Cut Slope, Arunachal Pradesh",
    lat: 27.1210,
    lng: 92.5520,
  },
  {
    name: "NH-13 KM-35 (Bhalukpong Gate)",
    description: "Foothill Ingress Corridor, Arunachal Pradesh",
    lat: 27.0250,
    lng: 92.6200,
  },
];

export interface SampleHazardPhoto {
  id: string;
  title: string;
  category: "LANDSLIDE" | "ROCKFALL" | "ROAD_DEBRIS" | "SLOPE_CRACK";
  category_label: string;
  url: string;
  description: string;
  source: string;
  media_type: "LANDSLIDE_PHOTOGRAPH";
  provenance: "REAL_REFERENCE_MEDIA";
  attribution: string;
}

export const SAMPLE_HAZARD_PHOTOS: SampleHazardPhoto[] = [
  {
    id: "sample-landslide",
    title: "Real Landslide",
    category: "LANDSLIDE",
    category_label: "Real Landslide",
    url: "/samples/sample-landslide-nagaland.jpg",
    description: "Active rotational mass movement & scarp failure across Northeast mountain corridor.",
    source: "Geological Survey of India / Northeast Landslide Inventory",
    media_type: "LANDSLIDE_PHOTOGRAPH",
    provenance: "REAL_REFERENCE_MEDIA",
    attribution: "GSI / Northeast Himalayan Landslide Inventory"
  },
  {
    id: "sample-rockfall",
    title: "Rockfall",
    category: "ROCKFALL",
    category_label: "Rockfall",
    url: "/samples/sample-rockfall-nagaland.jpg",
    description: "Unstable boulders and joint detachment along highway excavation cut-slope.",
    source: "Geological Survey of India / Northeast Corridor Survey",
    media_type: "LANDSLIDE_PHOTOGRAPH",
    provenance: "REAL_REFERENCE_MEDIA",
    attribution: "GSI Field Photo Archive (CC-BY-SA 4.0)"
  },
  {
    id: "sample-road-debris",
    title: "Road Debris",
    category: "ROAD_DEBRIS",
    category_label: "Road Debris",
    url: "/samples/sample-road-debris.jpg",
    description: "Mud, gravel, and fallen debris impeding roadway passage on mountain lifelines.",
    source: "Geological Survey of India / NDRF Himalayan Response Archive",
    media_type: "LANDSLIDE_PHOTOGRAPH",
    provenance: "REAL_REFERENCE_MEDIA",
    attribution: "Himalayan Corridor Disaster Response / Public Documentation"
  },
  {
    id: "sample-slope-crack",
    title: "Crack / Slope Failure",
    category: "SLOPE_CRACK",
    category_label: "Crack / Slope Failure",
    url: "/samples/sample-slope-crack.jpg",
    description: "Extensional tension cracks and shear displacement along crown scarp.",
    source: "Geological Survey of India / Slope Stability Reconnaissance",
    media_type: "LANDSLIDE_PHOTOGRAPH",
    provenance: "REAL_REFERENCE_MEDIA",
    attribution: "Geological Survey of India Reference Archive"
  },
];

