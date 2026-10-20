/**
 * Batch API Client Service
 * frontend/src/services/batchService.ts
 *
 * Typed client for M2 Refuse Tea Prediction endpoints:
 * - POST /batches (submit raw batch and run inference)
 * - GET /batches (paginated history list with filters)
 * - GET /batches/:id (single batch details with ML outputs)
 * - POST /batches/:id/whatif (constrained counterfactual simulation)
 */

import axios, { AxiosError } from 'axios';
import api from './api';
import {
  BatchInput,
  BatchCreationResponse,
  BatchListResponse,
  BatchDetailResponse,
  WhatIfOverrides,
  WhatIfResponse,
  BatchQueryFilter,
} from '../types/batch';

export class ApiError extends Error {
  public statusCode?: number;
  public isServiceUnavailable: boolean;
  public isNotFound: boolean;
  public isValidationError: boolean;
  public detail?: any;

  constructor(message: string, statusCode?: number, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.detail = detail;
    this.isServiceUnavailable = statusCode === 503;
    this.isNotFound = statusCode === 404;
    this.isValidationError = statusCode === 400 || statusCode === 422;
  }
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const detail = data?.detail || data?.error;

    if (status === 503) {
      throw new ApiError(
        'The ML prediction service is temporarily unavailable. Please verify the inference service is active and try again shortly.',
        503,
        detail
      );
    }

    if (status === 400 || status === 422) {
      const msg = typeof detail === 'string' ? detail : data?.message || 'Invalid batch parameters submitted.';
      throw new ApiError(msg, status, detail);
    }

    if (status === 404) {
      throw new ApiError(
        typeof detail === 'string' ? detail : 'The requested batch record was not found.',
        404,
        detail
      );
    }

    if (!axiosErr.response) {
      throw new ApiError(
        'Unable to reach the backend server. Please verify your network connection or server status.',
        503
      );
    }

    const fallbackMsg = typeof detail === 'string' ? detail : data?.message || axiosErr.message;
    throw new ApiError(fallbackMsg, status, detail);
  }

  if (error instanceof ApiError) {
    throw error;
  }

  throw new ApiError(
    error instanceof Error ? error.message : 'An unexpected error occurred.',
    500
  );
}

/**
 * Submit raw batch data to run ML prediction, SHAP attribution, and economic impact.
 */
export async function submitBatch(input: BatchInput): Promise<BatchCreationResponse> {
  try {
    const response = await api.post<BatchCreationResponse>('/batches', input);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch paginated list of batches with optional filtering.
 */
export async function fetchBatches(filters?: BatchQueryFilter): Promise<BatchListResponse> {
  try {
    const params: Record<string, string | number> = {};
    if (filters?.factory_id) params.factory_id = filters.factory_id;
    if (filters?.region) params.region = filters.region;
    if (filters?.source) params.source = filters.source;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.page != null) params.page = filters.page;
    if (filters?.limit != null) params.limit = filters.limit;

    const response = await api.get<BatchListResponse>('/batches', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch a single batch record with its cached ML outputs by UUID or batch_id.
 */
export async function fetchBatchById(id: string): Promise<BatchDetailResponse> {
  try {
    const response = await api.get<BatchDetailResponse>(`/batches/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Run constrained counterfactual what-if simulation for a stored batch.
 */
export async function simulateBatchWhatIf(
  id: string,
  overrides: WhatIfOverrides
): Promise<WhatIfResponse> {
  try {
    const response = await api.post<WhatIfResponse>(
      `/batches/${encodeURIComponent(id)}/whatif`,
      { overrides }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
