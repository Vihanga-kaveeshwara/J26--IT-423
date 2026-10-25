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
  Info,
  Sliders,
  TrendingDown,
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
        batch_date: batchDate,
        green_leaf_input_kg: parseFloat(greenLeafKg),
        withering_duration_hrs: parseFloat(witheringDurationHrs),
        dryer_temperature_c: parseFloat(dryerTempC),
        machine_downtime_hrs: parseFloat(machineDowntimeHrs || '0'),
        plucking_fine_leaf_pct: parseFloat(pluckingFineLeafPct),
        relative_humidity_pct: parseFloat(relativeHumidityPct),
        ambient_temperature_c: parseFloat(ambientTempC),
        tea_grade_produced: teaGradeProduced,
        refuse_resale_status: refuseResaleStatus,
      });

      setPredictionResponse(res);
      // Scroll to result smoothly
      window.scrollTo({ top: 600, behavior: 'smooth' });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiError(err.message);
        setIsServiceUnavailable(err.isServiceUnavailable);
      } else {
        setApiError('An unexpected error occurred during prediction.');
      }
    } finally {
      setSubmitting(false);
    }
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
                <span>CEYLON AI — REAL-TIME INFERENCE & DSS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight leading-tight">
                New Batch Refuse-Tea Prediction
              </h1>
              <p className="text-sm text-[#C8D9CE] mt-2 font-sans leading-relaxed">
                Simulate manufacturing parameters to forecast refuse percentages, SHAP root causes, and gross revenue loss before physical secondary sifting.
              </p>
            </div>

            {/* Quick Presets matching photo button styles */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={loadPresetFactoryH}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-2 backdrop-blur-xs active:scale-95"
              >
                <span>Factory H (Low-Country BOP)</span>
              </button>
              <button
                type="button"
                onClick={loadPresetNewFactory}
                className="px-4 py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A759] text-[#14261C] text-xs font-bold shadow-xs transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Nuwara Eliya (High-Elevation BOPF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Executive Guidance Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Causal Trailing Isolation */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                Causal Weather Trailing Isolation
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
                Anti-Leakage Protocol
              </span>
            </div>
            <p className="text-xs text-[#706B62] mt-1 font-sans">
              Strict chronological window: earliest batch per factory equals raw values.
            </p>

            <div className="bg-[#EDF7F2] border border-[#D5EBDE] rounded-xl p-3.5 text-xs text-[#194B32] flex items-start gap-2.5 mt-4 leading-relaxed">
              <Info className="w-4 h-4 text-[#165B34] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#14422D]">Automated Trailing History:</strong> The backend queries the prior 3 chronological batches strictly before this batch date for the selected factory to derive rolling temperature and humidity. No future information is snooped.
              </div>
            </div>
          </div>

          {/* Card 2: Process Control Standards */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                Process Control Targets (EDA Calibrated)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
                Physical Operating Range
              </span>
            </div>
            <p className="text-xs text-[#706B62] mt-1 font-sans">
              Optimal operating setpoints identified across historical batch distributions.
            </p>

            <div className="bg-[#FDF8EC] border border-[#F6E7C4] rounded-xl p-3.5 text-xs text-[#785416] flex items-start gap-2.5 mt-4 leading-relaxed">
              <Info className="w-4 h-4 text-[#A06A17] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#664612]">Process Target:</strong> Withering target is ~16.5–17.5h. Dryer temperature operates with a physical V-shaped curve (optimum at 109°C–113°C) minimizing leaf waste.
              </div>
            </div>
          </div>
        </div>

        {/* Input Form Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EBE6DD] p-7 sm:p-9 shadow-sm mb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Factory & Metadata */}
            <div>
              <div className="flex items-center gap-2 border-b border-[#F0ECE4] pb-3 mb-5">
                <Factory className="w-5 h-5 text-[#133E2B]" />
                <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                  1. Factory & Batch Identification
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#554C3F] mb-1.5">
                    Factory ID <span className="text-[#9A2C18]">*</span>
                  </label>
                  <select
                    value={factorySelect}
                    onChange={(e) => setFactorySelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                  >
                    {FACTORY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f === 'CUSTOM' ? '+ Enter New / Custom Factory' : f}
                      </option>
                    ))}
                  </select>
                </div>

                {factorySelect === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#554C3F] mb-1.5">
                      Custom Factory Name <span className="text-[#9A2C18]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Factory_HighlandGlen"
                      value={customFactory}
                      onChange={(e) => setCustomFactory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#554C3F] mb-1.5">
                    Agro-Climatic Region <span className="text-[#9A2C18]">*</span>
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554C3F] mb-1.5">
                    Batch Manufacturing Date <span className="text-[#9A2C18]">*</span>
                  </label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554C3F] mb-1.5">
                    Custom Batch Code <span className="text-[#A39B8F]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Operational Machinery Levers */}
            <div>
              <div className="flex items-center gap-2 border-b border-[#F0ECE4] pb-3 mb-5">
                <Sliders className="w-5 h-5 text-[#133E2B]" />
                <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                  2. Operational Machinery & Raw Material Levers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Green Leaf Intake (kg)</label>
                    <span className="text-[11px] text-[#706B62]">Range: 2k - 15k kg</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="1000"
                    max="20000"
                    value={greenLeafKg}
                    onChange={(e) => setGreenLeafKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Withering Duration (hrs)</label>
                    <span className="text-[11px] text-[#706B62]">Target: ~17.0h</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="8"
                    max="30"
                    value={witheringDurationHrs}
                    onChange={(e) => setWitheringDurationHrs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Fluid-Bed Dryer Temp (°C)</label>
                    <span className="text-[11px] text-[#706B62]">Target: 109-113°C</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="80"
                    max="140"
                    value={dryerTempC}
                    onChange={(e) => setDryerTempC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Machine Downtime (hrs)</label>
                    <span className="text-[11px] text-[#706B62]">Target: 0.0h</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={machineDowntimeHrs}
                    onChange={(e) => setMachineDowntimeHrs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Plucking Fine Leaf (%)</label>
                    <span className="text-[11px] text-[#706B62]">Target: &ge; 85%</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="40"
                    max="100"
                    value={pluckingFineLeafPct}
                    onChange={(e) => setPluckingFineLeafPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Produced Tea Grade</label>
                    <span className="text-[11px] text-[#706B62]">Auction Valuation</span>
                  </div>
                  <select
                    value={teaGradeProduced}
                    onChange={(e) => setTeaGradeProduced(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Ambient Weather & Resale Mode */}
            <div>
              <div className="flex items-center gap-2 border-b border-[#F0ECE4] pb-3 mb-5">
                <Thermometer className="w-5 h-5 text-[#133E2B]" />
                <h2 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
                  3. Ambient Factory Environment & Commercial Resale
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Relative Humidity (%)</label>
                    <span className="text-[11px] text-[#706B62]">Factory Trough Ambient</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="30"
                    max="100"
                    value={relativeHumidityPct}
                    onChange={(e) => setRelativeHumidityPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Ambient Temperature (°C)</label>
                    <span className="text-[11px] text-[#706B62]">Rolling Sensor Reading</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    max="45"
                    value={ambientTempC}
                    onChange={(e) => setAmbientTempC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#554C3F]">Refuse Resale Status</label>
                    <span className="text-[11px] text-[#706B62]">Revenue Salvage Mode</span>
                  </div>
                  <select
                    value={refuseResaleStatus}
                    onChange={(e) => setRefuseResaleStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD7CC] text-[#14261C] text-sm font-medium focus:outline-none focus:border-[#133E2B] focus:ring-1 focus:ring-[#133E2B] focus:bg-white transition-all"
                  >
                    {RESALE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {apiError && (
              <div className="p-4 rounded-2xl bg-[#FDF0ED] border border-[#FAD3CB] text-[#9A2C18] text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#9A2C18] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{isServiceUnavailable ? 'ML Service Offline' : 'Validation Error'}</p>
                  <p className="mt-1 text-xs">{apiError}</p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#F0ECE4]">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A759] text-[#14261C] font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#14261C]/30 border-t-[#14261C] rounded-full animate-spin" />
                    <span>Executing ML Inference...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Run ML Refuse Prediction & SHAP Analysis</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={loadPresetFactoryH}
                className="px-5 py-3.5 rounded-xl bg-[#F0ECE4] hover:bg-[#E4DED4] text-[#554C3F] font-semibold text-sm transition-all"
              >
                Reset to Default Preset
              </button>
            </div>
          </form>
        </div>

        {/* Live Prediction Output Area */}
        {predictionResponse && (
          <div className="mt-10 space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#165B34] font-mono">
                  PREDICTION COMPLETE
                </span>
                <h2 className="font-display font-bold text-2xl text-[#14261C] tracking-tight">
                  Inference & SHAP Attribution Output
                </h2>
              </div>

              <Link
                to={`/batches/${predictionResponse.data.batch_id}`}
                className="px-4 py-2 rounded-xl bg-[#123E2A] hover:bg-[#184832] text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>Open Counterfactual What-If Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
