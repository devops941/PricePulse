from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, Body, Depends, status
from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user, require_roles
from app.repositories.all_repositories import (
    AnomalyRepository,
    PriceRepository,
    ItemRepository,
    MarketRepository,
    AuditRepository,
    IndexRunRepository
)
from app.analytics.anomalies import detect_price_anomalies
from app.core.errors import AppException

router = APIRouter(tags=["Anomaly & Review Engine"])


class ReviewActionRequest(BaseModel):
    action: str = Field(..., description="'approve' | 'correct' | 'reject'")
    corrected_price: Optional[float] = Field(None, description="Required if action is 'correct'")
    comment: Optional[str] = Field(None, description="Reviewer rationale")


@router.get("/anomalies")
def list_anomalies(
    status_filter: Optional[str] = Query("pending", alias="status"),
    period: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    repo = AnomalyRepository()
    price_repo = PriceRepository()
    item_repo = ItemRepository()
    market_repo = MarketRepository()

    query: Dict[str, Any] = {}
    if status_filter and status_filter != "all":
        query["status"] = status_filter
    if period:
        query["period"] = period

    anomalies = repo.find(query, sort=[("created_at", -1)], skip=skip, limit=limit)
    total_count = repo.count(query)

    # Populate names and caches
    items_cache = {i["id"]: i for i in item_repo.find({})}
    markets_cache = {m["id"]: m for m in market_repo.find({})}

    enriched = []
    for a in anomalies:
        it_id = a.get("item_id")
        m_id = a.get("market_id")
        per = a.get("period")
        it = items_cache.get(it_id, {})
        m = markets_cache.get(m_id, {})
        
        a_copy = dict(a)
        a_copy["item_name"] = it.get("name", "Unknown Item")
        a_copy["category_id"] = it.get("category_id")
        a_copy["canonical_unit"] = it.get("canonical_unit", "kg")
        p_min = it.get("min_plausible", it.get("plausible_min", 5.0))
        p_max = it.get("max_plausible", it.get("plausible_max", 200.0))
        a_copy["plausible_min"] = p_min
        a_copy["plausible_max"] = p_max
        a_copy["market_name"] = m.get("name", "Unknown Market")
        a_copy["district"] = m.get("district", "General")

        # Contextual contemporaneous peer market prices
        peer_obs = price_repo.find({
            "item_id": it_id,
            "$or": [{"period_key": per}, {"period": per}],
            "status": {"$in": ["valid", "imputed", "approved", "auto_approved"]}
        })
        
        peer_prices = []
        for po in peer_obs:
            po_mkt_id = po.get("market_id")
            if po_mkt_id != m_id:
                po_mkt = markets_cache.get(po_mkt_id, {})
                po_val = float(po.get("price_per_canonical_unit") or po.get("normalized_price") or po.get("price", 0))
                peer_prices.append({
                    "market_id": po_mkt_id,
                    "market_name": po_mkt.get("name", "Other Hub"),
                    "district": po_mkt.get("district", "Tamil Nadu"),
                    "market_type": po_mkt.get("market_type", po_mkt.get("type", "retail")),
                    "price": round(po_val, 2)
                })

        # Calculate suggested price (median of peer prices, or midpoint of plausible range)
        if peer_prices:
            sorted_vals = sorted(p["price"] for p in peer_prices)
            mid = len(sorted_vals) // 2
            suggested = round(sorted_vals[mid], 2)
        else:
            suggested = round((float(p_min) + float(p_max)) / 2.0, 2)

        # Severity classification
        obs_p = float(a.get("observed_price", 0.0))
        z = float(a.get("zscore", 0.0))
        if z >= 5.0 or (p_max and obs_p > float(p_max) * 1.3):
            sev = "critical"
        elif z >= 3.0 or (p_max and obs_p > float(p_max)):
            sev = "high"
        else:
            sev = "moderate"

        a_copy["severity"] = a.get("severity") or sev
        a_copy["peer_prices"] = peer_prices
        a_copy["suggested_price"] = suggested
        enriched.append(a_copy)

    # Calculate executive overview stats
    pending_total = repo.count({"status": "pending"})
    approved_total = repo.count({"status": "approved"})
    corrected_total = repo.count({"status": "corrected"})
    rejected_total = repo.count({"status": "rejected"})

    return {
        "total": total_count,
        "items": enriched,
        "summary": {
            "pending": pending_total,
            "approved": approved_total,
            "corrected": corrected_total,
            "rejected": rejected_total,
            "total_decisions": approved_total + corrected_total + rejected_total
        }
    }


@router.patch("/anomalies/{anomaly_id}")
def review_anomaly(
    anomaly_id: str,
    req: ReviewActionRequest,
    current_user: dict = Depends(require_roles("Admin", "Analyst"))
):
    anomaly_repo = AnomalyRepository()
    price_repo = PriceRepository()
    audit_repo = AuditRepository()
    index_repo = IndexRunRepository()

    anomaly = anomaly_repo.get_by_id(anomaly_id)
    if not anomaly:
        raise AppException(code="NOT_FOUND", message="Anomaly record not found", status_code=404)

    price_id = anomaly.get("price_id")
    price_record = price_repo.get_by_id(price_id) if price_id else None

    action = req.action.lower()
    reviewer_email = current_user["email"]

    if action == "approve":
        anomaly_repo.update(anomaly_id, {
            "status": "approved",
            "reviewed_by": reviewer_email,
            "review_comment": req.comment
        })
        if price_record:
            price_repo.update(price_id, {"status": "valid"})

        audit_repo.log_event(
            actor=reviewer_email,
            action="ANOMALY_APPROVED",
            resource=f"anomalies/{anomaly_id}",
            metadata={"price_id": price_id, "comment": req.comment}
        )

    elif action == "correct":
        if req.corrected_price is None or req.corrected_price <= 0:
            raise AppException(code="INVALID_PRICE", message="Valid positive corrected_price required", status_code=400)

        anomaly_repo.update(anomaly_id, {
            "status": "corrected",
            "reviewed_by": reviewer_email,
            "corrected_price": req.corrected_price,
            "review_comment": req.comment
        })

        if price_record:
            price_repo.update(price_id, {
                "price": req.corrected_price,
                "normalized_price": req.corrected_price,
                "price_per_canonical_unit": req.corrected_price,
                "status": "valid",
                "corrected_from": price_record.get("price")
            })

        audit_repo.log_event(
            actor=reviewer_email,
            action="ANOMALY_CORRECTED",
            resource=f"anomalies/{anomaly_id}",
            metadata={
                "price_id": price_id,
                "original_price": price_record.get("price") if price_record else None,
                "corrected_price": req.corrected_price,
                "comment": req.comment
            }
        )

    elif action == "reject":
        anomaly_repo.update(anomaly_id, {
            "status": "rejected",
            "reviewed_by": reviewer_email,
            "review_comment": req.comment
        })
        if price_record:
            price_repo.update(price_id, {"status": "rejected"})

        audit_repo.log_event(
            actor=reviewer_email,
            action="ANOMALY_REJECTED",
            resource=f"anomalies/{anomaly_id}",
            metadata={"price_id": price_id, "comment": req.comment}
        )
    else:
        raise AppException(code="INVALID_ACTION", message="Action must be approve, correct, or reject", status_code=400)

    # Automatically trigger fresh index recalculation to keep headline CPI up to date
    try:
        from app.core.bootstrap import trigger_index_recalculation
        recalc_result = trigger_index_recalculation(actor_email=reviewer_email)
    except Exception:
        recalc_result = {"status": "skipped"}

    updated = anomaly_repo.get_by_id(anomaly_id)
    return {
        "success": True,
        "action": action,
        "anomaly": updated,
        "index_recalculated": True,
        "recalc_summary": recalc_result
    }


@router.post("/anomalies/seed-demo")
def seed_demo_anomalies(
    current_user: dict = Depends(require_roles("Admin", "Analyst"))
):
    """Provisions demonstration anomalies for evaluating the Review Desk."""
    anomaly_repo = AnomalyRepository()
    price_repo = PriceRepository()
    item_repo = ItemRepository()
    market_repo = MarketRepository()

    tomato = item_repo.find_one({"name": "Tomato Local"})
    onion = item_repo.find_one({"name": "Onion Sambhar"})
    m_anna = market_repo.find_one({"name": "Anna Nagar Retail Supermarket"})
    m_mattu = market_repo.find_one({"name": "Mattuthavani Vegetable Market"})

    seeded = 0
    if tomato and m_anna:
        p_doc = price_repo.find_one({
            "item_id": tomato["id"],
            "market_id": m_anna["id"],
            "$or": [{"period_key": "2024-W52"}, {"period": "2024-W52"}]
        })
        if p_doc:
            price_repo.update(p_doc["id"], {
                "price": 280.0,
                "normalized_price": 280.0,
                "price_per_canonical_unit": 280.0,
                "status": "flagged"
            })
            p_id = p_doc["id"]
        else:
            new_p = price_repo.insert({
                "item_id": tomato["id"],
                "market_id": m_anna["id"],
                "period": "2024-W52",
                "period_key": "2024-W52",
                "date": "2024-12-25",
                "price": 280.0,
                "normalized_price": 280.0,
                "price_per_canonical_unit": 280.0,
                "status": "flagged",
                "unit": "kg"
            })
            p_id = new_p["id"]

        existing_a = anomaly_repo.find_one({"price_id": p_id})
        if not existing_a:
            anomaly_repo.insert({
                "price_id": p_id,
                "item_id": tomato["id"],
                "market_id": m_anna["id"],
                "period": "2024-W52",
                "observed_price": 280.0,
                "zscore": 6.8,
                "reasons": [
                    "ABOVE_PLAUSIBLE_MAX: Reported ₹280.00 is above max bound ₹180.00.",
                    "ROBUST_ZSCORE_EXCEEDED: MAD z-score 6.8 exceeds threshold 3.0."
                ],
                "severity": "critical",
                "status": "pending"
            })
            seeded += 1
        elif existing_a.get("status") != "pending":
            anomaly_repo.update(existing_a["id"], {"status": "pending"})
            seeded += 1

    if onion and m_mattu:
        p_doc2 = price_repo.find_one({
            "item_id": onion["id"],
            "market_id": m_mattu["id"],
            "$or": [{"period_key": "2024-W52"}, {"period": "2024-W52"}]
        })
        if p_doc2:
            price_repo.update(p_doc2["id"], {
                "price": 195.0,
                "normalized_price": 195.0,
                "price_per_canonical_unit": 195.0,
                "status": "flagged"
            })
            p_id2 = p_doc2["id"]
        else:
            new_p2 = price_repo.insert({
                "item_id": onion["id"],
                "market_id": m_mattu["id"],
                "period": "2024-W52",
                "period_key": "2024-W52",
                "date": "2024-12-25",
                "price": 195.0,
                "normalized_price": 195.0,
                "price_per_canonical_unit": 195.0,
                "status": "flagged",
                "unit": "kg"
            })
            p_id2 = new_p2["id"]

        existing_a2 = anomaly_repo.find_one({"price_id": p_id2})
        if not existing_a2:
            anomaly_repo.insert({
                "price_id": p_id2,
                "item_id": onion["id"],
                "market_id": m_mattu["id"],
                "period": "2024-W52",
                "observed_price": 195.0,
                "zscore": 4.2,
                "reasons": [
                    "ABOVE_PLAUSIBLE_MAX: Reported ₹195.00 is above max bound ₹150.00.",
                    "ROBUST_ZSCORE_EXCEEDED: MAD z-score 4.2 exceeds threshold 3.0."
                ],
                "severity": "high",
                "status": "pending"
            })
            seeded += 1
        elif existing_a2.get("status") != "pending":
            anomaly_repo.update(existing_a2["id"], {"status": "pending"})
            seeded += 1

    return {"seeded": seeded, "message": f"Provisioned {seeded} demo anomalies for review."}


@router.post("/anomalies/scan")
def trigger_anomaly_scan(
    current_user: dict = Depends(require_roles("Admin", "Analyst"))
):
    """Scans all recent observations and generates anomaly records (§6, §11)."""
    price_repo = PriceRepository()
    anomaly_repo = AnomalyRepository()
    item_repo = ItemRepository()

    items = {i["id"]: i for i in item_repo.find({})}
    recent_prices = price_repo.find({"status": {"$in": ["submitted", "flagged", "valid", "approved", "auto_approved"]}}, limit=500)

    created_count = 0
    for p in recent_prices:
        p_id = p["id"]
        it_id = p.get("item_id")
        price_val = float(p.get("normalized_price", p.get("price", 0)))
        item = items.get(it_id, {})

        hist = [
            float(h.get("normalized_price", h.get("price", 0)))
            for h in price_repo.find({"item_id": it_id}, limit=30)
            if h["id"] != p_id
        ]

        check = detect_price_anomalies(
            candidate_price=price_val,
            history_prices=hist,
            plausible_min=item.get("min_plausible", item.get("plausible_min")),
            plausible_max=item.get("max_plausible", item.get("plausible_max")),
        )

        if check["is_anomaly"]:
            existing = anomaly_repo.find_one({"price_id": p_id})
            if not existing:
                anomaly_repo.insert({
                    "price_id": p_id,
                    "item_id": it_id,
                    "market_id": p.get("market_id"),
                    "period": p.get("period_key") or p.get("period"),
                    "observed_price": price_val,
                    "zscore": check["zscore"],
                    "reasons": check["reasons"],
                    "severity": check["severity"],
                    "status": "pending"
                })
                price_repo.update(p_id, {"status": "flagged"})
                created_count += 1

    return {"scanned": len(recent_prices), "new_anomalies_flagged": created_count}
