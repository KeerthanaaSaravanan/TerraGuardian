# TerraGuardian AI — Data Contracts
**Document ID:** `TG-DOC-08-DATA-CONTRACTS`  
**Status:** APPROVED FOR PHASE 5 DATA FABRIC  
**Governing Standard:** Section 8 & 9 of Engineering Constitution (`REALITY > CLAIMS`)  
**Version:** `1.0.0`  

---

## 1. Principles

1. **Truth in Provenance:** Every data record ingested, stored, or presented by TerraGuardian MUST carry an unambiguous provenance tag indicating its source, collector, ingestion pipeline timestamp, and data classification.
2. **Four-Tier Data Classification:**
   - `REAL`: Empirical physical sensor observations, government survey boundaries, open-access satellite imagery, authenticated citizen submissions.
   - `MODEL`: Statistical predictions, heuristic risk scores, inferred hazard footprints, spatial proximity buffers.
   - `SIMULATED`: Controlled scenario fixtures, synthetic sensor streams, test datasets. Must NEVER be labeled as `REAL`.
   - `AUTHORITATIVE_HUMAN`: Official administrative declarations, safety orders, verified field evaluations, human-in-the-loop decisions.
3. **Immutability of Evidence:** Evidence records once ingested and stamped with a cryptographic hash are append-only. State changes (e.g. `UNVERIFIED -> VERIFIED`) are recorded as immutable event log transitions.
4. **Coordinate Reference System (CRS) Standard:**
   - Storage & API Exchange: `EPSG:4326` (WGS84 ellipsoidal latitude/longitude in decimal degrees, 6 decimal places minimum ~0.11m precision).
   - Spatial Calculations (Distance, Buffer, Slope): Projected to `EPSG:32646` (WGS 84 / UTM Zone 46N) for North-East India to ensure metric fidelity without distortion.
5. **Temporal Precision:** All timestamps MUST use ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SS.sssZ`). Local timestamps without explicit UTC offsets are rejected at ingestion boundaries.

---

## 2. Incident Schema

The central domain model is the **Incident Twin** (`Incident`), representing a living landslide hazard lifecycle.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "IncidentTwin",
  "type": "object",
  "required": [
    "incident_id",
    "twin_id",
    "title",
    "lifecycle_status",
    "location",
    "district",
    "state",
    "detected_at",
    "last_updated_at",
    "data_classification"
  ],
  "properties": {
    "incident_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique immutable identifier for the operational incident"
    },
    "twin_id": {
      "type": "string",
      "format": "uuid",
      "description": "Associated Digital Twin state machine entity"
    },
    "title": {
      "type": "string",
      "minLength": 5,
      "maxLength": 160
    },
    "lifecycle_status": {
      "type": "string",
      "enum": [
        "DETECTED",
        "ASSESSING",
        "VERIFYING",
        "VERIFIED",
        "DECISION_REQUIRED",
        "AUTHORIZED",
        "RESPONDING",
        "MONITORING",
        "RESOLVED",
        "REVIEWED"
      ]
    },
    "location": {
      "type": "object",
      "required": ["type", "coordinates"],
      "properties": {
        "type": { "type": "string", "enum": ["Point"] },
        "coordinates": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 2,
          "maxItems": 3,
          "description": "[longitude, latitude, elevation_m]"
        }
      }
    },
    "district": { "type": "string" },
    "state": { "type": "string" },
    "corridor_id": { "type": "string" },
    "data_classification": {
      "type": "string",
      "enum": ["REAL", "SIMULATED"]
    },
    "detected_at": { "type": "string", "format": "date-time" },
    "last_updated_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## 3. Evidence Schema

Canonical representation of raw and normalized observational evidence ingested from external feeds, sensors, or field users.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CanonicalEvidence",
  "type": "object",
  "required": [
    "evidence_id",
    "incident_id",
    "source_type",
    "source_system",
    "telemetry_type",
    "recorded_at",
    "ingested_at",
    "geometry",
    "verification_status",
    "data_classification",
    "raw_payload",
    "normalized_features"
  ],
  "properties": {
    "evidence_id": { "type": "string", "format": "uuid" },
    "incident_id": { "type": "string", "format": "uuid" },
    "source_type": {
      "type": "string",
      "enum": [
        "METEOROLOGICAL_SENSOR",
        "SATELLITE_INSAR",
        "SATELLITE_OPTICAL",
        "IOT_INCLINOMETER",
        "IOT_PIEZOMETER",
        "CITIZEN_REPORT",
        "FIELD_TEAM_OBSERVATION",
        "GEOLOGICAL_SURVEY",
        "HISTORICAL_INVENTORY"
      ]
    },
    "source_system": {
      "type": "string",
      "description": "Identifier of the feeder system (e.g., 'IMD_AWS_PUNE', 'SENTINEL_1_CDSE', 'SAFE_CITIZEN_APP')"
    },
    "telemetry_type": {
      "type": "string",
      "enum": [
        "RAINFALL_ACCUMULATION",
        "SURFACE_DISPLACEMENT",
        "SOIL_PORE_PRESSURE",
        "BOREHOLE_TILT",
        "CROWDSOURCED_PHOTO",
        "LITHOLOGY_POLYGON",
        "HISTORICAL_SLIP_SCAR"
      ]
    },
    "recorded_at": { "type": "string", "format": "date-time" },
    "ingested_at": { "type": "string", "format": "date-time" },
    "geometry": {
      "type": "object",
      "required": ["type", "coordinates"],
      "properties": {
        "type": { "type": "string", "enum": ["Point", "LineString", "Polygon"] },
        "coordinates": { "type": "array" }
      }
    },
    "verification_status": {
      "type": "string",
      "enum": ["UNVERIFIED", "AUTOMATED_PLAUSIBILITY_PASSED", "VERIFIED", "REJECTED"]
    },
    "confidence_weight": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "data_classification": {
      "type": "string",
      "enum": ["REAL", "SIMULATED"]
    },
    "raw_payload": { "type": "object" },
    "normalized_features": {
      "type": "object",
      "properties": {
        "rainfall_24h_mm": { "type": "number" },
        "rainfall_7d_mm": { "type": "number" },
        "displacement_rate_mm_yr": { "type": "number" },
        "tilt_deg": { "type": "number" },
        "pore_pressure_kpa": { "type": "number" },
        "slope_deg": { "type": "number" },
        "lithology_susceptibility_score": { "type": "number" }
      }
    }
  }
}
```

---

## 4. Risk Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "RiskAssessment",
  "type": "object",
  "required": [
    "assessment_id",
    "incident_id",
    "hazard_score",
    "vulnerability_score",
    "exposure_score",
    "composite_risk_score",
    "risk_level",
    "evaluation_method",
    "assessed_at"
  ],
  "properties": {
    "assessment_id": { "type": "string", "format": "uuid" },
    "incident_id": { "type": "string", "format": "uuid" },
    "hazard_score": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Physical slope failure probability (P(Slope Failure))"
    },
    "vulnerability_score": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Susceptibility of elements at risk to physical damage"
    },
    "exposure_score": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Human population, road traffic, and critical infrastructure in hazard buffer"
    },
    "composite_risk_score": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Risk = Hazard x Vulnerability x Exposure"
    },
    "risk_level": {
      "type": "string",
      "enum": ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    },
    "evaluation_method": {
      "type": "string",
      "enum": [
        "DETERMINISTIC_HEURISTIC_V1",
        "STATISTICAL_XGBOOST_V1",
        "PHYSICALLY_BASED_SLOPE_STABILITY"
      ]
    },
    "assessed_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## 5. Confidence Schema

**CRITICAL RULE:** Risk and Confidence are orthogonal dimensions ($R \perp C$).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ConfidenceAssessment",
  "type": "object",
  "required": [
    "composite_confidence",
    "confidence_level",
    "factors",
    "assessed_at"
  ],
  "properties": {
    "composite_confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "confidence_level": {
      "type": "string",
      "enum": ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
    },
    "factors": {
      "type": "object",
      "required": [
        "freshness_score",
        "source_diversity_score",
        "spatial_proximity_score",
        "conflict_penalty"
      ],
      "properties": {
        "freshness_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Decays exponentially with evidence age (half-life: 12 hours for rainfall, 14 days for InSAR)"
        },
        "source_diversity_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Fraction of independent sensory modalities available (Rainfall + InSAR + IoT + Citizen)"
        },
        "spatial_proximity_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Distance penalty from evidence location to target incident center"
        },
        "conflict_penalty": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 0.5,
          "description": "Penalty applied if two sensor feeds produce divergent signals (e.g. zero tilt vs high displacement)"
        }
      }
    },
    "assessed_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## 6. Geospatial Data Standards

### Vector Standards
- **Format:** GeoJSON (`RFC 7946`) and GeoPackage (`OGC GPKG 1.2`).
- **CRS:** `EPSG:4326` (WGS84) for GeoJSON payloads; internal calculations projected to `EPSG:32646` (UTM 46N).
- **Topology:** Simple geometries only (`Point`, `LineString`, `Polygon`). Polygons must follow the right-hand rule (exterior boundary counter-clockwise). Self-intersecting rings are rejected.
- **Precision:** Coordinates must be serialized to 6 decimal places ($10^{-6}$ degrees $\approx 0.11\text{ m}$).

### Raster Standards
- **Format:** Cloud-Optimized GeoTIFF (`COG`).
- **Compression:** DEFLATE or LZW with internal overviews (pyramids).
- **DEM Resolution:** 1 arc-second (~30 meters) minimum; 0.4 arc-second (~12.5 meters) preferred.
- **NoData Value:** Must be explicitly set (standard: `-9999.0` or `NaN`). Unmasked NoData values will fail pipeline ingestion.
- **Tiling:** $256 \times 256$ or $512 \times 512$ tile blocks.

---

## 7. Temporal Standards

1. **Format:** Standard ISO 8601 with fractional seconds and explicit timezone UTC offset (`YYYY-MM-DDTHH:MM:SS.sssZ`).
2. **Standard Time Windows:**
   - Flash Trigger: Rolling 1-hour and 3-hour rainfall accumulation.
   - Immediate Antecedent: Rolling 24-hour rainfall accumulation.
   - Long-Term Hydrological Antecedent: Rolling 7-day, 14-day, and 30-day cumulative rainfall.
   - Geological Deformation: Annualized velocity ($\text{mm/year}$) and 12-day differential velocity ($\Delta v$).
3. **Staleness Decay Policy:**
   - Weather Telemetry: Reaches 50% confidence penalty after 6 hours; marked stale after 24 hours.
   - Satellite InSAR: Reaches 50% confidence penalty after 30 days; marked stale after 90 days.
   - In-Situ Inclinometer: Marked stale if heartbeat is absent for $> 30$ minutes.

---

## 8. Versioning & Migration Policy

1. **Semantic Versioning:** All contract schemas follow `vMAJOR.MINOR.PATCH`.
   - `MAJOR`: Breaking schema change (field deleted or type changed). Requires database migration and API version bump (`/v2/`).
   - `MINOR`: Backward-compatible addition of optional fields or metadata.
   - `PATCH`: Documentation or validation clarification.
2. **Schema Validation Enforcement:** FastAPI endpoints enforce incoming request payload validation via Pydantic models derived directly from these contracts.
3. **Database Migration Strategy:** Schema evolutions in SQLite/PostgreSQL are strictly version-controlled through Alembic migration scripts in `services/api/alembic/versions`. Raw SQL schema mutations without migration files are prohibited.
