/**
 * Demand Forecast Native SVG Chart Component
 * frontend/src/components/m1/DemandForecastChart.tsx
 *
 * Renders a responsive SVG chart featuring:
 * - 80% Confidence Interval Band (shaded)
 * - 50% Confidence Interval Band (shaded)
 * - Point Forecast Line & Markers
 * - Optional Historical Actuals Line
 * - Hover Tooltip with Point, Intervals, and Ensemble Components
 */

import React, { useState } from 'react';
import { MonthForecast } from '../../types/demandForecast';

export interface HistoricalPoint {
  month: string;
  actual_mn_kg: number;
}

interface DemandForecastChartProps {
  predictions: MonthForecast[];
  history?: HistoricalPoint[];
}

export const DemandForecastChart: React.FC<DemandForecastChartProps> = ({
  predictions,
  history = [],
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-white/50 text-sm italic">
        No forecast points available to plot.
      </div>
    );
  }

  // Chart dimensions & margins
  const width = 800;
  const height = 360;
  const margin = { top: 30, right: 40, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Compute value extremes across intervals and actuals
  let minVal = Infinity;
  let maxVal = -Infinity;

  predictions.forEach((p) => {
    minVal = Math.min(minVal, p.interval_80.lower_mn_kg, p.point_forecast_mn_kg);
    maxVal = Math.max(maxVal, p.interval_80.upper_mn_kg, p.point_forecast_mn_kg);
  });

  history.forEach((h) => {
    minVal = Math.min(minVal, h.actual_mn_kg);
    maxVal = Math.max(maxVal, h.actual_mn_kg);
  });

  // Add 10% vertical padding
  const valRange = maxVal - minVal || 5;
  const domainMin = Math.max(0, Math.floor(minVal - valRange * 0.15));
  const domainMax = Math.ceil(maxVal + valRange * 0.15);
  const domainSpan = domainMax - domainMin || 1;

  // Scale functions
  const count = predictions.length;
  const getX = (idx: number) => {
    if (count === 1) return margin.left + innerWidth / 2;
    return margin.left + (idx / (count - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return margin.top + innerHeight - ((val - domainMin) / domainSpan) * innerHeight;
  };

  // Generate paths for bands and line
  // 80% Band Polygon
  let band80Path = '';
  let band50Path = '';
  let linePath = '';

  if (count > 1) {
    // Top of 80%
    const top80 = predictions.map((p, idx) => `${getX(idx)},${getY(p.interval_80.upper_mn_kg)}`);
    // Bottom of 80% (reversed)
    const bot80 = [...predictions]
      .reverse()
      .map((p, idx) => `${getX(count - 1 - idx)},${getY(p.interval_80.lower_mn_kg)}`);
    band80Path = `M ${top80.join(' L ')} L ${bot80.join(' L ')} Z`;

    // Top of 50%
    const top50 = predictions.map((p, idx) => `${getX(idx)},${getY(p.interval_50.upper_mn_kg)}`);
    // Bottom of 50% (reversed)
    const bot50 = [...predictions]
      .reverse()
      .map((p, idx) => `${getX(count - 1 - idx)},${getY(p.interval_50.lower_mn_kg)}`);
    band50Path = `M ${top50.join(' L ')} L ${bot50.join(' L ')} Z`;

    // Forecast line
    linePath = `M ${predictions.map((p, idx) => `${getX(idx)},${getY(p.point_forecast_mn_kg)}`).join(' L ')}`;
  }

  // Y-axis ticks (5 ticks)
  const yTicksCount = 5;
  const yTicks = Array.from({ length: yTicksCount }, (_, i) => {
    const val = domainMin + (i / (yTicksCount - 1)) * domainSpan;
    return {
      value: val,
      y: getY(val),
    };
  });

  const activePred = hoverIndex !== null ? predictions[hoverIndex] : null;

  return (
    <div className="relative w-full bg-forest-900/40 rounded-2xl p-5 border border-white/10 shadow-lg">
      {/* Legend & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10">
        <div>
          <h4 className="text-sm font-semibold text-white tracking-wide">
            Export Demand Forecast & Uncertainty Bands
          </h4>
          <p className="text-xs text-white/60">
            Ensemble point forecast (Mn kg) with 50% and 80% calibrated empirical intervals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-emerald-400 rounded-full inline-block" />
            <span className="text-white/80">Point Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 bg-emerald-500/25 border border-emerald-500/40 rounded-sm inline-block" />
            <span className="text-white/80">50% Interval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 bg-emerald-400/10 border border-emerald-400/20 rounded-sm inline-block" />
            <span className="text-white/80">80% Interval</span>
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-gold-400 rounded-full inline-block" />
              <span className="text-white/80">Actuals</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[550px] overflow-visible"
        >
          <defs>
            <linearGradient id="band80Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="band50Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.20" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={width - margin.right}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={margin.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[11px] fill-white/50 font-mono"
              >
                {tick.value.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Y-axis Title */}
          <text
            x={-(height / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[11px] fill-white/60 tracking-wider uppercase font-semibold"
          >
            Export Volume (Mn kg)
          </text>

          {/* Shaded 80% Band */}
          {count > 1 ? (
            <path d={band80Path} fill="url(#band80Grad)" />
          ) : (
            // Single point: vertical range bracket
            <line
              x1={getX(0)}
              y1={getY(predictions[0].interval_80.lower_mn_kg)}
              x2={getX(0)}
              y2={getY(predictions[0].interval_80.upper_mn_kg)}
              stroke="#34d399"
              strokeWidth="10"
              strokeOpacity="0.2"
              strokeLinecap="round"
            />
          )}

          {/* Shaded 50% Band */}
          {count > 1 ? (
            <path d={band50Path} fill="url(#band50Grad)" />
          ) : (
            <line
              x1={getX(0)}
              y1={getY(predictions[0].interval_50.lower_mn_kg)}
              x2={getX(0)}
              y2={getY(predictions[0].interval_50.upper_mn_kg)}
              stroke="#34d399"
              strokeWidth="6"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />
          )}

          {/* Point Forecast Line */}
          {count > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points / Hover Nodes */}
          {predictions.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.point_forecast_mn_kg);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={p.target_month}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={margin.top}
                    x2={cx}
                    y2={height - margin.bottom}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Outer halo */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8 : 5}
                  className={`transition-all duration-200 ${
                    isHovered
                      ? 'fill-emerald-400/40 stroke-emerald-300'
                      : 'fill-forest-950 stroke-emerald-400'
                  }`}
                  strokeWidth="2.5"
                />

                {/* Inner dot */}
                <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />

                {/* X-axis Label */}
                <text
                  x={cx}
                  y={height - margin.bottom + 22}
                  textAnchor="middle"
                  className={`text-[11px] font-mono transition-colors ${
                    isHovered ? 'fill-emerald-300 font-semibold' : 'fill-white/70'
                  }`}
                >
                  {p.target_month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Details Card (Floating Tooltip) */}
        {activePred && hoverIndex !== null && (
          <div
            className="absolute top-4 right-6 bg-forest-950/95 backdrop-blur-md border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl z-20 text-xs w-64 pointer-events-none transition-all duration-200"
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
              <span className="font-semibold text-emerald-300 text-sm">
                {activePred.target_month}
              </span>
              <span className="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                Origin: {activePred.forecast_origin_month}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-white/70 font-medium">Point Forecast:</span>
                <span className="text-white font-bold text-sm">
                  {activePred.point_forecast_mn_kg.toFixed(2)} Mn kg
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400">50% Interval:</span>
                <span className="font-mono text-white/90">
                  [{activePred.interval_50.lower_mn_kg.toFixed(2)} – {activePred.interval_50.upper_mn_kg.toFixed(2)}]
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-300/80">80% Interval:</span>
                <span className="font-mono text-white/90">
                  [{activePred.interval_80.lower_mn_kg.toFixed(2)} – {activePred.interval_80.upper_mn_kg.toFixed(2)}]
                </span>
              </div>

              <div className="pt-2 mt-1 border-t border-white/10">
                <p className="text-[10px] uppercase text-white/40 tracking-wider font-semibold mb-1">
                  Ensemble Components:
                </p>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                  <div className="bg-white/5 p-1 rounded">
                    <p className="text-white/50">Seasonal</p>
                    <p className="font-semibold text-white">
                      {activePred.component_forecasts.seasonal_mean_3yr_mn_kg.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white/5 p-1 rounded">
                    <p className="text-white/50">ETS</p>
                    <p className="font-semibold text-white">
                      {activePred.component_forecasts.ets_mn_kg.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white/5 p-1 rounded">
                    <p className="text-white/50">XGBoost</p>
                    <p className="font-semibold text-white">
                      {activePred.component_forecasts.xgboost_mn_kg.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
