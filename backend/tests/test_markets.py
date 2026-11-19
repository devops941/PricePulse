import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.repositories.all_repositories import (
    MarketRepository,
    ItemRepository,
    PriceRepository,
    BasketRepository,
    CategoryRepository
)

client = TestClient(create_app())


@pytest.fixture(autouse=True)
def setup_market_data():
    market_repo = MarketRepository()
    item_repo = ItemRepository()
    price_repo = PriceRepository()
    cat_repo = CategoryRepository()
    basket_repo = BasketRepository()

    # Clear test collections
    market_repo.collection.delete_many({})
    item_repo.collection.delete_many({})
    price_repo.collection.delete_many({})
    cat_repo.collection.delete_many({})
    basket_repo.collection.delete_many({})

    cat = cat_repo.insert({"name": "Vegetables", "code": "veg", "display_order": 1})

    m1 = market_repo.insert({"name": "Wholesale Market", "district": "Central", "market_type": "wholesale", "active": True})
    m2 = market_repo.insert({"name": "Retail Bazaar", "district": "North", "market_type": "retail", "active": True})

    it1 = item_repo.insert({"name": "Tomato", "category_id": cat["id"], "canonical_unit": "kg", "plausible_min": 5, "plausible_max": 200, "active": True})
    it2 = item_repo.insert({"name": "Potato", "category_id": cat["id"], "canonical_unit": "kg", "plausible_min": 5, "plausible_max": 200, "active": True})

    basket_repo.insert({
        "version": "v1.0",
        "base_period": "2025-W01",
        "status": "active",
        "items": [
            {"item_id": it1["id"], "weight": 0.6},
            {"item_id": it2["id"], "weight": 0.4}
        ]
    })

    # Prices for period 2025-W04
    price_repo.insert({
        "item_id": it1["id"],
        "market_id": m1["id"],
        "price": 20.0,
        "normalized_price": 20.0,
        "period": "2025-W04",
        "date_observed": "2025-01-24",
        "status": "approved"
    })
    price_repo.insert({
        "item_id": it1["id"],
        "market_id": m2["id"],
        "price": 30.0,
        "normalized_price": 30.0,
        "period": "2025-W04",
        "date_observed": "2025-01-24",
        "status": "approved"
    })
    price_repo.insert({
        "item_id": it2["id"],
        "market_id": m1["id"],
        "price": 15.0,
        "normalized_price": 15.0,
        "period": "2025-W04",
        "date_observed": "2025-01-24",
        "status": "approved"
    })
    price_repo.insert({
        "item_id": it2["id"],
        "market_id": m2["id"],
        "price": 25.0,
        "normalized_price": 25.0,
        "period": "2025-W04",
        "date_observed": "2025-01-24",
        "status": "approved"
    })


def test_markets_compare_endpoint():
    res = client.get("/api/v1/markets/compare?period=2025-W04")
    assert res.status_code == 200
    data = res.json()
    assert data["period"] == "2025-W04"
    assert len(data["cheapest_ranking"]) == 2
    # Wholesale market should be cheapest
    assert data["cheapest_ranking"][0]["market_name"] == "Wholesale Market"
    assert data["cheapest_ranking"][0]["rank"] == 1
    assert data["cheapest_ranking"][0]["diff_from_cheapest_pct"] == 0.0
    assert data["cheapest_ranking"][1]["rank"] == 2
    assert data["cheapest_ranking"][1]["diff_from_cheapest_pct"] > 0

    # Item gaps check
    assert len(data["item_gaps"]) == 2
    tomato_gap = next(g for g in data["item_gaps"] if g["item_name"] == "Tomato")
    assert tomato_gap["min_price"] == 20.0
    assert tomato_gap["max_price"] == 30.0
    assert tomato_gap["spread_abs"] == 10.0
    assert tomato_gap["spread_pct"] == 50.0


def test_dashboard_summary_and_movers():
    res_sum = client.get("/api/v1/dashboard/summary")
    assert res_sum.status_code == 200
    data_sum = res_sum.json()
    assert "headline_yoy" in data_sum
    assert "basket_cost" in data_sum
    assert "purchasing_power_100" in data_sum

    res_mov = client.get("/api/v1/dashboard/movers")
    assert res_mov.status_code == 200
    data_mov = res_mov.json()
    assert "top_risers" in data_mov
    assert "top_fallers" in data_mov
