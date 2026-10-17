import copy
from typing import Dict, Any, List
from app.schemas.optimization import OptimizationRequest
from app.M4.optimizer import M4ExportOptimizer

def run_sensitivity_analysis(
    base_request: OptimizationRequest,
    parameter: str = "freight_cost",
    variations: List[float] = None
) -> List[Dict[str, Any]]:
    """
    Executes multiple runs varying a single operational parameter (e.g., -20%, -10%, 0%, +10%, +20%)
    and records objective values, feasibility, and delta changes.
    """
    if variations is None:
        variations = [-0.20, -0.10, 0.0, 0.10, 0.20]

    optimizer = M4ExportOptimizer()
    base_result = optimizer.solve(base_request)
    base_cost = base_result.get("total_cost_usd", 1.0)

    results = []
    for var_rate in variations:
        mult = 1.0 + var_rate
        req_copy = copy.deepcopy(base_request)

        if parameter == "freight_cost":
            for r in req_copy.routes:
                r.freight_cost_usd_per_kg *= mult
        elif parameter == "market_demand":
            for d in req_copy.demand:
                d.predicted_demand_kg *= mult
        elif parameter == "supply_capacity":
            for s in req_copy.supply:
                s.available_quantity_kg *= mult
        elif parameter == "packaging_cost":
            for p in req_copy.packaging:
                p.packaging_cost_usd_per_kg *= mult

        sol = optimizer.solve(req_copy)
        sol_cost = sol.get("total_cost_usd", 0.0)
        diff_abs = sol_cost - base_cost
        diff_pct = (diff_abs / base_cost * 100.0) if base_cost > 0 else 0.0

        results.append({
            "parameter": parameter,
            "variation_percentage": round(var_rate * 100.0, 1),
            "multiplier": round(mult, 2),
            "status": sol.get("status", "Unknown"),
            "is_feasible": sol.get("status") == "Optimal",
            "modified_cost_usd": sol_cost,
            "base_cost_usd": base_cost,
            "cost_diff_usd": round(diff_abs, 2),
            "cost_diff_pct": round(diff_pct, 2),
            "fulfillment_rate_pct": sol.get("fulfillment_rate_pct", 0.0),
        })

    return results
