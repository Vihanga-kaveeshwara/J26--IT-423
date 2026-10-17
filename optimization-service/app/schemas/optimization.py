from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class MarketInput(BaseModel):
    market_id: str
    market_name: str
    destination_port: str
    minimum_contract_kg: float = 0.0
    maximum_demand_multiplier: float = 1.0
    priority_weight: float = 1.0

class SupplyInput(BaseModel):
    tea_grade_id: str
    tea_grade_name: str
    available_quantity_kg: float
    unit_supply_cost_usd_per_kg: float

class DemandInput(BaseModel):
    market_id: str
    tea_grade_id: str
    predicted_demand_kg: float
    lower_demand_kg: Optional[float] = None
    upper_demand_kg: Optional[float] = None

class RouteInput(BaseModel):
    route_id: str
    origin: str = "Colombo Port, Sri Lanka"
    destination_market_id: str
    destination_port: str
    freight_cost_usd_per_kg: float
    handling_cost_usd_per_kg: float = 0.08
    customs_admin_cost_usd_per_kg: float = 0.04
    transit_days_estimate: int = 21
    route_capacity_kg: float = 500000.0
    route_risk_score: float = 0.15
    route_available: bool = True

class PackagingInput(BaseModel):
    packaging_id: str
    packaging_name: str
    packaging_cost_usd_per_kg: float = 0.07
    capacity_kg_per_unit: float = 500.0
    wastage_rate: float = 0.012
    max_units_available: Optional[int] = 2000

class OptimizationRequest(BaseModel):
    scenario_id: Optional[str] = "SCN-DEFAULT"
    scenario_name: Optional[str] = "Ceylon Tea Export Base Optimization"
    planning_horizon: str = "2024Q1"
    dataset_version: str = "M4-DS-v1.0"
    markets: List[MarketInput] = Field(default_factory=list)
    supply: List[SupplyInput] = Field(default_factory=list)
    demand: List[DemandInput] = Field(default_factory=list)
    routes: List[RouteInput] = Field(default_factory=list)
    packaging: List[PackagingInput] = Field(default_factory=list)
    enforce_contractual_minimums: bool = True
    enforce_route_capacities: bool = True
    unmet_demand_penalty_per_kg: float = 12.0

class AllocationResult(BaseModel):
    market_id: str
    market_name: str
    tea_grade_id: str
    tea_grade_name: str
    route_id: str
    origin: str
    destination_port: str
    packaging_id: str
    allocated_quantity_kg: float
    unit_cost_usd_per_kg: float
    total_cost_usd: float

class CostBreakdown(BaseModel):
    procurement_cost_usd: float
    packaging_cost_usd: float
    freight_cost_usd: float
    handling_cost_usd: float
    customs_admin_cost_usd: float
    estimated_wastage_cost_usd: float
    unmet_demand_penalties_usd: float
    total_cost_usd: float

class OptimizationResponse(BaseModel):
    success: bool
    status: str  # Optimal, Infeasible, Unbounded, Failed
    scenario_id: Optional[str]
    total_cost_usd: float
    total_allocated_kg: float
    total_demand_kg: float
    fulfillment_rate_pct: float
    baseline_estimated_cost_usd: float
    estimated_savings_usd: float
    estimated_savings_pct: float
    execution_time_seconds: float
    cost_breakdown: CostBreakdown
    allocations: List[AllocationResult]
    solver_message: str
    timestamp: str
