import pulp
from typing import Dict, Any

def build_objective(
    prob: pulp.LpProblem,
    x: Dict[tuple, pulp.LpVariable],
    u: Dict[tuple, pulp.LpVariable],
    data: Dict[str, Any]
) -> None:
    """
    Formulates the total export cost objective function:
    Procurement + Packaging + Freight + Handling + Customs + Wastage + Unmet Demand Penalties.
    """
    grades = data["grades"]
    routes = data["routes"]
    packaging = data["packaging"]
    penalty_rate = data["unmet_demand_penalty_per_kg"]

    cost_terms = []

    for (m_id, g_id, r_id, p_id), var in x.items():
        grade = grades[g_id]
        route = routes[r_id]
        pack = packaging[p_id]

        c_proc = grade.unit_supply_cost_usd_per_kg
        c_pack = pack.packaging_cost_usd_per_kg
        c_freight = route.freight_cost_usd_per_kg
        c_hand = route.handling_cost_usd_per_kg
        c_cust = route.customs_admin_cost_usd_per_kg
        # Wastage cost estimate based on packaging wastage rate applied to procurement + packaging
        c_waste = pack.wastage_rate * (c_proc + c_pack)

        unit_cost = c_proc + c_pack + c_freight + c_hand + c_cust + c_waste
        cost_terms.append(unit_cost * var)

    for (m_id, g_id), u_var in u.items():
        cost_terms.append(penalty_rate * u_var)

    prob += pulp.lpSum(cost_terms), "Total_Export_Cost_Objective"
