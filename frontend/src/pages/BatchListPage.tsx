import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Filter,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { M2Navbar } from '../components/m2/M2Navbar';
import { fetchBatches, ApiError } from '../services/batchService';
import { BatchRecord } from '../types/batch';

const FACTORY_OPTIONS = [
  'Factory_A',
  'Factory_B',
  'Factory_C',
  'Factory_D',
  'Factory_E',
  'Factory_F',
  'Factory_G',
  'Factory_H',
];

const REGION_OPTIONS = ['Low-Country', 'Uva', 'Nuwara Eliya'];

export function BatchListPage() {
  const navigate = useNavigate();

  // Filter State
  const [factoryId, setFactoryId] = useState('');
  const [region, setRegion] = useState('');
  const [source, setSource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Data & State
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBatches({
        factory_id: factoryId || undefined,
        region: region || undefined,
        source: source || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit,
      });

      setBatches(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch batch records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [factoryId, region, source, startDate, endDate, page, limit]);

  const handleResetFilters = () => {
    setFactoryId('');
    setRegion('');
    setSource('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const renderRefuseBadge = (b: BatchRecord) => {
    const val = b.predicted_refuse_tea_pct ?? b.actual_refuse_tea_pct;
    if (val == null) {
      return <span className="text-xs text-[#A39B8F] italic">Pending</span>;
    }

    const isLow = val < 5.5;
    const isMedium = val <= 7.5;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
          isLow
            ? 'bg-[#EAF6ED] text-[#165B34] border-[#CDE8D4]'
            : isMedium
            ? 'bg-[#FEF7E6] text-[#8C6212] border-[#FBE5B4]'
            : 'bg-[#FDF0ED] text-[#9A2C18] border-[#FAD3CB]'
        }`}
      >
        {val.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#182C23] flex flex-col font-sans">
      <M2Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full">
        {/* Executive Header Banner (matching photo) */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0F3523] via-[#133E2B] to-[#184832] p-7 sm:p-9 shadow-sm border border-[#184832] text-white relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-mono font-bold tracking-widest uppercase mb-2">
                <Sparkles className="w-4 h-4 text-[#C69A4B]" />
                <span>CEYLON AI — EXECUTIVE OPERATIONS & AUDIT</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight leading-tight">
                Batch Production & Refuse Audit Trail
              </h1>
              <p className="text-sm text-[#C8D9CE] mt-2 font-sans leading-relaxed">
                Summary of all tea manufacturing batches, continuous ML refuse predictions, and real-time operational quality audit logs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition-all flex items-center gap-2 backdrop-blur-xs active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sync Batches</span>
              </button>

              <Link
                to="/batches/new"
                className="px-5 py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A759] text-[#14261C] font-bold text-sm shadow-xs transition-all flex items-center gap-2 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Batch Prediction</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Executive Guidance Cards Row (matching photo's 2 top cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Benchmark Thresholds */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                Quality Standard & Refuse Targets
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
                Sri Lanka Tea Board
              </span>
            </div>
            <p className="text-xs text-[#706B62] mt-1 font-sans">
              Manufacturing thresholds calibrated against the national static baseline (6.0%).
            </p>

            {/* Mint Callout Box */}
            <div className="bg-[#EDF7F2] border border-[#D5EBDE] rounded-xl p-3.5 text-xs text-[#194B32] flex items-start gap-2.5 mt-4 leading-relaxed">
              <Info className="w-4 h-4 text-[#165B34] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#14422D]">Target Compliance:</strong> Batches with predicted refuse &lt; 5.5% maximize high-value export grade recovery. Batches &ge; 7.5% trigger machine maintenance and withering fan inspection.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#F0ECE4]">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF6ED] border border-[#CDE8D4] text-xs font-semibold text-[#165B34]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>&lt; 5.5% Optimal</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF7E6] border border-[#FBE5B4] text-xs font-semibold text-[#8C6212]">
                <span>5.5% - 7.5% Normal</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF0ED] border border-[#FAD3CB] text-xs font-semibold text-[#9A2C18]">
                <span>&ge; 7.5% Elevated</span>
              </div>
            </div>
          </div>

          {/* Card 2: Decision Support Engine */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                Root-Cause Attribution & Simulation
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
                SHAP Decision Engine
              </span>
            </div>
            <p className="text-xs text-[#706B62] mt-1 font-sans">
              Interactive local explainability and what-if parameter optimization.
            </p>

            {/* Warm Gold Callout Box */}
            <div className="bg-[#FDF8EC] border border-[#F6E7C4] rounded-xl p-3.5 text-xs text-[#785416] flex items-start gap-2.5 mt-4 leading-relaxed">
              <Info className="w-4 h-4 text-[#A06A17] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#664612]">How to steer operations:</strong> Click any batch in the audit trail to view TreeExplainer SHAP attribution drivers and test counterfactual adjustments to withering hours and dryer temperature.
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F0ECE4] text-xs text-[#706B62]">
              <span>Loaded Batches: <strong className="text-[#14261C]">{total.toLocaleString()}</strong></span>
              <span className="flex items-center gap-1 text-[#133E2B] font-semibold">
                <TrendingDown className="w-3.5 h-3.5 text-[#C69A4B]" />
                Interactive Simulation Active
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="mb-6 p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#554C3F]">
              <Filter className="w-4 h-4 text-[#133E2B]" />
              <span>Filter Batches</span>
            </div>
            {(factoryId || region || source || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[#133E2B] hover:text-[#184832] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Factory Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-[#554C3F] mb-1.5">Factory</label>
              <select
                value={factoryId}
                onChange={(e) => {
                  setFactoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-xs font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
              >
                <option value="">All Factories</option>
                {FACTORY_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-[#554C3F] mb-1.5">Region</label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-xs font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
              >
                <option value="">All Regions</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-[#554C3F] mb-1.5">Batch Source</label>
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-xs font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
              >
                <option value="">All Sources</option>
                <option value="operator_submitted">Operator Submitted</option>
                <option value="synthetic_seed">Synthetic Seed (Historical)</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-semibold text-[#554C3F] mb-1.5">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-xs font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-semibold text-[#554C3F] mb-1.5">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-xs font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FDF0ED] border border-[#FAD3CB] text-[#9A2C18] text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#9A2C18] shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Table / List View Card */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-9 h-9 border-3 border-[#CDE8D4] border-t-[#133E2B] rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#706B62] font-semibold">Loading batch records...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center px-4">
              <Layers className="w-12 h-12 text-[#C6BEB2] mb-3" />
              <p className="text-base font-bold text-[#14261C]">No Batches Found</p>
              <p className="text-xs text-[#706B62] max-w-sm mt-1">
                No production batches matched your current filter parameters. Try clearing the filters or submitting a new batch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#182C23]">
                <thead className="bg-[#F7F5EE] border-b border-[#EBE6DD] text-[11px] font-bold text-[#665D4F] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Batch ID / Source</th>
                    <th className="px-6 py-4">Factory & Region</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Intake & Grade</th>
                    <th className="px-6 py-4">Refuse %</th>
                    <th className="px-6 py-4">Machinery</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE4]">
                  {batches.map((batch) => {
                    const isOperator = batch.source === 'operator_submitted';
                    return (
                      <tr
                        key={batch.id}
                        onClick={() => navigate(`/batches/${batch.batch_id}`)}
                        className="hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                      >
                        {/* Batch ID & Source */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm font-bold text-[#14422D] group-hover:text-[#184832] transition-colors">
                            {batch.batch_id}
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              isOperator
                                ? 'bg-[#EAF6ED] text-[#165B34] border-[#CDE8D4]'
                                : 'bg-[#F2EFE8] text-[#554C3F] border-[#DFD8CC]'
                            }`}
                          >
                            {isOperator ? 'Operator Submitted' : 'Historical Seed'}
                          </span>
                        </td>

                        {/* Factory & Region */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-[#14261C]">{batch.factory_id}</div>
                          <div className="text-xs text-[#706B62]">{batch.region}</div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-[#554C3F] font-medium">
                          {formatDate(batch.batch_date)}
                        </td>

                        {/* Intake & Grade */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-[#14261C] font-semibold">
                            {batch.green_leaf_input_kg.toLocaleString()} kg
                          </div>
                          <div className="text-[11px] text-[#8C6212] font-mono font-semibold">
                            Grade: {batch.tea_grade_produced}
                          </div>
                        </td>

                        {/* Refuse % */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderRefuseBadge(batch)}
                        </td>

                        {/* Machinery */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-[#706B62]">
                          <div>Withering: <strong className="text-[#14261C]">{batch.withering_duration_hrs}h</strong></div>
                          <div>Dryer: <strong className="text-[#14261C]">{batch.dryer_temperature_c}°C</strong></div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F0ECE4] text-[#14261C] text-xs font-semibold group-hover:bg-[#123E2A] group-hover:text-white transition-all shadow-2xs">
                            <span>Analyze & What-If</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Toolbar */}
          {!loading && total > 0 && (
            <div className="px-6 py-4 border-t border-[#EBE6DD] flex flex-wrap items-center justify-between gap-4 text-xs text-[#706B62] bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] text-[#14261C] font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2 font-medium">
                  Showing {Math.min((page - 1) * limit + 1, total)} -{' '}
                  {Math.min(page * limit, total)} of {total} batches
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg bg-white border border-[#DDD7CC] hover:bg-[#F2EFE8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#14261C]"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-[#14261C] px-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg bg-white border border-[#DDD7CC] hover:bg-[#F2EFE8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#14261C]"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button (matching bottom-right of photo) */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/batches/new"
          className="w-12 h-12 rounded-full bg-[#123E2A] hover:bg-[#184832] text-[#D4AF37] border border-[#C69A4B]/40 shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
          title="AI Operations Assistant — New Prediction"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
