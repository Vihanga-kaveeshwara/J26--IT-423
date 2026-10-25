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
  CheckCircle2,
  ArrowRight,
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

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setSimulating(true);
    setSimError(null);

    try {
      const res = await simulateBatchWhatIf(batch.batch_id, {
        withering_duration_hrs: witheringHrs,
        dryer_temperature_c: dryerTemp,
        machine_downtime_hrs: downtimeHrs,
        plucking_fine_leaf_pct: fineLeafPct,
      });

      setSimulationResult(res.simulation);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSimError(err.message);
      } else {
        setSimError('Simulation request failed. Check server logs.');
      }
    } finally {
      setSimulating(false);
    }
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

  const formatLKR = (val: number) =>
    'Rs. ' + Number(val.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#182C23] flex flex-col font-sans">
      <M2Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-[#CDE8D4] border-t-[#133E2B] rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#706B62]">Retrieving batch audit record...</p>
          </div>
        ) : fetchError ? (
          <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white border border-[#EBE6DD] shadow-sm text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[#9A2C18] mx-auto" />
            <h2 className="text-2xl font-display font-bold text-[#14261C]">
              {isNotFound ? 'Batch Not Found' : 'Error Loading Batch'}
            </h2>
            <p className="text-sm text-[#706B62]">{fetchError}</p>
            <div className="pt-4">
              <Link
                to="/batches"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#123E2A] text-white font-semibold text-sm hover:bg-[#184832] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Batch History</span>
              </Link>
            </div>
          </div>
        ) : batch ? (
          <div className="space-y-8">
            {/* Executive Header Banner (matching photo) */}
            <div className="rounded-3xl bg-gradient-to-r from-[#0F3523] via-[#133E2B] to-[#184832] p-7 sm:p-9 shadow-sm border border-[#184832] text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-mono font-bold tracking-widest uppercase mb-2">
                    <Sparkles className="w-4 h-4 text-[#C69A4B]" />
                    <span>CEYLON AI — BATCH DECISION ENGINE & AUDIT</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight leading-tight">
                    Batch {batch.batch_id} Audit
                  </h1>
                  <p className="text-sm text-[#C8D9CE] mt-2 font-sans flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Factory: <strong className="text-white">{batch.factory_id}</strong></span>
                    <span>•</span>
                    <span>Region: <strong className="text-white">{batch.region}</strong></span>
                    <span>•</span>
                    <span>Grade: <strong className="text-white">{batch.tea_grade_produced}</strong></span>
                    <span>•</span>
                    <span>Manufactured: <strong className="text-white">{formatDate(batch.batch_date)}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/batches"
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-2 backdrop-blur-xs active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Batches</span>
                  </Link>

                  <Link
                    to="/batches/new"
                    className="px-5 py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A759] text-[#14261C] font-bold text-xs shadow-xs transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>New Prediction</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Operational Parameters Strip Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-[#F0ECE4] pb-3">
                <h2 className="font-display font-bold text-lg text-[#14261C] tracking-tight">
                  Recorded Batch Parameters
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
                  {batch.source === 'operator_submitted' ? 'Live Factory Submission' : 'Historical Benchmark'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Green Leaf Intake</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.green_leaf_input_kg.toLocaleString()} kg
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Withering Duration</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.withering_duration_hrs} hrs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Dryer Temperature</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.dryer_temperature_c}°C
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Machine Downtime</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.machine_downtime_hrs} hrs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Plucking Fine Leaf</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.plucking_fine_leaf_pct}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[#706B62] block mb-1">Ambient Weather</span>
                  <span className="font-mono font-bold text-sm text-[#14261C]">
                    {batch.relative_humidity_pct}% / {batch.ambient_temperature_c}°C
                  </span>
                </div>
              </div>
            </div>

            {/* Counterfactual What-If Sandbox Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-7 sm:p-9 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0ECE4] pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#133E2B]" />
                    <h2 className="font-display font-bold text-2xl text-[#14261C] tracking-tight">
                      Counterfactual What-If Simulation Sandbox
                    </h2>
                  </div>
                  <p className="text-xs text-[#706B62] mt-1 font-sans">
                    Adjust the 4 controllable operational levers within calibrated physical bounds to simulate expected refuse reduction.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTriOptimums}
                    className="px-3.5 py-1.5 rounded-lg bg-[#EAF6ED] text-[#165B34] border border-[#CDE8D4] text-xs font-semibold hover:bg-[#D5EBDE] transition-colors"
                  >
                    Apply Target Optimums
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToBaseline}
                    className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F5] text-[#554C3F] border border-[#DDD7CC] text-xs font-semibold hover:bg-[#EFECE6] transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Gold Guidance Callout Box */}
              <div className="bg-[#FDF8EC] border border-[#F6E7C4] rounded-xl p-3.5 text-xs text-[#785416] flex items-start gap-2.5 mb-6 leading-relaxed">
                <Info className="w-4 h-4 text-[#A06A17] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#664612]">Engineering Safety Bounds:</strong> Levers are strictly constrained to empirical factory operating domains (Withering 10–23h, Dryer 95–134°C, Downtime 0–4.4h, Fine Leaf 56–96%). Ambient humidity and temperature remain locked to true batch weather.
                </div>
              </div>

              {/* Sliders Form */}
              <form onSubmit={handleRunSimulation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lever 1: Withering Duration */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#14261C]">1. Withering Duration</span>
                      <span className="font-mono font-bold text-sm text-[#14261C] px-2.5 py-0.5 bg-white border border-[#DDD7CC] rounded-lg">
                        {witheringHrs.toFixed(1)} hrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.withering_duration_hrs.min}
                      max={SAFE_BOUNDS.withering_duration_hrs.max}
                      step={SAFE_BOUNDS.withering_duration_hrs.step}
                      value={witheringHrs}
                      onChange={(e) => setWitheringHrs(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#E2DDD5] rounded-lg appearance-none cursor-pointer accent-[#123E2A]"
                    />
                    <div className="flex justify-between text-[11px] text-[#706B62]">
                      <span>Min: {SAFE_BOUNDS.withering_duration_hrs.min}h</span>
                      <span className="text-[#165B34] font-semibold">Target: 17.0h</span>
                      <span>Max: {SAFE_BOUNDS.withering_duration_hrs.max}h</span>
                    </div>
                  </div>

                  {/* Lever 2: Dryer Temperature */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#14261C]">2. Dryer Temperature</span>
                      <span className="font-mono font-bold text-sm text-[#14261C] px-2.5 py-0.5 bg-white border border-[#DDD7CC] rounded-lg">
                        {dryerTemp.toFixed(1)} °C
                      </span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.dryer_temperature_c.min}
                      max={SAFE_BOUNDS.dryer_temperature_c.max}
                      step={SAFE_BOUNDS.dryer_temperature_c.step}
                      value={dryerTemp}
                      onChange={(e) => setDryerTemp(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#E2DDD5] rounded-lg appearance-none cursor-pointer accent-[#123E2A]"
                    />
                    <div className="flex justify-between text-[11px] text-[#706B62]">
                      <span>Min: {SAFE_BOUNDS.dryer_temperature_c.min}°C</span>
                      <span className="text-[#165B34] font-semibold">Target: 111.0°C</span>
                      <span>Max: {SAFE_BOUNDS.dryer_temperature_c.max}°C</span>
                    </div>
                  </div>

                  {/* Lever 3: Machine Downtime */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#14261C]">3. Machine Downtime</span>
                      <span className="font-mono font-bold text-sm text-[#14261C] px-2.5 py-0.5 bg-white border border-[#DDD7CC] rounded-lg">
                        {downtimeHrs.toFixed(2)} hrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.machine_downtime_hrs.min}
                      max={SAFE_BOUNDS.machine_downtime_hrs.max}
                      step={SAFE_BOUNDS.machine_downtime_hrs.step}
                      value={downtimeHrs}
                      onChange={(e) => setDowntimeHrs(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#E2DDD5] rounded-lg appearance-none cursor-pointer accent-[#123E2A]"
                    />
                    <div className="flex justify-between text-[11px] text-[#706B62]">
                      <span>Min: 0.0h</span>
                      <span className="text-[#165B34] font-semibold">Target: 0.0h</span>
                      <span>Max: {SAFE_BOUNDS.machine_downtime_hrs.max}h</span>
                    </div>
                  </div>

                  {/* Lever 4: Plucking Fine Leaf % */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#14261C]">4. Plucking Fine Leaf</span>
                      <span className="font-mono font-bold text-sm text-[#14261C] px-2.5 py-0.5 bg-white border border-[#DDD7CC] rounded-lg">
                        {fineLeafPct.toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.plucking_fine_leaf_pct.min}
                      max={SAFE_BOUNDS.plucking_fine_leaf_pct.max}
                      step={SAFE_BOUNDS.plucking_fine_leaf_pct.step}
                      value={fineLeafPct}
                      onChange={(e) => setFineLeafPct(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#E2DDD5] rounded-lg appearance-none cursor-pointer accent-[#123E2A]"
                    />
                    <div className="flex justify-between text-[11px] text-[#706B62]">
                      <span>Min: {SAFE_BOUNDS.plucking_fine_leaf_pct.min}%</span>
                      <span className="text-[#165B34] font-semibold">Target: 85.0%</span>
                      <span>Max: {SAFE_BOUNDS.plucking_fine_leaf_pct.max}%</span>
                    </div>
                  </div>
                </div>

                {simError && (
                  <div className="p-4 rounded-xl bg-[#FDF0ED] border border-[#FAD3CB] text-[#9A2C18] text-xs">
                    {simError}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={simulating}
                    className="px-6 py-3 rounded-xl bg-[#C69A4B] hover:bg-[#D4A759] text-[#14261C] font-bold text-sm shadow-xs transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {simulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#14261C]/30 border-t-[#14261C] rounded-full animate-spin" />
                        <span>Simulating Model Counterfactual...</span>
                      </>
                    ) : (
                      <>
                        <Sliders className="w-4 h-4" />
                        <span>Run Counterfactual What-If Simulation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Simulation Results Display */}
              {simulationResult && (
                <div className="mt-8 pt-8 border-t border-[#F0ECE4] space-y-6 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xl text-[#14261C]">
                      Simulation Results & Impact
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EAF6ED] text-[#165B34] border border-[#CDE8D4]">
                      Simulated in {simulationResult.latency_ms?.toFixed(2) ?? '2.5'} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Baseline vs Simulated */}
                    <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EBE6DD]">
                      <span className="text-xs font-semibold text-[#706B62] block mb-1">Baseline Refuse Rate</span>
                      <span className="text-3xl font-display font-bold text-[#14261C]">
                        {simulationResult.baseline_predicted_refuse_pct.toFixed(2)}%
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#EAF6ED] border border-[#CDE8D4]">
                      <span className="text-xs font-semibold text-[#165B34] block mb-1">Simulated Refuse Rate</span>
                      <span className="text-3xl font-display font-bold text-[#165B34]">
                        {simulationResult.simulated_predicted_refuse_pct.toFixed(2)}%
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EBE6DD]">
                      <span className="text-xs font-semibold text-[#706B62] block mb-1">Expected Refuse Delta</span>
                      <span className={`text-3xl font-display font-bold ${
                        simulationResult.delta_refuse_pct < 0 ? 'text-[#165B34]' : 'text-[#8C6212]'
                      }`}>
                        {simulationResult.delta_refuse_pct > 0 ? '+' : ''}
                        {simulationResult.delta_refuse_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Financial Savings Highlight */}
                  {simulationResult.economic_impact && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0F3523] via-[#133E2B] to-[#184832] text-white flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] block">
                          Projected Financial Impact
                        </span>
                        <p className="text-xl font-display font-bold mt-1">
                          Estimated Savings: {formatLKR(simulationResult.economic_impact.simulated_savings_lkr)}
                        </p>
                        <p className="text-xs text-[#C8D9CE] mt-0.5">
                          Represents a {simulationResult.economic_impact.savings_pct_of_loss.toFixed(1)}% recovery of baseline revenue loss.
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-[#C8D9CE] block">New Revenue Loss</span>
                        <span className="font-mono font-bold text-lg text-[#D4AF37]">
                          {formatLKR(simulationResult.economic_impact.simulated_revenue_loss_lkr)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Base Prediction & SHAP Details (Rendered via PredictionResultCard) */}
            <div>
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#133E2B] font-mono">
                  ORIGINAL BATCH INFERENCE AUDIT
                </span>
                <h2 className="font-display font-bold text-2xl text-[#14261C] tracking-tight">
                  Cached Predictions, SHAP Drivers & Operational Mitigations
                </h2>
              </div>

              <PredictionResultCard
                predictedRefusePct={batch.predicted_refuse_tea_pct ?? 6.0}
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
          </div>
        ) : null}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/batches"
          className="w-12 h-12 rounded-full bg-[#123E2A] hover:bg-[#184832] text-[#D4AF37] border border-[#C69A4B]/40 shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
          title="Return to Batch History"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
