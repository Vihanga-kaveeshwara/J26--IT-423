import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Package,
  Cpu,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import api from '../../../services/api';

interface DashboardData {
  datasetVersion: string;
  modelEngine: string;
  solverStatus: string;
  kpis: {
    savedScenariosCount: number;
    completedRunsCount: number;
    activeMarketsCount: number;
    totalAllocatedMetricTonnes: number;
    latestTotalCostUsd: number;
    latestBaselineCostUsd: number;
    latestPotentialSavingsUsd: number;
    latestSavingsPercentage: number;
    fulfillmentRatePct: number;
    solverStatus: string;
  };
  latestRun: {
    scenarioName: string;
    totalCostUsd: number;
    baselineCostUsd: number;
    savingsUsd: number;
    savingsPct: number;
    fulfillmentRatePct: number;
    allocatedVolumeKg: number;
    status: string;
    solverMessage: string;
    runDate: string;
  };
  charts: {
    costBreakdown: Array<{ category: string; amount: number; percentage: number }>;
    marketAllocations: Array<{ market: string; allocatedKg: number; costUsd: number; sharePct: number }>;
    scenarioComparisons: Array<{ scenario: string; totalCost: number; savings: number }>;
    quarterlyTrend: Array<{ quarter: string; baseline: number; optimized: number; savingsPct: number }>;
  };
}

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  user: string;
  timestamp: string;
  type: string;
}

const PIE_COLORS = ['#123D2B', '#286B45', '#3D8B62', '#C6A15B', '#778278', '#202922'];

export const M4DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, activityRes] = await Promise.all([
        api.get<{ success: boolean } & DashboardData>('/v1/dashboard/summary'),
        api.get<{ success: boolean; activities: ActivityItem[] }>('/v1/dashboard/recent-activity'),
      ]);
      setData(summaryRes.data);
      setActivities(activityRes.data.activities || []);
    } catch {
      setError('Unable to load latest dashboard metrics. Showing cached demonstration model state.');
      // Fallback demo state
      setData({
        datasetVersion: 'M4-DS-v1.0',
        modelEngine: 'PuLP / COIN-OR CBC Deterministic MILP',
        solverStatus: 'Ready',
        kpis: {
          savedScenariosCount: 4,
          completedRunsCount: 6,
          activeMarketsCount: 5,
          totalAllocatedMetricTonnes: 359,
          latestTotalCostUsd: 1846850,
          latestBaselineCostUsd: 2126780,
          latestPotentialSavingsUsd: 279930,
          latestSavingsPercentage: 13.16,
          fulfillmentRatePct: 100.0,
          solverStatus: 'Optimal',
        },
        latestRun: {
          scenarioName: 'Q1 2024 Base Export Plan',
          totalCostUsd: 1846850,
          baselineCostUsd: 2126780,
          savingsUsd: 279930,
          savingsPct: 13.16,
          fulfillmentRatePct: 100.0,
          allocatedVolumeKg: 359370,
          status: 'Optimal',
          solverMessage: 'Optimal solution found within 0.42 seconds.',
          runDate: new Date().toISOString(),
        },
        charts: {
          costBreakdown: [
            { category: 'Procurement (Tea Supply)', amount: 1224500, percentage: 66.3 },
            { category: 'Maritime Freight', amount: 325400, percentage: 17.6 },
            { category: 'Export Packaging', amount: 142100, percentage: 7.7 },
            { category: 'Port & Terminal Handling', amount: 84300, percentage: 4.6 },
            { category: 'Customs & Clearance Admin', amount: 48250, percentage: 2.6 },
            { category: 'Estimated Handling Wastage', amount: 22300, percentage: 1.2 },
          ],
          marketAllocations: [
            { market: 'Russia', allocatedKg: 83000, costUsd: 462100, sharePct: 23.1 },
            { market: 'UAE', allocatedKg: 115000, costUsd: 548900, sharePct: 32.0 },
            { market: 'Iraq', allocatedKg: 58000, costUsd: 312400, sharePct: 16.1 },
            { market: 'Turkey', allocatedKg: 62000, costUsd: 328600, sharePct: 17.3 },
            { market: 'Iran', allocatedKg: 41370, costUsd: 194850, sharePct: 11.5 },
          ],
          scenarioComparisons: [
            { scenario: 'Baseline Heuristic', totalCost: 2126780, savings: 0 },
            { scenario: 'M4 MILP Optimal', totalCost: 1846850, savings: 279930 },
            { scenario: 'Fuel Surcharge (+15%)', totalCost: 1895650, savings: 231130 },
            { scenario: 'Strict Contracts', totalCost: 1862100, savings: 264680 },
          ],
          quarterlyTrend: [
            { quarter: '2024Q1', baseline: 2823322, optimized: 2658620, savingsPct: 5.8 },
            { quarter: '2024Q2', baseline: 2126784, optimized: 1846856, savingsPct: 13.2 },
            { quarter: '2024Q3', baseline: 1839070, optimized: 1624655, savingsPct: 11.7 },
            { quarter: '2024Q4', baseline: 2553118, optimized: 2303697, savingsPct: 9.8 },
            { quarter: '2025Q1', baseline: 2011964, optimized: 1749981, savingsPct: 13.0 },
            { quarter: '2025Q2', baseline: 1861213, optimized: 1754224, savingsPct: 5.8 },
          ],
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-2xl bg-gray-200" />
          <div className="h-72 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#123D2B] via-[#1b4b35] to-[#286B45] p-6 text-white shadow-lg md:p-8">
        <div className="relative z-10 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15B]">
              <ShieldCheck className="h-4 w-4" />
              <span>Ceylon Intelligence — Research Executive Dashboard</span>
            </div>
            <h1 className="mt-1 font-serif-ceylon text-2xl font-bold md:text-3xl">
              Export & Logistics Prescriptive Overview
            </h1>
            <p className="mt-1 text-xs text-[#E8F0E5] md:text-sm">
              Optimization results, active tea grade allocations, and cost reduction analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync Metrics</span>
            </button>
            <button
              onClick={() => navigate('/m4/workspace')}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#C6A15B] px-4 py-2 text-xs font-semibold text-[#123D2B] shadow-sm transition hover:bg-[#d4b36f]"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Optimized Export Cost */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#778278]">Optimized Export Cost</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#286B45]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif-ceylon text-2xl font-bold text-[#123D2B]">
              ${(kpis?.latestTotalCostUsd ?? 0).toLocaleString()} <span className="text-xs font-sans text-[#778278]">USD</span>
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-[#286B45]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Baseline: ${(kpis?.latestBaselineCostUsd ?? 0).toLocaleString()} USD</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Potential Savings */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#778278]">Estimated Cost Savings</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-[#C6A15B]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif-ceylon text-2xl font-bold text-[#286B45]">
              ${(kpis?.latestPotentialSavingsUsd ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                +{kpis?.latestSavingsPercentage}% savings
              </span>
              <span className="text-[#778278]">vs. heuristic baseline</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Volume Allocated */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#778278]">Total Volume Dispatched</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#286B45]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif-ceylon text-2xl font-bold text-[#123D2B]">
              {kpis?.totalAllocatedMetricTonnes ?? 0} <span className="text-xs font-sans text-[#778278]">Metric Tonnes</span>
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-[#778278]">
              <span>Demand Fulfillment:</span>
              <span className="font-semibold text-[#286B45]">{kpis?.fulfillmentRatePct}%</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Solver Status & Engine */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#778278]">Solver State</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif-ceylon text-2xl font-bold text-[#123D2B]">
              {kpis?.solverStatus || 'Optimal'}
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-[#778278]">
              <Clock className="h-3.5 w-3.5 text-[#C6A15B]" />
              <span>COIN-OR CBC (0.42s execution)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Cost Breakdown & Market Allocation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cost Breakdown Pie Chart (5 cols) */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm lg:col-span-5">
          <div className="mb-4">
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              Total Cost Breakdown by Category
            </h3>
            <p className="text-xs text-[#778278]">
              Allocation across procurement, freight, packaging, and port administration.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.costBreakdown || []}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(charts?.costBreakdown || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [
                    `$${Number(val).toLocaleString()} USD`,
                    'Amount',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Custom Legend */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {(charts?.costBreakdown || []).map((item, i) => (
              <div key={item.category} className="flex items-center space-x-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="truncate text-[#778278]">
                  {item.category}: <span className="font-semibold text-[#202922]">{item.percentage}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Allocation Bar Chart (7 cols) */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm lg:col-span-7">
          <div className="mb-4">
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              Export Destination Allocation & Cost
            </h3>
            <p className="text-xs text-[#778278]">
              Optimized export volume (kg) and total expenditure across top destination markets.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.marketAllocations || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="market" tick={{ fontSize: 11, fill: '#778278' }} />
                <YAxis tick={{ fontSize: 11, fill: '#778278' }} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    name === 'allocatedKg'
                      ? `${Number(value).toLocaleString()} kg`
                      : `$${Number(value).toLocaleString()} USD`,
                    name === 'allocatedKg' ? 'Allocated Volume' : 'Total Cost',
                  ]}
                />
                <Legend />
                <Bar dataKey="allocatedKg" name="Allocated Volume (kg)" fill="#286B45" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costUsd" name="Total Cost (USD)" fill="#C6A15B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Scenario Comparisons & Quarterly Historical Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scenario Comparisons (6 cols) */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-4">
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              Scenario Cost Comparison
            </h3>
            <p className="text-xs text-[#778278]">
              Evaluating M4 MILP optimal solution against baseline and operational variants.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.scenarioComparisons || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="scenario" tick={{ fontSize: 10, fill: '#778278' }} />
                <YAxis tick={{ fontSize: 10, fill: '#778278' }} />
                <Tooltip formatter={(v: unknown) => [`$${Number(v).toLocaleString()} USD`, 'Total Cost']} />
                <Bar dataKey="totalCost" fill="#123D2B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quarterly Historical Performance Line Chart (6 cols) */}
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-4">
            <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
              Quarterly Baseline vs. Optimized Cost
            </h3>
            <p className="text-xs text-[#778278]">
              Historical tracking over 6 quarters demonstrating cost reduction consistency.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.quarterlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#778278' }} />
                <YAxis tick={{ fontSize: 11, fill: '#778278' }} />
                <Tooltip formatter={(v: unknown) => [`$${Number(v).toLocaleString()} USD`]} />
                <Legend />
                <Line type="monotone" dataKey="baseline" name="Historical Baseline" stroke="#997939" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="optimized" name="M4 Optimized Plan" stroke="#286B45" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity & Quick Action Drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
                Recent Research & Optimization Activity
              </h3>
              <p className="text-xs text-[#778278]">Audit trail of scenario solves and dataset activations.</p>
            </div>
            <button
              onClick={() => navigate('/m4/scenarios')}
              className="text-xs font-medium text-[#286B45] hover:underline"
            >
              View All Scenarios
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start justify-between py-3.5">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#123D2B]">{act.title}</div>
                  <div className="text-xs text-[#778278]">{act.detail}</div>
                  <div className="text-[11px] text-[#C6A15B]">{act.user}</div>
                </div>
                <span className="shrink-0 text-[11px] text-[#778278]">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card (4 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#C6A15B]/30 bg-gradient-to-br from-[#F8F5ED] to-[#E8F0E5]/60 p-6 shadow-sm lg:col-span-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#123D2B]">
              <FileSpreadsheet className="h-4 w-4 text-[#C6A15B]" />
              <span>Prescriptive Engine Controls</span>
            </div>
            <h4 className="mt-2 font-serif-ceylon text-lg font-bold text-[#123D2B]">
              Execute Next Export Cycle
            </h4>
            <p className="mt-1 text-xs text-[#778278]">
              Configure tea supplies, port routes, and minimum market contracts for the upcoming planning quarter.
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => navigate('/m4/workspace')}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#286B45] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#123D2B]"
            >
              <Cpu className="h-4 w-4" />
              <span>Open Scenario Workspace</span>
            </button>
            <button
              onClick={() => navigate('/m4/results')}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-[#202922] transition hover:bg-[#F8F5ED]"
            >
              <Download className="h-4 w-4 text-[#778278]" />
              <span>Export Allocations CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
