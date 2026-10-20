import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  Thermometer,
  Wrench,
  Info,
} from 'lucide-react';
import { M2Navbar } from '../components/m2/M2Navbar';
import { PredictionResultCard } from '../components/m2/PredictionResultCard';
import {
  fetchBatchById,
  simulateBatchWhatIf,
  ApiError,
} from '../services/batchService';
import { BatchRecord, WhatIfSimulationResult } from '../types/batch';

const SAFE_BOUNDS = {
  withering_duration_hrs: { min: 10.0, max: 23.3, target: 17.0, unit: 'hrs', step: 0.1 },
  dryer_temperature_c: { min: 94.5, max: 134.2, target: 111.0, unit: '°C', step: 0.5 },
  machine_downtime_hrs: { min: 0.0, max: 4.4, target: 0.0, unit: 'hrs', step: 0.05 },
  plucking_fine_leaf_pct: { min: 56.2, max: 96.0, target: 85.0, unit: '%', step: 0.5 },
};

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [batch, setBatch] = useState<BatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // What-If Lever Overrides State
  const [witheringHrs, setWitheringHrs] = useState<number>(17.0);
  const [dryerTemp, setDryerTemp] = useState<number>(111.0);
  const [downtimeHrs, setDowntimeHrs] = useState<number>(0.0);
  const [fineLeafPct, setFineLeafPct] = useState<number>(85.0);

  // Simulation State
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<WhatIfSimulationResult | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setFetchError(null);
    setIsNotFound(false);

    fetchBatchById(id)
      .then((res) => {
        setBatch(res.data);
        // Initialize what-if levers to the batch's baseline values
        setWitheringHrs(res.data.withering_duration_hrs);
        setDryerTemp(res.data.dryer_temperature_c);
        setDowntimeHrs(res.data.machine_downtime_hrs);
        setFineLeafPct(res.data.plucking_fine_leaf_pct);
      })
      .catch((err: any) => {
        if (err instanceof ApiError) {
          setFetchError(err.message);
          setIsNotFound(err.isNotFound);
        } else {
          setFetchError('Failed to load batch record details.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleResetToBaseline = () => {
    if (!batch) return;
    setWitheringHrs(batch.withering_duration_hrs);
    setDryerTemp(batch.dryer_temperature_c);
    setDowntimeHrs(batch.machine_downtime_hrs);
    setFineLeafPct(batch.plucking_fine_leaf_pct);
    setSimulationResult(null);
    setSimError(null);
  };

  const handleApplyTriOptimums = () => {
    setWitheringHrs(SAFE_BOUNDS.withering_duration_hrs.target);
    setDryerTemp(SAFE_BOUNDS.dryer_temperature_c.target);
    setDowntimeHrs(SAFE_BOUNDS.machine_downtime_hrs.target);
    setFineLeafPct(SAFE_BOUNDS.plucking_fine_leaf_pct.target);
    setSimError(null);
  };

  const handleRunSimulation = async () => {
    if (!batch) return;

    setSimulating(true);
    setSimError(null);

    try {
      const overrides = {
        withering_duration_hrs: Number(witheringHrs),
        dryer_temperature_c: Number(dryerTemp),
        machine_downtime_hrs: Number(downtimeHrs),
        plucking_fine_leaf_pct: Number(fineLeafPct),
      };

      const res = await simulateBatchWhatIf(batch.batch_id, overrides);
      setSimulationResult(res.simulation);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSimError(err.message);
      } else {
        setSimError('Simulation failed to execute.');
      }
    } finally {
      setSimulating(false);
    }
  };

  const formatLKR = (val?: number) =>
    val != null
      ? 'Rs. ' + Number(val.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'N/A';

  return (
    <div className="min-h-screen bg-forest-950 text-white flex flex-col font-sans">
      <M2Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/batches"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Batch History</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
            <p className="text-sm text-white/60 font-medium">Loading batch analysis & records...</p>
          </div>
        )}

        {/* Not Found / Error State */}
        {!loading && (isNotFound || fetchError) && (
          <div className="p-8 rounded-3xl bg-forest-900/60 border border-white/10 text-center max-w-xl mx-auto my-12">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-white mb-2">
              {isNotFound ? 'Batch Not Found' : 'Unable to Retrieve Batch'}
            </h2>
            <p className="text-sm text-white/60 mb-6">{fetchError}</p>
            <Link
              to="/batches"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
            >
              <span>Return to Batch History</span>
            </Link>
          </div>
        )}

        {/* Loaded Batch Content */}
        {!loading && batch && (
          <div className="space-y-10">
            {/* Header Title Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-wide">
                    {batch.batch_id}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                      batch.source === 'operator_submitted'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
                    }`}
                  >
                    {batch.source === 'operator_submitted' ? 'Live Operator Batch' : 'Historical Benchmark'}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Factory: <span className="text-white font-semibold">{batch.factory_id}</span> ({batch.region}) •
                  Date:{' '}
                  <span className="text-white font-semibold">
                    {new Date(batch.batch_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="#whatif-simulator"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 hover:from-emerald-500 hover:to-forest-600 text-white font-semibold text-xs shadow-forest hover:shadow-glow-green transition-all flex items-center gap-2"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Jump to What-If Simulator</span>
                </a>
              </div>
            </div>

            {/* Batch Operational Specs Grid */}
            <div className="p-6 rounded-3xl bg-forest-900/60 border border-white/10 shadow-xl backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Recorded Production Parameters</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Green Leaf Intake</span>
                  <span className="text-white font-mono font-semibold text-sm">
                    {batch.green_leaf_input_kg.toLocaleString()} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Tea Grade</span>
                  <span className="text-gold-400 font-mono font-semibold text-sm">
                    {batch.tea_grade_produced}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Withering Duration</span>
                  <span className="text-white font-mono font-semibold text-sm">
                    {batch.withering_duration_hrs} hrs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Dryer Temp</span>
                  <span className="text-white font-mono font-semibold text-sm">
                    {batch.dryer_temperature_c} °C
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Machine Downtime</span>
                  <span className="text-white font-mono font-semibold text-sm">
                    {batch.machine_downtime_hrs} hrs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-forest-950/60 border border-white/5">
                  <span className="text-white/50 block mb-1">Plucking Fine Leaf</span>
                  <span className="text-white font-mono font-semibold text-sm">
                    {batch.plucking_fine_leaf_pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stored Prediction Results (Task 3 Component) */}
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-display font-bold text-white">Baseline Prediction & Root Causes</h2>
                <p className="text-xs text-white/50">Model output recorded for this batch instance</p>
              </div>

              <PredictionResultCard
                predictedRefusePct={batch.predicted_refuse_tea_pct ?? batch.actual_refuse_tea_pct ?? 0}
                usedFallbackRollingFeatures={batch.used_fallback_rolling_features}
                rollingHumidity={batch.rolling_humidity_3batch}
                rollingAmbientTemp={batch.rolling_ambient_temp_3batch}
                topDrivers={batch.top_shap_drivers}
                mitigations={batch.mitigations}
                economicImpact={batch.economic_impact}
                batchId={batch.batch_id}
                teaGrade={batch.tea_grade_produced}
                greenLeafKg={batch.green_leaf_input_kg}
              />
            </div>

            {/* WHAT-IF COUNTERFACTUAL SIMULATOR SECTION */}
            <div
              id="whatif-simulator"
              className="mt-14 pt-10 border-t border-white/15 scroll-mt-24 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-semibold mb-2">
                    <Sliders className="w-3.5 h-3.5" />
                    Process Adjustment Simulation
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                    Constrained What-If Counterfactual Simulator
                  </h2>
                  <p className="text-sm text-white/60 mt-1 max-w-2xl">
                    Re-queries the already-trained model with modified operational parameters to simulate the potential change in refuse tea percentage and estimated revenue impact.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTriOptimums}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all"
                  >
                    Set TRI Optimums
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToBaseline}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Baseline
                  </button>
                </div>
              </div>

              {/* Inline Simulation Error */}
              {simError && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">What-If Simulation Notice</p>
                    <p className="text-xs mt-0.5 opacity-90">{simError}</p>
                  </div>
                </div>
              )}

              {/* Lever Sliders & Inputs Card */}
              <div className="rounded-3xl bg-forest-900/70 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Lever 1: Withering Duration */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-white">Withering Duration</label>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Baseline: {batch.withering_duration_hrs}h</span>
                        <span className="text-emerald-400 font-mono font-bold">{witheringHrs} hrs</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.withering_duration_hrs.min}
                      max={SAFE_BOUNDS.withering_duration_hrs.max}
                      step={SAFE_BOUNDS.withering_duration_hrs.step}
                      value={witheringHrs}
                      onChange={(e) => setWitheringHrs(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>Min: {SAFE_BOUNDS.withering_duration_hrs.min}h</span>
                      <span className="text-emerald-400">Target: ~17.0h</span>
                      <span>Max: {SAFE_BOUNDS.withering_duration_hrs.max}h</span>
                    </div>
                  </div>

                  {/* Lever 2: Dryer Operating Temperature */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-white">Dryer Operating Temp</label>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Baseline: {batch.dryer_temperature_c}°C</span>
                        <span className="text-gold-400 font-mono font-bold">{dryerTemp} °C</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.dryer_temperature_c.min}
                      max={SAFE_BOUNDS.dryer_temperature_c.max}
                      step={SAFE_BOUNDS.dryer_temperature_c.step}
                      value={dryerTemp}
                      onChange={(e) => setDryerTemp(parseFloat(e.target.value))}
                      className="w-full accent-gold-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>Min: {SAFE_BOUNDS.dryer_temperature_c.min}°C</span>
                      <span className="text-gold-400">Target: ~111.0°C</span>
                      <span>Max: {SAFE_BOUNDS.dryer_temperature_c.max}°C</span>
                    </div>
                  </div>

                  {/* Lever 3: Machine Downtime */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-white">Machine Downtime</label>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Baseline: {batch.machine_downtime_hrs}h</span>
                        <span className="text-rose-400 font-mono font-bold">{downtimeHrs} hrs</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.machine_downtime_hrs.min}
                      max={SAFE_BOUNDS.machine_downtime_hrs.max}
                      step={SAFE_BOUNDS.machine_downtime_hrs.step}
                      value={downtimeHrs}
                      onChange={(e) => setDowntimeHrs(parseFloat(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>Min: {SAFE_BOUNDS.machine_downtime_hrs.min}h</span>
                      <span className="text-emerald-400">Target: 0.0h</span>
                      <span>Max: {SAFE_BOUNDS.machine_downtime_hrs.max}h</span>
                    </div>
                  </div>

                  {/* Lever 4: Plucking Fine Leaf % */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-white">Plucking Fine Leaf Compliance</label>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Baseline: {batch.plucking_fine_leaf_pct}%</span>
                        <span className="text-emerald-400 font-mono font-bold">{fineLeafPct}%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.plucking_fine_leaf_pct.min}
                      max={SAFE_BOUNDS.plucking_fine_leaf_pct.max}
                      step={SAFE_BOUNDS.plucking_fine_leaf_pct.step}
                      value={fineLeafPct}
                      onChange={(e) => setFineLeafPct(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>Min: {SAFE_BOUNDS.plucking_fine_leaf_pct.min}%</span>
                      <span className="text-emerald-400">Target: ~85.0%</span>
                      <span>Max: {SAFE_BOUNDS.plucking_fine_leaf_pct.max}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-forest-600 text-white font-semibold text-sm shadow-forest hover:shadow-glow-green active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Evaluating Counterfactual Model...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run Simulation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Simulation Results Display */}
              {simulationResult && (
                <div className="space-y-6 pt-4 animate-fade-in">
                  {/* Results Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Before vs After Refuse % */}
                    <div className="rounded-3xl bg-forest-900/80 border border-white/15 p-6 shadow-xl relative overflow-hidden">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                        Refuse Percentage Comparison
                      </span>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-forest-950/80 border border-white/10 flex-1 text-center">
                          <span className="text-[10px] text-white/40 block">Baseline</span>
                          <span className="text-2xl font-bold font-display text-white/80">
                            {simulationResult.baseline_predicted_refuse_pct.toFixed(2)}%
                          </span>
                        </div>

                        <div className="text-white/40 font-bold">→</div>

                        <div className="p-3 rounded-2xl bg-forest-950/80 border border-white/10 flex-1 text-center">
                          <span className="text-[10px] text-white/40 block">Simulated</span>
                          <span className="text-2xl font-bold font-display text-emerald-400">
                            {simulationResult.simulated_predicted_refuse_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-white/60">Change in Refuse:</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            simulationResult.delta_refuse_pct <= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {simulationResult.delta_refuse_pct <= 0 ? '' : '+'}
                          {simulationResult.delta_refuse_pct.toFixed(2)} pp
                        </span>
                      </div>
                    </div>

                    {/* Direction & Status */}
                    <div className="rounded-3xl bg-forest-900/80 border border-white/15 p-6 shadow-xl relative overflow-hidden">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                        Process Outcome Direction
                      </span>

                      <div className="mt-4 flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            simulationResult.direction === 'IMPROVEMENT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : simulationResult.direction === 'REGRESSION'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {simulationResult.direction === 'IMPROVEMENT' ? (
                            <TrendingDown className="w-6 h-6" />
                          ) : (
                            <TrendingUp className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <p className="text-lg font-bold text-white font-display">
                            {simulationResult.direction === 'IMPROVEMENT'
                              ? 'Quality Improvement'
                              : simulationResult.direction === 'REGRESSION'
                              ? 'Refuse Regression'
                              : 'Unchanged'}
                          </p>
                          <p className="text-xs text-white/50">
                            {simulationResult.direction === 'IMPROVEMENT'
                              ? 'Process modifications reduce refuse waste.'
                              : 'Proposed adjustments may increase refuse.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                        <span>Model Latency:</span>
                        <span>{simulationResult.latency_ms.toFixed(1)} ms</span>
                      </div>
                    </div>

                    {/* Estimated Monetary Translation */}
                    {simulationResult.economic_impact && (
                      <div className="rounded-3xl bg-forest-900/80 border border-white/15 p-6 shadow-xl relative overflow-hidden">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                          Estimated Financial Translation
                        </span>

                        <div className="mt-4">
                          <span className="text-[10px] text-white/50 block">Net Projected Savings</span>
                          <span
                            className={`text-3xl font-display font-bold ${
                              simulationResult.economic_impact.simulated_savings_lkr >= 0
                                ? 'text-gold-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {formatLKR(simulationResult.economic_impact.simulated_savings_lkr)}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                          <span>Loss Reduction:</span>
                          <span className="font-mono text-gold-300 font-semibold">
                            {simulationResult.economic_impact.savings_pct_of_loss.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Out of Distribution Warning (if applicable) */}
                  {simulationResult.out_of_distribution_warning && (
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300">Out-Of-Distribution Notice: </span>
                        One or more override values lie near or beyond historical empirical training support.
                        {simulationResult.out_of_distribution_details?.length > 0 && (
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {simulationResult.out_of_distribution_details.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MANDATORY STATUTORY & GOVERNANCE DISCLAIMER */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-forest-900 via-forest-900 to-forest-800 border-2 border-gold-500/40 shadow-xl relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-300 mb-1">
                          Mandatory Operational & Decision-Support Notice
                        </h4>
                        <p className="text-xs text-gold-100/90 leading-relaxed font-sans">
                          {simulationResult.disclaimer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
