/**
 * M1 Tea Export Demand Forecasting Type Definitions
 * frontend/src/types/demandForecast.ts
 */

export interface IntervalInfo {
  lower_mn_kg: number;
  upper_mn_kg: number;
  width_mn_kg: number;
  nominal_coverage_pct: number;
}

export interface ComponentForecasts {
  seasonal_mean_3yr_mn_kg: number;
  ets_mn_kg: number;
  xgboost_mn_kg: number;
}

export interface MonthForecast {
  target_month: string; // YYYY-MM
  forecast_origin_month: string;
  data_cutoff_used: string;
  horizon_months: number;
  point_forecast_mn_kg: number;
  uses_appended_data: boolean;
  interval_50: IntervalInfo;
  interval_80: IntervalInfo;
  component_forecasts: ComponentForecasts;
}

export interface OverrideInfo {
  date: string;
  old_val_mn_kg: number;
  new_val_mn_kg: number;
}

export interface ForecastMeta {
  from: string;
  to: string;
  requested_months_count: number;
  generated_at_utc: string;
}

export interface PredictDemandResponse {
  success: boolean;
  model_version: string;
  latest_actual_month: string;
  disclaimer: string;
  warnings: string[];
  overrides_applied: OverrideInfo[];
  predictions: MonthForecast[];
  meta?: ForecastMeta;
}

export interface ModelInfoResponse {
  success: boolean;
  model_name: string;
  model_version: string;
  model_architecture: string;
  training_date_utc: string;
  data_cutoff_date: string;
  cleaned_data_sha256: string;
  features: string[];
  hyperparameters: Record<string, any>;
  protocol: string;
  status: string;
}

export interface AsymmetryOffsetPair {
  lower_offset_mn_kg: number;
  upper_offset_mn_kg: number;
}

export interface MetricsResponse {
  success: boolean;
  model_version: string;
  backtest_metrics: {
    evaluation_protocol: string;
    n_origins: number;
    mae: number;
    rmse: number;
    mape_pct: number;
    bias_mn_kg: number;
  };
  interval_calibration: Record<string, any>;
  observed_backtest_coverage: {
    n_origins: number;
    n_test_origins: number;
    nominal_80_overall_pct: number;
    nominal_80_test_phase_pct: number;
    nominal_90_overall_pct: number;
    nominal_90_test_phase_pct: number;
    nominal_50_overall_pct: number;
    nominal_50_test_phase_pct: number;
  };
  bias_and_asymmetry: {
    n_pooled_origins: number;
    n_test_origins: number;
    n_fixed_offset_errors: number;
    pooled_bias_mn_kg: number;
    test_phase_2023_2024_bias_mn_kg: number;
    share_actuals_below_point_forecast_pooled_pct: number;
    share_actuals_below_point_forecast_test_phase_pct: number;
    interval_symmetry: string;
    sign_convention: string;
    asymmetry_offsets: {
      nominal_50: AsymmetryOffsetPair;
      nominal_80: AsymmetryOffsetPair;
      nominal_90: AsymmetryOffsetPair;
    };
    protocol_note: string;
  };
  known_limitations: string[];
}
