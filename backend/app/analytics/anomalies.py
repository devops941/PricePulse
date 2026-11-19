"""
Robust Anomaly Detection Engine (§6, §11, §17).
Implements Median Absolute Deviation (MAD) robust z-scores and physical sanity boundary checks.
"""
from typing import List, Dict, Any, Optional
import numpy as np


def compute_mad_zscore(values: List[float], candidate: float) -> float:
    """
    Computes robust z-score: |x - median| / (1.4826 * MAD)
    Returns 0.0 if MAD is zero.
    """
    arr = np.array(values, dtype=float)
    if len(arr) == 0:
        return 0.0
    med = float(np.median(arr))
    mad = float(np.median(np.abs(arr - med)))
    if mad == 0.0:
        return 0.0
    # 1.4826 normalizes MAD to standard deviation for normal distributions
    norm_mad = 1.4826 * mad
    return abs(candidate - med) / norm_mad


def detect_price_anomalies(
    candidate_price: float,
    history_prices: List[float],
    plausible_min: Optional[float] = None,
    plausible_max: Optional[float] = None,
    previous_price: Optional[float] = None,
    zscore_threshold: float = 3.0
) -> Dict[str, Any]:
    """
    Detects if candidate price violates sanity rules or robust MAD z-score.
    """
    reasons = []

    # 1. Physical non-negativity
    if candidate_price <= 0:
        return {
            "is_anomaly": True,
            "reasons": ["PRICE_NON_POSITIVE: Price must be strictly greater than zero."],
            "severity": "critical",
            "zscore": 999.0
        }

    # 2. Plausible bounds check
    if plausible_min is not None and candidate_price < plausible_min:
        reasons.append(f"BELOW_PLAUSIBLE_MIN: Reported ₹{candidate_price:.2f} is below min bound ₹{plausible_min:.2f}.")
    if plausible_max is not None and candidate_price > plausible_max:
        reasons.append(f"ABOVE_PLAUSIBLE_MAX: Reported ₹{candidate_price:.2f} is above max bound ₹{plausible_max:.2f}.")

    # 3. Ratio to previous price spike check (>5x or <0.2x)
    if previous_price is not None and previous_price > 0:
        ratio = candidate_price / previous_price
        if ratio > 5.0:
            reasons.append(f"EXTREME_SPIKE: Price surged {ratio:.1f}x relative to prior period ₹{previous_price:.2f}.")
        elif ratio < 0.2:
            reasons.append(f"EXTREME_COLLAPSE: Price collapsed to {ratio:.2f}x of prior period ₹{previous_price:.2f}.")

    # 4. Robust MAD z-score across historical observations
    zscore = 0.0
    if len(history_prices) >= 4:
        zscore = round(compute_mad_zscore(history_prices, candidate_price), 2)
        if zscore > zscore_threshold:
            reasons.append(f"ROBUST_ZSCORE_EXCEEDED: MAD z-score {zscore:.2f} exceeds threshold {zscore_threshold:.1f}.")

    is_anomaly = len(reasons) > 0
    severity = "high" if any("EXTREME" in r or "PLAUSIBLE" in r for r in reasons) else ("medium" if is_anomaly else "normal")

    return {
        "is_anomaly": is_anomaly,
        "reasons": reasons,
        "severity": severity,
        "zscore": zscore
    }
