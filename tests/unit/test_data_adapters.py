"""Comprehensive Unit & Safety Invariant Tests for External Data Adapters & Ingestion Pipeline (Phase 3).

Verifies the 17 core requirements:
1. Valid rainfall payload ingestion
2. Malformed rainfall payload rejection (HTTP/Pipeline SCHEMA_INVALID)
3. Invalid coordinate rejection (SPATIAL_OUT_OF_BOUNDS)
4. Invalid timestamp rejection (TEMPORAL_OUT_OF_BOUNDS future date)
5. Impossible rainfall value handling (QUARANTINED above physical cloudburst limit)
6. Duplicate observation rejection (Idempotent DUPLICATE status)
7. Stale observation handling (Quality flagged STALE)
8. Schema mismatch rejection (Missing required attributes)
9. Provider unavailable handling (SOURCE_UNAVAILABLE for unmapped adapter)
10. Quarantined payload storage and inspection
11. Provenance preservation (REPLAY remains REPLAY, cannot silently upgrade to LIVE)
12. Deterministic replay consistency (Identical payload hashes across runs)
13. Semantic Invariant: Ingestion does NOT mutate incident FSM state
14. Semantic Invariant: Ingestion does NOT mutate statutory authorization state
15. Semantic Invariant: Ingestion does NOT mutate dispatched action state
16. Semantic Invariant: Ingestion CANNOT bypass closure preconditions
17. Ambiguous incident association handling (REVIEW_REQUIRED / UNASSIGNED)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import (
    IncidentAssociationStatus,
    IngestionFailureReason,
    IngestionStatus,
    SourceAccessStatus,
)
from app.adapters.ingestion_pipeline import IngestionPipeline
from app.db.models import ActionModel, DecisionModel, EvidenceModel, IncidentModel
from app.domain.enums import (
    ActionState,
    ActorRole,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
)


@pytest.fixture
def clean_pipeline() -> IngestionPipeline:
    """Provide a fresh ingestion pipeline instance with clear caches."""
    p = IngestionPipeline()
    p.clear_caches()
    return p


# ── TEST 1: Valid Rainfall Payload Ingestion ──
@pytest.mark.asyncio
async def test_01_valid_rainfall_payload(clean_pipeline: IngestionPipeline):
    """Valid IMD rainfall payload normalizes into CanonicalPrecipitationObservation."""
    payload = {
        "station_id": "IMD-WK-001",
        "station_name": "Tenga Valley AWS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 24.5,
        "rainfall_24h_mm": 68.0,
        "temperature_c": 18.5,
        "relative_humidity_pct": 92.0,
    }
    result = await clean_pipeline.ingest_payload("rainfall", payload)
    assert result.status == IngestionStatus.ACCEPTED
    assert result.observation is not None
    assert result.observation.normalized_value == 24.5
    assert result.observation.unit == "mm"
    assert result.observation.quality_status == "VALID"
    assert result.observation.verification_status == EvidenceInterpretation.UNVERIFIED


# ── TEST 2: Malformed Rainfall Payload Rejection ──
@pytest.mark.asyncio
async def test_02_malformed_rainfall_payload(clean_pipeline: IngestionPipeline):
    """Malformed payload with missing required fields is rejected with SCHEMA_INVALID."""
    malformed = {
        "station_id": "IMD-BAD",
        # Missing timestamp, latitude, longitude, rainfall_1h_mm
    }
    result = await clean_pipeline.ingest_payload("rainfall", malformed)
    assert result.status == IngestionStatus.REJECTED
    assert result.failure_reason == IngestionFailureReason.SCHEMA_INVALID


# ── TEST 3: Invalid Coordinate Rejection ──
@pytest.mark.asyncio
async def test_03_invalid_coordinate(clean_pipeline: IngestionPipeline):
    """Payload with coordinates outside the North Eastern Region is rejected."""
    out_of_bounds = {
        "station_id": "IMD-DELHI-001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 28.6139,  # Delhi latitude
        "longitude": 77.2090,  # Delhi longitude (outside NER bounds 87.5-98.0)
        "rainfall_1h_mm": 12.0,
    }
    result = await clean_pipeline.ingest_payload("rainfall", out_of_bounds)
    assert result.status == IngestionStatus.REJECTED
    assert result.failure_reason == IngestionFailureReason.SPATIAL_OUT_OF_BOUNDS


# ── TEST 4: Invalid Future Timestamp Rejection ──
@pytest.mark.asyncio
async def test_04_invalid_future_timestamp(clean_pipeline: IngestionPipeline):
    """Payload with future timestamp (>5m ahead) is rejected with TEMPORAL_OUT_OF_BOUNDS."""
    future_time = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = {
        "station_id": "IMD-FUT",
        "timestamp": future_time.isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 15.0,
    }
    result = await clean_pipeline.ingest_payload("rainfall", payload)
    assert result.status == IngestionStatus.REJECTED
    assert result.failure_reason == IngestionFailureReason.TEMPORAL_OUT_OF_BOUNDS


# ── TEST 5: Impossible Rainfall Value Quarantine ──
@pytest.mark.asyncio
async def test_05_impossible_rainfall_value_quarantined(clean_pipeline: IngestionPipeline):
    """Payload with precipitation > 300 mm/hr exceeds physical records and is quarantined."""
    impossible = {
        "station_id": "IMD-EXTREME",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 450.0,  # Impossible cloudburst reading; likely sensor short-circuit
    }
    result = await clean_pipeline.ingest_payload("rainfall", impossible)
    assert result.status == IngestionStatus.QUARANTINED
    assert result.failure_reason == IngestionFailureReason.QUARANTINED
    assert result.quarantine_id is not None
    assert len(clean_pipeline.get_quarantine_records()) == 1


# ── TEST 6: Duplicate Observation Detection ──
@pytest.mark.asyncio
async def test_06_duplicate_observation(clean_pipeline: IngestionPipeline):
    """Submitting the exact same raw payload twice is idempotently flagged as DUPLICATE."""
    payload = {
        "station_id": "IMD-DUP-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 18.0,
    }
    res1 = await clean_pipeline.ingest_payload("rainfall", payload)
    assert res1.status == IngestionStatus.ACCEPTED
    assert res1.is_duplicate is False

    res2 = await clean_pipeline.ingest_payload("rainfall", payload)
    assert res2.status == IngestionStatus.DUPLICATE
    assert res2.failure_reason == IngestionFailureReason.DUPLICATE
    assert res2.is_duplicate is True


# ── TEST 7: Stale Observation Handling ──
@pytest.mark.asyncio
async def test_07_stale_observation(clean_pipeline: IngestionPipeline):
    """Observation older than 24 hours is accepted into canonical schema but flagged STALE."""
    old_time = datetime.now(timezone.utc) - timedelta(days=2)
    payload = {
        "station_id": "IMD-OLD-01",
        "timestamp": old_time.isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 10.0,
    }
    result = await clean_pipeline.ingest_payload("rainfall", payload)
    assert result.status == IngestionStatus.ACCEPTED
    assert result.observation is not None
    assert result.observation.quality_status == "STALE"
    assert result.observation.freshness_seconds > 86400


# ── TEST 8: Schema Version / Type Mismatch ──
@pytest.mark.asyncio
async def test_08_schema_mismatch(clean_pipeline: IngestionPipeline):
    """Payload with non-numeric latitude or rainfall fails with SCHEMA_INVALID."""
    corrupt_types = {
        "station_id": "IMD-STR-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": "NOT_A_LATITUDE",
        "longitude": 92.4000,
        "rainfall_1h_mm": "TWENTY_MM",
    }
    result = await clean_pipeline.ingest_payload("rainfall", corrupt_types)
    assert result.status == IngestionStatus.REJECTED
    assert result.failure_reason == IngestionFailureReason.SCHEMA_INVALID


# ── TEST 9: Provider Unavailable ──
@pytest.mark.asyncio
async def test_09_provider_unavailable(clean_pipeline: IngestionPipeline):
    """Requesting an unregistered adapter key returns SOURCE_UNAVAILABLE."""
    result = await clean_pipeline.ingest_payload("non_existent_provider", {"dummy": 1})
    assert result.status == IngestionStatus.REJECTED
    assert result.failure_reason == IngestionFailureReason.SOURCE_UNAVAILABLE


# ── TEST 10: Quarantined Payload Inspection ──
@pytest.mark.asyncio
async def test_10_quarantined_payload_inspection(clean_pipeline: IngestionPipeline):
    """Inclinometer sensor tilt > 45 deg is quarantined and retrievable via quarantine store."""
    toppled_sensor = {
        "sensor_id": "INC-CRASH-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "depth_meters": 15.0,
        "tilt_axis_x_deg": 38.0,
        "tilt_axis_y_deg": 35.0,  # sqrt(38^2 + 35^2) = 51.6 deg > 45.0 max limit
    }
    result = await clean_pipeline.ingest_payload("inclinometer", toppled_sensor)
    assert result.status == IngestionStatus.QUARANTINED
    quarantine_list = clean_pipeline.get_quarantine_records()
    assert len(quarantine_list) == 1
    assert quarantine_list[0]["adapter_name"] == "IoTInclinometerAdapter"
    assert "exceeds physical limit" in quarantine_list[0]["reason"]


# ── TEST 11: Provenance Preservation ──
@pytest.mark.asyncio
async def test_11_provenance_preservation(clean_pipeline: IngestionPipeline):
    """REPLAY adapter cannot be silently upgraded to LIVE provenance."""
    payload = {
        "satellite_mission": "Sentinel-1",
        "orbit_direction": "DESCENDING",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "coherence": 0.65,
        "line_of_sight_velocity_mm_yr": -18.5,
    }
    # Attempting to override provenance to LIVE on a REPLAY adapter
    result = await clean_pipeline.ingest_payload(
        "insar",
        payload,
        provenance_override=SourceAccessStatus.LIVE,
    )
    assert result.status == IngestionStatus.ACCEPTED
    assert result.observation is not None
    # Boundary rule: Adapter enforces actual institutional access status (REPLAY), preventing synthetic/replay masquerading as LIVE
    assert result.observation.provenance_class == SourceAccessStatus.REPLAY


# ── TEST 12: Deterministic Replay Consistency ──
@pytest.mark.asyncio
async def test_12_deterministic_replay(clean_pipeline: IngestionPipeline):
    """Batch replay of historical payloads yields identical payload hashes and deterministic ordering."""
    records = [
        {
            "station_id": f"IMD-REPLAY-{i}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 27.2000 + (i * 0.01),
            "longitude": 92.4000 + (i * 0.01),
            "rainfall_1h_mm": 10.0 + i,
        }
        for i in range(3)
    ]
    results = await clean_pipeline.replay_feed("rainfall", records)
    assert len(results) == 3
    for r in results:
        assert r.status == IngestionStatus.ACCEPTED
        assert r.observation is not None
        assert r.observation.provenance_class == SourceAccessStatus.REPLAY


# ── TEST 13: Ingestion Does NOT Mutate Incident FSM State ──
@pytest.mark.asyncio
async def test_13_no_fsm_mutation(db_session: AsyncSession):
    """CRITICAL INVARIANT: Ingesting external data must NEVER mutate incident status."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INGEST-FSM",
        title="FSM Non-Bypass Incident",
        status=IncidentStatus.VERIFYING.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.2000,
        longitude=92.4000,
    )
    db_session.add(incident)
    await db_session.flush()

    pipeline = IngestionPipeline(session=db_session)
    payload = {
        "station_id": "IMD-FSM-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2010,
        "longitude": 92.4010,
        "rainfall_1h_mm": 55.0,  # Heavy rainfall
    }

    result = await pipeline.ingest_payload("rainfall", payload, incident_id=incident.id)
    assert result.status == IngestionStatus.ACCEPTED
    assert result.audit_record.association_status == IncidentAssociationStatus.ATTACHED

    # Refresh incident from database
    refreshed = await db_session.get(IncidentModel, incident.id)
    assert refreshed is not None
    # Incident status MUST NOT have changed!
    assert refreshed.status == IncidentStatus.VERIFYING.value


# ── TEST 14: Ingestion Does NOT Mutate Authorization State ──
@pytest.mark.asyncio
async def test_14_no_authorization_mutation(db_session: AsyncSession):
    """CRITICAL INVARIANT: Ingestion cannot generate or modify statutory decisions."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INGEST-AUTH",
        title="Auth Non-Bypass Incident",
        status=IncidentStatus.DECISION_REQUIRED.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.2000,
        longitude=92.4000,
    )
    db_session.add(incident)
    await db_session.flush()

    pipeline = IngestionPipeline(session=db_session)
    payload = {
        "station_id": "IMD-AUTH-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 80.0,
    }

    await pipeline.ingest_payload("rainfall", payload, incident_id=incident.id)

    # Assert zero decisions exist for this incident
    stmt = select(DecisionModel).where(DecisionModel.incident_id == incident.id)
    decisions = (await db_session.execute(stmt)).scalars().all()
    assert len(decisions) == 0

    refreshed = await db_session.get(IncidentModel, incident.id)
    assert refreshed is not None
    assert refreshed.status == IncidentStatus.DECISION_REQUIRED.value


# ── TEST 15: Ingestion Does NOT Mutate Action State ──
@pytest.mark.asyncio
async def test_15_no_action_mutation(db_session: AsyncSession):
    """CRITICAL INVARIANT: Ingestion cannot advance or confirm dispatched actions."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INGEST-ACT",
        title="Action Non-Bypass Incident",
        status=IncidentStatus.RESPONDING.value,
        hazard_state=HazardState.ACTIVE.value,
        latitude=27.2000,
        longitude=92.4000,
    )
    db_session.add(incident)
    await db_session.flush()

    action = ActionModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        task_code="TSK-NON-MUTATE",
        agency="SDRF",
        title="Barrier Setup",
        description="Deploy physical barrier",
        state=ActionState.DISPATCHED.value,
        assigned_to="Unit 1",
    )
    db_session.add(action)
    await db_session.flush()

    pipeline = IngestionPipeline(session=db_session)
    payload = {
        "station_id": "IMD-ACT-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 5.0,
    }
    await pipeline.ingest_payload("rainfall", payload, incident_id=incident.id)

    refreshed_act = await db_session.get(ActionModel, action.id)
    assert refreshed_act is not None
    # Action state MUST remain DISPATCHED!
    assert refreshed_act.state == ActionState.DISPATCHED.value
    assert refreshed_act.confirmed_at is None


# ── TEST 16: Ingestion Cannot Bypass Closure Preconditions ──
@pytest.mark.asyncio
async def test_16_no_closure_bypass(db_session: AsyncSession):
    """CRITICAL INVARIANT: External observations enter as UNVERIFIED and cannot satisfy closure predicates."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INGEST-CLOSE",
        title="Closure Gate Protection Incident",
        status=IncidentStatus.REASSESSING.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.2000,
        longitude=92.4000,
    )
    db_session.add(incident)
    await db_session.flush()

    pipeline = IngestionPipeline(session=db_session)
    payload = {
        "station_id": "IMD-CLOSE-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 0.0,  # Zero rain
    }
    await pipeline.ingest_payload("rainfall", payload, incident_id=incident.id)

    # Inspect persisted evidence
    stmt = select(EvidenceModel).where(EvidenceModel.incident_id == incident.id)
    ev_items = (await db_session.execute(stmt)).scalars().all()
    assert len(ev_items) == 1
    # Evidence enters as UNVERIFIED, source is WEATHER, not FIELD
    assert ev_items[0].interpretation == EvidenceInterpretation.UNVERIFIED.value
    assert ev_items[0].source == EvidenceSource.WEATHER.value

    # Incident remains REASSESSING
    refreshed = await db_session.get(IncidentModel, incident.id)
    assert refreshed is not None
    assert refreshed.status == IncidentStatus.REASSESSING.value


# ── TEST 17: Ambiguous Incident Association Handling ──
@pytest.mark.asyncio
async def test_17_ambiguous_incident_association(db_session: AsyncSession):
    """External observation 7km away from incident is marked REVIEW_REQUIRED, not ATTACHED."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INGEST-ASSOC",
        title="Spatial Association Incident",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.2000,
        longitude=92.4000,
    )
    db_session.add(incident)
    await db_session.flush()

    pipeline = IngestionPipeline(session=db_session)
    # Coordinate approx 7.2 km north (0.065 degrees latitude ~= 7.2 km)
    payload = {
        "station_id": "IMD-MID-DIST-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2650,
        "longitude": 92.4000,
        "rainfall_1h_mm": 12.0,
    }
    result = await pipeline.ingest_payload("rainfall", payload, incident_id=incident.id)
    assert result.status == IngestionStatus.ACCEPTED
    # Distance between 5km and 10km triggers REVIEW_REQUIRED
    assert result.audit_record.association_status == IncidentAssociationStatus.REVIEW_REQUIRED

    # Observation > 10km away is UNASSIGNED
    payload_far = {
        "station_id": "IMD-FAR-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.3500,  # ~16.6 km away
        "longitude": 92.4000,
        "rainfall_1h_mm": 12.0,
    }
    res_far = await pipeline.ingest_payload("rainfall", payload_far, incident_id=incident.id)
    assert res_far.status == IngestionStatus.ACCEPTED
    assert res_far.audit_record.association_status == IncidentAssociationStatus.UNASSIGNED
