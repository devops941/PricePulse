from datetime import datetime, date, timezone
from typing import Dict, Any, Tuple, Optional
from app.repositories.all_repositories import MarketRepository, ItemRepository, PriceRepository


import re

# Base unit to canonical multiplier
# e.g. how many canonical units is 1 unit of this base unit?
# for canonical "kg": 1 g is 0.001 kg, 1 kg is 1.0 kg
UNIT_TO_CANONICAL = {
    ("g", "kg"): 0.001,
    ("kg", "kg"): 1.0,
    ("ml", "l"): 0.001,
    ("l", "l"): 1.0,
    ("dozen", "dozen"): 1.0,
    ("piece", "piece"): 1.0,
    ("cylinder", "cylinder"): 1.0,
    ("pack", "pack"): 1.0,
}


def parse_unit(unit_str: str) -> Tuple[float, str]:
    """Parses unit string with optional numeric quantity, e.g. '500 g', '250g', 'kg'."""
    s = unit_str.strip().lower()
    match = re.match(r"^([\d.]+)\s*([a-z]+)$", s)
    if match:
        return float(match.group(1)), match.group(2)
    return 1.0, s


def convert_to_canonical_unit(
    price: float,
    unit: str,
    canonical_unit: str
) -> Tuple[float, str]:
    """
    Converts entered price and unit into canonical price per canonical unit.
    e.g. '500 g' at ₹30 where canonical is 'kg' -> ₹60 / kg.
    """
    qty, u = parse_unit(unit)
    _, cu = parse_unit(canonical_unit)

    key = (u, cu)
    if key not in UNIT_TO_CANONICAL:
        raise ValueError(f"Cannot convert unit '{unit}' to canonical unit '{canonical_unit}'")

    multiplier = UNIT_TO_CANONICAL[key]
    effective_canonical_qty = qty * multiplier

    if effective_canonical_qty <= 0:
        raise ValueError(f"Effective canonical quantity must be positive, got {effective_canonical_qty}")

    price_per_canonical = price / effective_canonical_qty
    return round(price_per_canonical, 4), cu


def get_period_key(obs_date_str: str) -> str:
    """
    Computes ISO week period key (e.g. '2026-W42') and month key (e.g. '2026-10') from date.
    """
    d = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def validate_price_observation(
    data: Dict[str, Any],
    market_cache: Optional[Dict[str, Any]] = None,
    item_cache: Optional[Dict[str, Any]] = None,
    skip_db_checks: bool = False
) -> Dict[str, Any]:
    """
    Validates observation against Catalog rules (§6).
    Returns cleaned payload with price_per_canonical_unit and status (valid/flagged/rejected).
    """
    market_id = data.get("market_id")
    item_id = data.get("item_id")
    obs_date_str = str(data.get("date", "")).strip()
    raw_price = data.get("price")
    raw_unit = str(data.get("unit", "")).strip()
    source = data.get("source", "manual")

    # 1. Required fields
    if not market_id:
        raise ValueError("market_id is required")
    if not item_id:
        raise ValueError("item_id is required")
    if not obs_date_str:
        raise ValueError("date is required (YYYY-MM-DD)")
    if raw_price is None:
        raise ValueError("price is required")
    if not raw_unit:
        raise ValueError("unit is required")

    # 2. Numeric price > 0
    try:
        price = float(raw_price)
        if price <= 0:
            raise ValueError(f"price must be strictly positive (> 0), got {price}")
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid numeric price: {raw_price}")

    # 3. Date parsing & future check
    try:
        obs_date = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"date format must be YYYY-MM-DD, got {obs_date_str}")

    today = datetime.now(timezone.utc).date()
    if obs_date > today:
        raise ValueError(f"Observation date cannot be in the future (Obs: {obs_date}, Today: {today})")

    # 4. Check Market & Item existence
    item_doc = None
    if not skip_db_checks:
        if market_cache and market_id in market_cache:
            market_doc = market_cache[market_id]
        else:
            market_doc = MarketRepository().get_by_id(market_id)
        if not market_doc:
            raise ValueError(f"Market with id '{market_id}' does not exist")

        if item_cache and item_id in item_cache:
            item_doc = item_cache[item_id]
        else:
            item_doc = ItemRepository().get_by_id(item_id)
        if not item_doc:
            raise ValueError(f"Item with id '{item_id}' does not exist")

    canonical_unit = item_doc.get("canonical_unit", raw_unit) if item_doc else raw_unit
    min_plausible = item_doc.get("min_plausible", 0.0) if item_doc else 0.0
    max_plausible = item_doc.get("max_plausible", 999999.0) if item_doc else 999999.0

    # 5. Unit conversion to canonical unit
    price_per_canonical, canonical_u = convert_to_canonical_unit(price, raw_unit, canonical_unit)

    # 6. Status: check plausible range & outlier flag
    status = "valid"
    flag_reason = None

    if price_per_canonical < min_plausible or price_per_canonical > max_plausible:
        # As per §6: outlier flag (not reject) for large jumps / bounds
        status = "flagged"
        flag_reason = f"Price per canonical unit (₹{price_per_canonical:.2f}) falls outside plausible bounds [₹{min_plausible}, ₹{max_plausible}]"

    period_key = get_period_key(obs_date_str)

    return {
        "market_id": market_id,
        "item_id": item_id,
        "date": obs_date_str,
        "period_key": period_key,
        "price": price,
        "unit": raw_unit,
        "price_per_canonical_unit": price_per_canonical,
        "canonical_unit": canonical_u,
        "source": source,
        "status": status,
        "flag_reason": flag_reason,
        "notes": data.get("notes", "")
    }
