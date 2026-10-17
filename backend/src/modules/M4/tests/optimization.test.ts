import { optimizationService } from '../services/optimizationService';
import { OptimizationRunRequest } from '../types/optimizationTypes';

async function testOptimizationSolver() {
  console.log('--- Running M4 Optimization Prescriptive Solver Tests ---');

  // Test 1: Hand-Verified Feasible Example (from docs/optimization-model.md)
  // UAE: 10,000 kg BOP @ $3.601/kg = $36,010.00
  // Russia: 15,000 kg BOP @ $4.051/kg = $60,765.00
  // Total expected = $96,775.00
  const handVerifiedReq: OptimizationRunRequest = {
    scenario_id: 'SCN-HAND-VERIFIED',
    planning_horizon: '2024Q1',
    dataset_version: 'M4-DS-v1.0',
    markets: [
      { market_id: 'MKT-UAE', market_name: 'UAE', destination_port: 'Jebel Ali' },
      { market_id: 'MKT-RUS', market_name: 'Russia', destination_port: 'Novorossiysk' },
    ],
    supply: [
      {
        tea_grade_id: 'TEA-BOP',
        tea_grade_name: 'BOP Black Tea',
        available_quantity_kg: 30000,
        unit_supply_cost_usd_per_kg: 3.0,
      },
    ],
    demand: [
      { market_id: 'MKT-UAE', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 10000 },
      { market_id: 'MKT-RUS', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 15000 },
    ],
    routes: [
      {
        route_id: 'RTE-UAE',
        destination_market_id: 'MKT-UAE',
        destination_port: 'Jebel Ali',
        freight_cost_usd_per_kg: 0.40,
        handling_cost_usd_per_kg: 0.05,
        customs_admin_cost_usd_per_kg: 0.02,
      },
      {
        route_id: 'RTE-RUS',
        destination_market_id: 'MKT-RUS',
        destination_port: 'Novorossiysk',
        freight_cost_usd_per_kg: 0.80,
        handling_cost_usd_per_kg: 0.08,
        customs_admin_cost_usd_per_kg: 0.04,
      },
    ],
    packaging: [
      {
        packaging_id: 'PKG-BULK',
        packaging_name: 'Bulk export liner',
        packaging_cost_usd_per_kg: 0.10,
        wastage_rate: 0.01,
      },
    ],
  };

  const result = await optimizationService.dispatchOptimization(handVerifiedReq);

  console.log(`Reported Total Cost: $${result.total_cost_usd} USD`);
  console.log(`Allocated Volume: ${result.total_allocated_kg} kg (Fulfillment: ${result.fulfillment_rate_pct}%)`);
  console.log(`Execution Time: ${result.execution_time_seconds}s`);

  // Verify total cost is $96,775 within +/- $1 floating point precision
  const expectedCost = 96775.0;
  if (Math.abs(result.total_cost_usd - expectedCost) > 1.0) {
    throw new Error(
      `Test 1 Failed: Cost $${result.total_cost_usd} does not match hand calculation $${expectedCost}`
    );
  }
  console.log('✓ Test 1 Passed: Hand-calculated benchmark ($96,775.00 USD) matched exactly!');

  // Test 2: Allocations and Decision Variables
  if (result.allocations.length !== 2) {
    throw new Error(`Test 2 Failed: Expected 2 allocations, got ${result.allocations.length}`);
  }
  const uaeAlloc = result.allocations.find((a) => a.market_id === 'MKT-UAE');
  const rusAlloc = result.allocations.find((a) => a.market_id === 'MKT-RUS');

  if (uaeAlloc?.allocated_quantity_kg !== 10000 || rusAlloc?.allocated_quantity_kg !== 15000) {
    throw new Error('Test 2 Failed: Quantities do not match demand fulfillment');
  }
  console.log('✓ Test 2 Passed: Decision variable allocations verified.');

  // Test 3: Savings vs Heuristic Baseline
  if (result.estimated_savings_usd <= 0 || result.estimated_savings_pct <= 0) {
    throw new Error('Test 3 Failed: Baseline comparison did not yield positive savings');
  }
  console.log(`✓ Test 3 Passed: Positive savings (${result.estimated_savings_pct}%) verified.`);

  console.log('All M4 Core Optimization Engine Tests Passed Successfully!');
}

testOptimizationSolver().catch((err) => {
  console.error('Optimization test failure:', err);
  process.exit(1);
});
