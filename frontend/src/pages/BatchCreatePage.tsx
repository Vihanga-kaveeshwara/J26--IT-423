import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Factory,
  Cpu,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Clock,
  Thermometer,
  Layers,
  Percent,
  Check,
} from 'lucide-react';
import { M2Navbar } from '../components/m2/M2Navbar';
import { PredictionResultCard } from '../components/m2/PredictionResultCard';
import { submitBatch, ApiError } from '../services/batchService';
import { BatchCreationResponse } from '../types/batch';

const FACTORY_OPTIONS = [
  'Factory_A',
  'Factory_B',
  'Factory_C',
  'Factory_D',
  'Factory_E',
  'Factory_F',
  'Factory_G',
  'Factory_H',
  'CUSTOM',
];

const REGION_OPTIONS = ['Low-Country', 'Uva', 'Nuwara Eliya'];
const GRADE_OPTIONS = ['BOP', 'BOPF', 'FBOP', 'OP', 'PEKOE', 'DUST'];
const RESALE_OPTIONS = [
  { value: 'DISCARDED', label: 'Discarded (Zero Revenue)' },
  { value: 'SOLD_DISCOUNTED_GRADE', label: 'Sold as Secondary DUST Grade' },
];

export function BatchCreatePage() {
  const navigate = useNavigate();

  // Form State
  const [factorySelect, setFactorySelect] = useState('Factory_H');
  const [customFactory, setCustomFactory] = useState('');
  const [region, setRegion] = useState('Low-Country');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchId, setBatchId] = useState('');

  const [greenLeafKg, setGreenLeafKg] = useState('9500');
  const [witheringDurationHrs, setWitheringDurationHrs] = useState('16.0');
  const [dryerTempC, setDryerTempC] = useState('100.0');
  const [machineDowntimeHrs, setMachineDowntimeHrs] = useState('0.5');
  const [pluckingFineLeafPct, setPluckingFineLeafPct] = useState('82.0');

  const [relativeHumidityPct, setRelativeHumidityPct] = useState('75.0');
  const [ambientTempC, setAmbientTempC] = useState('26.5');
  const [teaGradeProduced, setTeaGradeProduced] = useState('BOP');
  const [refuseResaleStatus, setRefuseResaleStatus] = useState('DISCARDED');

  // Loading & Result State
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState(false);
  const [predictionResponse, setPredictionResponse] = useState<BatchCreationResponse | null>(null);

  const activeFactoryId = factorySelect === 'CUSTOM' ? customFactory.trim() : factorySelect;

  // Sample presets for quick testing
  const loadPresetFactoryH = () => {
    setFactorySelect('Factory_H');
    setRegion('Low-Country');
    setBatchDate('2026-03-01');
    setBatchId(`BATCH-H-${Date.now().toString().slice(-4)}`);
    setGreenLeafKg('9500');
    setWitheringDurationHrs('16.0');
    setDryerTempC('100.0');
    setMachineDowntimeHrs('0.5');
    setPluckingFineLeafPct('82.0');
    setRelativeHumidityPct('75.0');
    setAmbientTempC('26.5');
    setTeaGradeProduced('BOP');
    setRefuseResaleStatus('DISCARDED');
    setApiError(null);
  };

  const loadPresetNewFactory = () => {
    setFactorySelect('CUSTOM');
    setCustomFactory('Factory_NewGreenValley');
    setRegion('Nuwara Eliya');
    setBatchDate('2026-03-01');
    setBatchId(`BATCH-NGV-${Date.now().toString().slice(-4)}`);
    setGreenLeafKg('6500');
    setWitheringDurationHrs('17.5');
    setDryerTempC('112.0');
    setMachineDowntimeHrs('0.0');
    setPluckingFineLeafPct('91.0');
    setRelativeHumidityPct('82.0');
    setAmbientTempC('18.0');
    setTeaGradeProduced('BOPF');
    setRefuseResaleStatus('DISCARDED');
    setApiError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsServiceUnavailable(false);

    if (!activeFactoryId) {
      setApiError('Please specify a valid Factory ID.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitBatch({
        batch_id: batchId ? batchId.trim() : undefined,
        factory_id: activeFactoryId,
        region,
        batch_date: new Date(batchDate).toISOString(),
        green_leaf_input_kg: parseFloat(greenLeafKg),
        withering_duration_hrs: parseFloat(witheringDurationHrs),
        dryer_temperature_c: parseFloat(dryerTempC),
        machine_downtime_hrs: parseFloat(machineDowntimeHrs),
        plucking_fine_leaf_pct: parseFloat(pluckingFineLeafPct),
        relative_humidity_pct: parseFloat(relativeHumidityPct),
        ambient_temperature_c: parseFloat(ambientTempC),
        tea_grade_produced: teaGradeProduced,
        refuse_resale_status: refuseResaleStatus,
      });

      setPredictionResponse(res);
      // Smooth scroll to results
      setTimeout(() => {
        window.scrollTo({ top: 600, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiError(err.message);
        setIsServiceUnavailable(err.isServiceUnavailable);
      } else {
        setApiError(err?.message || 'Failed to submit batch for prediction.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-forest-950 text-white flex flex-col font-sans">
      <M2Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                M2 Operational Inference
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                Batch Production Submission
              </h1>
              <p className="text-sm text-white/60 mt-1 max-w-2xl">
                Submit raw operational parameters for real-time refuse tea percentage inference, causal trailing weather feature calculation, SHAP root-cause attributions, and economic impact analysis.
              </p>
            </div>

            {/* Preset Buttons for easy demo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPresetFactoryH}
                className="px-3.5 py-2 rounded-xl bg-forest-800/80 hover:bg-forest-700/80 border border-white/10 text-xs text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Loads Factory_H (has historical seed for rolling features)"
              >
                <span>Factory_H Preset</span>
              </button>
              <button
                type="button"
                onClick={loadPresetNewFactory}
                className="px-3.5 py-2 rounded-xl bg-forest-800/80 hover:bg-forest-700/80 border border-white/10 text-xs text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Loads a new factory to demonstrate graceful fallback"
              >
                <span>New Factory Preset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {apiError && (
          <div
            className={`mb-8 p-4 rounded-2xl border flex items-start gap-3.5 ${
              isServiceUnavailable
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="text-sm">
              <p className="font-semibold">{isServiceUnavailable ? 'ML Service Notice' : 'Validation Error'}</p>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{apiError}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 1: Factory & Batch Metadata */}
            <div className="rounded-3xl bg-forest-900/60 border border-white/10 p-6 shadow-xl relative backdrop-blur-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">1. Factory & Batch Identity</h2>
                  <p className="text-[11px] text-white/50">Location & operational shift</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Factory ID</label>
                  <select
                    value={factorySelect}
                    onChange={(e) => setFactorySelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {FACTORY_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-forest-950 text-white">
                        {f === 'CUSTOM' ? '+ Enter Custom Factory Code...' : f}
                      </option>
                    ))}
                  </select>
                </div>

                {factorySelect === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1.5">
                      Custom Factory Identifier
                    </label>
                    <input
                      type="text"
                      value={customFactory}
                      onChange={(e) => setCustomFactory(e.target.value)}
                      placeholder="e.g. Factory_Kandapola"
                      className="w-full px-3.5 py-2 rounded-xl bg-forest-950 border border-emerald-500/40 text-white text-sm focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Cultivation Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r} value={r} className="bg-forest-950 text-white">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Batch Production Date</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <p className="text-[10px] text-white/40 mt-1">
                    Causal rolling weather will strictly query batches before this date.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Batch Code <span className="text-white/40">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Factory Floor & Machinery Levers */}
            <div className="rounded-3xl bg-forest-900/60 border border-white/10 p-6 shadow-xl relative backdrop-blur-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">2. Process & Machinery Levers</h2>
                  <p className="text-[11px] text-white/50">Withering, drying, and downtime</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Green Leaf Intake (kg)</label>
                    <span className="text-[10px] text-white/40">100 - 50,000 kg</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="100"
                    max="50000"
                    value={greenLeafKg}
                    onChange={(e) => setGreenLeafKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Withering Duration (hrs)</label>
                    <span className="text-[10px] text-emerald-400">Optimum ~17.0h</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="35"
                    value={witheringDurationHrs}
                    onChange={(e) => setWitheringDurationHrs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Dryer Operating Temp (°C)</label>
                    <span className="text-[10px] text-emerald-400">Optimum ~111.0°C</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="70"
                    max="160"
                    value={dryerTempC}
                    onChange={(e) => setDryerTempC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Machine Downtime (hrs)</label>
                    <span className="text-[10px] text-white/40">Mechanical outages</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="24"
                    value={machineDowntimeHrs}
                    onChange={(e) => setMachineDowntimeHrs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Plucking Fine Leaf Compliance (%)</label>
                    <span className="text-[10px] text-white/40">2-leaves-and-a-bud</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="100"
                    value={pluckingFineLeafPct}
                    onChange={(e) => setPluckingFineLeafPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Ambient Weather & Commercial Target */}
            <div className="rounded-3xl bg-forest-900/60 border border-white/10 p-6 shadow-xl relative backdrop-blur-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">3. Environment & Grade</h2>
                  <p className="text-[11px] text-white/50">Current weather & tea target</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Relative Humidity (%)</label>
                    <span className="text-[10px] text-white/40">Factory interior RH</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="100"
                    value={relativeHumidityPct}
                    onChange={(e) => setRelativeHumidityPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-white/70">Ambient Temperature (°C)</label>
                    <span className="text-[10px] text-white/40">Factory interior temp</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="50"
                    value={ambientTempC}
                    onChange={(e) => setAmbientTempC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Target Commercial Tea Grade
                  </label>
                  <select
                    value={teaGradeProduced}
                    onChange={(e) => setTeaGradeProduced(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-forest-950 text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Refuse Resale Disposition
                  </label>
                  <select
                    value={refuseResaleStatus}
                    onChange={(e) => setRefuseResaleStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {RESALE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-forest-950 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <div className="p-3.5 rounded-xl bg-forest-950/60 border border-white/5 text-[11px] text-white/60 space-y-1">
                    <p className="text-emerald-400 font-medium">Automatic Pipeline Features:</p>
                    <p>• Trailing 3-batch rolling humidity & temperature averaged automatically.</p>
                    <p>• SHAP TreeExplainer will attribute top root causes upon submission.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setBatchId('');
                setPredictionResponse(null);
                setApiError(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Form
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-forest-600 text-white font-semibold text-sm shadow-forest hover:shadow-glow-green hover:from-emerald-500 hover:to-forest-500 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing Refuse Tea Prediction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Refuse Tea Prediction & DSS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Prediction Results Section */}
        {predictionResponse && (
          <div className="mt-12 pt-10 border-t border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-white">Prediction & Root-Cause Results</h2>
                <p className="text-xs text-white/50">Batch record successfully persisted to PostgreSQL</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/batches/${predictionResponse.data.batch_id}`}
                  className="px-4 py-2 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-gold-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <span>Run What-If Simulation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/batches"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
                >
                  View in History
                </Link>
              </div>
            </div>

            <PredictionResultCard
              predictedRefusePct={predictionResponse.prediction.predicted_refuse_tea_pct}
              usedFallbackRollingFeatures={predictionResponse.prediction.used_fallback_rolling_features}
              rollingHumidity={predictionResponse.prediction.rolling_humidity_3batch}
              rollingAmbientTemp={predictionResponse.prediction.rolling_ambient_temp_3batch}
              priorBatchesCount={predictionResponse.prediction.prior_batches_count}
              latencyMs={predictionResponse.prediction.latency_ms}
              topDrivers={predictionResponse.explanation.top_features}
              mitigations={predictionResponse.explanation.mitigations}
              economicImpact={predictionResponse.economic_impact}
              batchId={predictionResponse.data.batch_id}
              teaGrade={predictionResponse.data.tea_grade_produced}
              greenLeafKg={predictionResponse.data.green_leaf_input_kg}
            />
          </div>
        )}
      </main>
    </div>
  );
}
