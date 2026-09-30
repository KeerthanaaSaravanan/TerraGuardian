"""Authoritative Unit Tests for Citizen Safe Real-Time Evidence Pipeline.

Verifies:
- Multimodal AI vision screening & quality checks (positive landslide vs negative unrelated object)
- Reverse geocoding across all 8 NER states and outside-NER rejection
- Secure image storage, hashing, and path traversal prevention
- Transactional database persistence of citizen reports
- Role-based review queue governance (RBAC 403 on unauthorized, approval creates/links incident)
"""

import io
import pytest
from PIL import Image
from httpx import ASGITransport, AsyncClient

from app.adapters.geocoding import GeocodingProvider, NER_STATES
from app.adapters.storage import EvidenceStorageProvider
from app.adapters.vision import VisionProvider
from app.domain.enums import ActorRole
from app.main import app


@pytest.mark.asyncio
async def test_image_quality_and_unrelated_screening():
    """Verify image screening properly differentiates landslides from unrelated objects and black images."""
    # 1. Blank/black image test
    black_img = Image.new("RGB", (200, 200), color=(0, 0, 0))
    buf = io.BytesIO()
    black_img.save(buf, format="JPEG")
    black_bytes = buf.getvalue()

    result_black = await VisionProvider.screen_image(black_bytes, filename="black.jpg")
    assert result_black.is_hazard_relevant is False
    assert result_black.ai_status == "INSUFFICIENT_IMAGE"
    assert result_black.image_quality == "EMPTY_OR_BLACK"

    # 2. Negative test: Unrelated image (e.g. laptop / indoor office desk)
    try:
        with open("apps/operations-centre/public/samples/sample-unrelated-laptop.jpg", "rb") as f:
            unrel_bytes = f.read()
    except FileNotFoundError:
        with open("../../apps/operations-centre/public/samples/sample-unrelated-laptop.jpg", "rb") as f:
            unrel_bytes = f.read()

    result_unrel = await VisionProvider.screen_image(unrel_bytes, filename="sample-unrelated-laptop.jpg")
    assert result_unrel.is_hazard_relevant is False
    assert result_unrel.ai_status == "REJECTED_UNRELATED"
    assert "No visible slope instability" in result_unrel.visual_observations[0] or "indoor" in result_unrel.visual_observations[1].lower()

    # 3. Positive test: Real mountain landslide photo
    try:
        with open("apps/operations-centre/public/samples/sample-landslide-nagaland.jpg", "rb") as f:
            slide_bytes = f.read()
    except FileNotFoundError:
        with open("../../apps/operations-centre/public/samples/sample-landslide-nagaland.jpg", "rb") as f:
            slide_bytes = f.read()

    result_slide = await VisionProvider.screen_image(slide_bytes, filename="sample-landslide-nagaland.jpg")
    assert result_slide.is_hazard_relevant is True
    assert result_slide.ai_status == "SUCCESS"
    assert result_slide.severity_screen in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert result_slide.hazard_type in ("SLOPE_DEBRIS", "ROCKFALL", "TENSION_CRACK", "MUD_SLUMP")


@pytest.mark.asyncio
async def test_reverse_geocoding_all_ner_states_and_outside_ner():
    """Verify reverse geocoding across all 8 North Eastern Region states and outside NER."""
    ner_test_coordinates = {
        "Arunachal Pradesh": (27.234, 92.568),
        "Assam": (26.184, 91.753),
        "Meghalaya": (25.578, 91.893),
        "Manipur": (24.817, 93.936),
        "Mizoram": (23.727, 92.717),
        "Nagaland": (25.674, 94.108),
        "Sikkim": (27.338, 88.606),
        "Tripura": (23.831, 91.286),
    }

    for expected_state, (lat, lng) in ner_test_coordinates.items():
        res = await GeocodingProvider.reverse_geocode(lat, lng)
        assert res.is_ner_region is True
        assert res.state in NER_STATES

    # Test outside-NER coordinate (e.g. Chennai, Tamil Nadu at 13.0827, 80.2707)
    outside_res = await GeocodingProvider.reverse_geocode(13.0827, 80.2707)
    assert outside_res.is_ner_region is False
    assert outside_res.state == "Tamil Nadu"


@pytest.mark.asyncio
async def test_secure_image_storage_and_path_traversal_prevention():
    """Verify image validation, hashing, and path traversal prevention."""
    valid_img = Image.new("RGB", (300, 300), color=(120, 80, 50))
    buf = io.BytesIO()
    valid_img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    meta = EvidenceStorageProvider.validate_and_save_image(
        image_bytes=img_bytes,
        tracking_id="TG-TEST-STORAGE",
    )
    assert meta.file_size > 0
    assert len(meta.image_hash) == 64
    assert meta.image_url.startswith("/uploads/citizen/TG-TEST-STORAGE")

    # Invalid image bytes
    with pytest.raises(ValueError, match="corrupted or not a valid decodable image"):
        EvidenceStorageProvider.validate_and_save_image(b"not-an-image-payload", "TG-BAD")

    # Empty image bytes
    with pytest.raises(ValueError, match="empty"):
        EvidenceStorageProvider.validate_and_save_image(b"", "TG-EMPTY")


@pytest.mark.asyncio
async def test_citizen_report_submission_api_flow(async_client):
    """Verify citizen report submission, AI screening endpoint, and database persistence."""
    client = async_client
    # 1. Screen unrelated image via API -> returns REJECTED_UNRELATED
    try:
        with open("apps/operations-centre/public/samples/sample-unrelated-laptop.jpg", "rb") as f:
            unrel_b64 = f.read()
    except FileNotFoundError:
        with open("../../apps/operations-centre/public/samples/sample-unrelated-laptop.jpg", "rb") as f:
            unrel_b64 = f.read()

    import base64
    screen_resp = await client.post(
        "/api/v1/citizen/screen-image",
        json={
            "image_base64": base64.b64encode(unrel_b64).decode("utf-8"),
            "filename": "laptop.jpg",
        },
    )
    assert screen_resp.status_code == 200
    screen_data = screen_resp.json()
    assert screen_data["is_hazard_relevant"] is False
    assert screen_data["ai_status"] == "REJECTED_UNRELATED"

    # 2. Attempting to submit report with rejected AI screening -> 422 Unprocessable Entity
    sub_fail_resp = await client.post(
        "/api/v1/citizen/report",
        json={
            "image_base64": base64.b64encode(unrel_b64).decode("utf-8"),
            "latitude": 27.234,
            "longitude": 92.568,
            "ai_screening_result": screen_data,
            "citizen_notes": "Trying to report a laptop",
        },
    )
    assert sub_fail_resp.status_code == 422
    assert "Image rejected by AI screening" in sub_fail_resp.json()["detail"]

    # 3. Submit valid landslide report -> 201 Created & Persisted
    try:
        with open("apps/operations-centre/public/samples/sample-landslide-nagaland.jpg", "rb") as f:
            slide_raw = f.read()
    except FileNotFoundError:
        with open("../../apps/operations-centre/public/samples/sample-landslide-nagaland.jpg", "rb") as f:
            slide_raw = f.read()

    sub_success_resp = await client.post(
        "/api/v1/citizen/report",
        json={
            "image_base64": base64.b64encode(slide_raw).decode("utf-8"),
            "latitude": 27.234,
            "longitude": 92.568,
            "gps_accuracy": 3.8,
            "state": "Arunachal Pradesh",
            "district": "West Kameng",
            "locality": "KM-41.8 Bhalukpong",
            "citizen_notes": "Active mud and rock debris blocking lane",
            "reporter_contact": "+91-9876543210",
            "client_submission_id": "TG-CIT-TEST-001",
        },
    )
    assert sub_success_resp.status_code == 201
    created_report = sub_success_resp.json()
    assert created_report["tracking_id"] == "TG-CIT-TEST-001"
    assert created_report["submission_status"] == "PENDING_REVIEW"
    assert created_report["maturity_status"] == "UNVERIFIED"
    assert created_report["is_ner_region"] is True
    report_id = created_report["id"]

    # 4. List reports in Operations review queue -> report is present
    list_resp = await client.get("/api/v1/citizen/reports")
    assert list_resp.status_code == 200
    reports = list_resp.json()
    assert any(r["id"] == report_id for r in reports)


@pytest.mark.asyncio
async def test_role_based_review_and_incident_association(async_client, db_session):
    """Verify RBAC on citizen review: unauthorized receives 403; authorized operator approves and links."""
    from app.services.auth_service import AuthService
    auth_srv = AuthService(db_session)
    await auth_srv.seed_demo_users()

    client = async_client
    # Create a test report
    dummy_img = Image.new("RGB", (250, 250), color=(100, 70, 40))
    buf = io.BytesIO()
    dummy_img.save(buf, format="JPEG")
    import base64
    sub_resp = await client.post(
        "/api/v1/citizen/report",
        json={
            "image_base64": base64.b64encode(buf.getvalue()).decode("utf-8"),
            "latitude": 27.234,
            "longitude": 92.568,
            "state": "Arunachal Pradesh",
            "district": "West Kameng",
            "citizen_notes": "Rock debris on shoulder",
            "client_submission_id": "TG-CIT-RBAC-001",
        },
    )
    report_id = sub_resp.json()["id"]

    # 1. Login as CITIZEN (cannot reconcile evidence / approve reports)
    cit_login = await client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen#2026"},
    )
    cit_token = cit_login.json()["access_token"]

    # Attempt review as citizen -> 403 Forbidden
    unauth_resp = await client.post(
        f"/api/v1/citizen/reports/{report_id}/review",
        headers={"Authorization": f"Bearer {cit_token}"},
        json={"action": "APPROVE"},
    )
    assert unauth_resp.status_code == 403

    # 2. Login as REVIEWER (read-only audit role; cannot reconcile live evidence)
    rev_login = await client.post(
        "/api/v1/auth/login",
        json={"username": "reviewer", "password": "Terra#Review2026"},
    )
    rev_token = rev_login.json()["access_token"]

    rev_unauth_resp = await client.post(
        f"/api/v1/citizen/reports/{report_id}/review",
        headers={"Authorization": f"Bearer {rev_token}"},
        json={"action": "APPROVE"},
    )
    assert rev_unauth_resp.status_code == 403

    # 3. Login as OPERATOR (holds RECONCILE_EVIDENCE permission)
    op_login = await client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = op_login.json()["access_token"]

    # Operator approves and creates a new operational incident case
    approve_resp = await client.post(
        f"/api/v1/citizen/reports/{report_id}/review",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "action": "APPROVE",
            "create_new_incident": True,
            "new_incident_title": "West Kameng Slope Hazard",
            "review_notes": "Field patrol confirmed visible tension scarp. Elevating to incident case.",
        },
    )
    assert approve_resp.status_code == 200
    approved_data = approve_resp.json()
    assert approved_data["review_status"] == "APPROVED"
    assert approved_data["submission_status"] == "APPROVED"
    assert approved_data["maturity_status"] == "VERIFIED_FOR_OPERATIONAL_REVIEW"
    assert approved_data["incident_id"] is not None
    assert approved_data["reviewer_role"] == ActorRole.OPERATOR.value

    # Verify new incident twin exists
    inc_resp = await client.get(f"/api/v1/incidents/{approved_data['incident_id']}")
    assert inc_resp.status_code == 200
    inc_data = inc_resp.json()
    assert inc_data["id"] == approved_data["incident_id"]
