"""Unit tests for FastAPI health endpoint."""

from fastapi.testclient import TestClient
from app.main import create_app


def test_health_endpoint():
    app = create_app()
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "terraguardian-api"
    assert data["database"] == "ok"
    assert data["version"] == "0.0.1"
    assert "environment" in data

    # Verify /api/v1/health prefix routing
    v1_response = client.get("/api/v1/health")
    assert v1_response.status_code == 200
    v1_data = v1_response.json()
    assert v1_data["status"] == "ok"
    assert v1_data["database"] == "ok"

