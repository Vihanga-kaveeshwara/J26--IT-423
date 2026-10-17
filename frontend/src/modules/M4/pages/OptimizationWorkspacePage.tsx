import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Layers,
  Globe,
  Anchor,
  Box,
  Sliders,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import api from '../../../services/api';

export const OptimizationWorkspacePage: React.FC = () => {
  const navigate = useNavigate();

  // A. Planning Horizon & Metadata
  const [scenarioName, setScenarioName] = useState('2024 Q1 Core Multi-Market Allocation');
  const [planningHorizon, setPlanningHorizon] = useState('2024Q1');
  const [datasetVersion, setDatasetVersion] = useState('M4-DS-v1.0');
  const [baselineSelection, setBaselineSelection] = useState('HEURISTIC_PREMIUM');

  // B. Export Markets & Minimum Contract Commitments
  const [markets, setMarkets] = useState([
    { market_id: 'MKT-RUS', market_name: 'Russia', destination_port: 'Novorossiysk', minimum_contract_kg: 15000, active: true },
    { market_id: 'MKT-UAE', market_name: 'UAE', destination_port: 'Jebel Ali', minimum_contract_kg: 20000, active: true },
    { market_id: 'MKT-IRQ', market_name: 'Iraq', destination_port: 'Umm Qasr', minimum_contract_kg: 10000, active: true },
    { market_id: 'MKT-TUR', market_name: 'Turkey', destination_port: 'Mersin', minimum_contract_kg: 12000, active: true },
    { market_id: 'MKT-IRN', market_name: 'Iran', destination_port: 'Bandar Abbas', minimum_contract_kg: 8000, active: true },
  ]);

  // C. Tea Products & Available Supply
  const [supply, setSupply] = useState([
    { tea_grade_id: 'TEA-BOP', tea_grade_name: 'BOP Black Tea', available_quantity_kg: 140000, unit_supply_cost_usd_per_kg: 3.20 },
    { tea_grade_id: 'TEA-OP', tea_grade_name: 'OP Black Tea', available_quantity_kg: 160000, unit_supply_cost_usd_per_kg: 3.50 },
    { tea_grade_id: 'TEA-GREEN', tea_grade_name: 'Green Tea', available_quantity_kg: 120000, unit_supply_cost_usd_per_kg: 4.80 },
  ]);

  // D. Market Demand Targets (kg)
  const [demand, setDemand] = useState([
    { market_id: 'MKT-RUS', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 48000 },
    { market_id: 'MKT-RUS', tea_grade_id: 'TEA-OP', predicted_demand_kg: 35000 },
    { market_id: 'MKT-UAE', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 40000 },
    { market_id: 'MKT-UAE', tea_grade_id: 'TEA-OP', predicted_demand_kg: 50000 },
    { market_id: 'MKT-UAE', tea_grade_id: 'TEA-GREEN', predicted_demand_kg: 25000 },
    { market_id: 'MKT-IRQ', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 30000 },
    { market_id: 'MKT-TUR', tea_grade_id: 'TEA-OP', predicted_demand_kg: 35000 },
    { market_id: 'MKT-IRN', tea_grade_id: 'TEA-BOP', predicted_demand_kg: 25000 },
  ]);

  // E. Logistics & Shipping Routes
  const [routes, setRoutes] = useState([
    { route_id: 'RTE-RUS-1', destination_market_id: 'MKT-RUS', destination_port: 'Novorossiysk', freight_cost_usd_per_kg: 0.85, route_capacity_kg: 400000 },
    { route_id: 'RTE-UAE-1', destination_market_id: 'MKT-UAE', destination_port: 'Jebel Ali', freight_cost_usd_per_kg: 0.38, route_capacity_kg: 650000 },
    { route_id: 'RTE-IRQ-1', destination_market_id: 'MKT-IRQ', destination_port: 'Umm Qasr', freight_cost_usd_per_kg: 0.65, route_capacity_kg: 350000 },
    { route_id: 'RTE-TUR-1', destination_market_id: 'MKT-TUR', destination_port: 'Mersin', freight_cost_usd_per_kg: 0.76, route_capacity_kg: 450000 },
    { route_id: 'RTE-IRN-1', destination_market_id: 'MKT-IRN', destination_port: 'Bandar Abbas', freight_cost_usd_per_kg: 0.61, route_capacity_kg: 320000 },
  ]);

  // F. Packaging Options
  const [packaging, setPackaging] = useState([
    { packaging_id: 'PKG-BULK', packaging_name: 'Bulk export liner', packaging_cost_usd_per_kg: 0.075, wastage_rate: 0.012 },
    { packaging_id: 'PKG-PACKET', packaging_name: 'Consumer retail packets', packaging_cost_usd_per_kg: 0.240, wastage_rate: 0.008 },
  ]);

  // G. Constraints & Objectives
  const [enforceContracts, setEnforceContracts] = useState(true);
  const [enforceCapacities, setEnforceCapacities] = useState(true);
  const [penaltyPerKg, setPenaltyPerKg] = useState(12.0);

  // Execution State
  const [solverState, setSolverState] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExecuteOptimization = async () => {
    setSolverState('RUNNING');
    setStatusMessage('Formulating Mixed-Integer Linear Program and dispatching to solver...');

    const payload = {
      scenario_id: `SCN-${Date.now()}`,
      scenario_name: scenarioName,
      planning_horizon: planningHorizon,
      dataset_version: datasetVersion,
      markets: markets.filter((m) => m.active),
      supply,
      demand,
      routes,
      packaging,
      enforce_contractual_minimums: enforceContracts,
      enforce_route_capacities: enforceCapacities,
      unmet_demand_penalty_per_kg: penaltyPerKg,
    };

    try {
      const { data } = await api.post('/v1/M4/optimization-runs', payload);

      if (data.status === 'Optimal' || data.success) {
        setSolverState('COMPLETED');
        setStatusMessage(`Optimization Succeeded! Objective Cost: $${data.total_cost_usd?.toLocaleString()} USD`);
        // Store latest result in session storage for ResultsPage
        sessionStorage.setItem('ceylon_latest_optimization_result', JSON.stringify(data));
        setTimeout(() => {
          navigate('/m4/results');
        }, 1200);
      } else {
        setSolverState('ERROR');
        setStatusMessage(`Solver returned status: ${data.status}. Reason: ${data.solver_message || 'Infeasible constraints.'}`);
      }
    } catch (err: unknown) {
      setSolverState('ERROR');
      setStatusMessage('Solver service connection failed. Please ensure the optimization service is running on port 8001.');
    }
  };

  const handleResetToDefaults = () => {
    setScenarioName('2024 Q1 Core Multi-Market Allocation');
    setPlanningHorizon('2024Q1');
    setEnforceContracts(true);
    setEnforceCapacities(true);
    setPenaltyPerKg(12.0);
    setSolverState('IDLE');
    setStatusMessage('Workspace parameters reset to standard research baseline.');
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15B]">
            <Cpu className="h-4 w-4" />
            <span>Prescriptive MILP Scenario Formulator</span>
          </div>
          <h1 className="mt-1 font-serif-ceylon text-3xl font-bold text-[#123D2B]">
            Optimization Workspace
          </h1>
          <p className="mt-1 text-xs text-[#778278] md:text-sm">
            Configure quarterly market demands, Ceylon Tea supplies, logistics routes, and contractual constraints.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetToDefaults}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-[#202922] transition hover:bg-[#F8F5ED]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#778278]" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleExecuteOptimization}
            disabled={solverState === 'RUNNING'}
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-[#123D2B] via-[#1a4a34] to-[#286B45] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#123D2B]/20 transition hover:opacity-95 disabled:opacity-50"
          >
            {solverState === 'RUNNING' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play className="h-4 w-4 text-[#C6A15B] fill-current" />
            )}
            <span>{solverState === 'RUNNING' ? 'Solving MILP Engine...' : 'Run Optimization'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center space-x-2 rounded-xl border p-4 text-xs font-medium ${
            solverState === 'ERROR'
              ? 'border-red-200 bg-red-50 text-red-800'
              : solverState === 'COMPLETED'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          {solverState === 'ERROR' ? (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Section A: Planning Horizon & Metadata */}
      <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-[#C6A15B]" />
          <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
            A. Planning Horizon & Dataset Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-[#202922] mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-[#202922] focus:border-[#286B45] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202922] mb-1">Planning Quarter</label>
            <select
              value={planningHorizon}
              onChange={(e) => setPlanningHorizon(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-[#202922] focus:border-[#286B45] focus:outline-none"
            >
              <option value="2024Q1">2024 Q1 (Active)</option>
              <option value="2024Q2">2024 Q2</option>
              <option value="2024Q3">2024 Q3</option>
              <option value="2024Q4">2024 Q4</option>
              <option value="2025Q1">2025 Q1</option>
              <option value="2025Q2">2025 Q2</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202922] mb-1">Dataset Registry Version</label>
            <input
              type="text"
              value={datasetVersion}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-slate-50 p-2.5 text-xs text-[#778278]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202922] mb-1">Baseline Comparison Type</label>
            <select
              value={baselineSelection}
              onChange={(e) => setBaselineSelection(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-[#202922] focus:border-[#286B45] focus:outline-none"
            >
              <option value="HEURISTIC_PREMIUM">Heuristic Premium Baseline (+13.2%)</option>
              <option value="HISTORICAL_BENCHMARK">Historical Benchmark Actuals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section B & C: Export Markets & Tea Supply Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Markets and Contractual Minimums */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-[#286B45]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              B. Export Markets & Contractual Minimums
            </h3>
          </div>

          <div className="space-y-3">
            {markets.map((m, idx) => (
              <div key={m.market_id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 text-xs bg-[#F8F5ED]/40">
                <div>
                  <div className="font-semibold text-[#123D2B]">{m.market_name}</div>
                  <div className="text-[11px] text-[#778278]">Port: {m.destination_port}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] text-[#778278]">Min Contract:</span>
                    <input
                      type="number"
                      value={m.minimum_contract_kg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setMarkets((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, minimum_contract_kg: val } : item))
                        );
                      }}
                      className="w-24 rounded-lg border border-gray-200 p-1 text-right font-mono text-xs focus:outline-none"
                    />
                    <span className="text-[11px] text-[#778278]">kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ceylon Tea Supply Limits */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Layers className="h-4 w-4 text-[#286B45]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              C. Available Harvest Supply & Procurement
            </h3>
          </div>

          <div className="space-y-3">
            {supply.map((s, idx) => (
              <div key={s.tea_grade_id} className="rounded-xl border border-gray-100 p-3 text-xs bg-[#F8F5ED]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#123D2B]">{s.tea_grade_name}</span>
                  <span className="font-mono text-[11px] text-[#286B45]">${s.unit_supply_cost_usd_per_kg} / kg</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="text-[#778278]">Available (kg)</label>
                    <input
                      type="number"
                      value={s.available_quantity_kg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSupply((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, available_quantity_kg: val } : item))
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-200 p-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#778278]">Supply Cost (USD/kg)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={s.unit_supply_cost_usd_per_kg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSupply((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, unit_supply_cost_usd_per_kg: val } : item))
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-200 p-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section D: Market Demand Matrix */}
      <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-[#C6A15B]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              D. Market Demand Targets (Synthetic M1 Input)
            </h3>
          </div>
          <span className="text-xs text-[#778278]">
            Total Demand: {demand.reduce((sum, d) => sum + d.predicted_demand_kg, 0).toLocaleString()} kg
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {demand.map((d, idx) => (
            <div key={`${d.market_id}-${d.tea_grade_id}`} className="rounded-xl border border-gray-100 p-3 bg-slate-50 text-xs">
              <div className="flex justify-between font-semibold text-[#123D2B]">
                <span>{d.market_id.replace('MKT-', '')}</span>
                <span className="text-[#286B45]">{d.tea_grade_id.replace('TEA-', '')}</span>
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  value={d.predicted_demand_kg}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDemand((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, predicted_demand_kg: val } : item))
                    );
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white p-1 text-right font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section E, F, G: Routes, Packaging & Solver Constraints */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Maritime Routes */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Anchor className="h-4 w-4 text-[#286B45]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              E. Maritime Routes
            </h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {routes.map((r, idx) => (
              <div key={r.route_id} className="rounded-xl border border-gray-100 p-2.5 bg-[#F8F5ED]/30">
                <div className="flex justify-between font-semibold text-[#123D2B]">
                  <span>{r.route_id}</span>
                  <span className="font-mono text-[#C6A15B]">${r.freight_cost_usd_per_kg}/kg</span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-[#778278]">
                  <span>Dest: {r.destination_port}</span>
                  <span>Cap: {(r.route_capacity_kg / 1000).toFixed(0)} MT</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Packaging Formats */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Box className="h-4 w-4 text-[#286B45]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              F. Packaging Options
            </h3>
          </div>
          <div className="space-y-3 text-xs">
            {packaging.map((p) => (
              <div key={p.packaging_id} className="rounded-xl border border-gray-100 p-3 bg-[#F8F5ED]/30">
                <div className="font-semibold text-[#123D2B]">{p.packaging_name}</div>
                <div className="mt-1 flex justify-between text-[11px] text-[#778278]">
                  <span>Cost: ${p.packaging_cost_usd_per_kg}/kg</span>
                  <span>Wastage: {(p.wastage_rate * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solver Constraints Toggle */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-[#286B45]" />
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              G. Solver Constraints
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceContracts}
                onChange={(e) => setEnforceContracts(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#286B45] focus:ring-[#286B45]"
              />
              <span className="text-[#202922] font-medium">Enforce Contractual Minimums</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceCapacities}
                onChange={(e) => setEnforceCapacities(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#286B45] focus:ring-[#286B45]"
              />
              <span className="text-[#202922] font-medium">Enforce Route Vessel Capacities</span>
            </label>

            <div>
              <label className="block text-[11px] text-[#778278] mb-1">
                Unmet Demand Shortfall Penalty (USD/kg)
              </label>
              <input
                type="number"
                value={penaltyPerKg}
                onChange={(e) => setPenaltyPerKg(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-200 p-2 font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-[#778278]">
              Target Objective: Minimize Procurement + Packaging + Freight + Handling + Customs + Wastage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OptimizationWorkspacePage;
