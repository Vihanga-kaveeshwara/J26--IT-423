from typing import Dict, Any, List
from app.schemas.optimization import OptimizationRequest

def prepare_optimization_data(request: OptimizationRequest) -> Dict[str, Any]:
    """
    Standardize, validate, and index all inputs for the MILP formulation.
    """
    markets = {m.market_id: m for m in request.markets}
    grades = {s.tea_grade_id: s for s in request.supply}
    routes = {r.route_id: r for r in request.routes if r.route_available}
    packaging = {p.packaging_id: p for p in request.packaging}

    # Demand map (market_id, tea_grade_id) -> float
    demand_map = {}
    for d in request.demand:
        demand_map[(d.market_id, d.tea_grade_id)] = float(d.predicted_demand_kg)

    # Routes to market
    market_routes: Dict[str, List[str]] = {}
    for r_id, r in routes.items():
        market_routes.setdefault(r.destination_market_id, []).append(r_id)

    return {
        "markets": markets,
        "grades": grades,
        "routes": routes,
        "packaging": packaging,
        "demand_map": demand_map,
        "market_routes": market_routes,
        "enforce_contractual_minimums": request.enforce_contractual_minimums,
        "enforce_route_capacities": request.enforce_route_capacities,
        "unmet_demand_penalty_per_kg": request.unmet_demand_penalty_per_kg,
    }
