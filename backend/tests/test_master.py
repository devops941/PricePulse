import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.core.database import get_db, create_all_indexes
from app.core.security import hash_password
from app.repositories.all_repositories import UserRepository, CategoryRepository, ItemRepository, BasketRepository


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def setup_master_db():
    db = get_db()
    create_all_indexes(db)
    db.users.delete_many({})
    db.markets.delete_many({})
    db.categories.delete_many({})
    db.items.delete_many({})
    db.basket_versions.delete_many({})

    # Setup admin
    UserRepository().insert({
        "email": "admin@pricepulse.local",
        "name": "Admin",
        "role": "Admin",
        "password_hash": hash_password("AdminPass@123"),
        "status": "active"
    })
    yield db


def get_admin_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@pricepulse.local",
        "password": "AdminPass@123"
    })
    return res.json()["access_token"]


def test_market_and_category_crud(client):
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create Market
    m_res = client.post("/api/v1/markets", json={
        "name": "Koyambedu Wholesale",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "type": "wholesale",
        "active": True
    }, headers=headers)
    assert m_res.status_code == 200
    market_id = m_res.json()["id"]

    # Create Category
    c_res = client.post("/api/v1/categories", json={
        "name": "Cereals",
        "color_key": "cocoa",
        "order": 1
    }, headers=headers)
    assert c_res.status_code == 200
    cat_id = c_res.json()["id"]

    # Create Item
    i_res = client.post("/api/v1/items", json={
        "name": "Rice (Sona Masoori)",
        "category_id": cat_id,
        "canonical_unit": "kg",
        "min_plausible": 30.0,
        "max_plausible": 120.0,
        "active": True
    }, headers=headers)
    assert i_res.status_code == 200
    item_id = i_res.json()["id"]

    # Verify list items includes category name
    items_res = client.get("/api/v1/items")
    assert items_res.status_code == 200
    assert len(items_res.json()) == 1
    assert items_res.json()[0]["category_name"] == "Cereals"


def test_invalid_item_plausible_range(client):
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # min_plausible >= max_plausible must fail validation
    res = client.post("/api/v1/items", json={
        "name": "Invalid Item",
        "category_id": "cat-1",
        "canonical_unit": "kg",
        "min_plausible": 100.0,
        "max_plausible": 50.0,
        "active": True
    }, headers=headers)
    assert res.status_code == 422


def test_basket_weight_sum_validation(client):
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Weight sum = 0.5 (must be rejected)
    bad_res = client.post("/api/v1/basket-versions", json={
        "name": "Incomplete Basket",
        "base_period": "2025-10",
        "frequency": "monthly",
        "effective_from": "2026-01-01",
        "lines": [
            {"item_id": "item-1", "weight": 0.5, "base_quantity": 10.0}
        ]
    }, headers=headers)
    assert bad_res.status_code == 422

    # Weight sum = 1.0 (must succeed)
    good_res = client.post("/api/v1/basket-versions", json={
        "name": "Balanced Basket v1",
        "base_period": "2025-10",
        "frequency": "monthly",
        "effective_from": "2026-01-01",
        "lines": [
            {"item_id": "item-1", "weight": 0.6, "base_quantity": 10.0},
            {"item_id": "item-2", "weight": 0.4, "base_quantity": 5.0}
        ]
    }, headers=headers)
    assert good_res.status_code == 200
    basket_1_id = good_res.json()["id"]

    # Activate basket 1
    act_1 = client.post(f"/api/v1/basket-versions/{basket_1_id}/activate", headers=headers)
    assert act_1.status_code == 200
    assert act_1.json()["status"] == "active"

    # Create basket 2
    b2_res = client.post("/api/v1/basket-versions", json={
        "name": "Balanced Basket v2",
        "base_period": "2026-10",
        "frequency": "monthly",
        "effective_from": "2026-11-01",
        "lines": [
            {"item_id": "item-1", "weight": 0.5, "base_quantity": 10.0},
            {"item_id": "item-2", "weight": 0.5, "base_quantity": 5.0}
        ]
    }, headers=headers)
    basket_2_id = b2_res.json()["id"]

    # Activate basket 2 - must archive basket 1
    act_2 = client.post(f"/api/v1/basket-versions/{basket_2_id}/activate", headers=headers)
    assert act_2.status_code == 200
    assert act_2.json()["status"] == "active"

    # Verify basket 1 is now archived
    b1_check = BasketRepository().get_by_id(basket_1_id)
    assert b1_check["status"] == "archived"
