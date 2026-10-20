import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
  Wrench,
  CheckCircle,
} from 'lucide-react';
import {
  FeatureAttribution,
  MitigationAdvice,
  EconomicImpactResult,
} from '../../types/batch';

interface PredictionResultCardProps {
  predictedRefusePct: number;
  usedFallbackRollingFeatures: boolean;
  rollingHumidity?: number | null;
  rollingAmbientTemp?: number | null;
  priorBatchesCount?: number;
  latencyMs?: number;
  topDrivers?: FeatureAttribution[] | null;
  mitigations?: MitigationAdvice[] | null;
  economicImpact?: EconomicImpactResult | null;
  batchId?: string;
  teaGrade?: string;
  greenLeafKg?: number;
}

export function PredictionResultCard({
  predictedRefusePct,
  usedFallbackRollingFeatures,
  rollingHumidity,
  rollingAmbientTemp,
  priorBatchesCount,
  latencyMs,
  topDrivers,
  mitigations,
  economicImpact,
  batchId,
  teaGrade,
  greenLeafKg,
}: PredictionResultCardProps) {
  // Format helpers
  const formatPct = (val: number) => val.toFixed(2) + '%';
  const formatLKR = (val: number) =>
    'Rs. ' + Number(val.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Severity sorting: HIGH > MEDIUM > LOW
  const sortedMitigations = mitigations
    ? [...mitigations].sort((a, b) => {
        const order: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.severity] || 99) - (order[b.severity] || 99);
      })
    : [];

  const refuseTier =
    predictedRefusePct < 5.5
      ? { label: 'Low Refuse', color: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      : predictedRefusePct <= 7.5
      ? { label: 'Moderate Refuse', color: 'text-gold-400', badge: 'bg-gold-500/15 text-gold-300 border-gold-500/30' }
      : { label: 'Elevated Refuse', color: 'text-rose-400', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };

  return (
    <div className="space-y-6">
      {/* Fallback Banner if trailing history was unavailable */}
      {usedFallbackRollingFeatures && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Trailing History Fallback Applied: </span>
            No prior batch history was found for this factory strictly before this batch date.
            The ML model applied the global historical dataset mean (~77.37% humidity, ~22.96°C ambient temperature).
          </div>
        </div>
      )}

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Refuse Percentage */}
        <div className="rounded-3xl bg-gradient-to-b from-forest-800/80 to-forest-900/90 border border-white/10 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Predicted Refuse Tea
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${refuseTier.badge}`}>
              {refuseTier.label}
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-5xl font-display font-bold tracking-tight ${refuseTier.color}`}>
              {formatPct(predictedRefusePct)}
            </span>
            <span className="text-xs text-white/50">of dry tea mass</span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>
              {priorBatchesCount != null && priorBatchesCount > 0
                ? `Trailing avg: ${priorBatchesCount} prior runs`
                : usedFallbackRollingFeatures
                ? 'Dataset mean fallback'
                : 'History aligned'}
            </span>
            {latencyMs != null && <span>Latency: {latencyMs.toFixed(1)} ms</span>}
          </div>
        </div>

        {/* Card 2: Financial Impact */}
        {economicImpact && (
          <div className="rounded-3xl bg-gradient-to-b from-forest-800/80 to-forest-900/90 border border-white/10 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Monetary Revenue Loss
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full border bg-gold-500/15 text-gold-300 border-gold-500/30 font-medium">
                Grade: {economicImpact.tea_grade_produced}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-display font-bold text-gold-400">
                {formatLKR(economicImpact.revenue_loss_lkr)}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>Refuse: ~{economicImpact.estimated_refuse_tea_kg.toFixed(1)} kg</span>
              <span>Rate: Rs. {economicImpact.good_tea_price_per_kg}/kg</span>
            </div>
          </div>
        )}

        {/* Card 3: Batch Overview Details */}
        <div className="rounded-3xl bg-gradient-to-b from-forest-800/80 to-forest-900/90 border border-white/10 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Batch Context
            </span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            {batchId && (
              <div className="flex justify-between">
                <span className="text-white/60">Batch ID</span>
                <span className="font-mono text-emerald-300 font-medium">{batchId}</span>
              </div>
            )}
            {greenLeafKg != null && (
              <div className="flex justify-between">
                <span className="text-white/60">Green Leaf Intake</span>
                <span className="text-white font-medium">{greenLeafKg.toLocaleString()} kg</span>
              </div>
            )}
            {rollingHumidity != null && (
              <div className="flex justify-between">
                <span className="text-white/60">Rolling Humidity (3-batch)</span>
                <span className="text-white font-medium">{rollingHumidity.toFixed(1)}%</span>
              </div>
            )}
            {rollingAmbientTemp != null && (
              <div className="flex justify-between">
                <span className="text-white/60">Rolling Ambient Temp (3-batch)</span>
                <span className="text-white font-medium">{rollingAmbientTemp.toFixed(1)}°C</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top SHAP Drivers & Mitigations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top SHAP Drivers */}
        <div className="rounded-3xl bg-gradient-to-b from-forest-800/70 to-forest-900/80 border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Top Influential Drivers (SHAP)</h3>
              <p className="text-xs text-white/50">Root-cause feature attributions for this specific batch</p>
            </div>
          </div>

          {topDrivers && topDrivers.length > 0 ? (
            <div className="space-y-3">
              {topDrivers.map((driver, idx) => {
                const isIncreasing = driver.contribution === 'INCREASES_REFUSE' || driver.shap_value_pp > 0;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-forest-950/50 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isIncreasing
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isIncreasing ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {driver.feature.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-white/50">
                          Observed value: <span className="text-white/80 font-mono">{driver.feature_value}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold font-mono ${
                          isIncreasing ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {driver.shap_value_pp > 0 ? `+${driver.shap_value_pp.toFixed(2)}` : driver.shap_value_pp.toFixed(2)} pp
                      </span>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">
                        {isIncreasing ? 'Increases Refuse' : 'Reduces Refuse'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/50 italic py-6 text-center">No SHAP attribution records available.</p>
          )}
        </div>

        {/* Right Column: Rule-Based Mitigation Advice */}
        <div className="rounded-3xl bg-gradient-to-b from-forest-800/70 to-forest-900/80 border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Targeted Operational Mitigations</h3>
              <p className="text-xs text-white/50">Rule-based recommendations ranked by urgency</p>
            </div>
          </div>

          {sortedMitigations.length > 0 ? (
            <div className="space-y-3.5">
              {sortedMitigations.map((mitigation, idx) => {
                const isHigh = mitigation.severity === 'HIGH';
                const isMedium = mitigation.severity === 'MEDIUM';

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isHigh
                        ? 'bg-rose-950/30 border-rose-500/30'
                        : isMedium
                        ? 'bg-amber-950/30 border-amber-500/30'
                        : 'bg-emerald-950/20 border-emerald-500/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white capitalize">
                        {mitigation.feature.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/60">
                          {mitigation.category}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            isHigh
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isMedium
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {mitigation.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-white/80">{mitigation.recommendation}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center flex flex-col items-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
              <p className="text-sm font-medium text-emerald-300">Optimal Operating Parameters</p>
              <p className="text-xs text-white/50 max-w-xs mt-1">
                No active operational anomalies detected for this batch. Operating within safe targets.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Economic Impact Disclaimer */}
      {economicImpact?.disclaimer && (
        <div className="p-4 rounded-2xl bg-forest-900/80 border border-gold-500/30 shadow-md flex items-start gap-3">
          <Info className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gold-200/90 leading-relaxed font-sans">
            <span className="font-semibold text-gold-300">Economic Valuation Notice: </span>
            {economicImpact.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
