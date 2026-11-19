import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Response, status
from pymongo.errors import DuplicateKeyError
from app.core.dependencies import get_current_user, require_roles
from app.core.errors import AppException
from app.core.logging import logger
from app.ingestion.parser import calculate_sha256, parse_csv_file, parse_excel_file, auto_map_columns
from app.ingestion.validators import validate_price_observation
from app.repositories.all_repositories import (
    UploadRepository,
    PriceRepository,
    MarketRepository,
    ItemRepository,
    AnomalyRepository,
    AuditRepository,
)
from app.core.bootstrap import ensure_master_catalog, trigger_index_recalculation
from app.schemas.upload import (
    UploadPreviewResponse,
    UploadConfirmRequest,
    UploadConfirmResponse,
)

# Common aliases for Tamil Nadu grocery & mandi commodities
ITEM_ALIASES = {
    "tomato": "Tomato Local",
    "tomato local": "Tomato Local",
    "hybrid tomato": "Tomato Local",
    "local tomato": "Tomato Local",
    "onion": "Onion Sambhar",
    "onion sambhar": "Onion Sambhar",
    "small onion": "Onion Sambhar",
    "red onion": "Onion Sambhar",
    "bellary onion": "Onion Sambhar",
    "potato": "Potato Jyoti",
    "potato jyoti": "Potato Jyoti",
    "green chilli": "Green Chilli",
    "chilli": "Green Chilli",
    "green chillies": "Green Chilli",
    "rice": "Rice (Sona Masoori)",
    "rice (sona masoori)": "Rice (Sona Masoori)",
    "sona masoori": "Rice (Sona Masoori)",
    "sona masoori rice": "Rice (Sona Masoori)",
    "atta": "Atta (Whole Wheat)",
    "atta (whole wheat)": "Atta (Whole Wheat)",
    "wheat flour": "Atta (Whole Wheat)",
    "wheat flour (atta)": "Atta (Whole Wheat)",
    "tur dal": "Tur Dal (Arhar)",
    "tur dal (arhar)": "Tur Dal (Arhar)",
    "toor dal": "Tur Dal (Arhar)",
    "toor dal (arhar)": "Tur Dal (Arhar)",
    "arhar dal": "Tur Dal (Arhar)",
    "moong dal": "Moong Dal",
    "mustard oil": "Mustard Oil",
    "sunflower oil": "Sunflower Oil",
    "milk": "Milk (Pasteurized Toned)",
    "milk (pasteurized toned)": "Milk (Pasteurized Toned)",
    "pasteurised milk": "Milk (Pasteurized Toned)",
    "pasteurized milk": "Milk (Pasteurized Toned)",
    "curd": "Curd (Dahi)",
    "curd (dahi)": "Curd (Dahi)",
    "dahi": "Curd (Dahi)",
    "garlic": "Garlic",
    "dry ginger": "Dry Ginger",
    "ginger": "Dry Ginger",
    "sugar": "Sugar (Refined)",
    "sugar (refined)": "Sugar (Refined)",
}

router = APIRouter(prefix="/uploads", tags=["CSV/Excel Upload Wizard"])

# Temporary in-memory raw row cache for staging before confirm
_staging_rows_cache = {}


@router.get("/template")
def download_template():
    """Returns downloadable CSV template as specified in §6.3 & §11."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["market", "item", "date", "price", "unit", "source", "notes"])
    # Example hint row
    writer.writerow(["Chennai Central", "Rice (Sona Masoori)", "2026-10-15", "58.00", "kg", "manual", "Spot retail quote"])
    content = output.getvalue()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pricepulse_template.csv"}
    )


@router.get("/sample")
def download_sample_data():
    """Returns illustrative sample data labeled clearly (§0 Rule 7)."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["market", "item", "date", "price", "unit", "source", "notes"])
    samples = [
        ["Chennai Central", "Rice (Sona Masoori)", "2026-10-15", "58.00", "kg", "sample", "Illustrative sample data"],
        ["Chennai Central", "Wheat Flour (Atta)", "2026-10-15", "42.00", "kg", "sample", "Illustrative sample data"],
        ["Madurai South", "Toor Dal (Arhar)", "2026-10-15", "168.00", "kg", "sample", "Illustrative sample data"],
        ["Coimbatore West", "Pasteurised Milk", "2026-10-15", "62.00", "L", "sample", "Illustrative sample data"],
        ["Koyambedu Wholesale", "Red Onion", "2026-10-15", "48.00", "kg", "sample", "Illustrative sample data"],
        ["Salem Mandi", "Hybrid Tomato", "2026-10-15", "38.00", "kg", "sample", "Illustrative sample data"],
    ]
    for s in samples:
        writer.writerow(s)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pricepulse_sample_data.csv"}
    )


@router.post("/preview", response_model=UploadPreviewResponse)
async def preview_upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("Admin", "Analyst", "Collector"))
):
    contents = await file.read()
    if len(contents) == 0:
        raise AppException(code="EMPTY_FILE", message="Uploaded file is empty", status_code=400)

    filename = file.filename or "upload.csv"
    checksum = calculate_sha256(contents)

    # Check idempotency: Was this exact file already confirmed? (§17 Phase 7)
    upload_repo = UploadRepository()
    existing_batch = upload_repo.get_by_checksum(checksum)
    if existing_batch and existing_batch.get("status") == "confirmed":
        return UploadPreviewResponse(
            batch_id=existing_batch["id"],
            filename=filename,
            checksum=checksum,
            headers=existing_batch.get("mapping", {}).values(),
            suggested_mapping=existing_batch.get("mapping", {}),
            total_rows=existing_batch.get("counts", {}).get("total", 0),
            preview_rows=[],
            valid_count=existing_batch.get("counts", {}).get("valid", 0),
            flagged_count=existing_batch.get("counts", {}).get("flagged", 0),
            invalid_count=existing_batch.get("counts", {}).get("rejected", 0),
            already_confirmed=True
        )

    # Parse CSV or Excel
    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            headers, raw_records = parse_excel_file(contents)
        else:
            headers, raw_records = parse_csv_file(contents)
    except Exception as e:
        raise AppException(code="PARSE_ERROR", message=f"Failed to parse file: {str(e)}", status_code=400)

    if not headers or not raw_records:
        raise AppException(code="EMPTY_DATA", message="No valid header row or data records found", status_code=400)

    suggested_map = auto_map_columns(headers)

    # Create staging batch in DB
    batch_doc = upload_repo.insert({
        "filename": filename,
        "checksum": checksum,
        "mapping": suggested_map,
        "counts": {"total": len(raw_records)},
        "duplicate_policy": "skip",
        "status": "preview",
        "actor": current_user["email"],
        "rejected_errors": []
    })
    batch_id = batch_doc["id"]

    # Cache records in memory for confirmation step
    _staging_rows_cache[batch_id] = raw_records

    # Quick preview of first 50 rows
    preview_slice = raw_records[:50]

    return UploadPreviewResponse(
        batch_id=batch_id,
        filename=filename,
        checksum=checksum,
        headers=headers,
        suggested_mapping=suggested_map,
        total_rows=len(raw_records),
        preview_rows=preview_slice,
        valid_count=len(raw_records),
        flagged_count=0,
        invalid_count=0,
        already_confirmed=False
    )


@router.post("/{batch_id}/confirm", response_model=UploadConfirmResponse)
def confirm_upload(
    batch_id: str,
    req: UploadConfirmRequest,
    current_user: dict = Depends(require_roles("Admin", "Analyst", "Collector"))
):
    upload_repo = UploadRepository()
    price_repo = PriceRepository()
    anomaly_repo = AnomalyRepository()
    audit_repo = AuditRepository()
    market_repo = MarketRepository()
    item_repo = ItemRepository()

    batch = upload_repo.get_by_id(batch_id)
    if not batch:
        raise AppException(code="NOT_FOUND", message="Upload batch not found", status_code=404)

    # Idempotent: If already confirmed, return cached result
    if batch.get("status") == "confirmed":
        counts = batch.get("counts", {})
        return UploadConfirmResponse(
            batch_id=batch_id,
            status="confirmed",
            total_processed=counts.get("total", 0),
            saved_count=counts.get("saved", 0),
            flagged_count=counts.get("flagged", 0),
            rejected_count=counts.get("rejected", 0),
            checksum=batch["checksum"],
            has_errors=counts.get("rejected", 0) > 0,
            errors_csv_url=f"/api/v1/uploads/{batch_id}/errors.csv" if counts.get("rejected", 0) > 0 else None
        )

    raw_records = _staging_rows_cache.get(batch_id, [])
    if not raw_records:
        raise AppException(code="STAGING_EXPIRED", message="Staged upload records expired. Please re-upload.", status_code=400)

    # Ensure master catalog is present
    ensure_master_catalog()

    # Pre-cache markets & items (lookup by ID and by Name for flexibility)
    all_markets = market_repo.find({})
    all_items = item_repo.find({})
    market_map = {}
    for m in all_markets:
        market_map[m["id"]] = m
        market_map[m["name"].lower().strip()] = m

    item_map = {}
    for it in all_items:
        item_map[it["id"]] = it
        item_map[it["name"].lower().strip()] = it

    mapping = req.mapping
    market_col = mapping.get("market")
    item_col = mapping.get("item")
    date_col = mapping.get("date")
    price_col = mapping.get("price")
    unit_col = mapping.get("unit")
    notes_col = mapping.get("notes")

    saved_count = 0
    flagged_count = 0
    rejected_count = 0
    rejected_errors = []

    for idx, row in enumerate(raw_records):
        row_num = idx + 1
        m_val = str(row.get(market_col, "")).strip()
        i_val = str(row.get(item_col, "")).strip()
        d_val = str(row.get(date_col, "")).strip()
        p_val = str(row.get(price_col, "")).strip()
        u_val = str(row.get(unit_col, "")).strip()
        notes_val = str(row.get(notes_col, "")).strip() if notes_col else ""

        # 1. Resolve market (with alias + auto-provisioning)
        m_lower = m_val.lower().strip()
        m_doc = market_map.get(m_val) or market_map.get(m_lower)
        if not m_doc:
            for mk_name, mk_obj in market_map.items():
                if m_lower and (m_lower in mk_name or mk_name in m_lower):
                    m_doc = mk_obj
                    break

        if not m_doc and m_val:
            dist = "Chennai"
            if "madurai" in m_lower:
                dist = "Madurai"
            elif "coimbatore" in m_lower:
                dist = "Coimbatore"
            elif "salem" in m_lower:
                dist = "Salem"

            m_type = "wholesale" if any(w in m_lower for w in ["wholesale", "mandi", "terminal"]) else "retail"
            m_doc = market_repo.insert({
                "name": m_val,
                "district": dist,
                "market_type": m_type,
                "active": True
            })
            market_map[m_val] = m_doc
            market_map[m_lower] = m_doc

        # 2. Resolve item (with alias mapping)
        i_lower = i_val.lower().strip()
        canonical_name = ITEM_ALIASES.get(i_lower, i_val)
        i_doc = (
            item_map.get(canonical_name)
            or item_map.get(canonical_name.lower().strip())
            or item_map.get(i_val)
            or item_map.get(i_lower)
        )
        if not i_doc:
            for it_name, it_obj in item_map.items():
                if i_lower and (i_lower in it_name or it_name in i_lower):
                    i_doc = it_obj
                    break

        if not m_doc:
            rejected_errors.append({"row": row_num, "field": "market", "reason": f"Unknown market '{m_val}'", "raw": row})
            rejected_count += 1
            continue
        if not i_doc:
            rejected_errors.append({"row": row_num, "field": "item", "reason": f"Unknown item '{i_val}'", "raw": row})
            rejected_count += 1
            continue

        try:
            validated = validate_price_observation({
                "market_id": m_doc["id"],
                "item_id": i_doc["id"],
                "date": d_val,
                "price": p_val,
                "unit": u_val,
                "notes": notes_val,
                "source": "csv_upload"
            }, market_cache={m_doc["id"]: m_doc}, item_cache={i_doc["id"]: i_doc})

            validated["batch_id"] = batch_id
            validated["entered_by"] = current_user["email"]

            # Duplicate policy handling (§6.3, §17)
            existing_obs = price_repo.find_one({
                "market_id": validated["market_id"],
                "item_id": validated["item_id"],
                "date": validated["date"],
                "source": validated["source"]
            })

            if existing_obs:
                if req.duplicate_policy == "skip":
                    rejected_errors.append({
                        "row": row_num,
                        "field": "duplicate",
                        "reason": f"Skipped duplicate observation for {m_val} / {i_val} on {d_val}",
                        "raw": row
                    })
                    rejected_count += 1
                    continue
                elif req.duplicate_policy == "replace":
                    # Update existing record with audit
                    price_repo.update(existing_obs["id"], validated)
                    saved_count += 1
                    audit_repo.log_event(
                        actor=current_user["email"],
                        action="PRICE_REPLACED_VIA_UPLOAD",
                        resource=f"price_observations/{existing_obs['id']}",
                        metadata={"old_price": existing_obs["price"], "new_price": validated["price"]}
                    )
                    continue
                else: # reject
                    rejected_errors.append({
                        "row": row_num,
                        "field": "duplicate",
                        "reason": f"Duplicate observation rejected: {m_val} / {i_val} on {d_val}",
                        "raw": row
                    })
                    rejected_count += 1
                    continue

            # Insert clean observation
            created = price_repo.insert(validated)
            saved_count += 1

            if created["status"] == "flagged":
                flagged_count += 1
                anomaly_repo.insert({
                    "observation_id": created["id"],
                    "item_id": created["item_id"],
                    "market_id": created["market_id"],
                    "score": 3.2,
                    "expected_range": "Plausible bounds",
                    "reason": created.get("flag_reason", "Out of bounds jump"),
                    "status": "open"
                })

        except Exception as e:
            rejected_errors.append({
                "row": row_num,
                "field": "validation",
                "reason": str(e),
                "raw": row
            })
            rejected_count += 1

    # Update batch in DB
    upload_repo.update(batch_id, {
        "status": "confirmed",
        "mapping": mapping,
        "duplicate_policy": req.duplicate_policy,
        "counts": {
            "total": len(raw_records),
            "saved": saved_count,
            "flagged": flagged_count,
            "rejected": rejected_count
        },
        "rejected_errors": rejected_errors
    })

    # Clean in-memory cache
    if batch_id in _staging_rows_cache:
        del _staging_rows_cache[batch_id]

    # Trigger automated Laspeyres index calculation cascade across all modules
    if saved_count > 0:
        try:
            cascade_res = trigger_index_recalculation(current_user["email"])
            logger.info(f"Auto-calculated index run post upload: {cascade_res}")
        except Exception as e:
            logger.warning(f"Index recalculation notice post-upload: {e}")

    audit_repo.log_event(
        actor=current_user["email"],
        action="UPLOAD_BATCH_CONFIRMED",
        resource=f"upload_batches/{batch_id}",
        metadata={"saved": saved_count, "flagged": flagged_count, "rejected": rejected_count}
    )

    return UploadConfirmResponse(
        batch_id=batch_id,
        status="confirmed",
        total_processed=len(raw_records),
        saved_count=saved_count,
        flagged_count=flagged_count,
        rejected_count=rejected_count,
        checksum=batch["checksum"],
        has_errors=rejected_count > 0,
        errors_csv_url=f"/api/v1/uploads/{batch_id}/errors.csv" if rejected_count > 0 else None
    )


@router.get("/{batch_id}/errors.csv")
def download_errors_csv(batch_id: str):
    """Exports rejected-rows CSV with error reasons as specified in §6.3 & §11."""
    upload_repo = UploadRepository()
    batch = upload_repo.get_by_id(batch_id)
    if not batch:
        raise AppException(code="NOT_FOUND", message="Batch not found", status_code=404)

    errors = batch.get("rejected_errors", [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row Number", "Failed Field", "Reason", "Original Data"])

    for err in errors:
        writer.writerow([
            err.get("row"),
            err.get("field"),
            err.get("reason"),
            str(err.get("raw", ""))
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rejected_rows_{batch_id[:8]}.csv"}
    )
