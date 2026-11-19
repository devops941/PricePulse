import io
from datetime import datetime, timezone, timedelta
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
    UploadRepository
)


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def setup_upload_db():
    db = get_db()
    create_all_indexes(db)
    db.users.delete_many({})
    db.markets.delete_many({})
    db.items.delete_many({})
    db.price_observations.delete_many({})
    db.upload_batches.delete_many({})

    # Setup admin
    UserRepository().insert({
        "email": "admin@pricepulse.local",
        "name": "Admin",
        "role": "Admin",
        "password_hash": hash_password("AdminPass@123"),
        "status": "active"
    })

    # Setup market & item
    m = MarketRepository().insert({"name": "Chennai Market", "district": "Chennai", "state": "TN", "type": "retail", "active": True})
    it = ItemRepository().insert({
        "name": "Rice (Sona Masoori)",
        "category_id": "c1",
        "canonical_unit": "kg",
        "min_plausible": 30.0,
        "max_plausible": 100.0,
        "active": True
    })

    yield {"market": m, "item": it}


def get_token(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@pricepulse.local", "password": "AdminPass@123"})
    return res.json()["access_token"]


def test_template_and_sample_downloads(client):
    t_res = client.get("/api/v1/uploads/template")
    assert t_res.status_code == 200
    assert "market,item,date,price,unit" in t_res.text

    s_res = client.get("/api/v1/uploads/sample")
    assert s_res.status_code == 200
    assert "Illustrative sample data" in s_res.text


def test_upload_preview_and_confirm_flow(client, setup_upload_db):
    token = get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    csv_content = f"""market,item,date,price,unit,notes
Chennai Market,Rice (Sona Masoori),{today},58.00,kg,Clean row
Chennai Market,Rice (Sona Masoori),{yesterday},150.00,kg,Out of bounds jump
Unknown Market,Rice (Sona Masoori),{today},55.00,kg,Bad market row
"""
    file_bytes = csv_content.encode("utf-8")

    # Step 1: Preview
    p_res = client.post(
        "/api/v1/uploads/preview",
        files={"file": ("test_prices.csv", io.BytesIO(file_bytes), "text/csv")},
        headers=headers
    )
    assert p_res.status_code == 200
    p_data = p_res.json()
    batch_id = p_data["batch_id"]
    assert p_data["total_rows"] == 3
    assert p_data["suggested_mapping"]["market"] == "market"
    assert p_data["suggested_mapping"]["item"] == "item"

    # Step 2: Confirm
    c_res = client.post(
        f"/api/v1/uploads/{batch_id}/confirm",
        json={
            "mapping": p_data["suggested_mapping"],
            "duplicate_policy": "skip"
        },
        headers=headers
    )
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data["status"] == "confirmed"
    assert c_data["saved_count"] == 2 # Row 1 clean, Row 2 flagged (saved as flagged)
    assert c_data["flagged_count"] == 1 # Row 2 flagged
    assert c_data["rejected_count"] == 1 # Row 3 unknown market rejected
    assert c_data["has_errors"] is True

    # Step 3: Errors CSV download
    err_res = client.get(f"/api/v1/uploads/{batch_id}/errors.csv")
    assert err_res.status_code == 200
    assert "Unknown market" in err_res.text

    # Step 4: Re-uploading exact same file -> returns already_confirmed=True (idempotency)
    re_preview = client.post(
        "/api/v1/uploads/preview",
        files={"file": ("test_prices.csv", io.BytesIO(file_bytes), "text/csv")},
        headers=headers
    )
    assert re_preview.status_code == 200
    assert re_preview.json()["already_confirmed"] is True
