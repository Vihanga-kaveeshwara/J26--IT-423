export interface MarketInput {
  market_id: string;
  market_name: string;
  destination_port: string;
  minimum_contract_kg?: number;
  maximum_demand_multiplier?: number;
  priority_weight?: number;
}

export interface SupplyInput {
  tea_grade_id: string;
  tea_grade_name: string;
  available_quantity_kg: number;
  unit_supply_cost_usd_per_kg: number;
}

export interface DemandInput {
  market_id: string;
  tea_grade_id: string;
  predicted_demand_kg: number;
  lower_demand_kg?: number;
  upper_demand_kg?: number;
}

export interface RouteInput {
  route_id: string;
  origin?: string;
  destination_market_id: string;
  destination_port: string;
  freight_cost_usd_per_kg: number;
  handling_cost_usd_per_kg?: number;
  customs_admin_cost_usd_per_kg?: number;
  transit_days_estimate?: number;
  route_capacity_kg?: number;
  route_risk_score?: number;
  route_available?: boolean;
}

export interface PackagingInput {
  packaging_id: string;
  packaging_name: string;
  packaging_cost_usd_per_kg: number;
  capacity_kg_per_unit?: number;
  wastage_rate?: number;
  max_units_available?: number;
}

export interface OptimizationRunRequest {
  scenario_id?: string;
  scenario_name?: string;
  planning_horizon: string;
  dataset_version: string;
  markets: MarketInput[];
  supply: SupplyInput[];
  demand: DemandInput[];
  routes: RouteInput[];
  packaging: PackagingInput[];
  enforce_contractual_minimums?: boolean;
  enforce_route_capacities?: boolean;
  unmet_demand_penalty_per_kg?: number;
}

export interface AllocationItem {
  market_id: string;
  market_name: string;
  tea_grade_id: string;
  tea_grade_name: string;
  route_id: string;
  origin: string;
  destination_port: string;
  packaging_id: string;
  allocated_quantity_kg: number;
  unit_cost_usd_per_kg: number;
  total_cost_usd: number;
}

export interface CostBreakdown {
  procurement_cost_usd: number;
  packaging_cost_usd: number;
  freight_cost_usd: number;
  handling_cost_usd: number;
  customs_admin_cost_usd: number;
  estimated_wastage_cost_usd: number;
  unmet_demand_penalties_usd: number;
  total_cost_usd: number;
}

export interface OptimizationRunResponse {
  success: boolean;
  status: string;
  run_id?: string;
  scenario_id?: string;
  total_cost_usd: number;
  total_allocated_kg: number;
  total_demand_kg: number;
  fulfillment_rate_pct: number;
  baseline_estimated_cost_usd: number;
  estimated_savings_usd: number;
  estimated_savings_pct: number;
  execution_time_seconds: number;
  cost_breakdown: CostBreakdown;
  allocations: AllocationItem[];
  solver_message: string;
  timestamp: string;
}
