import pytest
from app.analytics.anomalies import compute_mad_zscore, detect_price_anomalies
from app.analytics.forecast import compute_metrics, generate_forecast, compute_volatility_clusters
from fastapi.testclient import TestClient
from app.main import create_app
from app.repositories.all_repositories import AnomalyRepository, PriceRepository, ItemRepository, MarketRepository, UserRepository
from app.core.security import create_access_token

client = TestClient(create_app())


def test_mad_zscore_calculation():
    # Regular values with obvious outlier
    vals = [20.0, 21.0, 19.5, 20.5, 20.0]
    outlier = 50.0
    z = compute_mad_zscore(vals, outlier)
    assert z > 3.0

    normal = 20.2
    z_norm = compute_mad_zscore(vals, normal)
    assert z_norm < 2.0


def test_anomaly_boundary_checks():
    # Negative price
    res_neg = detect_price_anomalies(-5.0, [20.0, 21.0])
    assert res_neg["is_anomaly"] is True
    assert res_neg["severity"] == "critical"

    # Beyond plausible max
    res_plausible = detect_price_anomalies(350.0, [20.0, 21.0], plausible_min=10.0, plausible_max=200.0)
    assert res_plausible["is_anomaly"] is True

    # 10x surge from previous period
    res_surge = detect_price_anomalies(250.0, [20.0, 22.0], previous_price=22.0)
    assert res_surge["is_anomaly"] is True
    assert any("EXTREME_SPIKE" in r for r in res_surge["reasons"])


def test_forecast_engine_generation():
    series = [100.0, 101.5, 102.8, 104.2, 105.0, 106.3, 107.8]
    periods = [f"2025-W{i:02d}" for i in range(1, 8)]

    fc = generate_forecast(series, periods, horizon=4)
    assert fc["selected_model"] is not None
    assert len(fc["forecast"]) == 4
    for pt in fc["forecast"]:
        # Verify 80% and 95% fan interval order: lower_95 <= lower_80 <= mean <= upper_80 <= upper_95
        assert pt["lower_95"] <= pt["lower_80"] <= pt["mean"] <= pt["upper_80"] <= pt["upper_95"]


def test_forecast_api_endpoints():
    res = client.post("/api/v1/forecasts", json={
        "target_type": "overall",
        "horizon": 3,
        "model": "auto"
    })
    assert res.status_code == 200
    data = res.json()
    assert "forecast_points" in data
    assert len(data["forecast_points"]) == 3
    assert "caveat" in data

    res_clusters = client.get("/api/v1/forecasts/clusters")
    assert res_clusters.status_code == 200
    clusters = res_clusters.json()
    assert isinstance(clusters, list)
    assert len(clusters) > 0


def test_anomaly_review_workflow():
    anomaly_repo = AnomalyRepository()
    price_repo = PriceRepository()
    user_repo = UserRepository()

    # Clear and insert test price & anomaly
    p = price_repo.insert({
        "item_id": "test_item",
        "market_id": "test_mkt",
        "price": 180.0,
        "normalized_price": 180.0,
        "period": "2025-W04",
        "status": "flagged"
    })

    a = anomaly_repo.insert({
        "price_id": p["id"],
        "item_id": "test_item",
        "market_id": "test_mkt",
        "period": "2025-W04",
        "observed_price": 180.0,
        "zscore": 4.5,
        "reasons": ["EXTREME_SPIKE"],
        "severity": "high",
        "status": "pending"
    })

    user = user_repo.insert({
        "email": "admin@pricepulse.local",
        "hashed_password": "fake",
        "role": "Admin",
        "status": "active",
        "name": "Admin Tester"
    })

    token = create_access_token({"sub": user["id"], "role": "Admin", "email": "admin@pricepulse.local"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Correct price to 40.0
    res_correct = client.patch(
        f"/api/v1/anomalies/{a['id']}",
        json={"action": "correct", "corrected_price": 40.0, "comment": "Typo in data entry"},
        headers=headers
    )
    assert res_correct.status_code == 200
    body = res_correct.json()
    assert body["success"] is True
    assert body["index_stale_warning"] is True

    # Check updated price in DB
    updated_p = price_repo.get_by_id(p["id"])
    assert updated_p["price"] == 40.0
    assert updated_p["status"] == "approved"
