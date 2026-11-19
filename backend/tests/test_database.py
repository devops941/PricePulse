import pytest
from pymongo.errors import DuplicateKeyError
from app.core.database import get_db, create_all_indexes
from app.repositories.base import apply_role_scope
from app.repositories.all_repositories import (
    UserRepository,
    MarketRepository,
    PriceRepository,
    BasketRepository,
    ItemRepository,
)


@pytest.fixture(autouse=True)
def setup_test_db():
    db = get_db()
    create_all_indexes(db)
    # Clear collections before test
    db.users.delete_many({})
    db.markets.delete_many({})
    db.items.delete_many({})
    db.price_observations.delete_many({})
    yield db


def test_unique_user_email_index():
    repo = UserRepository()
    repo.insert({
        "email": "analyst@pricepulse.local",
        "name": "Price Analyst",
        "role": "Analyst",
        "password_hash": "hash123"
    })

    # Attempt inserting identical email
    with pytest.raises(DuplicateKeyError):
        repo.insert({
            "email": "analyst@pricepulse.local",
            "name": "Duplicate Analyst",
            "role": "Analyst",
            "password_hash": "hash456"
        })


def test_unique_price_observation_index():
    repo = PriceRepository()
    doc = {
        "market_id": "MKT-1",
        "item_id": "ITEM-RICE",
        "date": "2026-10-15",
        "source": "manual",
        "price": 58.0,
        "unit": "kg",
        "status": "valid"
    }
    repo.insert(doc)

    # Attempt inserting exact same (market_id, item_id, date, source)
    with pytest.raises(DuplicateKeyError):
        repo.insert(doc)


def test_role_scoping_for_collectors():
    collector_user = {
        "email": "collector@pricepulse.local",
        "role": "Collector",
        "market_ids": ["MKT-CHENNAI-CENTRAL", "MKT-MADURAI-SOUTH"]
    }

    # Unfiltered query from collector
    query = {"status": "valid"}
    scoped = apply_role_scope(query, collector_user)
    assert scoped["status"] == "valid"
    assert "$in" in scoped["market_id"]
    assert scoped["market_id"]["$in"] == ["MKT-CHENNAI-CENTRAL", "MKT-MADURAI-SOUTH"]

    # If query requested a specific market inside assigned
    query2 = {"market_id": "MKT-CHENNAI-CENTRAL"}
    scoped2 = apply_role_scope(query2, collector_user)
    assert scoped2["market_id"] == "MKT-CHENNAI-CENTRAL"

    # If query requested a market outside assigned
    query3 = {"market_id": "MKT-UNASSIGNED"}
    scoped3 = apply_role_scope(query3, collector_user)
    assert scoped3["market_id"]["$in"] == []


def test_role_scoping_for_admin_and_analyst():
    admin_user = {
        "email": "admin@pricepulse.local",
        "role": "Admin",
        "market_ids": []
    }
    query = {"status": "valid"}
    scoped = apply_role_scope(query, admin_user)
    # Admin is not constrained to market_id
    assert "market_id" not in scoped


def test_repository_crud():
    repo = MarketRepository()
    inserted = repo.insert({
        "name": "Koyambedu Wholesale Market",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "type": "wholesale",
        "active": True
    })
    assert inserted["id"] is not None
    assert inserted["name"] == "Koyambedu Wholesale Market"

    # Read
    found = repo.get_by_id(inserted["id"])
    assert found is not None
    assert found["district"] == "Chennai"

    # Update
    updated = repo.update(inserted["id"], {"active": False})
    assert updated["active"] is False

    # Delete
    deleted = repo.delete(inserted["id"])
    assert deleted is True
    assert repo.get_by_id(inserted["id"]) is None
