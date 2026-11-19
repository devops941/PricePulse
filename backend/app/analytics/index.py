from typing import Dict, Any, List, Tuple, Optional
from app.analytics.prices import aggregate_market_prices
from app.analytics.contributions import calculate_item_contributions
from app.analytics.chain import calculate_chain_link, apply_chain_linking


FORMULA_VERSION = "idx-v1"


def compute_period_index(
    current_prices: Dict[str, float],
    base_prices: Dict[str, float],
    weights: Dict[str, float],
    base_quantities: Optional[Dict[str, float]] = None,
    missing_counts: Optional[Dict[str, int]] = None,
    prev_prices: Optional[Dict[str, float]] = None
) -> Tuple[float, Dict[str, float], float, float, float, List[str]]:
    """
    Computes Laspeyres-type fixed-weight index for a single period (§5.1-5.8).

    Returns:
      (index_value, price_relatives, basket_cost, purchasing_power_100, coverage_pct, warnings)
    """
    relatives: Dict[str, float] = {}
    effective_weights: Dict[str, float] = {}
    total_real_weight = 0.0
    warnings: List[str] = []

    missing_counts = missing_counts or {}
    prev_prices = prev_prices or {}
    base_quantities = base_quantities or {item_id: 1.0 for item_id in weights}

    # Step 1: Identify present vs missing prices
    for item_id, w in weights.items():
        p_base = base_prices.get(item_id, 0.0)
        p_curr = current_prices.get(item_id, 0.0)

        if p_base <= 0:
            warnings.append(f"Item '{item_id}' has non-positive or missing base price ({p_base}). Excluded.")
            continue

        if p_curr > 0:
            # Real price observed
            rel = p_curr / p_base
            relatives[item_id] = rel
            effective_weights[item_id] = w
            total_real_weight += w
        else:
            # Missing price handling (§5.8)
            consecutive_missing = missing_counts.get(item_id, 0)
            if consecutive_missing < 2 and item_id in prev_prices:
                # Carry forward at most 2 periods and mark as imputed
                imputed_p = prev_prices[item_id]
                rel = imputed_p / p_base
                relatives[item_id] = rel
                effective_weights[item_id] = w
                warnings.append(f"Item '{item_id}' carried forward as imputed (period {consecutive_missing + 1}/2).")
            else:
                # Exclude beyond 2 periods; weights will be renormalised
                warnings.append(f"Item '{item_id}' missing for >2 periods. Excluded and weights renormalised.")

    # Step 2: Renormalise weights if items were excluded (§5.8)
    sum_effective_w = sum(effective_weights.values())
    coverage_pct = round((total_real_weight / sum(weights.values())) * 100.0, 2) if weights else 0.0

    if sum_effective_w <= 0:
        return 100.0, {}, 0.0, 100.0, 0.0, ["CRITICAL: No valid items in period. Returned base 100.0."]

    # Renormalise
    norm_weights = {item_id: w / sum_effective_w for item_id, w in effective_weights.items()}

    # Step 3: Laspeyres Index I_t = 100 * Σ w_i * R_it (§5.3)
    index_val = 100.0 * sum(norm_weights[item_id] * relatives[item_id] for item_id in norm_weights)

    # Step 4: Basket cost in ₹: Σ q_i * P_it (§5.7)
    basket_cost = sum(
        base_quantities.get(item_id, 1.0) * current_prices.get(item_id, prev_prices.get(item_id, 0.0))
        for item_id in weights
    )

    # Step 5: Purchasing power of ₹100 = 10000 / I_t (§5.7)
    purchasing_power_100 = (10000.0 / index_val) if index_val > 0 else 100.0

    return round(index_val, 6), relatives, round(basket_cost, 2), round(purchasing_power_100, 2), coverage_pct, warnings


def build_full_series(
    period_observations: Dict[str, List[Dict[str, Any]]], # period_key -> list of observations
    base_period_key: str,
    basket_lines: List[Dict[str, Any]], # [{item_id, weight, base_quantity}]
    categories_map: Optional[Dict[str, str]] = None, # item_id -> category_name
    aggregation_method: str = "mean",
    frequency: str = "weekly"
) -> Dict[str, Any]:
    """
    Builds chronological index series with MoM, YoY, contributions, and category indices.
    """
    sorted_periods = sorted(period_observations.keys())
    if not sorted_periods:
        return {"series": [], "contributions": {}, "category_series": {}, "warnings": ["No periods found"]}

    weights = {l["item_id"]: float(l["weight"]) for l in basket_lines}
    quantities = {l["item_id"]: float(l.get("base_quantity", 1.0)) for l in basket_lines}

    # Aggregate base period prices
    base_obs = period_observations.get(base_period_key, [])
    if not base_obs and sorted_periods:
        # Fallback to first available period if base_period_key has no direct rows
        base_period_key = sorted_periods[0]
        base_obs = period_observations[base_period_key]

    base_prices = aggregate_market_prices(base_obs, method=aggregation_method)

    series = []
    contributions_by_period = {}
    missing_trackers = {it: 0 for it in weights}
    prev_period_prices = base_prices.copy()
    prev_relatives = {it: 1.0 for it in weights}
    prev_index = 100.0

    lag_periods = 52 if frequency == "weekly" else 12

    for p_idx, p_key in enumerate(sorted_periods):
        obs_list = period_observations[p_key]
        curr_prices = aggregate_market_prices(obs_list, method=aggregation_method)

        # Update missing counters
        for it in weights:
            if it not in curr_prices or curr_prices[it] <= 0:
                missing_trackers[it] += 1
            else:
                missing_trackers[it] = 0

        idx_val, relatives, cost, pp100, coverage, p_warnings = compute_period_index(
            current_prices=curr_prices,
            base_prices=base_prices,
            weights=weights,
            base_quantities=quantities,
            missing_counts=missing_trackers,
            prev_prices=prev_period_prices
        )

        # Inflation MoM & YoY (§5.5)
        mom = round(((idx_val / prev_index) - 1.0) * 100.0, 2) if p_idx > 0 else 0.0
        
        yoy = None
        if p_idx >= lag_periods:
            yoy_base_idx = series[p_idx - lag_periods]["index"]
            yoy = round(((idx_val / yoy_base_idx) - 1.0) * 100.0, 2)
        elif p_idx > 0:
            # If full lag not yet reached, report change vs period 0
            yoy = round(((idx_val / 100.0) - 1.0) * 100.0, 2)

        # Contributions (§5.6)
        if p_idx > 0:
            period_contribs = calculate_item_contributions(
                relatives_t=relatives,
                relatives_prev=prev_relatives,
                weights=weights,
                index_prev=prev_index
            )
            contributions_by_period[p_key] = period_contribs

        series.append({
            "period": p_key,
            "index": round(idx_val, 2),
            "mom": mom,
            "yoy": yoy,
            "coverage": coverage,
            "basket_cost": cost,
            "purchasing_power_100": pp100,
            "warnings": p_warnings
        })

        prev_period_prices = {**prev_period_prices, **curr_prices}
        prev_relatives = relatives
        prev_index = idx_val

    return {
        "formula_version": FORMULA_VERSION,
        "base_period": base_period_key,
        "frequency": frequency,
        "series": series,
        "contributions": contributions_by_period,
        "base_prices": base_prices
    }
