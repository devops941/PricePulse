import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.repositories.all_repositories import ReportRepository, IndexRunRepository

client = TestClient(create_app())


def test_create_bulletin_report():
    report_repo = ReportRepository()
    report_repo.collection.delete_many({})

    res = client.post("/api/v1/reports", json={
        "template": "monthly",
        "period": "2025-W04",
        "title": "January 2025 Test Bulletin"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["template"] == "monthly"
    assert data["period"] == "2025-W04"
    assert "id" in data
    assert data["pdf_size_bytes"] > 1000

    rep_id = data["id"]

    # Test list reports
    res_list = client.get("/api/v1/reports")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # Test download PDF
    res_dl = client.get(f"/api/v1/reports/{rep_id}/download")
    assert res_dl.status_code == 200
    assert res_dl.headers["content-type"] == "application/pdf"
    assert len(res_dl.content) > 1000
    # PDF starts with %PDF-
    assert res_dl.content.startswith(b"%PDF-")

    # Test publish to landing
    res_pub = client.post(f"/api/v1/reports/{rep_id}/publish")
    assert res_pub.status_code == 200

    # Test published landing bulletin endpoint
    res_land = client.get("/api/v1/reports/landing/published")
    assert res_land.status_code == 200
    assert res_land.json()["period"] == "2025-W04"
