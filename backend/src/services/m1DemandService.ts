/**
 * M1 Tea Export Demand Forecasting Service Client
 * backend/src/services/m1DemandService.ts
 *
 * Typed client communicating with the FastAPI M1 ML Service.
 * Endpoints handled:
 * - POST /api/ml/predict-demand
 * - GET  /api/ml/model
 * - GET  /api/ml/metrics
 */

import axios, { AxiosError } from 'axios';
import { config } from '../config/env';

// ----------------------------------------------------------------------------
// Typed Interfaces (Mirroring Pydantic ML Schemas)
// ----------------------------------------------------------------------------

export interface MonthlyActualInput {
  date: string; // YYYY-MM
  total_mn_kg: number;
  unit?: string;
}

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
  forecast_origin_month: string; // T - 12
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

export interface PredictDemandResponse {
  success: boolean;
  model_version: string;
  latest_actual_month: string;
  disclaimer: string;
  warnings: string[];
  overrides_applied: OverrideInfo[];
  predictions: MonthForecast[];
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

// ----------------------------------------------------------------------------
// Service Error Handling
// ----------------------------------------------------------------------------

export class M1ServiceError extends Error {
  public statusCode: number;
  public detail?: any;

  constructor(statusCode: number, message: string, detail?: any) {
    super(message);
    this.name = 'M1ServiceError';
    this.statusCode = statusCode;
    this.detail = detail;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

function handleAxiosError(error: any, endpoint: string): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data;
      const detail = data?.detail || data?.message || data;

      if (status === 422 || status === 400) {
        const errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new M1ServiceError(status, errorMsg, detail);
      }

      if (status === 503) {
        throw new M1ServiceError(
          503,
          typeof detail === 'string' ? detail : 'ML demand forecasting service is unavailable or model file missing',
          detail
        );
      }

      throw new M1ServiceError(
        status,
        `ML service returned error ${status} on ${endpoint}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
        detail
      );
    }

    if (
      axiosErr.code === 'ECONNREFUSED' ||
      axiosErr.code === 'ENOTFOUND' ||
      axiosErr.code === 'ECONNABORTED' ||
      axiosErr.code === 'ETIMEDOUT' ||
      !axiosErr.response
    ) {
      throw new M1ServiceError(
        503,
        `ML demand forecasting service is unavailable at ${config.mlServiceUrl} (${axiosErr.code || axiosErr.message})`
      );
    }
  }

  if (error instanceof M1ServiceError) {
    throw error;
  }

  throw new M1ServiceError(503, `ML service request failed: ${error?.message || String(error)}`);
}

// ----------------------------------------------------------------------------
// Client Methods
// ----------------------------------------------------------------------------

export async function predictDemand(
  targetMonths: string[],
  recentMonthlyTotals?: MonthlyActualInput[],
  overrideExisting: boolean = false
): Promise<PredictDemandResponse> {
  const payload = {
    target_months: targetMonths,
    recent_monthly_totals: recentMonthlyTotals ?? null,
    override_existing: overrideExisting,
  };

  try {
    const response = await axios.post<PredictDemandResponse>(
      `${config.mlServiceUrl}/api/ml/predict-demand`,
      payload,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/api/ml/predict-demand');
  }
}

export async function getModelInfo(): Promise<ModelInfoResponse> {
  try {
    const response = await axios.get<ModelInfoResponse>(
      `${config.mlServiceUrl}/api/ml/model`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/api/ml/model');
  }
}

export async function getMetrics(): Promise<MetricsResponse> {
  try {
    const response = await axios.get<MetricsResponse>(
      `${config.mlServiceUrl}/api/ml/metrics`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/api/ml/metrics');
  }
}
