import math
from typing import List, Dict, Any, Optional
import numpy as np


def aggregate_market_prices(
    observations: List[Dict[str, Any]],
    method: str = "mean" # "mean", "median", "geometric" (Jevons)
) -> Dict[str, float]:
    """
    Aggregates valid prices across markets for each item in a period (§5).
    Elementary aggregation:
      - 'mean': Arithmetic mean of prices across markets.
      - 'median': Median price across markets.
      - 'geometric': Geometric mean (Jevons index elementary formula): (∏ p_m)^(1/M).
    """
    item_prices: Dict[str, List[float]] = {}
    for obs in observations:
        if obs.get("status") not in ("valid", "imputed"):
            continue
        item_id = obs["item_id"]
        price = float(obs.get("price_per_canonical_unit") or obs.get("price") or 0.0)
        if price > 0:
            if item_id not in item_prices:
                item_prices[item_id] = []
            item_prices[item_id].append(price)

    results: Dict[str, float] = {}
    for item_id, prices in item_prices.items():
        if not prices:
            continue
        if method == "median":
            results[item_id] = float(np.median(prices))
        elif method == "geometric": # Jevons elementary index
            log_sum = sum(math.log(p) for p in prices)
            results[item_id] = float(math.exp(log_sum / len(prices)))
        else: # default arithmetic mean
            results[item_id] = float(np.mean(prices))

    return results
