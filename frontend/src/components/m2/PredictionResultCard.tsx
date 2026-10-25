import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
  Wrench,
  CheckCircle,
  Clock,
  Sparkles,
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
      ? { label: 'Optimal (< 5.5%)', color: 'text-[#165B34]', badge: 'bg-[#EAF6ED] text-[#165B34] border-[#CDE8D4]' }
      : predictedRefusePct <= 7.5
      ? { label: 'Normal (5.5 - 7.5%)', color: 'text-[#8C6212]', badge: 'bg-[#FEF7E6] text-[#8C6212] border-[#FBE5B4]' }
      : { label: 'Elevated (≥ 7.5%)', color: 'text-[#9A2C18]', badge: 'bg-[#FDF0ED] text-[#9A2C18] border-[#FAD3CB]' };

  return (
    <div className="space-y-6">
      {/* Fallback Banner if trailing history was unavailable */}
      {usedFallbackRollingFeatures && (
        <div className="p-4 rounded-2xl bg-[#FEF7E6] border border-[#FBE5B4] text-[#785416] text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <Info className="w-5 h-5 text-[#8C6212] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#664612]">Trailing History Fallback Applied: </strong>
            No prior batch history was found for this factory strictly before this batch date.
            The ML model applied the global historical dataset mean (~77.37% humidity, ~22.96°C ambient temperature).
          </div>
        </div>
      )}

      {/* Main KPI Row (3 Cards matching Executive Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Refuse Percentage */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#706B62]">
              Predicted Refuse Tea
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${refuseTier.badge}`}>
              {refuseTier.label}
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-5xl font-display font-bold tracking-tight ${refuseTier.color}`}>
              {formatPct(predictedRefusePct)}
            </span>
            <span className="text-xs text-[#706B62] font-medium">of dry tea mass</span>
          </div>

          <div className="mt-4 pt-4 border-t border-[#F0ECE4] flex items-center justify-between text-xs text-[#706B62]">
            <span>National Baseline: <strong className="text-[#14261C]">6.00%</strong></span>
            <span className="font-semibold text-[#14261C]">
              Delta: {predictedRefusePct > 6.0 ? '+' : ''}{(predictedRefusePct - 6.0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Card 2: Revenue Impact */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#706B62]">
              Gross Revenue Loss
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border bg-[#FEF7E6] text-[#8C6212] border-[#FBE5B4] font-semibold">
              Auction Reference
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-display font-bold text-[#8C6212] tracking-tight">
              {economicImpact ? formatLKR(economicImpact.revenue_loss_lkr) : 'N/A'}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-[#F0ECE4] flex items-center justify-between text-xs text-[#706B62]">
            <span>Est. Refuse Mass:</span>
            <span className="font-semibold text-[#14261C]">
              {economicImpact ? `${economicImpact.estimated_refuse_tea_kg.toFixed(1)} kg` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Card 3: Model & Diagnostics */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#706B62]">
              Inference Diagnostics
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border bg-[#EAF6ED] text-[#165B34] border-[#CDE8D4] font-semibold">
              Production Champion
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#706B62]">Model Architecture:</span>
              <span className="font-mono font-bold text-[#14261C]">XGBoost Regressor v1</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#706B62]">Single-Row Latency:</span>
              <span className="font-mono font-bold text-[#165B34]">{latencyMs ? `${latencyMs.toFixed(2)} ms` : '< 5.0 ms'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#706B62]">Causal Prior Batches:</span>
              <span className="font-semibold text-[#14261C]">{priorBatchesCount ?? 3} batches</span>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Feature Attributions Section */}
      {topDrivers && topDrivers.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-7 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h3 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
              Local SHAP Root-Cause Feature Attribution
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
              TreeExplainer Local Attribution
            </span>
          </div>
          <p className="text-xs text-[#706B62] font-sans">
            Quantifies each operational and ambient parameter's contribution (in percentage points) to this batch's predicted refuse rate.
          </p>

          {/* Mint Callout Box matching photo */}
          <div className="bg-[#EDF7F2] border border-[#D5EBDE] rounded-xl p-3.5 text-xs text-[#194B32] flex items-start gap-2.5 my-5 leading-relaxed">
            <Info className="w-4 h-4 text-[#165B34] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#14422D]">How to interpret contributions:</strong> Deep green bars indicate process factors that lowered refuse tea below baseline. Warm gold/terracotta bars indicate factors driving refuse percentage higher.
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {topDrivers.map((driver, idx) => {
              const isDecreasing = driver.contribution === 'DECREASES_REFUSE' || driver.shap_value_pp < 0;
              const absVal = Math.abs(driver.shap_value_pp);
              const barWidthPct = Math.min(100, Math.max(12, absVal * 95));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#14261C]">
                      {driver.feature.replace(/_/g, ' ')}
                      <span className="text-[#706B62] font-normal ml-2">
                        (val: {typeof driver.feature_value === 'number' ? driver.feature_value.toFixed(2) : driver.feature_value})
                      </span>
                    </span>
                    <span className={`font-mono font-bold ${isDecreasing ? 'text-[#165B34]' : 'text-[#8C6212]'}`}>
                      {driver.shap_value_pp > 0 ? '+' : ''}{driver.shap_value_pp.toFixed(4)} pp
                    </span>
                  </div>

                  <div className="h-4 w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDecreasing
                          ? 'bg-[#123E2A]'
                          : 'bg-[#C69A4B]'
                      }`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operational Mitigations Section */}
      {sortedMitigations && sortedMitigations.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-7 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
              Actionable Operational Mitigations
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
              Expert System Advisory
            </span>
          </div>
          <p className="text-xs text-[#706B62] font-sans mb-6">
            Automated recommendations tailored to the highest-severity SHAP drivers observed in this batch.
          </p>

          <div className="space-y-3.5">
            {sortedMitigations.map((mit, idx) => {
              const isHigh = mit.severity === 'HIGH';
              const isMedium = mit.severity === 'MEDIUM';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-l-4 bg-[#FAF8F5] border-y border-r border-y-[#EBE6DD] border-r-[#EBE6DD] ${
                    isHigh
                      ? 'border-l-[#9A2C18]'
                      : isMedium
                      ? 'border-l-[#C69A4B]'
                      : 'border-l-[#165B34]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#14261C]">
                        {mit.category}
                      </span>
                      <span className="text-xs text-[#706B62]">
                        • {mit.feature.replace(/_/g, ' ')} ({mit.feature_value})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isHigh
                          ? 'bg-[#FDF0ED] text-[#9A2C18] border-[#FAD3CB]'
                          : isMedium
                          ? 'bg-[#FEF7E6] text-[#8C6212] border-[#FBE5B4]'
                          : 'bg-[#EAF6ED] text-[#165B34] border-[#CDE8D4]'
                      }`}
                    >
                      {mit.severity} Impact
                    </span>
                  </div>

                  <p className="text-xs text-[#554C3F] leading-relaxed font-sans">
                    {mit.recommendation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Economic Impact Detail Table */}
      {economicImpact && (
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EBE6DD] p-7 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-xl text-[#14261C] tracking-tight">
              Economic Loss Conversion Breakdown
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFECE6] text-[#554C3F] border border-[#DDD7CC]">
              Auction Pricing Model
            </span>
          </div>
          <p className="text-xs text-[#706B62] font-sans mb-5">
            Valuation calculated using indicative Colombo Tea Auction benchmark prices per grade.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#182C23]">
              <thead className="bg-[#F7F5EE] border-b border-[#EBE6DD] text-[11px] font-bold text-[#665D4F] uppercase">
                <tr>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#14261C]">Target Grade</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#8C6212]">{economicImpact.tea_grade_produced}</td>
                  <td className="px-4 py-3 text-[#706B62]">Produced made tea classification</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#14261C]">Auction Reference Price</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#14261C]">{formatLKR(economicImpact.good_tea_price_per_kg)}/kg</td>
                  <td className="px-4 py-3 text-[#706B62]">Colombo Tea Auction benchmark quote</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#14261C]">Estimated Dry Tea Mass</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#14261C]">{economicImpact.total_dry_tea_kg.toFixed(2)} kg</td>
                  <td className="px-4 py-3 text-[#706B62]">Derived from green leaf intake & standard yield ratio (~22.3%)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#14261C]">Refuse Mass Lost</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#9A2C18]">{economicImpact.estimated_refuse_tea_kg.toFixed(2)} kg</td>
                  <td className="px-4 py-3 text-[#706B62]">Volume classified as refuse stalk & fluff</td>
                </tr>
                <tr className="bg-[#FAF8F5] font-bold">
                  <td className="px-4 py-3 text-[#14261C]">Net Revenue Loss</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#8C6212]">{formatLKR(economicImpact.revenue_loss_lkr)}</td>
                  <td className="px-4 py-3 text-[#706B62]">Unrecovered revenue impact for this manufacturing batch</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] text-[#A39B8F] italic font-sans">
            {economicImpact.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
