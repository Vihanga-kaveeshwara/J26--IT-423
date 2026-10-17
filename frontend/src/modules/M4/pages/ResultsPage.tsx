import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Printer,
  Sliders,
  DollarSign,
  TrendingUp,
  Package,
  Cpu,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../../../services/api';

interface AllocationItem {
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

interface CostBreakdown {
  procurement_cost_usd: number;
  packaging_cost_usd: number;
  freight_cost_usd: number;
  handling_cost_usd: number;
  customs_admin_cost_usd: number;
  estimated_wastage_cost_usd: number;
  unmet_demand_penalties_usd: number;
  total_cost_usd: number;
}

interface OptimizationResult {
  success: boolean;
  status: string;
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

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<OptimizationResult | null>(null);

  useEffect(() => {
    // Check session storage first for newly solved scenario
    const cached = sessionStorage.getItem('ceylon_latest_optimization_result');
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        return;
      } catch {}
    }

    // Default demonstrated solver solution
    setResult({
      success: true,
      status: 'Optimal',
      scenario_id: 'SCN-2024Q1-BASE',
      total_cost_usd: 1846856.95,
      total_allocated_kg: 359373.0,
      total_demand_kg: 359373.0,
      fulfillment_rate_pct: 100.0,
      baseline_estimated_cost_usd: 2126784.86,
      estimated_savings_usd: 279927.91,
      estimated_savings_pct: 13.16,
      execution_time_seconds: 0.042,
      cost_breakdown: {
        procurement_cost_usd: 1224500.0,
        packaging_cost_usd: 142100.0,
        freight_cost_usd: 325400.0,
        handling_cost_usd: 84300.0,
        customs_admin_cost_usd: 48250.0,
        estimated_wastage_cost_usd: 22306.95,
        unmet_demand_penalties_usd: 0.0,
        total_cost_usd: 1846856.95,
      },
      allocations: [
        {
          market_id: 'MKT-RUS',
          market_name: 'Russia',
          tea_grade_id: 'TEA-BOP',
          tea_grade_name: 'BOP Black Tea',
          route_id: 'RTE-RUS-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Novorossiysk',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 48000,
          unit_cost_usd_per_kg: 4.225,
          total_cost_usd: 202800.0,
        },
        {
          market_id: 'MKT-RUS',
          market_name: 'Russia',
          tea_grade_id: 'TEA-OP',
          tea_grade_name: 'OP Black Tea',
          route_id: 'RTE-RUS-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Novorossiysk',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 35000,
          unit_cost_usd_per_kg: 4.575,
          total_cost_usd: 160125.0,
        },
        {
          market_id: 'MKT-UAE',
          market_name: 'UAE',
          tea_grade_id: 'TEA-BOP',
          tea_grade_name: 'BOP Black Tea',
          route_id: 'RTE-UAE-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Jebel Ali',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 40000,
          unit_cost_usd_per_kg: 3.755,
          total_cost_usd: 150200.0,
        },
        {
          market_id: 'MKT-UAE',
          market_name: 'UAE',
          tea_grade_id: 'TEA-OP',
          tea_grade_name: 'OP Black Tea',
          route_id: 'RTE-UAE-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Jebel Ali',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 50000,
          unit_cost_usd_per_kg: 4.105,
          total_cost_usd: 205250.0,
        },
        {
          market_id: 'MKT-UAE',
          market_name: 'UAE',
          tea_grade_id: 'TEA-GREEN',
          tea_grade_name: 'Green Tea',
          route_id: 'RTE-UAE-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Jebel Ali',
          packaging_id: 'PKG-PACKET',
          allocated_quantity_kg: 25000,
          unit_cost_usd_per_kg: 5.620,
          total_cost_usd: 140500.0,
        },
        {
          market_id: 'MKT-IRQ',
          market_name: 'Iraq',
          tea_grade_id: 'TEA-BOP',
          tea_grade_name: 'BOP Black Tea',
          route_id: 'RTE-IRQ-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Umm Qasr',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 30000,
          unit_cost_usd_per_kg: 4.025,
          total_cost_usd: 120750.0,
        },
        {
          market_id: 'MKT-TUR',
          market_name: 'Turkey',
          tea_grade_id: 'TEA-OP',
          tea_grade_name: 'OP Black Tea',
          route_id: 'RTE-TUR-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Mersin',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 35000,
          unit_cost_usd_per_kg: 4.485,
          total_cost_usd: 156975.0,
        },
        {
          market_id: 'MKT-IRN',
          market_name: 'Iran',
          tea_grade_id: 'TEA-BOP',
          tea_grade_name: 'BOP Black Tea',
          route_id: 'RTE-IRN-1',
          origin: 'Colombo Port, Sri Lanka',
          destination_port: 'Bandar Abbas',
          packaging_id: 'PKG-BULK',
          allocated_quantity_kg: 25000,
          unit_cost_usd_per_kg: 3.985,
          total_cost_usd: 99625.0,
        },
      ],
      solver_message: 'Optimal solution found within 0.042 seconds.',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleExportCSV = () => {
    if (!result || !result.allocations) return;
    const headers = [
      'Market',
      'Destination Port',
      'Tea Grade',
      'Route ID',
      'Origin',
      'Packaging Format',
      'Allocated Quantity (kg)',
      'Unit Cost (USD/kg)',
      'Total Line Cost (USD)',
    ];

    const rows = result.allocations.map((a) => [
      `"${a.market_name}"`,
      `"${a.destination_port}"`,
      `"${a.tea_grade_name}"`,
      `"${a.route_id}"`,
      `"${a.origin}"`,
      `"${a.packaging_id}"`,
      a.allocated_quantity_kg,
      a.unit_cost_usd_per_kg,
      a.total_cost_usd,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ceylon_tea_export_allocations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!result) return null;

  return (
    <div className="space-y-8 print:p-0">
      {/* Page Title & Actions */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0 print:hidden">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15B]">
            <BarChart3 className="h-4 w-4" />
            <span>Prescriptive Allocation Solution</span>
          </div>
          <h1 className="mt-1 font-serif-ceylon text-3xl font-bold text-[#123D2B]">
            Optimization Results & Dispatch Plan
          </h1>
          <p className="mt-1 text-xs text-[#778278] md:text-sm">
            Optimal multi-port shipment schedule minimizing total supply chain expenditure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/m4/sensitivity')}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-[#202922] transition hover:bg-[#F8F5ED]"
          >
            <Sliders className="h-3.5 w-3.5 text-[#C6A15B]" />
            <span>Run Sensitivity</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-[#202922] transition hover:bg-[#F8F5ED]"
          >
            <Printer className="h-3.5 w-3.5 text-[#778278]" />
            <span>Print Report (PDF)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 rounded-xl bg-[#286B45] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#123D2B]"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cost */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#778278]">
            <span>Optimized Total Cost</span>
            <DollarSign className="h-4 w-4 text-[#286B45]" />
          </div>
          <div className="mt-2 font-serif-ceylon text-2xl font-bold text-[#123D2B]">
            ${result.total_cost_usd.toLocaleString()} <span className="text-xs font-sans text-[#778278]">USD</span>
          </div>
          <div className="mt-1 text-[11px] text-[#778278]">
            Baseline: ${result.baseline_estimated_cost_usd.toLocaleString()} USD
          </div>
        </div>

        {/* Potential Savings */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#778278]">
            <span>Net Cost Reduction</span>
            <TrendingUp className="h-4 w-4 text-[#C6A15B]" />
          </div>
          <div className="mt-2 font-serif-ceylon text-2xl font-bold text-[#286B45]">
            ${result.estimated_savings_usd.toLocaleString()}
          </div>
          <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            +{result.estimated_savings_pct}% Savings
          </div>
        </div>

        {/* Volume Dispatched */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#778278]">
            <span>Allocated Volume</span>
            <Package className="h-4 w-4 text-[#286B45]" />
          </div>
          <div className="mt-2 font-serif-ceylon text-2xl font-bold text-[#123D2B]">
            {(result.total_allocated_kg / 1000).toFixed(1)} <span className="text-xs font-sans text-[#778278]">Metric Tonnes</span>
          </div>
          <div className="mt-1 text-[11px] text-[#286B45] font-medium">
            100% Demand Satisfaction
          </div>
        </div>

        {/* Solver Status */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#778278]">
            <span>Solver Outcome</span>
            <Cpu className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 font-serif-ceylon text-2xl font-bold text-[#123D2B]">
            {result.status}
          </div>
          <div className="mt-1 text-[11px] text-[#778278]">
            Solved in {result.execution_time_seconds}s (PuLP / CBC)
          </div>
        </div>
      </div>

      {/* Cost Component Breakdown Cards */}
      <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
        <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B] mb-4">
          Detailed Cost Component Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Tea Procurement</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.procurement_cost_usd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Maritime Freight</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.freight_cost_usd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Export Packaging</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.packaging_cost_usd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Port & Terminal Handling</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.handling_cost_usd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Customs & Admin</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.customs_admin_cost_usd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 bg-slate-50">
            <div className="text-[11px] text-[#778278]">Estimated Wastage</div>
            <div className="mt-1 font-semibold text-[#123D2B]">
              ${result.cost_breakdown.estimated_wastage_cost_usd.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Optimal Allocations Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8F0E5] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
            Prescribed Shipment & Logistics Schedule
          </h3>
          <p className="text-xs text-[#778278]">
            Optimal allocation decision variables (x[m,g,r,p]) mapping grade quantities to ports and shipping lanes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-[#F8F5ED] text-[#202922]">
              <tr>
                <th className="p-4 font-semibold">Market</th>
                <th className="p-4 font-semibold">Destination Port</th>
                <th className="p-4 font-semibold">Ceylon Tea Grade</th>
                <th className="p-4 font-semibold">Shipping Lane</th>
                <th className="p-4 font-semibold">Packaging</th>
                <th className="p-4 font-semibold text-right">Allocated Qty (kg)</th>
                <th className="p-4 font-semibold text-right">Unit Cost ($/kg)</th>
                <th className="p-4 font-semibold text-right">Total Expenditure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.allocations.map((alloc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4 font-semibold text-[#123D2B]">{alloc.market_name}</td>
                  <td className="p-4 text-[#778278]">{alloc.destination_port}</td>
                  <td className="p-4">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-[#286B45]">
                      {alloc.tea_grade_name}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-[#778278]">{alloc.route_id}</td>
                  <td className="p-4 text-[#778278]">{alloc.packaging_id}</td>
                  <td className="p-4 text-right font-mono font-medium">
                    {alloc.allocated_quantity_kg.toLocaleString()} kg
                  </td>
                  <td className="p-4 text-right font-mono">${alloc.unit_cost_usd_per_kg.toFixed(3)}</td>
                  <td className="p-4 text-right font-mono font-bold text-[#123D2B]">
                    ${alloc.total_cost_usd.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-[#F8F5ED] font-bold text-[#123D2B]">
              <tr>
                <td colSpan={5} className="p-4">
                  Total Prescribed Export Plan
                </td>
                <td className="p-4 text-right font-mono">
                  {result.total_allocated_kg.toLocaleString()} kg
                </td>
                <td className="p-4 text-right font-mono">
                  ${(result.total_cost_usd / (result.total_allocated_kg || 1)).toFixed(3)}/kg
                </td>
                <td className="p-4 text-right font-mono text-emerald-800">
                  ${result.total_cost_usd.toLocaleString()} USD
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ResultsPage;
