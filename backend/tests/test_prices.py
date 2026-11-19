from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.core.database import get_db, create_all_indexes
from app.core.security import hash_password
from app.repositories.all_repositories import (
    UserRepository,
    MarketRepository,
    ItemRepository,
    PriceRepository,
    AnomalyRepository
)


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def setup_prices_db():
    db = get_db()
    create_all_indexes(db)
    db.users.delete_many({})
    db.markets.delete_many({})
    db.items.delete_many({})
    db.price_observations.delete_many({})
    db.anomalies.delete_many({})

    user_repo = UserRepository()
    market_repo = MarketRepository()
    item_repo = ItemRepository()

    # Markets
    m1 = market_repo.insert({"name": "Chennai Market", "district": "Chennai", "state": "TN", "type": "retail", "active": True})
    m2 = market_repo.insert({"name": "Madurai Market", "district": "Madurai", "state": "TN", "type": "retail", "active": True})

    # Items (Rice canonical kg, min 30, max 100)
    it1 = item_repo.insert({
        "name": "Rice (Sona Masoori)",
        "category_id": "c1",
        "canonical_unit": "kg",
        "min_plausible": 30.0,
        "max_plausible": 100.0,
        "active": True
    })

    # Users
    user_repo.insert({
        "email": "admin@pricepulse.local",
        "name": "Admin",
        "role": "Admin",
        "password_hash": hash_password("AdminPass@123"),
        "status": "active"
    })

    user_repo.insert({
        "email": "collector@pricepulse.local",
        "name": "Collector 1",
        "role": "Collector",
        "password_hash": hash_password("CollectorPass@123"),
        "status": "active",
        "market_ids": [m1["id"]] # Only assigned to Chennai
    })

    yield {
        "market_1_id": m1["id"],
        "market_2_id": m2["id"],
        "item_1_id": it1["id"]
    }


def get_token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_single_price_entry_and_unit_conversion(client, setup_prices_db):
    token = get_token(client, "admin@pricepulse.local", "AdminPass@123")
    headers = {"Authorization": f"Bearer {token}"}
    m1_id = setup_prices_db["market_1_id"]
    i1_id = setup_prices_db["item_1_id"]

    # Enter 500 g for ₹30 (Canonical is kg, so ₹60/kg)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    res = client.post("/api/v1/prices", json={
        "market_id": m1_id,
        "item_id": i1_id,
        "date": today_str,
        "price": 30.0,
        "unit": "500 g"
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["price"] == 30.0
    assert data["unit"] == "500 g"
    # Price per canonical kg should be converted (30 / 0.5 kg = 60.0)
    assert data["price_per_canonical_unit"] == 60.0
    assert data["canonical_unit"] == "kg"
    assert data["status"] == "valid"


def test_price_outlier_marks_flagged_and_creates_anomaly(client, setup_prices_db):
    token = get_token(client, "admin@pricepulse.local", "AdminPass@123")
    headers = {"Authorization": f"Bearer {token}"}
    m1_id = setup_prices_db["market_1_id"]
    i1_id = setup_prices_db["item_1_id"]

    # Price = ₹250 (Max plausible is 100)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    res = client.post("/api/v1/prices", json={
        "market_id": m1_id,
        "item_id": i1_id,
        "date": today_str,
        "price": 250.0,
        "unit": "kg"
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "flagged"
    assert "falls outside plausible bounds" in data["flag_reason"]

    # Verify routed to anomalies queue
    anomalies = AnomalyRepository().find({"observation_id": data["id"]})
    assert len(anomalies) == 1
    assert anomalies[0]["status"] == "open"


def test_future_date_rejected(client, setup_prices_db):
    token = get_token(client, "admin@pricepulse.local", "AdminPass@123")
    headers = {"Authorization": f"Bearer {token}"}
    m1_id = setup_prices_db["market_1_id"]
    i1_id = setup_prices_db["item_1_id"]

    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")
    res = client.post("/api/v1/prices", json={
        "market_id": m1_id,
        "item_id": i1_id,
        "date": future_date,
        "price": 50.0,
        "unit": "kg"
    }, headers=headers)
    assert res.status_code == 422
    assert "future" in res.json()["error"]["message"]


def test_collector_market_restriction(client, setup_prices_db):
    token = get_token(client, "collector@pricepulse.local", "CollectorPass@123")
    headers = {"Authorization": f"Bearer {token}"}
    m2_id = setup_prices_db["market_2_id"] # Collector is NOT assigned to market 2
    i1_id = setup_prices_db["item_1_id"]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    res = client.post("/api/v1/prices", json={
        "market_id": m2_id,
        "item_id": i1_id,
        "date": today_str,
        "price": 50.0,
        "unit": "kg"
    }, headers=headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN_MARKET"


def test_batch_entry_and_records_listing(client, setup_prices_db):
    token = get_token(client, "admin@pricepulse.local", "AdminPass@123")
    headers = {"Authorization": f"Bearer {token}"}
    m1_id = setup_prices_db["market_1_id"]
    m2_id = setup_prices_db["market_2_id"]
    i1_id = setup_prices_db["item_1_id"]

    res = client.post("/api/v1/prices/batch", json={
        "observations": [
            {"market_id": m1_id, "item_id": i1_id, "date": "2026-10-01", "price": 55.0, "unit": "kg"},
            {"market_id": m2_id, "item_id": i1_id, "date": "2026-10-01", "price": 58.0, "unit": "kg"},
            # Duplicate of row 1 (must be reported in errors)
            {"market_id": m1_id, "item_id": i1_id, "date": "2026-10-01", "price": 55.0, "unit": "kg"},
        ]
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["saved_count"] == 2
    assert data["rejected_count"] == 1
    assert len(data["errors"]) == 1

    # Verify listing with role scoping
    list_res = client.get("/api/v1/prices", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2
    assert list_res.json()[0]["item_name"] == "Rice (Sona Masoori)"
