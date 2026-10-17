import pulp
from typing import Dict, Any

def apply_constraints(
    prob: pulp.LpProblem,
    x: Dict[tuple, pulp.LpVariable],
    u: Dict[tuple, pulp.LpVariable],
    data: Dict[str, Any]
) -> None:
    """
    Applies operational, logistics, market, and contractual constraints:
    1. Supply availability limits per tea grade.
    2. Demand fulfillment per market and grade (with slack u for shortfall).
    3. Contractual minimum quantities per market (if enabled).
    4. Shipping route capacities (if enabled).
    5. Packaging unit availability constraints.
    """
    markets = data["markets"]
    grades = data["grades"]
    routes = data["routes"]
    packaging = data["packaging"]
    demand_map = data["demand_map"]
    enforce_contracts = data["enforce_contractual_minimums"]
    enforce_routes = data["enforce_route_capacities"]

    # 1. Supply limit constraint per grade
    for g_id, grade in grades.items():
        relevant_vars = [var for (m, g, r, p), var in x.items() if g == g_id]
        if relevant_vars:
            prob += (
                pulp.lpSum(relevant_vars) <= float(grade.available_quantity_kg),
                f"Supply_Limit_{g_id}"
            )

    # 2. Demand fulfillment constraint per (market, grade)
    for (m_id, g_id), target_demand in demand_map.items():
        relevant_vars = [var for (m, g, r, p), var in x.items() if m == m_id and g == g_id]
        u_var = u.get((m_id, g_id))
        if relevant_vars and u_var is not None:
            prob += (
                pulp.lpSum(relevant_vars) + u_var == float(target_demand),
                f"Demand_Fulfillment_{m_id}_{g_id}"
            )

    # 3. Contractual minimum per market
    if enforce_contracts:
        for m_id, market in markets.items():
            if market.minimum_contract_kg > 0:
                market_vars = [var for (m, g, r, p), var in x.items() if m == m_id]
                if market_vars:
                    prob += (
                        pulp.lpSum(market_vars) >= float(market.minimum_contract_kg),
                        f"Contract_Min_{m_id}"
                    )

    # 4. Route capacity limits
    if enforce_routes:
        for r_id, route in routes.items():
            if route.route_capacity_kg > 0:
                route_vars = [var for (m, g, r, p), var in x.items() if r == r_id]
                if route_vars:
                    prob += (
                        pulp.lpSum(route_vars) <= float(route.route_capacity_kg),
                        f"Route_Capacity_{r_id}"
                    )

    # 5. Packaging capacity limits
    for p_id, pack in packaging.items():
        if pack.max_units_available is not None and pack.max_units_available > 0:
            max_kg = float(pack.max_units_available) * float(pack.capacity_kg_per_unit)
            pack_vars = [var for (m, g, r, p), var in x.items() if p == p_id]
            if pack_vars:
                prob += (
                    pulp.lpSum(pack_vars) <= max_kg,
                    f"Packaging_Capacity_{p_id}"
                )
