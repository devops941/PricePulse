import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pymongo.errors import DuplicateKeyError
from app.core.dependencies import get_current_user, require_roles
from app.core.errors import AppException
from app.ingestion.validators import validate_price_observation, convert_to_canonical_unit
from app.repositories.all_repositories import (
    PriceRepository,
    MarketRepository,
    ItemRepository,
    AnomalyRepository,
    AuditRepository
)
from app.schemas.prices import (
    PriceCreate,
    PriceBatchCreate,
    PriceObservationOut,
    PriceBatchResult,
    PriceUpdateAudit
)

router = APIRouter(prefix="/prices", tags=["Price Observations"])


@router.post("", response_model=PriceObservationOut)
def record_single_price(
    data: PriceCreate,
    current_user: dict = Depends(require_roles("Admin", "Analyst", "Collector"))
):
    # Role guard check: If Collector, ensure market_id is in their assigned markets (§3)
    if current_user.get("role") == "Collector":
        assigned = current_user.get("market_ids", [])
        if data.market_id not in assigned:
            raise AppException(
                code="FORBIDDEN_MARKET",
                message=f"You are not assigned to collect prices for market '{data.market_id}'",
                status_code=status.HTTP_403_FORBIDDEN
            )

    try:
        validated = validate_price_observation(data.model_dump())
    except ValueError as e:
        raise AppException(
            code="VALIDATION_FAILED",
            message=str(e),
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    validated["entered_by"] = current_user["email"]

    price_repo = PriceRepository()
    try:
        created = price_repo.insert(validated)
    except DuplicateKeyError:
        raise AppException(
            code="DUPLICATE_OBSERVATION",
            message=f"A price observation already exists for this market, item, date and source ({data.market_id}, {data.item_id}, {data.date})",
            status_code=status.HTTP_409_CONFLICT
        )

    # If flagged, automatically route to anomalies queue for Review Desk (§4, §11)
    if created.get("status") == "flagged":
        AnomalyRepository().insert({
            "observation_id": created["id"],
            "item_id": created["item_id"],
            "market_id": created["market_id"],
            "score": 3.5,
            "expected_range": "Within plausible bounds",
            "reason": created.get("flag_reason", "Out of bounds"),
            "status": "open",
            "reviewer": None,
            "note": None
        })

    AuditRepository().log_event(
        actor=current_user["email"],
        action="PRICE_ENTERED",
        resource=f"price_observations/{created['id']}",
        metadata={"price": data.price, "unit": data.unit}
    )
    return created


@router.post("/batch", response_model=PriceBatchResult)
def record_batch_prices(
    batch: PriceBatchCreate,
    current_user: dict = Depends(require_roles("Admin", "Analyst", "Collector"))
):
    """Batch entry from Weekly Price Grid or multi-row input."""
    price_repo = PriceRepository()
    anomaly_repo = AnomalyRepository()
    market_repo = MarketRepository()
    item_repo = ItemRepository()

    # Pre-cache markets & items for performance
    market_cache = {m["id"]: m for m in market_repo.find({})}
    item_cache = {i["id"]: i for i in item_repo.find({})}

    assigned_markets = set(current_user.get("market_ids", []))
    is_collector = current_user.get("role") == "Collector"

    batch_id = str(uuid.uuid4())
    saved_ids = []
    errors = []
    saved_count = 0
    flagged_count = 0
    rejected_count = 0

    for idx, obs in enumerate(batch.observations):
        row_num = idx + 1
        # Check collector permission
        if is_collector and obs.market_id not in assigned_markets:
            errors.append({
                "row": row_num,
                "field": "market_id",
                "reason": f"Unassigned market '{obs.market_id}'"
            })
            rejected_count += 1
            continue

        try:
            val = validate_price_observation(
                obs.model_dump(),
                market_cache=market_cache,
                item_cache=item_cache
            )
            val["batch_id"] = batch_id
            val["entered_by"] = current_user["email"]

            created = price_repo.insert(val)
            saved_ids.append(created["id"])
            saved_count += 1

            if created["status"] == "flagged":
                flagged_count += 1
                anomaly_repo.insert({
                    "observation_id": created["id"],
                    "item_id": created["item_id"],
                    "market_id": created["market_id"],
                    "score": 3.0,
                    "expected_range": "Plausible bounds",
                    "reason": created.get("flag_reason", "Out of bounds"),
                    "status": "open"
                })

        except DuplicateKeyError:
            errors.append({
                "row": row_num,
                "field": "duplicate",
                "reason": f"Duplicate entry for market '{obs.market_id}', item '{obs.item_id}', date '{obs.date}'"
            })
            rejected_count += 1
        except Exception as e:
            errors.append({
                "row": row_num,
                "field": "validation",
                "reason": str(e)
            })
            rejected_count += 1

    AuditRepository().log_event(
        actor=current_user["email"],
        action="PRICE_BATCH_ENTERED",
        resource=f"upload_batches/{batch_id}",
        metadata={"total": len(batch.observations), "saved": saved_count, "errors": len(errors)}
    )

    return PriceBatchResult(
        saved_count=saved_count,
        flagged_count=flagged_count,
        rejected_count=rejected_count,
        saved_ids=saved_ids,
        errors=errors
    )


@router.get("", response_model=List[PriceObservationOut])
def list_prices(
    market_id: Optional[str] = None,
    item_id: Optional[str] = None,
    period_key: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    price_repo = PriceRepository()
    query = {}
    if market_id:
        query["market_id"] = market_id
    if item_id:
        query["item_id"] = item_id
    if period_key:
        query["period_key"] = period_key
    if status_filter:
        query["status"] = status_filter

    # Role-scoped automatically: Collector only sees assigned markets
    docs = price_repo.find_scoped(query, user=current_user, skip=skip, limit=limit)

    # Attach market and item names for readable UI presentation
    market_cache = {m["id"]: m["name"] for m in MarketRepository().find({})}
    item_cache = {i["id"]: i["name"] for i in ItemRepository().find({})}

    for d in docs:
        d["market_name"] = market_cache.get(d.get("market_id", ""), d.get("market_id"))
        d["item_name"] = item_cache.get(d.get("item_id", ""), d.get("item_id"))

    return docs


@router.patch("/{price_id}", response_model=PriceObservationOut)
def audit_update_price(
    price_id: str,
    update_data: PriceUpdateAudit,
    current_user: dict = Depends(require_roles("Admin", "Analyst"))
):
    price_repo = PriceRepository()
    existing = price_repo.get_by_id(price_id)
    if not existing:
        raise AppException(code="NOT_FOUND", message="Price observation not found", status_code=404)

    item = ItemRepository().get_by_id(existing["item_id"])
    canonical_unit = item["canonical_unit"] if item else existing.get("canonical_unit", "kg")
    unit = update_data.unit or existing["unit"]

    price_per_canonical, _ = convert_to_canonical_unit(update_data.price, unit, canonical_unit)

    updated = price_repo.update(price_id, {
        "price": update_data.price,
        "unit": unit,
        "price_per_canonical_unit": price_per_canonical,
        "status": "valid",
        "notes": f"Corrected by {current_user['email']}: {update_data.reason}"
    })

    AuditRepository().log_event(
        actor=current_user["email"],
        action="PRICE_CORRECTED",
        resource=f"price_observations/{price_id}",
        metadata={"old_price": existing["price"], "new_price": update_data.price, "reason": update_data.reason}
    )
    return updated
