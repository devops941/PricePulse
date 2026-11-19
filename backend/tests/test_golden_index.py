import pytest
from app.analytics.index import compute_period_index, FORMULA_VERSION
from app.analytics.contributions import calculate_item_contributions
from app.analytics.chain import calculate_chain_link, apply_chain_linking


def test_golden_dataset_fixed_weight_index_and_contributions():
    """
    Hand-calculated 3-item × 4-period fixture asserted to 1e-9 tolerance (§14).
    """
    base_prices = {"A": 10.0, "B": 20.0, "C": 50.0}
    weights = {"A": 0.50, "B": 0.30, "C": 0.20}
    quantities = {"A": 10.0, "B": 5.0, "C": 2.0}

    # Period 0: Base
    idx0, rel0, cost0, pp0, cov0, _ = compute_period_index(
        current_prices=base_prices,
        base_prices=base_prices,
        weights=weights,
        base_quantities=quantities
    )
    assert abs(idx0 - 100.0) < 1e-9
    assert abs(cost0 - (10*10 + 5*20 + 2*50)) < 1e-9 # 300.0
    assert abs(pp0 - 100.0) < 1e-9
    assert cov0 == 100.0

    # Period 1: P_A=11, P_B=22, P_C=45
    p1 = {"A": 11.0, "B": 22.0, "C": 45.0}
    idx1, rel1, cost1, pp1, cov1, _ = compute_period_index(
        current_prices=p1,
        base_prices=base_prices,
        weights=weights,
        base_quantities=quantities
    )
    # R_A = 1.10, R_B = 1.10, R_C = 0.90
    # I_1 = 100 * (0.5*1.1 + 0.3*1.1 + 0.2*0.9) = 100 * (0.55 + 0.33 + 0.18) = 106.0
    assert abs(idx1 - 106.0) < 1e-9
    assert abs(rel1["A"] - 1.10) < 1e-9
    assert abs(rel1["B"] - 1.10) < 1e-9
    assert abs(rel1["C"] - 0.90) < 1e-9

    # Cost of basket = 10*11 + 5*22 + 2*45 = 110 + 110 + 90 = 310.0
    assert abs(cost1 - 310.0) < 1e-9
    # Purchasing power of 100 = 10000 / 106.0 = 94.3396 -> 94.34
    assert abs(pp1 - round(10000 / 106.0, 2)) < 1e-9

    # Period 1 Contributions vs Period 0
    c1 = calculate_item_contributions(
        relatives_t=rel1,
        relatives_prev=rel0,
        weights=weights,
        index_prev=idx0
    )
    assert abs(c1["A"]["points"] - 5.0) < 1e-9
    assert abs(c1["B"]["points"] - 3.0) < 1e-9
    assert abs(c1["C"]["points"] - (-2.0)) < 1e-9
    sum_pts1 = sum(c["points"] for c in c1.values())
    headline_change1 = idx1 - idx0
    assert abs(sum_pts1 - headline_change1) < 1e-9

    # Period 2: P_A=12, P_B=21, P_C=55
    p2 = {"A": 12.0, "B": 21.0, "C": 55.0}
    idx2, rel2, cost2, pp2, cov2, _ = compute_period_index(
        current_prices=p2,
        base_prices=base_prices,
        weights=weights,
        base_quantities=quantities
    )
    # I_2 = 100 * (0.5*1.2 + 0.3*1.05 + 0.2*1.10) = 100 * (0.60 + 0.315 + 0.22) = 113.5
    assert abs(idx2 - 113.5) < 1e-9

    c2 = calculate_item_contributions(
        relatives_t=rel2,
        relatives_prev=rel1,
        weights=weights,
        index_prev=idx1
    )
    assert abs(c2["A"]["points"] - 5.0) < 1e-9
    assert abs(c2["B"]["points"] - (-1.5)) < 1e-9
    assert abs(c2["C"]["points"] - 4.0) < 1e-9
    sum_pts2 = sum(c["points"] for c in c2.values())
    headline_change2 = idx2 - idx1
    assert abs(sum_pts2 - headline_change2) < 1e-9

    # Period 3: P_A=13, P_B=24, P_C=52
    p3 = {"A": 13.0, "B": 24.0, "C": 52.0}
    idx3, rel3, cost3, pp3, cov3, _ = compute_period_index(
        current_prices=p3,
        base_prices=base_prices,
        weights=weights,
        base_quantities=quantities
    )
    # I_3 = 100 * (0.5*1.3 + 0.3*1.2 + 0.2*1.04) = 100 * (0.65 + 0.36 + 0.208) = 121.8
    assert abs(idx3 - 121.8) < 1e-9

    c3 = calculate_item_contributions(
        relatives_t=rel3,
        relatives_prev=rel2,
        weights=weights,
        index_prev=idx2
    )
    sum_pts3 = sum(c["points"] for c in c3.values())
    headline_change3 = idx3 - idx2
    assert abs(sum_pts3 - headline_change3) < 1e-9


def test_missing_price_imputation_and_renormalisation():
    """
    Tests §5.8 rules: carry forward <= 2 periods, exclude & renormalise beyond 2 periods.
    """
    base_prices = {"A": 10.0, "B": 20.0, "C": 50.0}
    weights = {"A": 0.50, "B": 0.30, "C": 0.20}
    prev_prices = {"A": 11.0, "B": 22.0, "C": 45.0}

    # Case 1: Item C missing for period 1 (consecutive_missing = 1) -> carried forward as imputed
    p_curr = {"A": 12.0, "B": 24.0} # C is absent
    idx, rel, _, _, cov, warnings = compute_period_index(
        current_prices=p_curr,
        base_prices=base_prices,
        weights=weights,
        missing_counts={"C": 1},
        prev_prices=prev_prices
    )
    assert "C" in rel # Carried forward
    assert cov == 80.0 # Real observed weight share is 0.5 + 0.3 = 0.8
    assert any("carried forward as imputed" in w for w in warnings)

    # Case 2: Item C missing for > 2 periods (consecutive_missing = 3) -> excluded and weights renormalised
    idx_renorm, rel_renorm, _, _, cov_renorm, warnings_renorm = compute_period_index(
        current_prices=p_curr,
        base_prices=base_prices,
        weights=weights,
        missing_counts={"C": 3},
        prev_prices=prev_prices
    )
    # Weights for A and B renormalised to sum to 1:
    # w_A' = 0.5 / 0.8 = 0.625, w_B' = 0.3 / 0.8 = 0.375
    # R_A = 12/10 = 1.2, R_B = 24/20 = 1.2
    # I = 100 * (0.625*1.2 + 0.375*1.2) = 120.0
    assert abs(idx_renorm - 120.0) < 1e-9
    assert cov_renorm == 80.0
    assert any("renormalised" in w for w in warnings_renorm)


def test_chain_linking_when_basket_version_changes():
    """
    Tests §5.4: Chain linking I_t = I_{t-1} * L_{t-1->t}
    """
    # Suppose old index reached 120.0 in period t-1
    old_index_prev = 120.0

    # New basket version introduced with new weights: A=0.40, B=0.40, C=0.20
    new_weights = {"A": 0.40, "B": 0.40, "C": 0.20}

    # Prices in adjacent periods t-1 and t
    p_prev = {"A": 12.0, "B": 24.0, "C": 50.0}
    p_curr = {"A": 13.2, "B": 25.2, "C": 52.5}
    # R_{A} = 13.2 / 12.0 = 1.10
    # R_{B} = 25.2 / 24.0 = 1.05
    # R_{C} = 52.5 / 50.0 = 1.05
    # Link L = 0.40 * 1.10 + 0.40 * 1.05 + 0.20 * 1.05 = 0.44 + 0.42 + 0.21 = 1.07
    link = calculate_chain_link(p_curr, p_prev, new_weights)
    assert abs(link - 1.07) < 1e-9

    # Chain linked index = 120.0 * 1.07 = 128.4
    chained = apply_chain_linking(old_index_prev, link)
    assert abs(chained - 128.4) < 1e-9
