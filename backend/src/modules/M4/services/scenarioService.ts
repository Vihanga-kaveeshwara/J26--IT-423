import { OptimizationRunRequest } from '../types/optimizationTypes';

export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  planningHorizon: string;
  datasetVersion: string;
  baselineSelection: string;
  status: 'DRAFT' | 'OPTIMIZED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  config: OptimizationRunRequest;
  latestRunId?: string;
  totalCostUsd?: number;
  savingsUsd?: number;
  savingsPct?: number;
}

class ScenarioService {
  private scenarios: Map<string, SavedScenario> = new Map();

  constructor() {
    // Seed initial demonstration scenarios
    this.seedDefaultScenarios();
  }

  private seedDefaultScenarios() {
    const baseConfig: OptimizationRunRequest = {
      scenario_id: 'SCN-2024Q1-BASE',
      scenario_name: '2024 Q1 Core Multi-Market Allocation',
      planning_horizon: '2024Q1',
      dataset_version: 'M4-DS-v1.0',
      enforce_contractual_minimums: true,
      enforce_route_capacities: true,
      unmet_demand_penalty_per_kg: 12.0,
      markets: [
        { market_id: 'MKT-RUS', market_name: 'Russia', destination_port: 'Novorossiysk', minimum_contract_kg: 15000 },
        { market_id: 'MKT-UAE', market_name: 'UAE', destination_port: 'Jebel Ali', minimum_contract_kg: 20000 },
        { market_id: 'MKT-IRQ', market_name: 'Iraq', destination_port: 'Umm Qasr', minimum_contract_kg: 10000 },
        { market_id: 'MKT-TUR', market_name: 'Turkey', destination_port: 'Mersin', minimum_contract_kg: 12000 },
        { market_id: 'MKT-IRN', market_name: 'Iran', destination_port: 'Bandar Abbas', minimum_contract_kg: 8000 },
      ],
      supply: [
        { tea_grade_id: 'TEA-BOP', tea_grade_name: 'BOP Black Tea', available_quantity_kg: 140000, unit_supply_cost_usd_per_kg: 3.2 },
        { tea_grade_id: 'TEA-OP', tea_grade_name: 'OP Black Tea', available_quantity_kg: 160000, unit_supply_cost_usd_per_kg: 3.5 },
        { tea_grade_id: 'TEA-GREEN', tea_grade_name: 'Green Tea', available_quantity_kg: 120000, unit_supply_cost_usd_per_kg: 4.8 },
      ],
      demand: [
        { market_id: 'MKT-RUS', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 48000 },
        { market_id: 'MKT-RUS', tea_grade_id: 'TEA-OP', predicted_demand_kg: 35000 },
        { market_id: 'MKT-UAE', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 40000 },
        { market_id: 'MKT-UAE', tea_grade_id: 'TEA-OP', predicted_demand_kg: 50000 },
        { market_id: 'MKT-UAE', tea_grade_id: 'TEA-GREEN', predicted_demand_kg: 25000 },
        { market_id: 'MKT-IRQ', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 30000 },
        { market_id: 'MKT-TUR', tea_grade_id: 'TEA-OP', predicted_demand_kg: 35000 },
        { market_id: 'MKT-IRN', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 25000 },
      ],
      routes: [
        { route_id: 'RTE-RUS-1', destination_market_id: 'MKT-RUS', destination_port: 'Novorossiysk', freight_cost_usd_per_kg: 0.85, route_capacity_kg: 400000 },
        { route_id: 'RTE-UAE-1', destination_market_id: 'MKT-UAE', destination_port: 'Jebel Ali', freight_cost_usd_per_kg: 0.38, route_capacity_kg: 650000 },
        { route_id: 'RTE-IRQ-1', destination_market_id: 'MKT-IRQ', destination_port: 'Umm Qasr', freight_cost_usd_per_kg: 0.65, route_capacity_kg: 350000 },
        { route_id: 'RTE-TUR-1', destination_market_id: 'MKT-TUR', destination_port: 'Mersin', freight_cost_usd_per_kg: 0.76, route_capacity_kg: 450000 },
        { route_id: 'RTE-IRN-1', destination_market_id: 'MKT-IRN', destination_port: 'Bandar Abbas', freight_cost_usd_per_kg: 0.61, route_capacity_kg: 320000 },
      ],
      packaging: [
        { packaging_id: 'PKG-BULK', packaging_name: 'Bulk export liner', packaging_cost_usd_per_kg: 0.075, wastage_rate: 0.012 },
        { packaging_id: 'PKG-PACKET', packaging_name: 'Consumer retail packets', packaging_cost_usd_per_kg: 0.24, wastage_rate: 0.008 },
      ],
    };

    const s1: SavedScenario = {
      id: 'SCN-2024Q1-BASE',
      name: '2024 Q1 Core Multi-Market Allocation',
      description: 'Standard baseline scenario fulfilling bilateral trade contracts across 5 major export markets.',
      planningHorizon: '2024Q1',
      datasetVersion: 'M4-DS-v1.0',
      baselineSelection: 'HEURISTIC_PREMIUM',
      status: 'OPTIMIZED',
      createdAt: '2026-03-01T08:00:00Z',
      updatedAt: '2026-03-01T08:30:00Z',
      config: baseConfig,
      latestRunId: 'RUN-2024Q1-001',
      totalCostUsd: 1846850,
      savingsUsd: 279930,
      savingsPct: 13.16,
    };

    this.scenarios.set(s1.id, s1);
  }

  listScenarios(): SavedScenario[] {
    return Array.from(this.scenarios.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getScenarioById(id: string): SavedScenario | null {
    return this.scenarios.get(id) || null;
  }

  createScenario(data: Partial<SavedScenario>): SavedScenario {
    const id = data.id || `SCN-${Date.now()}`;
    const now = new Date().toISOString();
    const newScn: SavedScenario = {
      id,
      name: data.name || 'Custom Export Planning Scenario',
      description: data.description || '',
      planningHorizon: data.planningHorizon || '2024Q1',
      datasetVersion: data.datasetVersion || 'M4-DS-v1.0',
      baselineSelection: data.baselineSelection || 'HEURISTIC_PREMIUM',
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
      config: data.config || ({} as OptimizationRunRequest),
    };
    this.scenarios.set(id, newScn);
    return newScn;
  }

  updateScenario(id: string, data: Partial<SavedScenario>): SavedScenario | null {
    const scn = this.scenarios.get(id);
    if (!scn) return null;

    const updated = {
      ...scn,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.scenarios.set(id, updated);
    return updated;
  }

  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }
}

export const scenarioService = new ScenarioService();
