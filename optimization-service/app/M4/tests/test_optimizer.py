import pytest
from app.schemas.optimization import (
    OptimizationRequest, MarketInput, SupplyInput, DemandInput, RouteInput, PackagingInput
)
from app.M4.optimizer import M4ExportOptimizer

def test_m4_deterministic_solver_feasible():
    request = OptimizationRequest(
        scenario_id="TEST-001",
        markets=[
            MarketInput(market_id="RUS", market_name="Russia", destination_port="Novorossiysk", minimum_contract_kg=5000),
            MarketInput(market_id="UAE", market_name="UAE", destination_port="Jebel Ali", minimum_contract_kg=3000),
        ],
        supply=[
            SupplyInput(tea_grade_id="BOP", tea_grade_name="BOP Black Tea", available_quantity_kg=50000, unit_supply_cost_usd_per_kg=3.2),
            SupplyInput(tea_grade_id="OP", tea_grade_name="OP Black Tea", available_quantity_kg=40000, unit_supply_cost_usd_per_kg=3.5),
        ],
        demand=[
            DemandInput(market_id="RUS", tea_grade_id="BOP", predicted_demand_kg=15000),
            DemandInput(market_id="UAE", tea_grade_id="OP", predicted_demand_kg=10000),
        ],
        routes=[
            RouteInput(route_id="R-RUS-1", destination_market_id="RUS", destination_port="Novorossiysk", freight_cost_usd_per_kg=0.85, route_capacity_kg=20000),
            RouteInput(route_id="R-UAE-1", destination_market_id="UAE", destination_port="Jebel Ali", freight_cost_usd_per_kg=0.45, route_capacity_kg=20000),
        ],
        packaging=[
            PackagingInput(packaging_id="PKG-BULK", packaging_name="Bulk Liner", packaging_cost_usd_per_kg=0.08, wastage_rate=0.01)
        ],
        enforce_contractual_minimums=True,
        enforce_route_capacities=True
    )

    optimizer = M4ExportOptimizer()
    result = optimizer.solve(request)

    assert result["success"] is True
    assert result["status"] == "Optimal"
    assert result["total_allocated_kg"] == 25000
    assert result["total_cost_usd"] > 0
    assert len(result["allocations"]) == 2

def test_m4_infeasible_contract_min():
    # Supply is strictly less than contractual minimum -> should lead to infeasible or high penalty
    request = OptimizationRequest(
        scenario_id="TEST-INFEASIBLE",
        markets=[
            MarketInput(market_id="RUS", market_name="Russia", destination_port="Novorossiysk", minimum_contract_kg=100000),
        ],
        supply=[
            SupplyInput(tea_grade_id="BOP", tea_grade_name="BOP Black Tea", available_quantity_kg=5000, unit_supply_cost_usd_per_kg=3.2),
        ],
        demand=[
            DemandInput(market_id="RUS", tea_grade_id="BOP", predicted_demand_kg=100000),
        ],
        routes=[
            RouteInput(route_id="R-RUS-1", destination_market_id="RUS", destination_port="Novorossiysk", freight_cost_usd_per_kg=0.85, route_capacity_kg=200000),
        ],
        packaging=[
            PackagingInput(packaging_id="PKG-BULK", packaging_name="Bulk Liner", packaging_cost_usd_per_kg=0.08, wastage_rate=0.01)
        ],
        enforce_contractual_minimums=True,
        enforce_route_capacities=True
    )

    optimizer = M4ExportOptimizer()
    result = optimizer.solve(request)
    # Because supply is 5000 but min contract is 100000, the contract constraint cannot be satisfied
    assert result["status"] == "Infeasible" or result["success"] is False
