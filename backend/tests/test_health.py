import os
import pytest
from fastapi.testclient import TestClient

# Set valid test environment variables before importing app
os.environ["MONGODB_URI"] = "mongodb+srv://testuser:testpass@cluster.mongodb.net/pricepulse_test"
os.environ["JWT_SECRET"] = "super-secure-test-jwt-secret-key-12345"
os.environ["APP_ENV"] = "test"
os.environ["TESTING"] = "true"
os.environ["USE_MOCK_DB"] = "true"

from app.main import create_app

@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "PricePulse"
    assert data["version"] == "1.0.0"

def test_standard_404_error_contract(client):
    response = client.get("/api/v1/nonexistent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert isinstance(data["error"]["details"], list)
