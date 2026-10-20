import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Layers,
  Factory,
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
      return <span className="text-xs text-white/40 italic">Pending</span>;
    }

    const isLow = val < 5.5;
    const isMedium = val <= 7.5;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${
          isLow
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : isMedium
            ? 'bg-gold-500/15 text-gold-300 border-gold-500/30'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        }`}
      >
        {val.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-forest-950 text-white flex flex-col font-sans">
      <M2Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
              <History className="w-3.5 h-3.5" />
              Production Audit Trail
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              Batch Production History
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Showing {total.toLocaleString()} total historical & operator-submitted tea batches.
            </p>
          </div>

          <Link
            to="/batches/new"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 text-white font-semibold text-sm shadow-forest hover:shadow-glow-green hover:from-emerald-500 hover:to-forest-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Batch Prediction</span>
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="mb-6 p-5 rounded-3xl bg-forest-900/60 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filter Batches</span>
            </div>
            {(factoryId || region || source || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Factory Filter */}
            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">Factory</label>
              <select
                value={factoryId}
                onChange={(e) => {
                  setFactoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-forest-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
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
              <label className="block text-[11px] font-medium text-white/60 mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-forest-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
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
              <label className="block text-[11px] font-medium text-white/60 mb-1">Batch Source</label>
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-forest-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Sources</option>
                <option value="operator_submitted">Operator Submitted</option>
                <option value="synthetic_seed">Synthetic Seed (Historical)</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-forest-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-forest-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Table / List View */}
        <div className="rounded-3xl bg-forest-900/60 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
              <p className="text-sm text-white/60 font-medium">Loading batch records...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center px-4">
              <Layers className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-base font-semibold text-white/80">No Batches Found</p>
              <p className="text-xs text-white/50 max-w-sm mt-1">
                No production batches matched your current filter parameters. Try clearing the filters or submitting a new batch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="bg-forest-950/80 border-b border-white/10 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Batch ID / Source</th>
                    <th className="px-5 py-4">Factory & Region</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Intake & Grade</th>
                    <th className="px-5 py-4">Refuse %</th>
                    <th className="px-5 py-4">Machinery</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batches.map((batch) => {
                    const isOperator = batch.source === 'operator_submitted';
                    return (
                      <tr
                        key={batch.id}
                        onClick={() => navigate(`/batches/${batch.batch_id}`)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        {/* Batch ID & Source */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {batch.batch_id}
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              isOperator
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
                            }`}
                          >
                            {isOperator ? 'Operator Submitted' : 'Historical Seed'}
                          </span>
                        </td>

                        {/* Factory & Region */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-medium text-white">{batch.factory_id}</div>
                          <div className="text-xs text-white/50">{batch.region}</div>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-white/70">
                          {formatDate(batch.batch_date)}
                        </td>

                        {/* Intake & Grade */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-xs text-white font-medium">
                            {batch.green_leaf_input_kg.toLocaleString()} kg
                          </div>
                          <div className="text-[11px] text-gold-400 font-mono">
                            Grade: {batch.tea_grade_produced}
                          </div>
                        </td>

                        {/* Refuse % */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderRefuseBadge(batch)}
                        </td>

                        {/* Machinery */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-white/60">
                          <div>Withering: {batch.withering_duration_hrs}h</div>
                          <div>Dryer: {batch.dryer_temperature_c}°C</div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 text-xs font-medium text-white/70 transition-all">
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
            <div className="px-5 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60 bg-forest-950/50">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded bg-forest-900 border border-white/15 text-white"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2">
                  Showing {Math.min((page - 1) * limit + 1, total)} -{' '}
                  {Math.min(page * limit, total)} of {total} batches
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-white/80">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
