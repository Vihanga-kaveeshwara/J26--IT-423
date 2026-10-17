import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Plus,
  Play,
  Trash2,
  Clock,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import api from '../../../services/api';

interface ScenarioItem {
  id: string;
  name: string;
  description: string;
  planningHorizon: string;
  datasetVersion: string;
  baselineSelection: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalCostUsd?: number;
  savingsUsd?: number;
  savingsPct?: number;
}

export const ScenariosPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchScenarios = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; scenarios: ScenarioItem[] }>('/v1/M4/scenarios');
      setScenarios(res.data.scenarios);
    } catch {
      // Fallback local scenarios
      setScenarios([
        {
          id: 'SCN-2024Q1-BASE',
          name: '2024 Q1 Core Multi-Market Allocation',
          description: 'Standard baseline scenario fulfilling bilateral trade contracts across 5 major export markets.',
          planningHorizon: '2024Q1',
          datasetVersion: 'M4-DS-v1.0',
          baselineSelection: 'HEURISTIC_PREMIUM',
          status: 'OPTIMIZED',
          createdAt: '2026-03-01T08:00:00Z',
          updatedAt: '2026-03-01T08:30:00Z',
          totalCostUsd: 1846850,
          savingsUsd: 279930,
          savingsPct: 13.16,
        },
        {
          id: 'SCN-2024Q2-FUEL',
          name: '2024 Q2 Fuel Surcharge (+15%) Variant',
          description: 'Contingency plan testing maritime tariff escalations through the Red Sea corridor.',
          planningHorizon: '2024Q2',
          datasetVersion: 'M4-DS-v1.0',
          baselineSelection: 'HEURISTIC_PREMIUM',
          status: 'OPTIMIZED',
          createdAt: '2026-03-05T11:00:00Z',
          updatedAt: '2026-03-05T11:15:00Z',
          totalCostUsd: 1895650,
          savingsUsd: 231130,
          savingsPct: 10.87,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/v1/M4/scenarios/${id}`);
      setMessage('Scenario deleted successfully.');
      fetchScenarios();
    } catch {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      setMessage('Scenario removed (local session).');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15B]">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Prescriptive Scenario Repository</span>
          </div>
          <h1 className="mt-1 font-serif-ceylon text-3xl font-bold text-[#123D2B]">
            Export Scenarios
          </h1>
          <p className="mt-1 text-xs text-[#778278] md:text-sm">
            Saved planning iterations, trade agreements, and optimal allocation snapshots.
          </p>
        </div>

        <button
          onClick={() => navigate('/m4/workspace')}
          className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-[#123D2B] via-[#1a4a34] to-[#286B45] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#123D2B]/20 transition hover:opacity-95"
        >
          <Plus className="h-4 w-4 text-[#C6A15B]" />
          <span>New Scenario</span>
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {scenarios.map((scn) => (
          <div
            key={scn.id}
            className="flex flex-col justify-between rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#F8F5ED] px-3 py-1 text-[11px] font-semibold text-[#286B45]">
                  Horizon: {scn.planningHorizon}
                </span>
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{scn.status}</span>
                </span>
              </div>

              <h3 className="mt-3 font-serif-ceylon text-xl font-bold text-[#123D2B]">
                {scn.name}
              </h3>
              <p className="mt-1 text-xs text-[#778278] line-clamp-2">{scn.description}</p>

              {scn.totalCostUsd && (
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="text-[11px] text-[#778278]">Optimized Cost</div>
                    <div className="font-semibold text-[#123D2B]">
                      ${scn.totalCostUsd.toLocaleString()} USD
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#778278]">Potential Savings</div>
                    <div className="font-semibold text-[#286B45]">
                      +{scn.savingsPct}% (${scn.savingsUsd?.toLocaleString()})
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
              <span className="text-[#778278]">DS: {scn.datasetVersion}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/m4/workspace')}
                  className="inline-flex items-center space-x-1 rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-[#202922] hover:bg-[#F8F5ED]"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#778278]" />
                  <span>Edit / Re-solve</span>
                </button>
                <button
                  onClick={() => handleDelete(scn.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:text-red-600"
                  title="Delete Scenario"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ScenariosPage;
