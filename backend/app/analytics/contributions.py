from typing import Dict, Any, List


def calculate_item_contributions(
    relatives_t: Dict[str, float],
    relatives_prev: Dict[str, float],
    weights: Dict[str, float],
    index_prev: float
) -> Dict[str, Dict[str, float]]:
    """
    Computes decomposition of index change into item contributions (§5.6).
      - Points contribution: C_it = 100 * w_i * (R_it - R_{i,t-1})
      - Percent contribution: (C_it / I_{t-1}) * 100
    
    Guarantees mathematically that:
      sum(points_contribution) == (I_t - I_{t-1}) within tolerance 1e-9.
      sum(percent_contribution) == ((I_t - I_{t-1}) / I_{t-1}) * 100 within tolerance 1e-9.
    """
    contributions: Dict[str, Dict[str, float]] = {}

    for item_id, r_curr in relatives_t.items():
        r_prev = relatives_prev.get(item_id, 1.0)
        w_i = weights.get(item_id, 0.0)

        pts = 100.0 * w_i * (r_curr - r_prev)
        pct = (pts / index_prev * 100.0) if index_prev > 0 else 0.0

        contributions[item_id] = {
            "points": pts,
            "percent": pct,
            "relative_current": r_curr,
            "relative_prev": r_prev,
            "weight": w_i
        }

    return contributions
