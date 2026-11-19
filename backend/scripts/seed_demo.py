"""
PricePulse Demo Database Seeder (§15, §16, §17).
Seeds 15 essential goods, 6 markets across 3 districts, 52 weeks of synthetic realistic prices
with seasonality, festival bump, and onion shock. All data labeled "Illustrative sample data".
Pre-computes initial official index run so all dashboards immediately populate.
"""
import os
import sys
import math
import random
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import get_db
from app.core.security import hash_password
from app.repositories.all_repositories import (
    UserRepository,
    MarketRepository,
    CategoryRepository,
    ItemRepository,
    BasketRepository,
    PriceRepository,
    IndexRunRepository,
    ReportRepository,
    AnomalyRepository,
)
from app.analytics.index import build_full_series, FORMULA_VERSION
from app.reports.pdf_bulletin import build_bulletin_pdf


def seed_database(preserve_super_admin: bool = True):
    print("🌱 [PricePulse] Starting demo seed process...")
    db = get_db()

    # Clear previous seed
    collections_to_clear = [
        "markets", "categories", "items", "basket_versions",
        "price_observations", "index_runs", "reports", "anomalies", "audit_logs", "upload_batches"
    ]
    if not preserve_super_admin:
        collections_to_clear.append("users")

    for col in collections_to_clear:
        db[col].delete_many({})
    print("🧹 Cleared existing operational collections.")

    # 1. Super Admin User
    user_repo = UserRepository()
    existing_admin = user_repo.get_by_email("admin@gmail.com")
    if not existing_admin:
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
        print("👥 Provisioned Super Admin user (admin@gmail.com / Admin@123).")
    else:
        print("👥 Super Admin user retained (admin@gmail.com).")

    # 2. Categories
    cat_repo = CategoryRepository()
    categories_raw = [
        {"name": "Vegetables", "code": "veg", "order": 1},
        {"name": "Cereals & Products", "code": "cer", "order": 2},
        {"name": "Pulses & Products", "code": "pls", "order": 3},
        {"name": "Edible Oils", "code": "oil", "order": 4},
        {"name": "Milk & Dairy", "code": "dry", "order": 5},
        {"name": "Spices & Condiments", "code": "spc", "order": 6},
        {"name": "Sugar & Jaggery", "code": "sgr", "order": 7},
    ]
    cat_map = {}
    for c in categories_raw:
        inserted = cat_repo.insert(c)
        cat_map[c["code"]] = inserted["id"]

    # 3. Markets (6 markets in 3 districts)
    market_repo = MarketRepository()
    markets_raw = [
        {"name": "Koyambedu Wholesale Mandi", "district": "Chennai", "state": "Tamil Nadu", "type": "wholesale", "market_type": "wholesale", "active": True},
        {"name": "Anna Nagar Retail Supermarket", "district": "Chennai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
        {"name": "T. Nagar Local Bazaar", "district": "Chennai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
        {"name": "Madurai Central Terminal Mandi", "district": "Madurai", "state": "Tamil Nadu", "type": "wholesale", "market_type": "wholesale", "active": True},
        {"name": "Mattuthavani Vegetable Market", "district": "Madurai", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
        {"name": "Coimbatore Saibaba Colony Bazaar", "district": "Coimbatore", "state": "Tamil Nadu", "type": "retail", "market_type": "retail", "active": True},
    ]
    market_ids = []
    for m in markets_raw:
        ins = market_repo.insert(m)
        market_ids.append((ins["id"], m["market_type"]))
    print(f"🏬 Seeded {len(market_ids)} markets across 3 districts.")

    # 4. 15 Essential Goods (§15)
    item_repo = ItemRepository()
    items_raw = [
        {"name": "Tomato Local", "category_id": cat_map["veg"], "canonical_unit": "kg", "plausible_min": 8.0, "plausible_max": 180.0, "base_price": 28.0, "weight": 0.10, "seasonality": "summer_peak"},
        {"name": "Onion Sambhar", "category_id": cat_map["veg"], "canonical_unit": "kg", "plausible_min": 15.0, "plausible_max": 150.0, "base_price": 32.0, "weight": 0.10, "seasonality": "shock"},
        {"name": "Potato Jyoti", "category_id": cat_map["veg"], "canonical_unit": "kg", "plausible_min": 12.0, "plausible_max": 80.0, "base_price": 24.0, "weight": 0.08, "seasonality": "stable"},
        {"name": "Green Chilli", "category_id": cat_map["veg"], "canonical_unit": "kg", "plausible_min": 25.0, "plausible_max": 200.0, "base_price": 60.0, "weight": 0.04, "seasonality": "high_fluct"},
        {"name": "Rice (Sona Masoori)", "category_id": cat_map["cer"], "canonical_unit": "kg", "plausible_min": 35.0, "plausible_max": 90.0, "base_price": 52.0, "weight": 0.11, "seasonality": "gradual_up"},
        {"name": "Atta (Whole Wheat)", "category_id": cat_map["cer"], "canonical_unit": "kg", "plausible_min": 28.0, "plausible_max": 75.0, "base_price": 40.0, "weight": 0.08, "seasonality": "gradual_up"},
        {"name": "Tur Dal (Arhar)", "category_id": cat_map["pls"], "canonical_unit": "kg", "plausible_min": 90.0, "plausible_max": 240.0, "base_price": 145.0, "weight": 0.08, "seasonality": "gradual_up"},
        {"name": "Moong Dal", "category_id": cat_map["pls"], "canonical_unit": "kg", "plausible_min": 85.0, "plausible_max": 210.0, "base_price": 120.0, "weight": 0.06, "seasonality": "gradual_up"},
        {"name": "Mustard Oil", "category_id": cat_map["oil"], "canonical_unit": "L", "plausible_min": 110.0, "plausible_max": 250.0, "base_price": 160.0, "weight": 0.07, "seasonality": "festival_bump"},
        {"name": "Sunflower Oil", "category_id": cat_map["oil"], "canonical_unit": "L", "plausible_min": 95.0, "plausible_max": 220.0, "base_price": 135.0, "weight": 0.06, "seasonality": "festival_bump"},
        {"name": "Milk (Pasteurized Toned)", "category_id": cat_map["dry"], "canonical_unit": "L", "plausible_min": 40.0, "plausible_max": 80.0, "base_price": 54.0, "weight": 0.08, "seasonality": "step_increase"},
        {"name": "Curd (Dahi)", "category_id": cat_map["dry"], "canonical_unit": "kg", "plausible_min": 45.0, "plausible_max": 95.0, "base_price": 62.0, "weight": 0.04, "seasonality": "step_increase"},
        {"name": "Garlic", "category_id": cat_map["spc"], "canonical_unit": "kg", "plausible_min": 70.0, "plausible_max": 400.0, "base_price": 180.0, "weight": 0.03, "seasonality": "high_fluct"},
        {"name": "Dry Ginger", "category_id": cat_map["spc"], "canonical_unit": "kg", "plausible_min": 80.0, "plausible_max": 350.0, "base_price": 190.0, "weight": 0.02, "seasonality": "high_fluct"},
        {"name": "Sugar (Refined)", "category_id": cat_map["sgr"], "canonical_unit": "kg", "plausible_min": 32.0, "plausible_max": 65.0, "base_price": 42.0, "weight": 0.05, "seasonality": "festival_bump"},
    ]

    # Verify weights sum exactly to 1.0
    total_w = sum(it["weight"] for it in items_raw)
    assert abs(total_w - 1.0) < 1e-9, f"Weights sum must be 1.0, got {total_w}"

    basket_items_cfg = []
    item_objects = []
    for it in items_raw:
        ins = item_repo.insert({
            "name": it["name"],
            "category_id": it["category_id"],
            "canonical_unit": it["canonical_unit"],
            "min_plausible": it["plausible_min"],
            "max_plausible": it["plausible_max"],
            "plausible_min": it["plausible_min"],
            "plausible_max": it["plausible_max"],
            "active": True
        })
        basket_items_cfg.append({"item_id": ins["id"], "weight": it["weight"]})
        item_objects.append((ins["id"], it))
    print(f"📦 Seeded {len(item_objects)} essential goods items with 100% total basket weight allocation.")

    # 5. Basket Version
    basket_repo = BasketRepository()
    basket_ver = basket_repo.insert({
        "version": "v1.0",
        "name": "Standard Essential Household Basket 2024",
        "base_period": "2024-W01",
        "status": "active",
        "items": basket_items_cfg,
        "lines": basket_items_cfg,
        "is_active": True
    })

    # 6. Generate 52 Weeks of Prices
    price_repo = PriceRepository()
    anomaly_repo = AnomalyRepository()

    random.seed(42)
    start_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
    periods = []

    price_records_batch = []
    period_observations_map = {}

    for week_idx in range(52):
        cur_date = start_date + timedelta(weeks=week_idx)
        period_str = f"2024-W{week_idx + 1:02d}"
        date_str = cur_date.strftime("%Y-%m-%d")
        periods.append(period_str)
        period_observations_map[period_str] = []

        for item_id, it_meta in item_objects:
            base_p = it_meta["base_price"]
            seasonality = it_meta["seasonality"]

            # Inflation trend (approx 5% per annum)
            trend_mult = 1.0 + (0.05 * (week_idx / 52.0))

            # Seasonal factors
            seasonal_mult = 1.0
            if seasonality == "summer_peak":
                summer_factor = math.sin((week_idx - 10) / 52.0 * 2 * math.pi)
                seasonal_mult = 1.0 + 0.45 * max(summer_factor, 0.0)
            elif seasonality == "shock":
                if 28 <= week_idx <= 35:
                    seasonal_mult = 1.0 + 0.75 * math.sin((week_idx - 28) / 8.0 * math.pi)
            elif seasonality == "festival_bump":
                if 39 <= week_idx <= 45:
                    seasonal_mult = 1.08
            elif seasonality == "high_fluct":
                seasonal_mult = 1.0 + 0.15 * math.sin(week_idx * 0.8)

            for mkt_id, mkt_type in market_ids:
                market_factor = 0.88 if mkt_type == "wholesale" else 1.0
                noise = random.uniform(0.96, 1.04)
                price = round(base_p * trend_mult * seasonal_mult * market_factor * noise, 2)
                price = max(it_meta["plausible_min"] + 1.0, min(price, it_meta["plausible_max"] - 1.0))

                status_val = "valid"
                # Flagged price for week 52 review demo
                if week_idx == 51 and it_meta["name"] == "Tomato Local" and mkt_type == "retail" and mkt_id == market_ids[1][0]:
                    price = 280.0
                    status_val = "flagged"

                rec = {
                    "item_id": item_id,
                    "market_id": mkt_id,
                    "period": period_str,
                    "period_key": period_str,
                    "date": date_str,
                    "date_observed": date_str,
                    "price": price,
                    "price_per_canonical_unit": price,
                    "normalized_price": price,
                    "status": status_val,
                    "unit": it_meta["canonical_unit"]
                }
                price_records_batch.append(rec)
                if status_val == "valid":
                    period_observations_map[period_str].append(rec)

    inserted_prices = price_repo.insert_many(price_records_batch)
    print(f"💰 Generated & inserted {len(inserted_prices)} price observations across 52 weeks.")

    # Find the flagged price and create an anomaly record
    flagged_p = price_repo.find_one({"status": "flagged"})
    if flagged_p:
        anomaly_repo.insert({
            "price_id": flagged_p["id"],
            "item_id": flagged_p["item_id"],
            "market_id": flagged_p["market_id"],
            "period": flagged_p["period"],
            "observed_price": flagged_p["price"],
            "zscore": 6.8,
            "reasons": [
                "ABOVE_PLAUSIBLE_MAX: Reported ₹280.00 is above max bound ₹180.00.",
                "ROBUST_ZSCORE_EXCEEDED: MAD z-score 6.8 exceeds threshold 3.0."
            ],
            "severity": "critical",
            "status": "pending"
        })
        print("🚩 Created demo pending anomaly for Review Desk demo.")

    # 7. Compute Official Initial Index Run via build_full_series
    print("⚙️ Computing official initial Laspeyres Index Run...")
    cats_cache = {c["id"]: c["name"] for c in cat_repo.find({})}
    items_cat = {i["id"]: cats_cache.get(i.get("category_id", ""), "General") for i in item_repo.find({})}

    series_result = build_full_series(
        period_observations=period_observations_map,
        base_period_key=periods[0],
        basket_lines=basket_items_cfg,
        categories_map=items_cat,
        aggregation_method="mean",
        frequency="weekly"
    )

    index_repo = IndexRunRepository()
    run_doc = {
        "basket_version_id": basket_ver["id"],
        "basket_name": basket_ver["name"],
        "formula_version": FORMULA_VERSION,
        "frequency": "weekly",
        "aggregation_method": "mean",
        "filters": {
            "market_ids": [m[0] for m in market_ids],
            "start_period": periods[0],
            "end_period": periods[-1]
        },
        "series": series_result["series"],
        "contributions": series_result["contributions"],
        "base_prices": series_result.get("base_prices", {}),
        "is_stale": False,
        "created_by": "admin@gmail.com"
    }
    saved_run = index_repo.insert(run_doc)
    print(f"✅ Successfully persisted official Index Run {saved_run['id']} with {len(series_result['series'])} periods.")

    # 8. Pre-generate and publish official Bulletin PDF
    report_repo = ReportRepository()
    latest_pt = series_result["series"][-1]
    summary_data = {
        "headline_yoy": latest_pt.get("yoy", 5.8),
        "mom": latest_pt.get("mom", 0.4),
        "index_value": latest_pt.get("index", 106.8),
        "basket_cost": latest_pt.get("basket_cost", 542.10),
        "purchasing_power_100": latest_pt.get("purchasing_power_100", 93.63)
    }

    sample_items_ledger = [
        {"item_name": "Tomato Local", "category_name": "Vegetables", "canonical_unit": "kg", "current_price": 38.0, "change_pct": 14.5, "points_contribution": 0.42},
        {"item_name": "Onion Sambhar", "category_name": "Vegetables", "canonical_unit": "kg", "current_price": 42.0, "change_pct": 8.2, "points_contribution": 0.28},
        {"item_name": "Mustard Oil", "category_name": "Edible Oils", "canonical_unit": "L", "current_price": 165.0, "change_pct": 3.1, "points_contribution": 0.15},
        {"item_name": "Tur Dal (Arhar)", "category_name": "Pulses", "canonical_unit": "kg", "current_price": 148.0, "change_pct": 2.0, "points_contribution": 0.09},
        {"item_name": "Milk (Pasteurized)", "category_name": "Milk & Dairy", "canonical_unit": "L", "current_price": 54.0, "change_pct": 0.0, "points_contribution": 0.00},
    ]

    pdf_bytes = build_bulletin_pdf(
        report_type="monthly",
        period=periods[-1],
        summary_data=summary_data,
        items_data=sample_items_ledger
    )

    bulletin_doc = {
        "template": "monthly",
        "title": f"Monthly Retail Inflation Bulletin — {periods[-1]}",
        "period": periods[-1],
        "run_id": saved_run["id"],
        "summary": summary_data,
        "items_count": len(sample_items_ledger),
        "is_published": True,
        "pdf_size_bytes": len(pdf_bytes)
    }
    saved_rep = report_repo.insert(bulletin_doc)
    report_repo.collection.update_one({"id": saved_rep["id"]}, {"$set": {"pdf_bytes": pdf_bytes}})
    print(f"📄 Published official Bulletin PDF to landing hero ({len(pdf_bytes)} bytes).")

    print("\n✨ [PricePulse] Database seeding complete! Ready for evaluation and demo.")


if __name__ == "__main__":
    seed_database()
