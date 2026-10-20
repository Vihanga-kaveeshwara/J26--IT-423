/**
 * Sri Lanka Tea Export Demand Forecast Page
 * frontend/src/pages/DemandForecastPage.tsx
 *
 * 3-Layer Structure for Non-Technical Managers & Supervisors:
 * - Layer 1: Plain-language monthly forecast headlines, likely ranges, and clean chart
 * - Layer 2: Plain-language "How reliable is this?" card with status chip and zero jargon
 * - Layer 3: Collapsible "Technical details" section with detailed metrics, intervals, table, and provenance
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  History,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Sliders,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
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
import { DemandForecastChart } from '../components/m1/DemandForecastChart';

// Helper date math utilities
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

export function formatMonthName(monthStr: string): string {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
    (max, p) => (p.point_forecast_mn_kg > max.val ? { val: p.point_forecast_mn_kg, month: p.target_month } : max),
    { val: -Infinity, month: '--' }
  );

  const minPoint = predictions.reduce(
    (min, p) => (p.point_forecast_mn_kg < min.val ? { val: p.point_forecast_mn_kg, month: p.target_month } : min),
    { val: Infinity, month: '--' }
  );

  return (
    <div className="min-h-screen bg-forest-950 text-white font-sans selection:bg-emerald-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] bg-forest-700/20 rounded-full blur-[120px]" />
      </div>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Header Block with Non-Technical Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Module M1 Champion
              </span>
              <span
                data-testid="badge-data-cutoff"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-500/15 text-gold-300 border border-gold-500/30"
              >
                Model data ends: {latestActualMonth}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
              Sri Lanka Tea Export Demand Forecast
            </h1>
            <p className="text-sm text-emerald-300/90 font-medium mt-1">
              Each month is predicted from data 12 months earlier.
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

        {/* Non-dismissible Retrospective Demo Banner (1 short sentence) */}
        {isRetrospective && (
          <div
            data-testid="banner-retrospective-demo"
            className="bg-gold-500/15 border border-gold-500/40 rounded-2xl p-4 flex items-center gap-3 text-gold-200 text-xs sm:text-sm font-medium shadow-gold"
          >
            <History className="w-5 h-5 text-gold-400 shrink-0" />
            <p>
              Demo using past data: model data ends <strong>{latestActualMonth}</strong>. These months are not future forecasts.
            </p>
          </div>
        )}

        {/* Horizon Selection Controls */}
        <section className="bg-forest-900/40 rounded-2xl p-5 border border-white/10 space-y-4 shadow-md">
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-2">
                Forecast Period
              </span>

              {/* Dynamic Quick Presets */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  From Month
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
                  To Month
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
                  {loading ? 'Calculating...' : 'Update Forecast'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="bg-forest-900/30 rounded-2xl p-12 border border-white/10 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-white/70">
              Generating export demand forecast...
            </p>
          </div>
        )}

        {/* Error State (422 / 503) */}
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

        {/* Empty State */}
        {!loading && !error && predictions.length === 0 && (
          <div className="bg-forest-900/30 rounded-2xl p-12 border border-white/10 text-center space-y-2">
            <p className="text-sm font-semibold text-white">No Forecast Data Available</p>
            <p className="text-xs text-white/60">
              Please choose a valid month range within the forecast horizon.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Main 3-Layer Content Display                                              */}
        {/* ========================================================================= */}
        {!loading && !error && predictions.length > 0 && (
          <div className="space-y-6">
            {/* ===================================================================== */}
            {/* LAYER 1: Top, Large, Plain Language                                   */}
            {/* ===================================================================== */}
            <section className="space-y-4" data-testid="layer-1-forecast">
              {/* Monthly Forecast Cards: "<Month>: about X mn kg. Likely range: L to U mn kg" */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {predictions.map((p) => (
                  <div
                    key={p.target_month}
                    className="bg-forest-900/60 rounded-2xl p-5 border border-white/10 shadow-md space-y-2.5 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-base tracking-wide font-mono">
                        {p.target_month}
                      </span>
                      <span className="text-xs text-white/50">
                        {formatMonthName(p.target_month)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-white/60">Expected Export Volume</p>
                      <p className="text-2xl font-bold text-emerald-300 font-display mt-0.5">
                        about {p.point_forecast_mn_kg.toFixed(2)}{' '}
                        <span className="text-sm font-normal text-white/70">mn kg</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-xs">
                      <p className="text-white/60">
                        Likely range:{' '}
                        <strong className="text-white font-mono">
                          {p.interval_80.lower_mn_kg.toFixed(2)} to {p.interval_80.upper_mn_kg.toFixed(2)} mn kg
                        </strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-forest-900/30 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/60">Average Expected</p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {avgForecast} <span className="text-xs font-normal text-white/60">Mn kg</span>
                  </p>
                </div>
                <div className="bg-forest-900/30 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/60">Peak Month</p>
                  <p className="text-lg font-bold text-emerald-300 mt-0.5">
                    {peakPoint.val > -Infinity ? peakPoint.val.toFixed(2) : '--'}{' '}
                    <span className="text-xs font-normal text-white/60">{peakPoint.month}</span>
                  </p>
                </div>
                <div className="bg-forest-900/30 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/60">Trough Month</p>
                  <p className="text-lg font-bold text-gold-300 mt-0.5">
                    {minPoint.val < Infinity ? minPoint.val.toFixed(2) : '--'}{' '}
                    <span className="text-xs font-normal text-white/60">{minPoint.month}</span>
                  </p>
                </div>
                <div className="bg-forest-900/30 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/60">Model Horizon</p>
                  <p className="text-lg font-bold text-white mt-0.5">12 Months</p>
                </div>
              </div>

              {/* Simplified Native SVG Chart (One 80% band, Expected line) */}
              <DemandForecastChart predictions={predictions} />
            </section>

            {/* ===================================================================== */}
            {/* LAYER 2: "How reliable is this?" Plain Card (Max 3 sentences)         */}
            {/* ===================================================================== */}
            <section
              data-testid="card-how-reliable"
              className="bg-forest-900/50 rounded-2xl p-5 border border-emerald-500/25 shadow-md space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h3 className="text-base font-semibold text-white tracking-wide">
                    How reliable is this?
                  </h3>
                </div>

                {/* Status chip with explanatory title tooltip */}
                <div
                  data-testid="chip-use-with-caution"
                  title="Real-world export demand can fluctuate due to weather, fuel prices, and macroeconomic shifts. Actual volumes often fell below forecasts during recent disruptions."
                  className="cursor-help inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/35 hover:bg-amber-500/30 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use with caution</span>
                </div>
              </div>

              {/* 3 Plain Sentences filled dynamically from /metrics */}
              {metricsLoading ? (
                <div className="animate-pulse space-y-1.5 text-sm text-white/50">
                  Loading reliability insights...
                </div>
              ) : metricsError ? (
                <p className="text-xs text-red-400">Unable to load reliability summary: {metricsError}</p>
              ) : metricsInfo ? (
                <div className="text-sm text-white/85 leading-relaxed space-y-2">
                  <p data-testid="sentence-coverage">
                    In past tests the real value fell inside this range about{' '}
                    <strong className="text-white">
                      {metricsInfo.observed_backtest_coverage.nominal_80_overall_pct.toFixed(1)}%
                    </strong>{' '}
                    of the time (about{' '}
                    <strong className="text-emerald-300">
                      {metricsInfo.observed_backtest_coverage.nominal_80_test_phase_pct.toFixed(1)}%
                    </strong>{' '}
                    in 2023-24), not the 80% it aims for.
                  </p>
                  <p data-testid="sentence-bias">
                    The model tends to forecast a bit too high: on average{' '}
                    <strong className="text-white">
                      {metricsInfo.bias_and_asymmetry.pooled_bias_mn_kg.toFixed(2)} mn kg
                    </strong>{' '}
                    (
                    <strong className="text-amber-300">
                      {metricsInfo.bias_and_asymmetry.test_phase_2023_2024_bias_mn_kg.toFixed(2)} mn kg
                    </strong>{' '}
                    in 2023-24).
                  </p>
                  <p data-testid="sentence-error">
                    Typical error is about{' '}
                    <strong className="text-white">
                      {metricsInfo.backtest_metrics.mae.toFixed(2)} mn kg
                    </strong>{' '}
                    per month{' '}
                    {metricsInfo.backtest_metrics.mape_pct ? (
                      <>({metricsInfo.backtest_metrics.mape_pct.toFixed(1)}%)</>
                    ) : null}
                    .
                  </p>
                </div>
              ) : null}

              {/* Link to Technical Details / Full Disclaimer */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(true)}
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  <span>See full disclaimer & technical details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-white/40">Units: Million kilograms</span>
              </div>
            </section>

            {/* ===================================================================== */}
            {/* LAYER 3: Collapsible Technical Details (Closed by default)            */}
            {/* ===================================================================== */}
            <section className="bg-forest-900/30 rounded-2xl border border-white/10 overflow-hidden shadow-md">
              {/* Accessible Toggle Button */}
              <button
                type="button"
                data-testid="toggle-technical-details"
                aria-expanded={showTechnicalDetails}
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white tracking-wide">
                    Technical details
                  </span>
                  <span className="text-xs text-white/50">
                    (Component models, 50/80/90 intervals, backtest metrics, and methodology)
                  </span>
                </div>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>

              {/* Collapsed Content */}
              {showTechnicalDetails && (
                <div
                  data-testid="technical-details-content"
                  className="p-5 pt-0 space-y-6 border-t border-white/10"
                >
                  {/* 1. Full Backend Disclaimer & Warnings */}
                  <div className="bg-forest-950/70 p-4 rounded-xl border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-emerald-300">
                      <Info className="w-4 h-4" />
                      <span>Formal Advisory & Model Disclaimer</span>
                    </div>
                    {forecastData?.disclaimer && (
                      <p className="text-white/80 leading-relaxed italic" data-testid="text-backend-disclaimer">
                        &ldquo;{forecastData.disclaimer}&rdquo;
                      </p>
                    )}
                    <p className="text-white/60 text-[11px]">
                      Forecasting Mechanism:{' '}
                      <span className="text-emerald-300 font-medium" data-testid="note-direct-12m">
                        each month is forecast from data 12 months earlier (direct 12-month model)
                      </span>
                    </p>
                    {forecastData?.warnings && forecastData.warnings.length > 0 && (
                      <div className="pt-1 space-y-1">
                        {forecastData.warnings.map((w, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-gold-300 text-[11px]">
                            <span className="font-bold">•</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Over-Forecast Tendency & Observed vs Nominal Coverage */}
                  {metricsInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Box 1: Tendency to Forecast Too High */}
                      <div className="bg-forest-950/60 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-white">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Tends to forecast too high (Over-Forecast Bias)</span>
                        </div>
                        <p className="text-white/75 leading-relaxed">
                          Backtesting against held-out test phase (2023–2024, n={metricsInfo.observed_backtest_coverage.n_test_origins}) revealed a{' '}
                          <strong className="text-amber-300" data-testid="metric-test-bias">
                            +{metricsInfo.bias_and_asymmetry.test_phase_2023_2024_bias_mn_kg.toFixed(2)} Mn kg
                          </strong>{' '}
                          mean bias (pooled historical bias:{' '}
                          <strong className="text-white" data-testid="metric-pooled-bias">
                            +{metricsInfo.bias_and_asymmetry.pooled_bias_mn_kg.toFixed(2)} Mn kg
                          </strong>{' '}
                          across n={metricsInfo.bias_and_asymmetry.n_pooled_origins} origins, 2012–2024).
                        </p>
                        <p className="text-white/70">
                          Historical actuals fell below predictions in{' '}
                          <strong className="text-white" data-testid="metric-share-below-pooled">
                            {metricsInfo.bias_and_asymmetry.share_actuals_below_point_forecast_pooled_pct.toFixed(1)}%
                          </strong>{' '}
                          of pooled months and{' '}
                          <strong className="text-amber-300" data-testid="metric-share-below-test">
                            {metricsInfo.bias_and_asymmetry.share_actuals_below_point_forecast_test_phase_pct.toFixed(1)}%
                          </strong>{' '}
                          of 2023–2024 test months.
                        </p>
                      </div>

                      {/* Box 2: Observed vs Nominal Coverage */}
                      <div className="bg-forest-950/60 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Observed vs Nominal Interval Coverage</span>
                        </div>
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
                      </div>
                    </div>
                  )}

                  {/* 3. Asymmetry Offsets & Fixed vs Rolling Methodology */}
                  {metricsInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/70">
                      <div className="bg-forest-950/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <p className="font-semibold text-white">
                          Interval Asymmetry Offsets (point forecast + offset)
                        </p>
                        <p className="text-[11px] text-white/60">
                          {metricsInfo.bias_and_asymmetry.sign_convention}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                          <div className="bg-white/5 p-2 rounded">
                            <p className="text-white/50">50% Interval</p>
                            <p className="font-mono text-emerald-300 font-semibold mt-0.5" data-testid="offset-50">
                              [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_50.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_50.upper_offset_mn_kg.toFixed(2)}]
                            </p>
                          </div>
                          <div className="bg-white/5 p-2 rounded">
                            <p className="text-white/50">80% Interval</p>
                            <p className="font-mono text-emerald-300 font-semibold mt-0.5" data-testid="offset-80">
                              [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_80.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_80.upper_offset_mn_kg.toFixed(2)}]
                            </p>
                          </div>
                          <div className="bg-white/5 p-2 rounded">
                            <p className="text-white/50">90% Interval</p>
                            <p className="font-mono text-emerald-300 font-semibold mt-0.5" data-testid="offset-90">
                              [{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_90.lower_offset_mn_kg.toFixed(2)}, +{metricsInfo.bias_and_asymmetry.asymmetry_offsets.nominal_90.upper_offset_mn_kg.toFixed(2)}]
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-forest-950/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <p className="font-semibold text-white">
                          Note on Interval Methodology
                        </p>
                        <p className="text-[11px] text-white/65 leading-relaxed">
                          The serving API applies fixed empirical quantiles pooled over all 152 historical backtest errors (2012–2024, including 2023–2024). Reported coverage was evaluated causally via an expanding error quantile procedure at each origin across 81 origins (2018–2024).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 4. Complete Monthly Breakdown Table */}
                  <div className="bg-forest-950/60 rounded-xl border border-white/10 overflow-hidden shadow">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Full Monthly Forecast Breakdown</h4>
                        <p className="text-xs text-white/50">
                          Expected point values, 50/80/90 uncertainty bands, and component model outputs
                        </p>
                      </div>
                      <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded">
                        Units: Mn kg
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white/5 text-white/70 border-b border-white/10 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-3">Target Month</th>
                            <th className="py-3 px-3">Origin (T-12)</th>
                            <th className="py-3 px-3 text-right text-emerald-400">Expected</th>
                            <th className="py-3 px-3 text-center">50% Range</th>
                            <th className="py-3 px-3 text-center">80% Range</th>
                            <th className="py-3 px-3 text-center">90% Range</th>
                            <th className="py-3 px-3 text-right text-white/60">Seasonal Mean</th>
                            <th className="py-3 px-3 text-right text-white/60">ETS</th>
                            <th className="py-3 px-3 text-right text-white/60">XGBoost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/80">
                          {predictions.map((p) => (
                            <tr key={p.target_month} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3 font-semibold text-white font-mono">
                                {p.target_month}
                              </td>
                              <td className="py-3 px-3 font-mono text-white/50 text-[11px]">
                                {p.forecast_origin_month}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-300 font-mono">
                                {p.point_forecast_mn_kg.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-[11px]">
                                [{p.interval_50.lower_mn_kg.toFixed(2)} – {p.interval_50.upper_mn_kg.toFixed(2)}]
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-white/90">
                                [{p.interval_80.lower_mn_kg.toFixed(2)} – {p.interval_80.upper_mn_kg.toFixed(2)}]
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-white/70">
                                {(() => {
                                  const off90 = metricsInfo?.bias_and_asymmetry?.asymmetry_offsets?.nominal_90;
                                  const low90 = p.interval_90?.lower_mn_kg ?? (off90 ? Math.max(0, p.point_forecast_mn_kg + off90.lower_offset_mn_kg) : null);
                                  const high90 = p.interval_90?.upper_mn_kg ?? (off90 ? p.point_forecast_mn_kg + off90.upper_offset_mn_kg : null);
                                  return low90 !== null && high90 !== null
                                    ? `[${low90.toFixed(2)} – ${high90.toFixed(2)}]`
                                    : '--';
                                })()}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-white/70">
                                {p.component_forecasts.seasonal_mean_3yr_mn_kg.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-white/70">
                                {p.component_forecasts.ets_mn_kg.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-white/70">
                                {p.component_forecasts.xgboost_mn_kg.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 5. Model Architecture & Provenance Specifications */}
                  <div className="bg-forest-950/60 p-4 rounded-xl border border-white/5 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Model Architecture & Provenance Specifications</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-white/70">
                      <div className="bg-forest-900/40 p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] uppercase text-white/40">Model Architecture</p>
                        <p className="font-semibold text-white text-xs mt-0.5">
                          Equal-weight Ensemble (3 Models)
                        </p>
                      </div>

                      <div className="bg-forest-900/40 p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] uppercase text-white/40">Evaluation MAE</p>
                        <p className="font-semibold text-emerald-300 text-xs mt-0.5" data-testid="metric-mae">
                          {metricsInfo ? `${metricsInfo.backtest_metrics.mae.toFixed(3)} Mn kg` : '--'}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5" data-testid="metric-mae-n">
                          {metricsInfo ? `n=${metricsInfo.backtest_metrics.n_origins} origins (2012–2024)` : ''}
                        </p>
                      </div>

                      <div className="bg-forest-900/40 p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] uppercase text-white/40">Evaluation RMSE</p>
                        <p className="font-semibold text-emerald-300 text-xs mt-0.5" data-testid="metric-rmse">
                          {metricsInfo ? `${metricsInfo.backtest_metrics.rmse.toFixed(3)} Mn kg` : '--'}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5" data-testid="metric-rmse-n">
                          {metricsInfo ? `n=${metricsInfo.backtest_metrics.n_origins} origins (2012–2024)` : ''}
                        </p>
                      </div>

                      <div className="bg-forest-900/40 p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] uppercase text-white/40">Training Cutoff</p>
                        <p className="font-semibold text-white text-xs mt-0.5">
                          {modelInfo?.data_cutoff_date || latestActualMonth}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">Direct 12m step-ahead</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
