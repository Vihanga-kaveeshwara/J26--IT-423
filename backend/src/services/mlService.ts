/**
 * ML Service HTTP Client
 * backend/src/services/mlService.ts
 *
 * Typed client communicating with the FastAPI M2 ML Serving Layer.
 * Handles /predict, /explain, /economic-impact, /whatif, and /health.
 *
 * Error Handling:
 * - Connection failures / timeouts -> MLServiceUnavailableError (clean 503)
 * - 400 validation errors (e.g. invalid lever in what-if) -> MLValidationError (clean 400 forwarded)
 */

import axios, { AxiosError } from 'axios';
import { config } from '../config/env';
import { MLServiceUnavailableError, MLValidationError, AppError } from '../utils/errors';

export interface MLBatchOperationalData {
  green_leaf_input_kg: number;
  withering_duration_hrs: number;
  dryer_temperature_c: number;
  machine_downtime_hrs?: number;
  plucking_fine_leaf_pct: number;
  relative_humidity_pct: number;
  ambient_temperature_c: number;
  region: string;
  tea_grade_produced: string;
  season?: string | null;
  month?: number | null;
  rolling_humidity_3batch?: number | null;
  rolling_ambient_temp_3batch?: number | null;
}

export interface MLPredictResponse {
  success: boolean;
  predicted_refuse_tea_pct: number;
  latency_ms: number;
  used_fallback_rolling_features: boolean;
  feature_vector?: Record<string, number>;
}

export interface FeatureAttribution {
  feature: string;
  feature_value: number;
  shap_value_pp: number;
  contribution: string;
}

export interface MitigationAdvice {
  feature: string;
  feature_value: number;
  shap_value_pp: number;
  severity: string;
  category: string;
  recommendation: string;
}

export interface MLExplainResponse {
  success: boolean;
  predicted_refuse_tea_pct: number;
  base_value_pct: number;
  top_features: FeatureAttribution[];
  mitigations: MitigationAdvice[];
  latency_ms: number;
  used_fallback_rolling_features: boolean;
}

export interface MLEconomicImpactRequest {
  green_leaf_input_kg: number;
  predicted_refuse_pct: number;
  tea_grade_produced: string;
  refuse_resale_status: string;
  total_dry_tea_kg?: number | null;
}

export interface MLEconomicImpactResponse {
  success: boolean;
  mode: string;
  green_leaf_input_kg: number;
  predicted_refuse_pct: number;
  total_dry_tea_kg: number;
  yield_ratio_used: number;
  estimated_refuse_tea_kg: number;
  tea_grade_produced: string;
  good_tea_price_per_kg: number;
  refuse_resale_status: string;
  is_recovered: boolean;
  recovered_price_per_kg: number;
  net_loss_per_kg: number;
  gross_revenue_loss_lkr: number;
  recovered_revenue_lkr: number;
  revenue_loss_lkr: number;
  disclaimer: string;
}

export interface MLWhatIfRequest extends MLBatchOperationalData {
  overrides: Record<string, number>;
  refuse_resale_status?: string;
  total_dry_tea_kg?: number | null;
}

export interface MLWhatIfEconomicSummary {
  base_revenue_loss_lkr: number;
  simulated_revenue_loss_lkr: number;
  simulated_savings_lkr: number;
  savings_pct_of_loss: number;
}

export interface MLWhatIfResponse {
  success: boolean;
  baseline_predicted_refuse_pct: number;
  simulated_predicted_refuse_pct: number;
  delta_refuse_pct: number;
  direction: string;
  overrides_applied: Record<string, number>;
  derived_features_updated: Record<string, any>;
  out_of_distribution_warning: boolean;
  out_of_distribution_details: string[];
  economic_impact?: MLWhatIfEconomicSummary | null;
  disclaimer: string;
  latency_ms: number;
  used_fallback_rolling_features: boolean;
}

const DEFAULT_TIMEOUT_MS = 10000;

function handleAxiosError(error: any, endpoint: string): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data;
      const detail = data?.detail || data?.message || data;

      if (status === 400 || status === 422) {
        const errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new MLValidationError(errorMsg, detail);
      }

      if (status === 503) {
        throw new MLServiceUnavailableError(
          typeof detail === 'string' ? detail : 'ML service is currently unavailable',
          detail
        );
      }

      throw new AppError(
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
      throw new MLServiceUnavailableError(
        `ML service is unavailable at ${config.mlServiceUrl} (${axiosErr.code || axiosErr.message})`
      );
    }
  }

  if (error instanceof AppError) {
    throw error;
  }

  throw new MLServiceUnavailableError(`ML service request failed: ${error?.message || String(error)}`);
}

/**
 * Check ML service health status
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.mlServiceUrl}/health`, {
      timeout: 3000,
    });
    return response.status === 200 && response.data?.status === 'healthy';
  } catch (error) {
    try {
      const fallback = await axios.get(`${config.mlServiceUrl}/api/ml/health`, {
        timeout: 3000,
      });
      return fallback.data?.success === true;
    } catch {
      return false;
    }
  }
}

/**
 * Call ML /predict endpoint
 */
export async function predictRefuseTea(data: MLBatchOperationalData): Promise<MLPredictResponse> {
  try {
    const response = await axios.post<MLPredictResponse>(
      `${config.mlServiceUrl}/predict`,
      data,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/predict');
  }
}

/**
 * Call ML /explain endpoint
 */
export async function explainRefuseTea(data: MLBatchOperationalData): Promise<MLExplainResponse> {
  try {
    const response = await axios.post<MLExplainResponse>(
      `${config.mlServiceUrl}/explain`,
      data,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/explain');
  }
}

/**
 * Call ML /economic-impact endpoint
 */
export async function calculateEconomicImpact(data: MLEconomicImpactRequest): Promise<MLEconomicImpactResponse> {
  try {
    const response = await axios.post<MLEconomicImpactResponse>(
      `${config.mlServiceUrl}/economic-impact`,
      data,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/economic-impact');
  }
}

/**
 * Call ML /whatif endpoint
 */
export async function runWhatIfSimulation(data: MLWhatIfRequest): Promise<MLWhatIfResponse> {
  try {
    const response = await axios.post<MLWhatIfResponse>(
      `${config.mlServiceUrl}/whatif`,
      data,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error, '/whatif');
  }
}
