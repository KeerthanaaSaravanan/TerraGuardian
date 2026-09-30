/**
 * Authoritative Geospatial Intelligence Types & Feature Contracts (Phase 4 / 4R).
 */

export interface AdminBoundaryFeature {
  id: string;
  boundary_code: string;
  name: string;
  admin_level: string;
  state_code: string;
  geometry_wkt: string;
  geometry_geojson: {
    type: "Polygon";
    coordinates: number[][][];
  };
  bbox: [number, number, number, number];
  source: string;
  provenance_class: "LIVE" | "REAL_HISTORICAL" | "REPLAY" | "SYNTHETIC" | "UNAVAILABLE";
  is_authoritative: boolean;
}

export interface RoadSegmentFeature {
  id: string;
  road_code: string;
  segment_name: string;
  classification: string;
  managing_agency: string;
  chainage_start_km: number;
  chainage_end_km: number;
  geometry_wkt: string;
  geometry_geojson: {
    type: "LineString";
    coordinates: number[][];
  };
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  criticality_tier: "SOLE_LIFELINE" | "STRATEGIC_DEFENSE" | "SECONDARY";
  provenance_class: "LIVE" | "REAL_HISTORICAL" | "REPLAY" | "SYNTHETIC" | "UNAVAILABLE";
}

export interface SettlementFeature {
  id: string;
  settlement_code: string;
  name: string;
  district: string;
  state: string;
  population: number;
  household_count: number;
  latitude: number;
  longitude: number;
  geometry_geojson: {
    type: "Point";
    coordinates: [number, number];
  };
  provenance_class: "LIVE" | "REAL_HISTORICAL" | "REPLAY" | "SYNTHETIC" | "UNAVAILABLE";
}

export interface CriticalInfrastructureFeature {
  id: string;
  facility_code: string;
  name: string;
  facility_type: "HOSPITAL" | "BRIDGE" | "DEFENSE_LOGISTICS" | "TELECOM" | "POWER";
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  geometry_geojson: {
    type: "Point";
    coordinates: [number, number];
  };
  provenance_class: "LIVE" | "REAL_HISTORICAL" | "REPLAY" | "SYNTHETIC" | "UNAVAILABLE";
}

export interface SpatialIncidentFeature {
  id: string;
  code: string;
  title: string;
  status: string;
  hazard_state: string;
  risk_level: string;
  risk_score: number;
  confidence_level: string;
  confidence_score: number;
  priority_level: string;
  priority_score: number;
  latitude: number;
  longitude: number;
  location_name: string;
  corridor_name: string;
  state: string;
  district: string;
  evidence_count: number;
  provenance_class: "LIVE" | "REAL_HISTORICAL" | "REPLAY" | "SYNTHETIC" | "UNAVAILABLE";
  detected_at: string;
  updated_at: string;
  is_primary_demo: boolean;
}

export interface SpatialAssociationResponse {
  incident_id: string;
  observation_latitude: number;
  observation_longitude: number;
  distance_meters: number;
  association_status: "ATTACHED" | "REVIEW_REQUIRED" | "UNASSIGNED";
  threshold_attached_meters: number;
  threshold_review_meters: number;
  details: string;
}

export type SpatialAssociationResult = SpatialAssociationResponse;

export interface NERStateHierarchy {
  state_code: string;
  name: string;
  coverage_state: "REAL_HISTORICAL" | "SOURCE_AVAILABLE_ADAPTER_NOT_CONNECTED" | "FIXTURE";
  provenance_class: "REAL_HISTORICAL" | "NO_LIVE_FEED" | "FIXTURE";
  is_primary_demonstration_corridor: boolean;
  telemetry_status: string;
  details: string;
  districts: Array<{
    district_code: string;
    name: string;
    coverage_state: string;
    provenance_class: string;
    corridors: Array<{
      corridor_code: string;
      name: string;
      classification: string;
      criticality_tier: string;
      chainage_km: string;
      sites: Array<{
        site_code: string;
        name: string;
        latitude: number;
        longitude: number;
        associated_incident_code: string | null;
        has_active_twin: boolean;
      }>;
    }>;
  }>;
}

export interface NERHierarchyResponse {
  country: string;
  country_code: string;
  region: string;
  region_code: string;
  states_count: number;
  states: NERStateHierarchy[];
}

export interface ScientificAssessmentResponse {
  incident_id: string;
  incident_code: string;
  location_name: string;
  corridor_name: string;
  coordinates: {
    latitude: number;
    longitude: number;
    crs: string;
  };
  assessment_version: number;
  assessed_at: string;
  susceptibility: {
    experimental_score: number;
    classification: string;
    model_name: string;
    model_version: string;
    scientific_maturity: string;
    is_validated: boolean;
    is_calibrated: boolean;
    notice: string;
  };
  dynamic_hazard: {
    risk_score: number;
    risk_level: string;
    model_name: string;
    scientific_maturity: string;
    dominant_risk_factors: string[];
    explanation: string;
  };
  confidence: {
    confidence_score: number;
    confidence_level: string;
    completeness_ratio: number;
    available_features: number;
    missing_features: string[];
    stale_features: string[];
    sensor_concordance: string;
    optical_obscuration_pct: number;
    explanation: string;
  };
  feature_lineage: {
    slope: {
      value: number;
      unit: string;
      source_dataset: string;
      algorithm: string;
      provenance: string;
    };
    elevation: {
      value: number;
      unit: string;
      source_dataset: string;
      provenance: string;
    };
    aspect: {
      value: number;
      unit: string;
      source_dataset: string;
      provenance: string;
    };
    rainfall_24h: {
      value: number;
      unit: string;
      source_dataset: string;
      provenance: string;
    };
    antecedent_rainfall_7d: {
      value: number;
      unit: string;
      source_dataset: string;
      provenance: string;
    };
    historical_landslide: {
      nearest_landslide_dist_m: number;
      nearest_landslide_name: string;
      historical_density_5km: number;
      source_dataset: string;
      provenance: string;
    };
  };
  consequence_priority: {
    priority_level: string;
    priority_score: number;
    criticality_tier: string;
    exposed_lifeline: string;
    explanation: string;
  };
  scientific_maturity_levels: Record<string, string>;
  semantic_invariant_disclosures: Record<string, string>;
}

export interface NERLandslideProperties {
  event_id: string;
  name: string;
  state_code: string;
  state: string;
  district: string;
  location_name: string;
  corridor_code: string;
  chainage_km?: number;
  elevation_msl_m?: number;
  event_date: string;
  event_type: string;
  movement_mechanism?: string;
  trigger_type?: string;
  trigger_rainfall_3d_mm?: number;
  estimated_volume_m3?: number;
  road_blockage_hours?: number;
  source_agency: string;
  source_dataset?: string;
  source_record_id: string;
  source_reference?: string;
  source_url?: string;
  event_status: "VERIFIED_OPERATIONAL_INCIDENT" | "RECENT_REPORTED" | "HISTORICAL_RECORD" | "PENDING_VERIFICATION" | "CONTROLLED_DEMO";
  is_active_operational_incident: boolean;
  operational_incident_code?: string;
  data_maturity: "REAL_HISTORICAL" | "RECENT_REPORTED" | "CONTROLLED_DEMO";
  classification?: string;
  verification_status?: string;
  field_verified: boolean;
  reported_at?: string;
  observed_at?: string;
  ingested_at?: string;
  last_updated: string;
}

export interface NERLandslideFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: NERLandslideProperties;
}

export interface NERLandslidesGeoJSON {
  type: "FeatureCollection";
  region: string;
  event_count: number;
  time_window_applied: string;
  state_filter_applied: string;
  feed_metadata: {
    feed_status: string;
    live_adapter_status: string;
    live_adapter_note: string;
    last_synced_at: string;
    default_extent: {
      center: [number, number];
      zoom: number;
      bounds: [[number, number], [number, number]];
    };
  };
  features: NERLandslideFeature[];
}

export interface NERRegionalSummary {
  title: string;
  region: string;
  states_count: number;
  total_catalog_events: number;
  historical_events: number;
  controlled_demo_events?: number;
  recent_reported_events: number;
  active_verified_incidents: number;
  pending_verification: number;
  events_by_state: Record<string, number>;
  feed_status: string;
  feed_status_text: string;
  last_source_update: string;
  last_synced_at: string;
  data_stewards: string[];
}

