/**
 * M1 Tea Export Demand Forecasting Page
 * frontend/src/pages/DemandForecastPage.tsx
 *
 * Full dashboard for M1 export demand forecasting:
 * - Month range picker with presets (max 12 months)
 * - Shaded interval SVG chart (50% and 80% bands)
 * - Monthly breakdown table with point forecast and component models
 * - Advisory section: latest_actual_month, disclaimer, warnings, direct 12-month model note
 * - Observed vs nominal coverage statistics and over-forecast bias disclosure
 * - Loading, error (503/400/422), and empty states
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Info,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  BarChart2,
  Layers,
  ChevronRight,
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

export function DemandForecastPage() {
  const [fromMonth, setFromMonth] = useState('2025-01');
  const [toMonth, setToMonth] = useState('2025-03');
  const [forecastData, setForecastData] = useState<PredictDemandResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [metricsInfo, setMetricsInfo] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Month list for dropdown picker (2025-01 to 2025-12)
  const allowedMonths = [
    '2025-01',
    '2025-02',
    '2025-03',
    '2025-04',
    '2025-05',
    '2025-06',
    '2025-07',
    '2025-08',
    '2025-09',
    '2025-10',
    '2025-11',
    '2025-12',
  ];

  const loadData = async (from = fromMonth, to = toMonth) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      // Parallel fetch of forecast, model, and metrics
      const [forecastRes, modelRes, metricsRes] = await Promise.all([
        fetchDemandForecast(from, to),
        fetchDemandModel().catch(() => null),
        fetchDemandMetrics().catch(() => null),
      ]);

      setForecastData(forecastRes);
      if (modelRes) setModelInfo(modelRes);
      if (metricsRes) setMetricsInfo(metricsRes);
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

  useEffect(() => {
    loadData('2025-01', '2025-03');
  }, []);

  // Quick preset handlers
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                Model data ends: {forecastData?.latest_actual_month || '2024-12'}
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
            onClick={() => loadData(fromMonth, toMonth)}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white text-sm font-medium border border-white/10 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Mandatory Advisory Notice Banner */}
        <section className="bg-forest-900/60 rounded-2xl p-5 border border-white/10 space-y-3.5 shadow-md">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">Forecasting Mechanism:</span>
                <span className="text-emerald-300 font-medium">
                  each month is forecast from data 12 months earlier (direct 12-month model)
                </span>
                <span className="text-white/40">|</span>
                <span className="text-white/80">
                  Data Cutoff: <strong className="text-white">2024-12</strong>
                </span>
              </div>

              {forecastData?.disclaimer && (
                <p className="text-white/80 leading-relaxed italic">
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

          {/* Over-Forecast Bias & Calibration Disclosure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="bg-forest-950/60 p-3 rounded-xl border border-gold-500/20 flex gap-2.5">
              <ShieldAlert className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gold-300 mb-0.5">
                  Over-Forecast Bias Advisory
                </p>
                <p className="text-white/70 leading-relaxed">
                  Backtesting against the 2023–2024 test phase revealed a +1.05 Mn kg mean bias (+0.75 Mn kg pooled), with ~72% of actuals falling below the point forecast due to macro export contraction. Users should plan around conservative estimates.
                </p>
              </div>
            </div>

            <div className="bg-forest-950/60 p-3 rounded-xl border border-emerald-500/20 flex gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300 mb-0.5">
                  Observed vs Nominal Interval Coverage
                </p>
                <p className="text-white/70 leading-relaxed">
                  Nominal 80% interval achieves <strong className="text-white">82.7%</strong> coverage pooled, but drops to <strong className="text-white">~68.0%</strong> during 2023–2024 test phase. Nominal 50% interval achieves <strong className="text-white">54.3%</strong> pooled (44.0% test phase).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Range Controls & Presets */}
        <section className="bg-forest-900/40 rounded-2xl p-5 border border-white/10">
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Select Forecast Horizon (Max 12 Months)
              </span>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('2025-01', '2025-03')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === '2025-01' && toMonth === '2025-03'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  Q1 2025 (3 mo)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('2025-01', '2025-06')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === '2025-01' && toMonth === '2025-06'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  H1 2025 (6 mo)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('2025-01', '2025-12')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    fromMonth === '2025-01' && toMonth === '2025-12'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  Full Year 2025 (12 mo)
                </button>
              </div>
            </div>

            {/* Dropdown selectors */}
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
          <div className="bg-red-950/40 rounded-2xl p-6 border border-red-500/30 space-y-3">
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
              Please choose a valid month range within 2025 to generate export demand projections.
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

            {/* Model Architecture & Provenance Card */}
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
                  <p className="font-semibold text-emerald-400 text-xs mt-0.5">
                    1.734 Mn kg (Pooled Backtest)
                  </p>
                </div>
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Evaluation RMSE</p>
                  <p className="font-semibold text-white text-xs mt-0.5">
                    2.237 Mn kg (81 Origins)
                  </p>
                </div>
                <div className="bg-forest-950/60 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Training Cutoff</p>
                  <p className="font-semibold text-white text-xs mt-0.5">
                    {modelInfo?.data_cutoff_date || '2024-12'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
