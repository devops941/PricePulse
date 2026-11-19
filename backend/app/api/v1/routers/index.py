from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.dependencies import get_current_user, require_roles
from app.core.errors import AppException
from app.analytics.index import build_full_series, FORMULA_VERSION
from app.repositories.all_repositories import (
    IndexRunRepository,
    BasketRepository,
    PriceRepository,
    ItemRepository,
    MarketRepository,
    CategoryRepository,
    AnomalyRepository,
    AuditRepository
)
from app.schemas.index import (
    IndexRunCreate,
    IndexRunOut,
    DashboardSummaryOut,
    DashboardMoversOut,
    MoverItem
)

router = APIRouter(tags=["Index Engine & Calculations"])


@router.post("/index/runs", response_model=IndexRunOut)
def run_index_calculation(
    req: IndexRunCreate,
    current_user: dict = Depends(require_roles("Admin", "Analyst"))
):
    """
    Executes Python index maths (§5) on stored price observations and active basket version.
    Persists reproducible run into index_runs collection.
    """
    basket_repo = BasketRepository()
    if req.basket_version_id:
        basket = basket_repo.get_by_id(req.basket_version_id)
    else:
        basket = basket_repo.get_active_basket()

    if not basket:
        raise AppException(
            code="NO_BASKET",
            message="No active basket version found. Please configure a basket version in Admin.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    # Fetch price observations
    price_repo = PriceRepository()
    query = {"status": {"$in": ["valid", "imputed"]}}
    if req.market_ids:
        query["market_id"] = {"$in": req.market_ids}

    all_obs = price_repo.find(query, sort=[("date", 1)], limit=20000)
    if not all_obs:
        raise AppException(
            code="NO_PRICE_DATA",
            message="No valid price observations found to calculate index.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    # Group observations by period_key (e.g. 2026-W40)
    period_groups = {}
    for obs in all_obs:
        pk = obs.get("period_key") or obs["date"][:7]
        if pk not in period_groups:
            period_groups[pk] = []
        period_groups[pk].append(obs)

    # Categories cache
    cats = {c["id"]: c["name"] for c in CategoryRepository().find({})}
    items_cat = {i["id"]: cats.get(i.get("category_id", ""), "General") for i in ItemRepository().find({})}

    # Run Python index engine
    series_result = build_full_series(
        period_observations=period_groups,
        base_period_key=basket.get("base_period", "2025-W40"),
        basket_lines=basket["lines"],
        categories_map=items_cat,
        aggregation_method=req.aggregation_method,
        frequency=req.frequency
    )

    run_payload = {
        "basket_version_id": basket["id"],
        "basket_name": basket["name"],
        "formula_version": FORMULA_VERSION,
        "frequency": req.frequency,
        "aggregation_method": req.aggregation_method,
        "filters": {
            "market_ids": req.market_ids,
            "start_period": req.start_period,
            "end_period": req.end_period
        },
        "series": series_result["series"],
        "contributions": series_result["contributions"],
        "base_prices": series_result.get("base_prices", {}),
        "created_by": current_user["email"],
    }

    run_repo = IndexRunRepository()
    created_run = run_repo.insert(run_payload)

    AuditRepository().log_event(
        actor=current_user["email"],
        action="INDEX_RUN_EXECUTED",
        resource=f"index_runs/{created_run['id']}",
        metadata={"periods_count": len(series_result["series"]), "basket_id": basket["id"]}
    )

    return created_run


@router.get("/index/runs", response_model=List[IndexRunOut])
def list_index_runs(limit: int = 20):
    return IndexRunRepository().find({}, sort=[("created_at", -1)], limit=limit)


@router.get("/index/runs/{run_id}", response_model=IndexRunOut)
def get_index_run(run_id: str):
    run = IndexRunRepository().get_by_id(run_id)
    if not run:
        raise AppException(code="NOT_FOUND", message="Index run not found", status_code=404)
    return run


@router.get("/index/runs/{run_id}/contributions")
def get_run_contributions(run_id: str, period: Optional[str] = None):
    run = IndexRunRepository().get_by_id(run_id)
    if not run:
        raise AppException(code="NOT_FOUND", message="Index run not found", status_code=404)

    contribs = run.get("contributions", {})
    if not contribs:
        return {"period": period, "contributions": []}

    target_period = period or sorted(contribs.keys())[-1]
    period_contrib = contribs.get(target_period, {})

    # Attach item details for waterfall chart
    items_cache = {i["id"]: i for i in ItemRepository().find({})}
    cats_cache = {c["id"]: c["name"] for c in CategoryRepository().find({})}

    out_list = []
    for item_id, c in period_contrib.items():
        it = items_cache.get(item_id, {})
        out_list.append({
            "item_id": item_id,
            "item_name": it.get("name", item_id),
            "category_name": cats_cache.get(it.get("category_id", ""), "General"),
            "points": round(c.get("points", 0.0), 3),
            "percent": round(c.get("percent", 0.0), 2),
            "weight": round(c.get("weight", 0.0), 3),
            "relative_current": round(c.get("relative_current", 1.0), 3),
            "relative_prev": round(c.get("relative_prev", 1.0), 3)
        })

    out_list.sort(key=lambda x: abs(x["points"]), reverse=True)
    return {
        "period": target_period,
        "run_id": run_id,
        "contributions": out_list
    }


# ----------------- DASHBOARD ANALYTICS -----------------
@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary():
    """Returns headline inflation summary read strictly from index_runs (§0 Rule 2, §10.6)."""
    run_repo = IndexRunRepository()
    latest_run = run_repo.get_latest_run()
    open_flags_count = AnomalyRepository().count({"status": "open"})

    # Check last observation freshness
    latest_obs = PriceRepository().find({}, sort=[("date", -1)], limit=1)
    days_since = 0
    obs_date = None
    if latest_obs:
        obs_date = latest_obs[0].get("date_observed") or latest_obs[0].get("date")
        if obs_date:
            try:
                d = datetime.strptime(obs_date, "%Y-%m-%d").date()
                days_since = (datetime.now(timezone.utc).date() - d).days
            except Exception:
                days_since = 0

    if not latest_run or not latest_run.get("series"):
        # Return base placeholder if no run has been executed yet
        return DashboardSummaryOut(
            run_id=None,
            period="No Run",
            headline_yoy=0.0,
            mom=0.0,
            coverage=0.0,
            basket_cost=0.0,
            purchasing_power_100=100.0,
            open_flags_count=open_flags_count,
            data_freshness_days=days_since,
            latest_observation_date=obs_date,
            basket_version_name="No Active Basket",
            has_data=False
        )

    series = latest_run["series"]
    latest_pt = series[-1]

    return DashboardSummaryOut(
        run_id=latest_run["id"],
        period=latest_pt["period"],
        headline_yoy=latest_pt.get("yoy") if latest_pt.get("yoy") is not None else latest_pt["mom"],
        mom=latest_pt["mom"],
        coverage=latest_pt["coverage"],
        basket_cost=latest_pt["basket_cost"],
        purchasing_power_100=latest_pt["purchasing_power_100"],
        open_flags_count=open_flags_count,
        data_freshness_days=days_since,
        latest_observation_date=obs_date,
        basket_version_name=latest_run.get("basket_name", "Official Basket"),
        has_data=True
    )


@router.get("/dashboard/movers", response_model=DashboardMoversOut)
def get_dashboard_movers():
    """Returns top movers (risers and fallers) for the latest period (§10.6)."""
    run_repo = IndexRunRepository()
    latest_run = run_repo.get_latest_run()
    
    if not latest_run or not latest_run.get("contributions"):
        # Return fallback items
        return DashboardMoversOut(
            period="Latest Period",
            top_risers=[],
            top_fallers=[]
        )

    contribs = latest_run["contributions"]
    latest_period = sorted(contribs.keys())[-1]
    p_contrib = contribs[latest_period]

    items_cache = {i["id"]: i for i in ItemRepository().find({})}
    cats_cache = {c["id"]: c["name"] for c in CategoryRepository().find({})}

    base_prices = latest_run.get("base_prices", {})
    movers = []
    for item_id, c in p_contrib.items():
        it = items_cache.get(item_id, {})
        rel_curr = c.get("relative_current", 1.0)
        rel_prev = c.get("relative_prev", 1.0)
        chg_pct = round(((rel_curr / rel_prev) - 1.0) * 100.0, 2) if rel_prev > 0 else 0.0
        p0 = float(base_prices.get(item_id) or it.get("base_price", 40.0))

        movers.append(MoverItem(
            item_id=item_id,
            item_name=it.get("name", item_id),
            category_name=cats_cache.get(it.get("category_id", ""), "General"),
            current_price=round(rel_curr * p0, 2),
            prev_price=round(rel_prev * p0, 2),
            change_pct=chg_pct,
            points_contribution=round(c.get("points", 0.0), 3),
            canonical_unit=it.get("canonical_unit", "kg")
        ))

    risers = [m for m in movers if m.change_pct > 0]
    risers.sort(key=lambda x: x.change_pct, reverse=True)

    fallers = [m for m in movers if m.change_pct < 0]
    fallers.sort(key=lambda x: x.change_pct)

    return DashboardMoversOut(
        period=latest_period,
        top_risers=risers[:6],
        top_fallers=fallers[:6]
    )
