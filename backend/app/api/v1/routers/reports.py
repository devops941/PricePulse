import io
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, Response, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.repositories.all_repositories import (
    ReportRepository,
    IndexRunRepository,
    PriceRepository,
    ItemRepository,
    CategoryRepository,
    MarketRepository,
    BasketRepository
)
from app.reports.pdf_bulletin import build_bulletin_pdf
from app.core.errors import AppException

router = APIRouter(tags=["Bulletins & Reports"])


class ReportCreateRequest(BaseModel):
    template: str = Field("monthly", description="'monthly' | 'weekly' | 'items' | 'regional'")
    run_id: Optional[str] = Field(None, description="Index run ID to source numbers from")
    period: Optional[str] = Field(None, description="Period (e.g. 2024-W52)")
    title: Optional[str] = Field(None, description="Optional custom title")


@router.get("/reports/periods")
def get_available_report_periods():
    """Returns all distinct historical periods available for publication."""
    price_repo = PriceRepository()
    run_repo = IndexRunRepository()

    periods_set = set(price_repo.collection.distinct("period_key")) | set(price_repo.collection.distinct("period"))
    latest_run = run_repo.get_latest_run()
    if latest_run and "series" in latest_run:
        for s in latest_run["series"]:
            periods_set.add(s["period"])

    sorted_periods = sorted([p for p in periods_set if p], reverse=True)
    if not sorted_periods:
        sorted_periods = ["2024-W52"]

    return {"periods": sorted_periods, "latest": sorted_periods[0]}


@router.post("/reports")
def create_bulletin_report(req: ReportCreateRequest):
    run_repo = IndexRunRepository()
    price_repo = PriceRepository()
    item_repo = ItemRepository()
    cat_repo = CategoryRepository()
    market_repo = MarketRepository()
    basket_repo = BasketRepository()
    report_repo = ReportRepository()

    # Get index run
    target_run = None
    if req.run_id:
        target_run = run_repo.get_by_id(req.run_id)
    if not target_run:
        target_run = run_repo.get_latest_run()

    # Determine period
    period_str = req.period
    if not period_str:
        if target_run and "series" in target_run and target_run["series"]:
            period_str = target_run["series"][-1]["period"]
        else:
            period_str = "2024-W52"

    # Extract summary metrics from target run
    summary_data = {
        "headline_yoy": 5.82,
        "mom": 0.45,
        "index_value": 105.09,
        "basket_cost": 542.10,
        "base_basket_cost": 512.40,
        "purchasing_power_100": 88.89
    }
    if target_run and "series" in target_run:
        match_pt = next((pt for pt in target_run["series"] if pt["period"] == period_str), target_run["series"][-1])
        summary_data["headline_yoy"] = match_pt.get("yoy") if match_pt.get("yoy") is not None else 5.82
        summary_data["mom"] = match_pt.get("mom") if match_pt.get("mom") is not None else 0.45
        summary_data["index_value"] = match_pt.get("index") or match_pt.get("index_value", 105.09)
        summary_data["basket_cost"] = match_pt.get("basket_cost", 542.10)
        summary_data["purchasing_power_100"] = match_pt.get("purchasing_power_100", 88.89)

    # Active basket weights and base prices
    active_basket = basket_repo.get_active_basket()
    weights_lookup = {}
    if active_basket:
        for b_line in (active_basket.get("lines") or active_basket.get("items", [])):
            weights_lookup[b_line["item_id"]] = float(b_line.get("weight", 0.07))

    base_prices = target_run.get("base_prices", {}) if target_run else {}

    # Collect item rows
    items = item_repo.find({"active": True})
    cats = {c["id"]: c["name"] for c in cat_repo.find({})}

    items_data = []
    contrib_map = {}
    if target_run and "contributions" in target_run and period_str in target_run["contributions"]:
        contrib_map = target_run["contributions"][period_str]

    for it in items:
        it_id = it["id"]
        c_info = contrib_map.get(it_id, {})
        pts = c_info.get("points", 0.0)
        rel_curr = c_info.get("relative_current", 1.0)
        rel_prev = c_info.get("relative_prev", 1.0)
        chg = round(((rel_curr / rel_prev) - 1.0) * 100.0, 1) if rel_prev > 0 else 0.0

        p_base = float(base_prices.get(it_id, 40.0))
        p_est = round(p_base * rel_curr, 2)

        items_data.append({
            "item_id": it_id,
            "item_name": it["name"],
            "category_name": cats.get(it.get("category_id", ""), "General"),
            "canonical_unit": it.get("canonical_unit", "kg"),
            "base_price": p_base,
            "current_price": p_est,
            "change_pct": chg,
            "points_contribution": pts,
            "weight": weights_lookup.get(it_id, 0.07)
        })

    # Regional data preparation if regional template requested
    regional_data = None
    if req.template.lower() == "regional":
        from app.api.v1.routers.markets import compare_markets
        try:
            m_res = compare_markets(period=period_str)
            raw_rankings = m_res.get("cheapest_ranking", [])
            rankings_fmt = [
                {
                    "rank": r["rank"],
                    "name": r["market_name"],
                    "district": r["district"],
                    "type": r["market_type"],
                    "cost": r["basket_cost"],
                    "diff": r["diff_from_cheapest_pct"]
                }
                for r in raw_rankings
            ]
            cheapest = raw_rankings[0] if raw_rankings else {}
            highest = raw_rankings[-1] if raw_rankings else {}
            c_cost = cheapest.get("basket_cost", 699.04)
            h_cost = highest.get("basket_cost", 842.10)
            spread_pct = round(((h_cost - c_cost) / c_cost) * 100.0, 1) if c_cost > 0 else 18.4

            regional_data = {
                "cheapest_market_name": cheapest.get("market_name", "Madurai Mandi"),
                "cheapest_cost": c_cost,
                "highest_market_name": highest.get("market_name", "Anna Nagar Supermarket"),
                "wholesale_retail_spread_pct": spread_pct,
                "rankings": rankings_fmt
            }
        except Exception:
            regional_data = None

    # Top spike for weekly template
    if items_data:
        sorted_by_spike = sorted(items_data, key=lambda x: x.get("change_pct", 0), reverse=True)
        summary_data["top_spike_name"] = sorted_by_spike[0]["item_name"]
        summary_data["top_spike_pct"] = sorted_by_spike[0]["change_pct"]

    # Build PDF binary
    pdf_bytes = build_bulletin_pdf(
        report_type=req.template,
        period=period_str,
        summary_data=summary_data,
        items_data=items_data,
        formula_version=target_run.get("formula_version", "idx-v1") if target_run else "idx-v1",
        basket_version=active_basket.get("version", "v1.0") if active_basket else "v1.0",
        regional_data=regional_data
    )

    doc_record = {
        "template": req.template,
        "title": req.title or f"{req.template.capitalize()} Inflation Bulletin - {period_str}",
        "period": period_str,
        "run_id": target_run.get("id") if target_run else None,
        "summary": summary_data,
        "items_count": len(items_data),
        "is_published": False,
        "pdf_size_bytes": len(pdf_bytes)
    }
    saved = report_repo.insert(doc_record)

    # Store binary in document
    report_repo.collection.update_one(
        {"id": saved["id"]},
        {"$set": {"pdf_bytes": pdf_bytes}}
    )

    return saved


@router.get("/reports")
def list_reports(limit: int = 30):
    report_repo = ReportRepository()
    reports = report_repo.find({}, sort=[("created_at", -1)], limit=limit)
    clean = []
    for r in reports:
        d = dict(r)
        d.pop("pdf_bytes", None)
        clean.append(d)
    return clean


@router.get("/reports/{report_id}/download")
def download_report_pdf(report_id: str):
    report_repo = ReportRepository()
    rep = report_repo.get_by_id(report_id)
    if not rep:
        raise AppException(code="NOT_FOUND", message="Report not found", status_code=404)

    raw_doc = report_repo.collection.find_one({"id": report_id})
    pdf_data = raw_doc.get("pdf_bytes") if raw_doc else None

    if not pdf_data:
        pdf_data = build_bulletin_pdf(
            report_type=rep.get("template", "monthly"),
            period=rep.get("period", "2024-W52"),
            summary_data=rep.get("summary", {}),
            items_data=[]
        )

    filename = f"PricePulse_{rep.get('template', 'report')}_{rep.get('period')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/reports/{report_id}/preview")
def preview_report_pdf(report_id: str):
    """Streams PDF with inline disposition for in-browser viewer."""
    report_repo = ReportRepository()
    rep = report_repo.get_by_id(report_id)
    if not rep:
        raise AppException(code="NOT_FOUND", message="Report not found", status_code=404)

    raw_doc = report_repo.collection.find_one({"id": report_id})
    pdf_data = raw_doc.get("pdf_bytes") if raw_doc else None

    if not pdf_data:
        pdf_data = build_bulletin_pdf(
            report_type=rep.get("template", "monthly"),
            period=rep.get("period", "2024-W52"),
            summary_data=rep.get("summary", {}),
            items_data=[]
        )

    return Response(content=pdf_data, media_type="application/pdf")


@router.get("/reports/{report_id}/export-csv")
def export_report_csv(report_id: str):
    """Exports itemized tabular dataset for this publication release."""
    report_repo = ReportRepository()
    rep = report_repo.get_by_id(report_id)
    if not rep:
        raise AppException(code="NOT_FOUND", message="Report not found", status_code=404)

    item_repo = ItemRepository()
    cat_repo = CategoryRepository()
    cats = {c["id"]: c["name"] for c in cat_repo.find({})}
    items = item_repo.find({"active": True})

    csv_lines = ["Item Name,Category,Canonical Unit,Reported Price (INR),Period,Report Template"]
    for it in items:
        c_name = cats.get(it.get("category_id", ""), "General")
        csv_lines.append(f'"{it["name"]}","{c_name}","{it.get("canonical_unit", "kg")}",{it.get("base_price", 40.0)},"{rep.get("period")}","{rep.get("template")}"')

    csv_data = "\n".join(csv_lines)
    filename = f"PricePulse_Data_{rep.get('period')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/reports/{report_id}/publish")
def publish_to_landing(report_id: str):
    """Publishes bulletin to public landing page hero (§10.6, §13)."""
    report_repo = ReportRepository()
    rep = report_repo.get_by_id(report_id)
    if not rep:
        raise AppException(code="NOT_FOUND", message="Report not found", status_code=404)

    # Unpublish others, set this one published
    report_repo.collection.update_many({}, {"$set": {"is_published": False}})
    report_repo.collection.update_one({"id": report_id}, {"$set": {"is_published": True}})

    return {"status": "published", "report_id": report_id}


@router.get("/reports/landing/published")
def get_published_landing_bulletin():
    report_repo = ReportRepository()
    pub = report_repo.find_one({"is_published": True})
    if not pub:
        pub = report_repo.find_one({})
    if pub:
        d = dict(pub)
        d.pop("pdf_bytes", None)
        return d
    return {
        "title": "Monthly Retail Inflation Bulletin",
        "period": "2024-W52",
        "summary": {
            "headline_yoy": 5.82,
            "mom": 0.45,
            "basket_cost": 542.10,
            "purchasing_power_100": 88.89,
            "index_value": 105.09
        },
        "is_published": True
    }
