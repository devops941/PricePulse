"""
PricePulse Master Catalog Bootstrapper.
Ensures core master data (15 essential commodities, standard markets, active basket)
and Super Admin account are always available for price ingestion and index calculations.
"""
from datetime import datetime, timezone
from app.core.logging import logger
from app.core.security import hash_password
from app.repositories.all_repositories import (
    UserRepository,
    CategoryRepository,
    MarketRepository,
    ItemRepository,
    BasketRepository,
    PriceRepository,
    IndexRunRepository,
)
from app.analytics.index import build_full_series, FORMULA_VERSION


def ensure_master_catalog():
    """
    Idempotently verifies and provisions:
    1. Super Admin (admin@gmail.com / Admin@123)
    2. 7 standard categories
    3. 6 standard markets across 3 districts
    4. 15 canonical essential goods basket items with Laspeyres weights
    5. Active Basket Version (Standard Essential Household Basket)
    """
    try:
        user_repo = UserRepository()
        admin_user = user_repo.get_by_email("admin@gmail.com")
        if not admin_user:
            admin_pw = hash_password("Admin@123")
            user_repo.insert({
                "name": "Super Admin",
                "email": "admin@gmail.com",
                "password_hash": admin_pw,
                "hashed_password": admin_pw,
                "role": "Admin",
                "status": "active",
                "must_change_password": False,
                "market_ids": [],
            })
            logger.info("Provisioned Super Admin (admin@gmail.com / Admin@123)")

        cat_repo = CategoryRepository()
        existing_cats = cat_repo.find({})
        cat_map = {c.get("code"): c["id"] for c in existing_cats if "code" in c}
        if not cat_map:
            categories_raw = [
                {"name": "Vegetables", "code": "veg", "order": 1},
                {"name": "Cereals & Products", "code": "cer", "order": 2},
                {"name": "Pulses & Products", "code": "pls", "order": 3},
                {"name": "Edible Oils", "code": "oil", "order": 4},
                {"name": "Milk & Dairy", "code": "dry", "order": 5},
                {"name": "Spices & Condiments", "code": "spc", "order": 6},
                {"name": "Sugar & Jaggery", "code": "sgr", "order": 7},
            ]
            for c in categories_raw:
                ins = cat_repo.insert(c)
                cat_map[c["code"]] = ins["id"]
            logger.info("Provisioned 7 commodity categories.")

        market_repo = MarketRepository()
        existing_markets = market_repo.find({})
        if not existing_markets:
            markets_raw = [
                {"name": "Koyambedu Wholesale Mandi", "district": "Chennai", "state": "Tamil Nadu", "type": "wholesale", "market_type": "wholesale", "active": True},
                {"name": "Anna Nagar Retail Supermarket", "district": "Chennai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
                {"name": "T. Nagar Local Bazaar", "district": "Chennai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
                {"name": "Madurai Central Terminal Mandi", "district": "Madurai", "state": "Tamil Nadu", "type": "wholesale", "market_type": "wholesale", "active": True},
                {"name": "Mattuthavani Vegetable Market", "district": "Madurai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
                {"name": "Coimbatore Saibaba Colony Bazaar", "district": "Coimbatore", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
            ]
            for m in markets_raw:
                market_repo.insert(m)
            logger.info("Provisioned 6 standard markets across 3 districts.")
        else:
            for m in existing_markets:
                updates = {}
                if "state" not in m:
                    updates["state"] = "Tamil Nadu"
                if "type" not in m:
                    updates["type"] = m.get("market_type", "retail")
                if updates:
                    market_repo.update(m["id"], updates)

        item_repo = ItemRepository()
        existing_items = item_repo.find({})
        items_raw = [
            {"name": "Tomato Local", "category_code": "veg", "canonical_unit": "kg", "plausible_min": 8.0, "plausible_max": 180.0, "base_price": 28.0, "weight": 0.10},
            {"name": "Onion Sambhar", "category_code": "veg", "canonical_unit": "kg", "plausible_min": 15.0, "plausible_max": 150.0, "base_price": 32.0, "weight": 0.10},
            {"name": "Potato Jyoti", "category_code": "veg", "canonical_unit": "kg", "plausible_min": 12.0, "plausible_max": 80.0, "base_price": 24.0, "weight": 0.08},
            {"name": "Green Chilli", "category_code": "veg", "canonical_unit": "kg", "plausible_min": 25.0, "plausible_max": 200.0, "base_price": 60.0, "weight": 0.04},
            {"name": "Rice (Sona Masoori)", "category_code": "cer", "canonical_unit": "kg", "plausible_min": 35.0, "plausible_max": 90.0, "base_price": 52.0, "weight": 0.11},
            {"name": "Atta (Whole Wheat)", "category_code": "cer", "canonical_unit": "kg", "plausible_min": 28.0, "plausible_max": 75.0, "base_price": 40.0, "weight": 0.08},
            {"name": "Tur Dal (Arhar)", "category_code": "pls", "canonical_unit": "kg", "plausible_min": 90.0, "plausible_max": 240.0, "base_price": 145.0, "weight": 0.08},
            {"name": "Moong Dal", "category_code": "pls", "canonical_unit": "kg", "plausible_min": 85.0, "plausible_max": 210.0, "base_price": 120.0, "weight": 0.06},
            {"name": "Mustard Oil", "category_code": "oil", "canonical_unit": "L", "plausible_min": 110.0, "plausible_max": 250.0, "base_price": 160.0, "weight": 0.07},
            {"name": "Sunflower Oil", "category_code": "oil", "canonical_unit": "L", "plausible_min": 95.0, "plausible_max": 220.0, "base_price": 135.0, "weight": 0.06},
            {"name": "Milk (Pasteurized Toned)", "category_code": "dry", "canonical_unit": "L", "plausible_min": 40.0, "plausible_max": 80.0, "base_price": 54.0, "weight": 0.08},
            {"name": "Curd (Dahi)", "category_code": "dry", "canonical_unit": "kg", "plausible_min": 45.0, "plausible_max": 95.0, "base_price": 62.0, "weight": 0.04},
            {"name": "Garlic", "category_code": "spc", "canonical_unit": "kg", "plausible_min": 70.0, "plausible_max": 400.0, "base_price": 180.0, "weight": 0.03},
            {"name": "Dry Ginger", "category_code": "spc", "canonical_unit": "kg", "plausible_min": 80.0, "plausible_max": 350.0, "base_price": 190.0, "weight": 0.02},
            {"name": "Sugar (Refined)", "category_code": "sgr", "canonical_unit": "kg", "plausible_min": 32.0, "plausible_max": 65.0, "base_price": 42.0, "weight": 0.05},
        ]

        basket_items_cfg = []
        if not existing_items:
            for it in items_raw:
                ins = item_repo.insert({
                    "name": it["name"],
                    "category_id": cat_map.get(it["category_code"], ""),
                    "canonical_unit": it["canonical_unit"],
                    "min_plausible": it["plausible_min"],
                    "max_plausible": it["plausible_max"],
                    "plausible_min": it["plausible_min"],
                    "plausible_max": it["plausible_max"],
                    "active": True
                })
                basket_items_cfg.append({"item_id": ins["id"], "weight": it["weight"]})
            logger.info("Provisioned 15 canonical essential commodities.")
        else:
            # Ensure min_plausible and max_plausible exist on all existing items
            for it in existing_items:
                if "min_plausible" not in it and "plausible_min" in it:
                    item_repo.update(it["id"], {
                        "min_plausible": it["plausible_min"],
                        "max_plausible": it.get("plausible_max", 999.0)
                    })
            item_lookup = {i["name"]: i["id"] for i in existing_items}
            for it in items_raw:
                iid = item_lookup.get(it["name"])
                if iid:
                    basket_items_cfg.append({"item_id": iid, "weight": it["weight"]})

        basket_repo = BasketRepository()
        active_basket = basket_repo.get_active_basket()
        if not active_basket and basket_items_cfg:
            basket_repo.insert({
                "version": "v1.0",
                "name": "Standard Essential Household Basket 2024",
                "base_period": "2024-W01",
                "status": "active",
                "items": basket_items_cfg,
                "lines": basket_items_cfg,
                "is_active": True
            })
            logger.info("Provisioned active essential goods basket version v1.0.")

    except Exception as e:
        logger.error(f"Error ensuring master catalog: {e}", exc_info=True)


def trigger_index_recalculation(actor_email: str = "system") -> dict:
    """
    Runs Laspeyres Index Engine (idx-v1) across all price observations and active basket,
    persisting an active IndexRun so all dashboard charts immediately display live figures.
    """
    basket_repo = BasketRepository()
    basket = basket_repo.get_active_basket()
    if not basket:
        return {"status": "skipped", "reason": "No active basket version found"}

    price_repo = PriceRepository()
    all_obs = price_repo.find({"status": {"$in": ["valid", "imputed"]}}, sort=[("date", 1)], limit=20000)
    if not all_obs:
        return {"status": "skipped", "reason": "No valid observations"}

    # Group observations by period_key (e.g. 2024-W40)
    period_groups = {}
    for obs in all_obs:
        pk = obs.get("period_key") or obs["date"][:7]
        if pk not in period_groups:
            period_groups[pk] = []
        period_groups[pk].append(obs)

    cat_repo = CategoryRepository()
    item_repo = ItemRepository()
    cats = {c["id"]: c["name"] for c in cat_repo.find({})}
    items_cat = {i["id"]: cats.get(i.get("category_id", ""), "General") for i in item_repo.find({})}

    series_result = build_full_series(
        period_observations=period_groups,
        base_period_key=basket.get("base_period", "2024-W01"),
        basket_lines=basket.get("lines") or basket.get("items", []),
        categories_map=items_cat,
        aggregation_method="median",
        frequency="weekly"
    )

    index_repo = IndexRunRepository()
    run_doc = index_repo.insert({
        "basket_version_id": basket["id"],
        "basket_name": basket["name"],
        "formula_version": FORMULA_VERSION,
        "frequency": "weekly",
        "aggregation_method": "median",
        "filters": {"market_ids": [], "start_period": None, "end_period": None},
        "series": series_result["series"],
        "contributions": series_result["contributions"],
        "base_prices": series_result.get("base_prices", {}),
        "created_by": actor_email,
        "active": True
    })

    return {
        "status": "success",
        "run_id": run_doc["id"],
        "periods_calculated": len(series_result["series"]),
        "latest_index": series_result["series"][-1]["index_value"] if series_result["series"] else 100.0
    }
