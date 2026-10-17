-- ==============================================================================
-- CEYLON INTELLIGENCE: M4 PRESCRIPTIVE OPTIMIZATION ENGINE
-- PostgreSQL Database DDL Specification
-- Database: tea_export_db
-- ==============================================================================

-- 1. Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('Admin', 'Export Manager', 'Logistics Coordinator', 'Research Analyst')),
    organization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Datasets & Version Registry
CREATE TABLE IF NOT EXISTS datasets (
    dataset_id VARCHAR(64) PRIMARY KEY,
    version_tag VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    source_component VARCHAR(64) DEFAULT 'M4_INTEGRATED',
    record_count INT DEFAULT 0,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Export Markets
CREATE TABLE IF NOT EXISTS export_markets (
    market_id VARCHAR(32) PRIMARY KEY,
    market_name VARCHAR(128) NOT NULL,
    destination_port VARCHAR(128) NOT NULL,
    currency VARCHAR(16) DEFAULT 'USD',
    active BOOLEAN DEFAULT TRUE,
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

-- 4. Tea Grades
CREATE TABLE IF NOT EXISTS tea_grades (
    tea_grade_id VARCHAR(32) PRIMARY KEY,
    tea_grade_name VARCHAR(128) NOT NULL,
    illustrative_supply_cost_usd_per_kg NUMERIC(10, 4) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

-- 5. Shipping Routes & Logistics Costs
CREATE TABLE IF NOT EXISTS shipping_routes (
    route_id VARCHAR(64) PRIMARY KEY,
    origin VARCHAR(128) DEFAULT 'Colombo Port, Sri Lanka',
    destination_market_id VARCHAR(32) REFERENCES export_markets(market_id),
    destination_port VARCHAR(128) NOT NULL,
    freight_cost_usd_per_kg NUMERIC(10, 4) NOT NULL,
    handling_cost_usd_per_kg NUMERIC(10, 4) DEFAULT 0.08,
    customs_admin_cost_usd_per_kg NUMERIC(10, 4) DEFAULT 0.04,
    transit_days_estimate INT DEFAULT 21,
    route_capacity_kg NUMERIC(14, 2) DEFAULT 500000.0,
    route_risk_score NUMERIC(5, 4) DEFAULT 0.15,
    route_available BOOLEAN DEFAULT TRUE,
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

CREATE INDEX IF NOT EXISTS idx_routes_dest ON shipping_routes(destination_market_id);

-- 6. Packaging Options
CREATE TABLE IF NOT EXISTS packaging_options (
    packaging_id VARCHAR(32) PRIMARY KEY,
    packaging_name VARCHAR(128) NOT NULL,
    packaging_cost_usd_per_kg NUMERIC(10, 4) NOT NULL,
    capacity_kg_per_unit NUMERIC(10, 2) DEFAULT 500.0,
    wastage_rate NUMERIC(6, 4) DEFAULT 0.012,
    max_units_per_quarter INT DEFAULT 2000,
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

-- 7. Supply Records
CREATE TABLE IF NOT EXISTS supply_records (
    supply_id VARCHAR(64) PRIMARY KEY,
    quarter VARCHAR(16) NOT NULL,
    tea_grade_id VARCHAR(32) REFERENCES tea_grades(tea_grade_id),
    available_quantity_kg NUMERIC(14, 2) NOT NULL,
    unit_supply_cost_usd_per_kg NUMERIC(10, 4) NOT NULL,
    dataset_version VARCHAR(64) DEFAULT 'M4-DS-v1.0',
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

CREATE INDEX IF NOT EXISTS idx_supply_quarter ON supply_records(quarter);

-- 8. Demand Forecast Records (Synthetic M1 Output)
CREATE TABLE IF NOT EXISTS demand_records (
    demand_id VARCHAR(64) PRIMARY KEY,
    quarter VARCHAR(16) NOT NULL,
    market_id VARCHAR(32) REFERENCES export_markets(market_id),
    tea_grade_id VARCHAR(32) REFERENCES tea_grades(tea_grade_id),
    predicted_demand_kg NUMERIC(14, 2) NOT NULL,
    lower_demand_kg NUMERIC(14, 2),
    upper_demand_kg NUMERIC(14, 2),
    forecast_source VARCHAR(64) DEFAULT 'M1_MOCK_OUTPUT',
    dataset_version VARCHAR(64) DEFAULT 'M1-MOCK-v1.0',
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO'
);

CREATE INDEX IF NOT EXISTS idx_demand_quarter ON demand_records(quarter);

-- 9. Optimization Scenarios
CREATE TABLE IF NOT EXISTS optimization_scenarios (
    scenario_id VARCHAR(64) PRIMARY KEY,
    scenario_name VARCHAR(255) NOT NULL,
    description TEXT,
    planning_horizon VARCHAR(16) DEFAULT '2024Q1',
    dataset_version VARCHAR(64) DEFAULT 'M4-DS-v1.0',
    baseline_selection VARCHAR(64) DEFAULT 'HEURISTIC_PREMIUM',
    status VARCHAR(32) DEFAULT 'DRAFT', -- DRAFT, RUNNING, COMPLETED, FAILED
    enforce_contractual_minimums BOOLEAN DEFAULT TRUE,
    enforce_route_capacities BOOLEAN DEFAULT TRUE,
    unmet_demand_penalty_per_kg NUMERIC(10, 2) DEFAULT 12.0,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Scenario Market Constraints
CREATE TABLE IF NOT EXISTS scenario_constraints (
    constraint_id VARCHAR(64) PRIMARY KEY,
    scenario_id VARCHAR(64) REFERENCES optimization_scenarios(scenario_id) ON DELETE CASCADE,
    market_id VARCHAR(32) REFERENCES export_markets(market_id),
    minimum_contract_quantity_kg NUMERIC(14, 2) DEFAULT 0.0,
    maximum_demand_multiplier NUMERIC(6, 4) DEFAULT 1.0,
    priority_weight NUMERIC(6, 4) DEFAULT 1.0
);

-- 11. Optimization Runs & Solver Outputs
CREATE TABLE IF NOT EXISTS optimization_runs (
    run_id VARCHAR(64) PRIMARY KEY,
    scenario_id VARCHAR(64) REFERENCES optimization_scenarios(scenario_id) ON DELETE CASCADE,
    solver_status VARCHAR(32) NOT NULL, -- Optimal, Infeasible, Unbounded, Failed
    total_cost_usd NUMERIC(16, 2) NOT NULL,
    total_allocated_kg NUMERIC(16, 2) NOT NULL,
    total_demand_kg NUMERIC(16, 2) NOT NULL,
    fulfillment_rate_pct NUMERIC(6, 2) DEFAULT 100.0,
    baseline_estimated_cost_usd NUMERIC(16, 2),
    estimated_savings_usd NUMERIC(16, 2),
    estimated_savings_pct NUMERIC(6, 2),
    execution_time_seconds NUMERIC(10, 4) NOT NULL,
    cost_procurement_usd NUMERIC(16, 2),
    cost_packaging_usd NUMERIC(16, 2),
    cost_freight_usd NUMERIC(16, 2),
    cost_handling_usd NUMERIC(16, 2),
    cost_customs_usd NUMERIC(16, 2),
    cost_wastage_usd NUMERIC(16, 2),
    cost_penalties_usd NUMERIC(16, 2),
    solver_message TEXT,
    run_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Optimization Allocations (Decision Variables)
CREATE TABLE IF NOT EXISTS optimization_allocations (
    allocation_id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES optimization_runs(run_id) ON DELETE CASCADE,
    market_id VARCHAR(32) REFERENCES export_markets(market_id),
    tea_grade_id VARCHAR(32) REFERENCES tea_grades(tea_grade_id),
    route_id VARCHAR(64) REFERENCES shipping_routes(route_id),
    packaging_id VARCHAR(32) REFERENCES packaging_options(packaging_id),
    allocated_quantity_kg NUMERIC(14, 2) NOT NULL,
    unit_cost_usd_per_kg NUMERIC(10, 4) NOT NULL,
    total_cost_usd NUMERIC(16, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_run ON optimization_allocations(run_id);

-- 13. Sensitivity Analysis Runs
CREATE TABLE IF NOT EXISTS sensitivity_runs (
    sensitivity_id VARCHAR(64) PRIMARY KEY,
    scenario_id VARCHAR(64) REFERENCES optimization_scenarios(scenario_id) ON DELETE CASCADE,
    parameter_name VARCHAR(64) NOT NULL,
    variation_pct NUMERIC(6, 2) NOT NULL,
    multiplier NUMERIC(6, 4) NOT NULL,
    status VARCHAR(32) NOT NULL,
    is_feasible BOOLEAN DEFAULT TRUE,
    modified_cost_usd NUMERIC(16, 2) NOT NULL,
    base_cost_usd NUMERIC(16, 2) NOT NULL,
    cost_diff_usd NUMERIC(16, 2) NOT NULL,
    cost_diff_pct NUMERIC(6, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Quarterly Historical Backtesting Records
CREATE TABLE IF NOT EXISTS backtesting_history (
    backtest_id VARCHAR(64) PRIMARY KEY,
    quarter VARCHAR(16) NOT NULL,
    baseline_cost_usd NUMERIC(16, 2) NOT NULL,
    optimized_cost_usd NUMERIC(16, 2) NOT NULL,
    savings_usd NUMERIC(16, 2) NOT NULL,
    savings_pct NUMERIC(6, 2) NOT NULL,
    status VARCHAR(32) DEFAULT 'Optimal',
    execution_time_seconds NUMERIC(8, 4) DEFAULT 1.25,
    data_source_type VARCHAR(32) DEFAULT 'SYNTHETIC_DEMO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id VARCHAR(64),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
