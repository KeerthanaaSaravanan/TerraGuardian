"""Targeted Unit & Regression Test Suite for NER-Wide Landslide Intelligence and Citizen Media.

Tests:
1. NER default extent and 8-state coverage.
2. All 8 NER states represented in catalog.
3. Event normalization, provenance, and data maturity.
4. Physical truthfulness: 0 events returned for empty time windows (no random/fabricated events).
5. Feed status disclosure (NOT_CONNECTED, no fabricated live streams).
6. Citizen reference image provenance and absence of hotel/resort/non-hazard imagery.
"""

import json
from pathlib import Path
import pytest
from app.services.ner_landslides_service import NERLandslidesService

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_ner_inventory_covers_all_eight_states():
    """Verify that all 8 North Eastern states have authoritative landslide records."""
    svc = NERLandslidesService()
    records = svc.get_all_records()
    assert len(records) >= 8

    state_codes = {r["state_code"] for r in records}
    expected_states = {"AR", "AS", "ML", "MN", "MZ", "NL", "SK", "TR"}
    assert expected_states.issubset(state_codes), f"Missing states: {expected_states - state_codes}"


def test_ner_geojson_feature_contract():
    """Verify GeoJSON FeatureCollection conforms to Leaflet and GIS contracts."""
    svc = NERLandslidesService()
    geojson = svc.to_geojson()

    assert geojson["type"] == "FeatureCollection"
    assert "features" in geojson
    assert len(geojson["features"]) == 18

    # Check feed metadata & default extent
    feed_meta = geojson["feed_metadata"]
    assert feed_meta["feed_status"] == "OFFICIAL_CATALOG_SYNCED"
    assert feed_meta["live_adapter_status"] == "NOT_CONNECTED"
    assert feed_meta["default_extent"]["zoom"] == 7
    # Extent must frame the complete NER
    center = feed_meta["default_extent"]["center"]
    assert 25.0 <= center[0] <= 27.5
    assert 91.0 <= center[1] <= 94.5


def test_ner_event_normalization_and_provenance():
    """Verify each event has all required fields, authentic sources, and no random coords."""
    svc = NERLandslidesService()
    records = svc.get_all_records()

    for r in records:
        assert "event_id" in r and r["event_id"].startswith("LS-NER-")
        assert "name" in r and len(r["name"]) > 5
        assert "latitude" in r and 21.5 <= r["latitude"] <= 30.0  # Latitude in NER
        assert "longitude" in r and 88.0 <= r["longitude"] <= 98.0  # Longitude in NER
        assert "event_date" in r
        assert "source_agency" in r
        assert "source_record_id" in r
        assert r["data_maturity"] in ("REAL_HISTORICAL", "RECENT_REPORTED", "CONTROLLED_DEMO")
        assert r["event_status"] in (
            "VERIFIED_OPERATIONAL_INCIDENT",
            "RECENT_REPORTED",
            "HISTORICAL_RECORD",
            "PENDING_VERIFICATION",
            "CONTROLLED_DEMO",
        )


def test_time_window_truthfulness_no_fabricated_events():
    """Verify empty time windows return 0 events without fabricating synthetic entries."""
    svc = NERLandslidesService()

    # 24H and 7D filter should return 0 events if no events happened in the last 24h
    events_24h = svc.filter_events(time_window="24H")
    assert len(events_24h) == 0, "Expected 0 events for 24H window without live feed; must not fabricate!"

    events_7d = svc.filter_events(time_window="7D")
    assert len(events_7d) == 0, "Expected 0 events for 7D window; must not fabricate!"

    # ALL AVAILABLE must return all 18 records
    events_all = svc.filter_events(time_window="ALL")
    assert len(events_all) == 18


def test_regional_summary_aggregation():
    """Verify regional summary counts, status, and state distribution."""
    svc = NERLandslidesService()
    summary = svc.get_regional_summary()

    assert summary["title"] == "NER LANDSLIDE INTELLIGENCE"
    assert summary["states_count"] == 8
    assert summary["total_catalog_events"] == 18
    assert summary["active_verified_incidents"] == 1  # KM-42 / TG-2048
    assert summary["historical_events"] == 6  # 6 independently verified historical disasters
    assert summary["controlled_demo_events"] == 12  # 12 internal controlled demonstration fixtures
    assert summary["recent_reported_events"] == 0  # 0 recent reported events (no live feed connected)
    assert summary["feed_status"] == "NOT_CONNECTED"
    assert "events_by_state" in summary
    for st in ("AR", "AS", "ML", "MN", "MZ", "NL", "SK", "TR"):
        assert summary["events_by_state"].get(st, 0) > 0


def test_source_record_id_is_source_native_or_null():
    """Rule 1: Verify source_record_id is either a source-native database ID or null.
    
    Synthesized strings are prohibited. If no native source primary key exists,
    source_record_id must be null and internal_reference_id used instead.
    """
    svc = NERLandslidesService()
    records = svc.get_all_records()
    for r in records:
        assert r.get("source_record_id") is None, (
            f"Event {r['event_id']} has synthesized source_record_id: {r.get('source_record_id')}"
        )
        assert r.get("internal_reference_id") is not None, (
            f"Event {r['event_id']} missing internal_reference_id"
        )


def test_coordinate_verification_is_explicit():
    """Rule 2: Every coordinate must be explicitly classified."""
    valid_modes = {"COORDINATE_SOURCE_VERIFIED", "COORDINATE_APPROXIMATED", "COORDINATE_NOT_AVAILABLE"}
    svc = NERLandslidesService()
    records = svc.get_all_records()
    for r in records:
        mode = r.get("coordinate_verification_mode")
        assert mode in valid_modes, f"Event {r['event_id']} has invalid coordinate mode: {mode}"


def test_timestamp_verification_is_explicit():
    """Rule 3: Every timestamp must be explicitly classified."""
    valid_modes = {"TIMESTAMP_SOURCE_VERIFIED", "TIMESTAMP_APPROXIMATED", "TIMESTAMP_NOT_AVAILABLE"}
    svc = NERLandslidesService()
    records = svc.get_all_records()
    for r in records:
        mode = r.get("timestamp_verification_mode")
        assert mode in valid_modes, f"Event {r['event_id']} has invalid timestamp mode: {mode}"


def test_remote_sensing_is_not_field_verified():
    """Rule 4: Events mapped via remote sensing must NEVER be marked field_verified."""
    svc = NERLandslidesService()
    records = svc.get_all_records()
    remote_events = [r for r in records if r.get("source_verification_mode") == "REMOTE_SENSING_ONLY"]
    assert len(remote_events) >= 1
    for r in remote_events:
        assert r.get("field_verified") is False, (
            f"Event {r['event_id']} is REMOTE_SENSING_ONLY but marked field_verified!"
        )


def test_real_historical_does_not_imply_field_verified():
    """Rule 5: REAL_HISTORICAL does NOT imply field verification by TerraGuardian."""
    svc = NERLandslidesService()
    records = svc.get_all_records()
    real_records = [r for r in records if r.get("classification") == "REAL_HISTORICAL"]
    assert len(real_records) == 6
    for r in real_records:
        assert r.get("field_verified") is False, (
            f"Event {r['event_id']} is REAL_HISTORICAL but claims TerraGuardian field_verified!"
        )


def test_controlled_demo_has_no_real_event_claim():
    """Rule 6: CONTROLLED_DEMO records make no claim to real-world event existence."""
    svc = NERLandslidesService()
    records = svc.get_all_records()
    demo_records = [r for r in records if r.get("classification") == "CONTROLLED_DEMO"]
    assert len(demo_records) == 12
    for r in demo_records:
        assert r.get("event_existence_verified") is False, (
            f"Demo event {r['event_id']} improperly claims event_existence_verified!"
        )
        assert r.get("source_verification_mode") == "UNVERIFIED"


def test_real_historical_events_have_complete_citations():
    """Every REAL_HISTORICAL event must have authentic agency, dataset, and reference citations."""
    svc = NERLandslidesService()
    records = svc.get_all_records()
    real_records = [r for r in records if r.get("classification") == "REAL_HISTORICAL"]
    assert len(real_records) == 6
    for r in real_records:
        assert r.get("source_agency"), f"Event {r['event_id']} missing source_agency"
        assert r.get("source_dataset"), f"Event {r['event_id']} missing source_dataset"
        assert r.get("source_reference"), f"Event {r['event_id']} missing source_reference"
        assert r.get("source_url"), f"Event {r['event_id']} missing source_url"
        assert r.get("event_existence_verified") is True



def test_susceptibility_zones_are_not_event_records():
    """Rule 4 & Rule 11: GSI NLSM susceptibility zones must never be represented as landslide event occurrences."""
    svc = NERLandslidesService()
    records = svc.get_all_records()

    for r in records:
        # If a record references NLSM, it must not claim to be a standalone NLSM event occurrence without SIT/Atlas evidence
        if "NLSM" in r.get("source_dataset", ""):
            assert r.get("classification") != "REAL_HISTORICAL", (
                f"Event {r['event_id']} claims NLSM susceptibility mapping is a landslide event record!"
            )
        # No event name or type may be labeled simply SUSCEPTIBILITY
        assert r.get("event_type") != "SUSCEPTIBILITY_ZONE"
        assert "susceptibility" not in r.get("event_type", "").lower()


def test_no_event_is_promoted_to_REAL_HISTORICAL_without_source_provenance():
    """Rule 6 & Rule 9: No event is promoted to REAL_HISTORICAL without independent source verification."""
    svc = NERLandslidesService()
    records = svc.get_all_records()

    verified_event_ids = {
        "LS-NER-AS-2022-HAFLONG",
        "LS-NER-MN-2022-TUPUL",
        "LS-NER-MZ-2024-AIZAWL",
        "LS-NER-NL-2023-KOHIMA",
        "LS-NER-SK-2023-TEESTA",
        "LS-NER-SK-2024-MANGAN",
    }

    for r in records:
        if r["event_id"] in verified_event_ids:
            assert r.get("classification") == "REAL_HISTORICAL"
            assert r.get("data_maturity") == "REAL_HISTORICAL"
        else:
            assert r.get("classification") in ("CONTROLLED_DEMO", "DEMO")
            assert r.get("data_maturity") in ("CONTROLLED_DEMO", "DEMO")
            assert r.get("verification_status") in ("CONTROLLED_DEMO", "DEMO")


def test_recent_report_requires_observed_or_reported_timestamp():
    """Rule 2 & Rule 10: Any RECENT_REPORTED event must have observed_at and reported_at timestamps and active feed."""
    svc = NERLandslidesService()
    records = svc.get_all_records()

    recent_events = [r for r in records if r.get("classification") == "RECENT_REPORTED"]
    # Currently no live feed connected, so recent_events must be 0
    assert len(recent_events) == 0, "No live feed is connected; RECENT_REPORTED count must be 0!"

    for r in records:
        if r.get("classification") == "RECENT_REPORTED":
            assert r.get("reported_at") is not None
            assert r.get("observed_at") is not None


def test_state_coverage_does_not_force_synthetic_records():
    """Rule 7: State coverage must NOT force synthetic records into REAL_HISTORICAL."""
    svc = NERLandslidesService()
    records = svc.get_all_records()

    real_records_by_state = {}
    demo_records_by_state = {}

    for r in records:
        st = r["state_code"]
        if r.get("classification") == "REAL_HISTORICAL":
            real_records_by_state[st] = real_records_by_state.get(st, 0) + 1
        else:
            demo_records_by_state[st] = demo_records_by_state.get(st, 0) + 1

    # States without independently verified historical disasters must have 0 REAL_HISTORICAL
    assert real_records_by_state.get("AR", 0) == 0, "Arunachal must not have unverified records marked REAL_HISTORICAL"
    assert real_records_by_state.get("ML", 0) == 0, "Meghalaya must not have unverified records marked REAL_HISTORICAL"
    assert real_records_by_state.get("TR", 0) == 0, "Tripura must not have unverified records marked REAL_HISTORICAL"

    # All unverified state records must be honestly marked as CONTROLLED_DEMO
    assert demo_records_by_state.get("AR", 0) == 4
    assert demo_records_by_state.get("ML", 0) == 2
    assert demo_records_by_state.get("TR", 0) == 2


def test_citizen_media_no_hotel_images():
    """Verify citizen safe types and assets do not contain hotel/resort/non-hazard images."""
    citizen_ts_path = REPO_ROOT / "apps" / "terra-guardian-safe" / "src" / "types" / "citizen.ts"
    content = citizen_ts_path.read_text(encoding="utf-8")

    # Hotel unsplash photo ID must not appear anywhere
    assert "photo-1542314831-068cd1dbfeeb" not in content, "Hotel unsplash image found in citizen.ts!"
    assert "hotel" not in content.lower(), "Keyword 'hotel' found in citizen.ts!"
    assert "resort" not in content.lower(), "Keyword 'resort' found in citizen.ts!"

    # Must contain 4 genuine categories and GSI attribution
    assert "Real Landslide" in content
    assert "Rockfall" in content
    assert "Road Debris" in content
    assert "Crack / Slope Failure" in content
    assert "Geological Survey of India" in content
    assert "REAL_REFERENCE_MEDIA" in content
    assert "LANDSLIDE_PHOTOGRAPH" in content

    # Verify physical files exist in public/samples
    samples_dir = REPO_ROOT / "apps" / "terra-guardian-safe" / "public" / "samples"
    assert (samples_dir / "sample-landslide-nagaland.jpg").is_file()
    assert (samples_dir / "sample-rockfall-nagaland.jpg").is_file()
    assert (samples_dir / "sample-road-debris.jpg").is_file()
    assert (samples_dir / "sample-slope-crack.jpg").is_file()
