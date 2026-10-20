/**
 * M1 Tea Export Demand Forecasting Page
 * frontend/src/pages/DemandForecastPage.tsx
 *
 * Full dashboard for M1 export demand forecasting:
 * - Dynamic month range picker with presets derived from latest_actual_month
 * - Non-dismissible retrospective demo banner for past months
 * - Shaded interval SVG chart (50% and 80% bands)
 * - Monthly breakdown table with point forecast and component models
 * - Runtime metrics binding from GET /api/demand-forecast/metrics (zero hardcoding)
 * - Observed vs nominal coverage (50%, 80%, 90%) and empirical asymmetry offsets
 * - Loading, error (503/400/422), and empty states
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Info,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Layers,
  History,
  Sliders,
} from 'lucide-react';
import { M1Navbar } from '../components/m1/M1Navbar';
import { DemandForecastChart } from '../components/m1/DemandForecastChart';
import {
  fetchDemandForecast,
  fetchDemandModel,
  fetchDemandMetrics,
  DemandApiError,
} from '../services/m1DemandService';
import {
  PredictDemandResponse,
  ModelInfoResponse,
  MetricsResponse,
} from '../types/demandForecast';

// Helper date arithmetic functions
export function getNextMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  return `${nextY}-${String(nextM).padStart(2, '0')}`;
}

export function addMonths(monthStr: string, count: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) + count;
  const newY = Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

export function getMonthList(from: string, to: string): string[] {
  const res: string[] = [];
  let cur = from;
  while (cur <= to && res.length < 36) {
    res.push(cur);
    cur = getNextMonth(cur);
  }
  return res;
}

export function DemandForecastPage() {
  const [fromMonth, setFromMonth] = useState('2025-01');
  const [toMonth, setToMonth] = useState('2025-03');
  const [forecastData, setForecastData] = useState<PredictDemandResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [metricsInfo, setMetricsInfo] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loadData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      const [forecastRes, modelRes] = await Promise.all([
        fetchDemandForecast(from, to),
        fetchDemandModel().catch(() => null),
      ]);
      setForecastData(forecastRes);
      if (modelRes) setModelInfo(modelRes);
    } catch (err: any) {
      if (err instanceof DemandApiError) {
        setError(err.message);
        setErrorStatus(err.statusCode || 500);
      } else {
        setError(err?.message || 'Failed to fetch demand forecast');
        setErrorStatus(500);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const metricsRes = await fetchDemandMetrics();
      setMetricsInfo(metricsRes);
    } catch (err: any) {
      setMetricsError(err?.message || 'Failed to fetch metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    loadData(fromMonth, toMonth);
    loadMetrics();
  }, []);

  // Derived date bounds
  const latestActualMonth = forecastData?.latest_actual_month || modelInfo?.data_cutoff_date || '2024-12';
  const startHorizonMonth = getNextMonth(latestActualMonth);
  const maxAllowedTargetMonth = addMonths(latestActualMonth, 12);
  const allowedMonths = getMonthList(startHorizonMonth, maxAllowedTargetMonth);

  // Dynamic presets
  const presetQ1End = addMonths(latestActualMonth, 3);
  const presetH1End = addMonths(latestActualMonth, 6);
  const presetFullEnd = addMonths(latestActualMonth, 12);

  // Retrospective demo banner check
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isRetrospective = fromMonth < currentYearMonth || toMonth < currentYearMonth;

  // Preset handler
  const applyPreset = (from: string, to: string) => {
    setFromMonth(from);
    setToMonth(to);
    loadData(from, to);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromMonth > toMonth) {
      setError('Start month cannot be after end month.');
      setErrorStatus(400);
      return;
    }
    loadData(fromMonth, toMonth);
  };

  // Calculations for summary tiles
  const predictions = forecastData?.predictions || [];
  const avgForecast =
    predictions.length > 0
      ? (
          predictions.reduce((acc, p) => acc + p.point_forecast_mn_kg, 0) /
          predictions.length
        ).toFixed(2)
      : '0.00';

  const peakPoint = predictions.reduce(
    (max, p) => (p.point_forecast_mn_kg > max.val ? { month: p.target_month, val: p.point_forecast_mn_kg } : max),
    { month: 'N/A', val: -Infinity }
  );

  const minPoint = predictions.reduce(
    (min, p) => (p.point_forecast_mn_kg < min.val ? { month: p.target_month, val: p.point_forecast_mn_kg } : min),
    { month: 'N/A', val: Infinity }
  );

  return (
    <div className="min-h-screen bg-forest-950 text-white font-sans flex flex-col">
      <M1Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Module M1 Champion
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/30" data-testid="badge-latest-actual">
                Model data ends: {latestActualMonth}
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-wide">
              Sri Lanka Tea Export Demand Forecast
            </h1>
            <p className="text-sm text-white/70 mt-1 max-w-2xl">
              Advisory export volume projections using an equal-weight ensemble (Seasonal Mean 3yr + ETS + XGBoost) with calibrated empirical prediction intervals.
            </p>
          </div>

          <button
            onClick={() => {
              loadData(fromMonth, toMonth);
              loadMetrics();
            }}
            disabled={loading || metricsLoading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white text-sm font-medium border border-white/10 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading || metricsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Non-dismissible Retrospective Demo Banner (Condition 4) */}
        {isRetrospective && (
          <div
            data-testid="banner-retrospective-demo"
            className="bg-gold-500/15 border-2 border-gold-500/40 rounded-2xl p-4 flex items-center gap-3 text-gold-200 text-xs sm:text-sm font-medium shadow-gold"
          >
            <History className="w-5 h-5 text-gold-400 shrink-0" />
            <p>
              <strong>Retrospective demo:</strong> model data ends <strong>{latestActualMonth}</strong>. Months already in the past are not future forecasts.
            </p>
          </div>
        )}

        {/* Mandatory Advisory Notice Banner */}
        <section className="bg-forest-900/60 rounded-2xl p-5 border border-white/10 space-y-3.5 shadow-md">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">Forecasting Mechanism:</span>
                <span className="text-emerald-300 font-medium" data-testid="note-direct-12m">
                  each month is forecast from data 12 months earlier (direct 12-month model)
                </span>
                <span className="text-white/40">|</span>
                <span className="text-white/80">
                  Data Cutoff: <strong className="text-white">{latestActualMonth}</strong>
                </span>
              </div>

              {forecastData?.disclaimer && (
                <p className="text-white/80 leading-relaxed italic" data-testid="text-backend-disclaimer">
                  &ldquo;{forecastData.disclaimer}&rdquo;
                </p>
              )}

              {/* Warnings List */}
              {forecastData?.warnings && forecastData.warnings.length > 0 && (
                <div className="pt-1 space-y-1">
                  {forecastData.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gold-300/90 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-gold-400" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Over-Forecast Bias & Calibration Disclosure (Runtime values from /metrics, Condition 2 & 7) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
            {/* Box 1: Bias & Asymmetry */}
            <div className="bg-forest-950/60 p-3.5 rounded-xl border border-gold-500/20 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-gold-300">
                <ShieldAlert className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Over-Forecast Bias Advisory</span>
              </div>

              {metricsLoading ? (
                <div className="animate-pulse space-y-1 text-white/40">Loading bias metrics...</div>
              ) : metricsError ? (
                <p className="text-red-400">Failed to load bias metrics: {metricsError}</p>
              ) : metricsInfo ? (
                <div className="text-white/80 space-y-1.5 leading-relaxed">
                  <p>
                    Backtesting against held-out test phase (2023–2024, n={metricsInfo.bias_and_asymmetry.n_test_origins}) revealed a{' '}
                    <strong className="text-gold-300" data-testid="metric-test-bias">
                      +{metricsInfo.bias_and_asymmetry.test_phase_2023_2024_bias_mn_kg.toFixed(2)} Mn kg
                    </strong>{' '}
                    mean bias (pooled historical bias:{' '}
                    <strong className="text-white" data-testid="metric-pooled-bias">
                      +{metricsInfo.bias_and_asymmetry.pooled_bias_mn_kg.toFixed(2)} Mn kg
                    </strong>{' '}
                    across n={metricsInfo.bias_and_asymmetry.n_pooled_origins} origins, 2012–2024).
                  </p>
                  <p>
                    Historical actuals fell below point forecasts in{' '}
                    <strong className="text-white" data-testid="metric-share-below-pooled">
                      {metricsInfo.bias_and_asymmetry.share_actuals_below_point_forecast_pooled_pct.toFixed(1)}%
                    </strong>{' '}
                    of pooled months and{' '}
                    <strong className="text-gold-300" data-testid="metric-share-below-test">
                      {metricsInfo.bias_and_asymmetry.share_actuals_below_point_forecast_test_phase_pct.toFixed(1)}%
                    </strong>{' '}
                    of 2023–2024 test months.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Box 2: Observed vs Nominal Coverage */}
            <div className="bg-forest-950/60 p-3.5 rounded-xl border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Observed vs Nominal Interval Coverage</span>
              </div>

              {metricsLoading ? (
                <div className="animate-pulse space-y-1 text-white/40">Loading coverage metrics...</div>
              ) : metricsError ? (
                <p className="text-red-400">Failed to load coverage metrics: {metricsError}</p>
              ) : metricsInfo ? (
                <div className="text-white/80 space-y-1.5 leading-relaxed">
                  <p>
                    Nominal 80% interval achieves{' '}
                    <strong className="text-white" data-testid="metric-cov80-overall">
                      {metricsInfo.observed_backtest_coverage.nominal_80_overall_pct.toFixed(1)}%
                    </strong>{' '}
                    coverage overall (n={metricsInfo.observed_backtest_coverage.n_origins}, 2018–2024), dropping to{' '}
                    <strong className="text-emerald-300" data-testid="metric-cov80-test">
                      {metricsInfo.observed_backtest_coverage.nominal_80_test_phase_pct.toFixed(1)}%
                    </strong>{' '}
                    during 2023–2024 test phase (n={metricsInfo.observed_backtest_coverage.n_test_origins}).
                  </p>
                  <p>
                    Nominal 50% interval achieves{' '}
                    <strong className="text-white" data-testid="metric-cov50-overall">
                      {metricsInfo.observed_backtest_coverage.nominal_50_overall_pct.toFixed(1)}%
                    </strong>{' '}
                    overall ({metricsInfo.observed_backtest_coverage.nominal_50_test_phase_pct.toFixed(1)}% test). Nominal 90% achieves{' '}
                    <strong className="text-white" data-testid="metric-cov90-overall">
                      {metricsInfo.observed_backtest_coverage.nominal_90_overall_pct.toFixed(1)}%
                    </strong>{' '}
                    overall ({metricsInfo.observed_backtest_coverage.nominal_90_test_phase_pct.toFixed(1)}% test).
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Asymmetry Offsets & Condition 6 Note */}
          {metricsInfo && (
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/70">
              <div className="flex items-start gap-2 bg-forest-950/40 p-3 rounded-lg border border-white/5">
                <Sliders className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-1">
                    Interval Asymmetry Offsets (point forecast + offset)
                  </p>
                  <p className="text-[11px] text-white/60 mb-1.5">
                    {metricsInfo.bias_and_asymmetry.sign_convention}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-white/5 p-1.5 rounded">
                      <p className="text-white/50">50% Interval</p>
                      <p className="font-mono text-emerald-300 font-semibold" data-testid="offset-50">
                        [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_50.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_50.upper_offset_mn_kg.toFixed(2)}]
                      </p>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <p className="text-white/50">80% Interval</p>
                      <p className="font-mono text-emerald-300 font-semibold" data-testid="offset-80">
                        [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_80.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_80.upper_offset_mn_kg.toFixed(2)}]
                      </p>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <p className="text-white/50">90% Interval</p>
                      <p className="font-mono text-emerald-300 font-semibold" data-testid="offset-90">
                        [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_90.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_90.upper_offset_mn_kg.toFixed(2)}]
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-forest-950/40 p-3 rounded-lg border border-white/5 text-[11px] leading-relaxed">
                <Info className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-0.5">Note on Interval Methodology</p>
                  <p className="text-white/60">
                    The serving API applies fixed empirical quantiles pooled over all {metricsInfo.bias_and_asymmetry.n_fixed_offset_errors} historical backtest errors (2012–2024, including 2023–2024). Reported coverage was evaluated causally via an expanding error quantile procedure at each origin across {metricsInfo.observed_backtest_coverage.n_origins} origins (2018–2024).
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Range Controls & Presets (Condition 3) */}
        <section className="bg-forest-900/40 rounded-2xl p-5 border border-white/10">
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Select Forecast Horizon (Max 12 Months from Cutoff)
              </span>

              {/* Dynamic Preset buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(startHorizonMonth, presetQ1End)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === startHorizonMonth && toMonth === presetQ1End
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  Next 3 Months ({startHorizonMonth}..{presetQ1End})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(startHorizonMonth, presetH1End)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === startHorizonMonth && toMonth === presetH1End
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  Next 6 Months ({startHorizonMonth}..{presetH1End})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(startHorizonMonth, presetFullEnd)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === startHorizonMonth && toMonth === presetFullEnd
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  Full 12 Months ({startHorizonMonth}..{presetFullEnd})
                </button>
              </div>
            </div>

            {/* Dynamic Dropdown selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  From Target Month
                </label>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="w-full bg-forest-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {allowedMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  To Target Month
                </label>
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="w-full bg-forest-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {allowedMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 hover:from-emerald-500 hover:to-forest-600 text-white text-sm font-semibold shadow-forest transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Calculating...' : 'Generate Forecast'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* State Handling: Loading, Error, Empty, or Content */}
        {loading && (
          <div className="bg-forest-900/30 rounded-2xl p-12 border border-white/10 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-white/70">
              Generating ensemble forecasts with empirical uncertainty bands...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-950/40 rounded-2xl p-6 border border-red-500/30 space-y-3" data-testid="card-error">
            <div className="flex items-center gap-2.5 text-red-400 font-semibold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Forecast Generation Error ({errorStatus || 500})</span>
            </div>
            <p className="text-sm text-white/80">{error}</p>
            {errorStatus === 503 && (
              <p className="text-xs text-white/60">
                Please ensure the ML service is running on the backend URL (default: http://localhost:8000).
              </p>
            )}
            <button
              onClick={() => loadData(fromMonth, toMonth)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800/60 hover:bg-red-700/60 text-xs text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && predictions.length === 0 && (
          <div className="bg-forest-900/30 rounded-2xl p-12 border border-white/10 text-center space-y-2">
            <p className="text-sm font-semibold text-white">No Forecast Data Available</p>
            <p className="text-xs text-white/60">
              Please choose a valid month range within the forecast horizon to generate projections.
            </p>
          </div>
        )}

        {!loading && !error && predictions.length > 0 && (
          <div className="space-y-8">
            {/* Summary Stat Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-forest-900/40 p-4 rounded-xl border border-white/10">
                <p className="text-xs text-white/60">Average Forecast</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {avgForecast} <span className="text-sm font-normal text-white/60">Mn kg</span>
                </p>
                <p className="text-[11px] text-emerald-400 mt-0.5">Across {predictions.length} months</p>
              </div>

              <div className="bg-forest-900/40 p-4 rounded-xl border border-white/10">
                <p className="text-xs text-white/60">Peak Projected Month</p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">
                  {peakPoint.val > -Infinity ? peakPoint.val.toFixed(2) : '--'}{' '}
                  <span className="text-sm font-normal text-white/60">Mn kg</span>
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">{peakPoint.month}</p>
              </div>

              <div className="bg-forest-900/40 p-4 rounded-xl border border-white/10">
                <p className="text-xs text-white/60">Trough Projected Month</p>
                <p className="text-2xl font-bold text-gold-300 mt-1">
                  {minPoint.val < Infinity ? minPoint.val.toFixed(2) : '--'}{' '}
                  <span className="text-sm font-normal text-white/60">Mn kg</span>
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">{minPoint.month}</p>
              </div>

              <div className="bg-forest-900/40 p-4 rounded-xl border border-white/10">
                <p className="text-xs text-white/60">Model Horizon</p>
                <p className="text-2xl font-bold text-white mt-1">12 Months</p>
                <p className="text-[11px] text-white/60 mt-0.5">Direct lag architecture</p>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <DemandForecastChart predictions={predictions} />

            {/* Monthly Forecast & Components Table */}
            <div className="bg-forest-900/40 rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Monthly Forecast Breakdown</h3>
                  <p className="text-xs text-white/60">
                    Point estimates, empirical confidence intervals, and individual component model forecasts
                  </p>
                </div>
                <span className="text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-md">
                  Units: Million kg
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/70 border-b border-white/10 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Target Month</th>
                      <th className="py-3 px-4">Origin (T-12)</th>
                      <th className="py-3 px-4 text-right text-emerald-400">Point Forecast</th>
                      <th className="py-3 px-4 text-center">50% Interval</th>
                      <th className="py-3 px-4 text-center">80% Interval</th>
                      <th className="py-3 px-4 text-right text-white/60">Seasonal Mean</th>
                      <th className="py-3 px-4 text-right text-white/60">ETS</th>
                      <th className="py-3 px-4 text-right text-white/60">XGBoost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {predictions.map((p) => (
                      <tr key={p.target_month} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white font-mono">
                          {p.target_month}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-white/50 text-xs">
                          {p.forecast_origin_month}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-300 font-mono text-sm">
                          {p.point_forecast_mn_kg.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">
                          [{p.interval_50.lower_mn_kg.toFixed(2)} – {p.interval_50.upper_mn_kg.toFixed(2)}]
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-white/90">
                          [{p.interval_80.lower_mn_kg.toFixed(2)} – {p.interval_80.upper_mn_kg.toFixed(2)}]
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-white/70">
                          {p.component_forecasts.seasonal_mean_3yr_mn_kg.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-white/70">
                          {p.component_forecasts.ets_mn_kg.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-white/70">
                          {p.component_forecasts.xgboost_mn_kg.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model Architecture & Provenance Card (Condition 4: Show n for accuracy) */}
            <div className="bg-forest-900/30 rounded-2xl p-5 border border-white/10 text-xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Model Architecture & Provenance Specifications</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-white/70">
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Model Architecture</p>
                  <p className="font-semibold text-white text-xs mt-0.5">
                    Equal-weight Ensemble (3 Models)
                  </p>
                </div>
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Evaluation MAE</p>
                  <p className="font-semibold text-emerald-400 text-xs mt-0.5" data-testid="metric-mae">
                    {metricsInfo ? `${metricsInfo.backtest_metrics.mae.toFixed(3)} Mn kg` : '--'}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    n={metricsInfo?.backtest_metrics.n_origins || 152} origins (2012–2024)
                  </p>
                </div>
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Evaluation RMSE</p>
                  <p className="font-semibold text-white text-xs mt-0.5" data-testid="metric-rmse">
                    {metricsInfo ? `${metricsInfo.backtest_metrics.rmse.toFixed(3)} Mn kg` : '--'}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5" data-testid="metric-rmse-n">
                    n={metricsInfo?.backtest_metrics.n_origins || 152} origins (2012–2024)
                  </p>
                </div>
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Training Cutoff</p>
                  <p className="font-semibold text-white text-xs mt-0.5">
                    {latestActualMonth}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">Direct 12m step-ahead</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
