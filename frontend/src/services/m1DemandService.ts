/**
 * M1 Demand Forecasting API Service
 * frontend/src/services/m1DemandService.ts
 *
 * Communicates with the Express backend endpoints:
 * - GET /demand-forecast (?from=YYYY-MM&to=YYYY-MM)
 * - GET /demand-forecast/model
 * - GET /demand-forecast/metrics
 */

import axios, { AxiosError } from 'axios';
import api from './api';
import {
  PredictDemandResponse,
  ModelInfoResponse,
  MetricsResponse,
} from '../types/demandForecast';

export class DemandApiError extends Error {
  public statusCode?: number;
  public isServiceUnavailable: boolean;
  public isValidationError: boolean;
  public detail?: any;

  constructor(message: string, statusCode?: number, detail?: any) {
    super(message);
    this.name = 'DemandApiError';
    this.statusCode = statusCode;
    this.detail = detail;
    this.isServiceUnavailable = statusCode === 503;
    this.isValidationError = statusCode === 400 || statusCode === 422;
  }
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const detail = data?.error || data?.detail || data?.message;

    if (status === 503) {
      throw new DemandApiError(
        typeof detail === 'string'
          ? detail
          : 'The demand forecasting service is temporarily unavailable or model file missing (503).',
        503,
        detail
      );
    }

    if (status === 400 || status === 422) {
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new DemandApiError(msg || 'Invalid forecast parameters provided.', status, detail);
    }

    if (!axiosErr.response) {
      throw new DemandApiError(
        'Unable to reach backend server. Please verify your connection or backend status.',
        503
      );
    }

    const fallback = typeof detail === 'string' ? detail : axiosErr.message;
    throw new DemandApiError(fallback, status, detail);
  }

  if (error instanceof DemandApiError) {
    throw error;
  }

  throw new DemandApiError(
    error instanceof Error ? error.message : 'An unexpected error occurred.',
    500
  );
}

/**
 * Fetch demand forecast for a specified month range.
 * Defaults to 2025-01..2025-03 if omitted.
 */
export async function fetchDemandForecast(
  from?: string,
  to?: string
): Promise<PredictDemandResponse> {
  try {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await api.get<PredictDemandResponse>('/demand-forecast', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch model metadata, architecture configuration, and training info.
 */
export async function fetchDemandModel(): Promise<ModelInfoResponse> {
  try {
    const response = await api.get<ModelInfoResponse>('/demand-forecast/model');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch backtest performance metrics, coverage stats, and asymmetry notes.
 */
export async function fetchDemandMetrics(): Promise<MetricsResponse> {
  try {
    const response = await api.get<MetricsResponse>('/demand-forecast/metrics');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
