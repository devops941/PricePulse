from typing import Dict, Any, List


def calculate_chain_link(
    prices_curr: Dict[str, float],
    prices_prev: Dict[str, float],
    new_weights: Dict[str, float]
) -> float:
    """
    Computes chain link L_{t-1->t} using the new basket weights (§5.4).
    L = Σ w_new,i * (P_it / P_{i,t-1})
    """
    total_link = 0.0
    for item_id, w in new_weights.items():
        p_curr = prices_curr.get(item_id, 0.0)
        p_prev = prices_prev.get(item_id, 0.0)
        if p_prev > 0 and p_curr > 0:
            rel = p_curr / p_prev
            total_link += w * rel
        else:
            # If item missing in overlap, link relative is 1.0
            total_link += w * 1.0
    return total_link


def apply_chain_linking(
    index_prev: float,
    link_factor: float
) -> float:
    """I_t = I_{t-1} * L_{t-1->t}"""
    return round(index_prev * link_factor, 6)
