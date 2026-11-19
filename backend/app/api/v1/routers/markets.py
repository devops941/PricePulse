from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, Depends
from app.repositories.all_repositories import (
    MarketRepository,
    ItemRepository,
    CategoryRepository,
    PriceRepository,
    BasketRepository,
    AnomalyRepository,
    IndexRunRepository,
)

router = APIRouter(tags=["Markets & Regional Analysis"])


@router.get("/markets/compare")
def compare_markets(
    period: Optional[str] = Query(None, description="Period to compare (e.g. 2024-W52). Defaults to latest."),
    district: Optional[str] = Query(None, description="Optional district filter"),
):
    market_repo = MarketRepository()
    price_repo = PriceRepository()
    item_repo = ItemRepository()
    basket_repo = BasketRepository()
    cat_repo = CategoryRepository()

    # Get active markets
    market_query: Dict[str, Any] = {"active": True}
    if district and district.lower() != "all":
        market_query["district"] = district
    markets = market_repo.find(market_query)
    market_map = {m["id"]: m for m in markets}

    # Get all items and categories
    items = item_repo.find({"active": True})
    item_map = {it["id"]: it for it in items}
    cats = {c["id"]: c["name"] for c in cat_repo.find({})}

    # Active basket weights
    active_basket = basket_repo.get_active_basket()
    weights_map = {}
    if active_basket and ("lines" in active_basket or "items" in active_basket):
        b_lines = active_basket.get("lines") or active_basket.get("items", [])
        for b_item in b_lines:
            weights_map[b_item["item_id"]] = float(b_item.get("weight", 1.0 / max(len(items), 1)))

    # Determine available periods dynamically
    distinct_pkeys = set(price_repo.collection.distinct("period_key")) | set(price_repo.collection.distinct("period"))
    available_periods = sorted([p for p in distinct_pkeys if p])

    if not period or period.lower() == "latest":
        if available_periods:
            period = available_periods[-1]
        else:
            period = "2024-W52"

    # Fetch observations for this period
    prices = price_repo.find({
        "$or": [{"period_key": period}, {"period": period}],
        "status": {"$in": ["valid", "imputed", "flagged", "approved", "auto_approved"]},
    })

    # Group prices by market and item
    market_item_prices: Dict[str, Dict[str, float]] = {m_id: {} for m_id in market_map}
    item_market_prices: Dict[str, List[Dict[str, Any]]] = {it_id: [] for it_id in item_map}

    for p in prices:
        m_id = p.get("market_id")
        it_id = p.get("item_id")
        price_val = float(p.get("price_per_canonical_unit") or p.get("normalized_price") or p.get("price", 0.0))
        if m_id in market_item_prices and it_id in item_map:
            market_item_prices[m_id][it_id] = price_val
            item_market_prices[it_id].append({
                "market_id": m_id,
                "market_name": market_map[m_id]["name"],
                "price": price_val
            })

    # Calculate standard basket cost per market
    ranking = []
    for m_id, m_info in market_map.items():
        p_dict = market_item_prices[m_id]
        if not p_dict:
            continue
        total_cost = 0.0
        covered_weight = 0.0
        for it_id, it_info in item_map.items():
            w = weights_map.get(it_id, 1.0 / max(len(items), 1))
            if it_id in p_dict:
                total_cost += p_dict[it_id] * w * 10.0  # standard monthly scale
                covered_weight += w

        if covered_weight > 0:
            norm_cost = round(total_cost / covered_weight, 2)
        else:
            norm_cost = round(sum(p_dict.values()), 2)

        ranking.append({
            "market_id": m_id,
            "market_name": m_info["name"],
            "district": m_info.get("district", "General"),
            "market_type": m_info.get("market_type", m_info.get("type", "retail")),
            "basket_cost": norm_cost,
            "items_reported": len(p_dict),
            "total_items": len(item_map)
        })

    # Sort ranking: Rank 1 is the Cheapest Market
    ranking.sort(key=lambda x: x["basket_cost"])
    cheapest_cost = ranking[0]["basket_cost"] if ranking else 0.0
    for idx, r in enumerate(ranking):
        r["rank"] = idx + 1
        r["diff_from_cheapest_pct"] = round(
            ((r["basket_cost"] - cheapest_cost) / cheapest_cost * 100.0) if cheapest_cost > 0 else 0.0,
            1
        )

    # Dumbbell chart: price gaps per item across markets
    item_gaps = []
    for it_id, it_info in item_map.items():
        obs = item_market_prices.get(it_id, [])
        if not obs:
            continue
        sorted_obs = sorted(obs, key=lambda x: x["price"])
        min_obs = sorted_obs[0]
        max_obs = sorted_obs[-1]
        spread_abs = round(max_obs["price"] - min_obs["price"], 2)
        spread_pct = round((spread_abs / min_obs["price"] * 100.0) if min_obs["price"] > 0 else 0.0, 1)
        avg_price = round(sum(o["price"] for o in obs) / len(obs), 2)

        item_gaps.append({
            "item_id": it_id,
            "item_name": it_info["name"],
            "category_name": cats.get(it_info.get("category_id", ""), "General"),
            "unit": it_info.get("canonical_unit", "kg"),
            "min_price": min_obs["price"],
            "min_market": min_obs["market_name"],
            "max_price": max_obs["price"],
            "max_market": max_obs["market_name"],
            "spread_abs": spread_abs,
            "spread_pct": spread_pct,
            "avg_price": avg_price
        })

    item_gaps.sort(key=lambda x: x["spread_pct"], reverse=True)

    # Small multiples history: past 8 periods for each market hub
    recent_periods = available_periods[-8:] if len(available_periods) >= 8 else available_periods

    small_multiples = []
    for m_id, m_info in market_map.items():
        history = []
        for per in recent_periods:
            per_prices = price_repo.find({
                "market_id": m_id,
                "$or": [{"period_key": per}, {"period": per}],
                "status": {"$in": ["valid", "imputed", "flagged", "approved", "auto_approved"]}
            })
            if per_prices:
                c = sum(float(p.get("price_per_canonical_unit") or p.get("price", 0.0)) for p in per_prices)
                avg_c = round(c / len(per_prices), 2)
                history.append({"period": per, "basket_cost": avg_c})
            else:
                history.append({"period": per, "basket_cost": None})

        # Calculate trend % between first and last valid history
        valid_history = [h for h in history if h["basket_cost"] is not None]
        trend_pct = 0.0
        if len(valid_history) >= 2 and valid_history[0]["basket_cost"]:
            first = valid_history[0]["basket_cost"]
            last = valid_history[-1]["basket_cost"]
            trend_pct = round(((last - first) / first) * 100.0, 2)

        small_multiples.append({
            "market_id": m_id,
            "market_name": m_info["name"],
            "district": m_info.get("district", "General"),
            "market_type": m_info.get("market_type", m_info.get("type", "retail")),
            "history": history,
            "trend_pct": trend_pct
        })

    return {
        "period": period,
        "available_periods": available_periods,
        "cheapest_ranking": ranking,
        "item_gaps": item_gaps,
        "small_multiples": small_multiples
    }
