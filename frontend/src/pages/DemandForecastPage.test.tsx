/**
 * React Unit Test for DemandForecastPage
 * frontend/src/pages/DemandForecastPage.test.tsx
 *
 * Verifies that the real page component renders dynamic metrics from /metrics
 * using intentionally distinct mock numbers (Condition 3 & 8).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemandForecastPage } from './DemandForecastPage';
import * as m1DemandService from '../services/m1DemandService';

vi.mock('../services/m1DemandService', () => ({
  fetchDemandForecast: vi.fn(),
  fetchDemandModel: vi.fn(),
  fetchDemandMetrics: vi.fn(),
  DemandApiError: class DemandApiError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

describe('DemandForecastPage Dynamic Metrics Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock with intentionally DIFFERENT numbers from real verified ones (Condition 3 & 8)
    const distinctMetrics = {
      success: true,
      model_version: 'test-v9',
      backtest_metrics: {
        evaluation_protocol: 'Mock Protocol',
        n_origins: 999,
        mae: 8.88,
        rmse: 7.77,
        mape_pct: 12.34,
        bias_mn_kg: 9.99,
      },
      interval_calibration: {},
      observed_backtest_coverage: {
        n_origins: 777,
        n_test_origins: 111,
        nominal_80_overall_pct: 42.1,
        nominal_80_test_phase_pct: 35.7,
        nominal_90_overall_pct: 61.2,
        nominal_90_test_phase_pct: 58.4,
        nominal_50_overall_pct: 28.9,
        nominal_50_test_phase_pct: 19.4,
      },
      bias_and_asymmetry: {
        n_pooled_origins: 999,
        n_test_origins: 111,
        n_fixed_offset_errors: 999,
        pooled_bias_mn_kg: 9.99,
        test_phase_2023_2024_bias_mn_kg: 5.55,
        share_actuals_below_point_forecast_pooled_pct: 42.1,
        share_actuals_below_point_forecast_test_phase_pct: 33.3,
        interval_symmetry: 'asymmetric test',
        sign_convention: 'point forecast + offset: lower_bound = max(0, point_pred + lower_offset_mn_kg), upper_bound = point_pred + upper_offset_mn_kg',
        asymmetry_offsets: {
          nominal_50: { lower_offset_mn_kg: -1.23, upper_offset_mn_kg: 0.45 },
          nominal_80: { lower_offset_mn_kg: -2.34, upper_offset_mn_kg: 1.56 },
          nominal_90: { lower_offset_mn_kg: -3.45, upper_offset_mn_kg: 2.67 },
        },
        protocol_note: 'test protocol note',
      },
      known_limitations: ['test limitation'],
    };

    const mockForecast = {
      success: true,
      model_version: 'test-v9',
      latest_actual_month: '2024-12',
      disclaimer: 'Mocked dynamic backend disclaimer test.',
      warnings: ['Mock warning: test direct 12m lag'],
      overrides_applied: [],
      predictions: [
        {
          target_month: '2025-01',
          forecast_origin_month: '2024-01',
          data_cutoff_used: '2024-12',
          horizon_months: 12,
          point_forecast_mn_kg: 25.5,
          uses_appended_data: false,
          interval_50: { lower_mn_kg: 24.27, upper_mn_kg: 25.95, width_mn_kg: 1.68, nominal_coverage_pct: 50 },
          interval_80: { lower_mn_kg: 23.16, upper_mn_kg: 27.06, width_mn_kg: 3.90, nominal_coverage_pct: 80 },
          component_forecasts: { seasonal_mean_3yr_mn_kg: 25.0, ets_mn_kg: 25.5, xgboost_mn_kg: 26.0 },
        },
      ],
    };

    const mockModel = {
      success: true,
      model_name: 'test_champion',
      model_version: 'test-v9',
      model_architecture: 'Mock Ensemble',
      training_date_utc: '2026-10-21T00:00:00Z',
      data_cutoff_date: '2024-12',
      cleaned_data_sha256: 'abc123sha',
      features: ['f1', 'f2'],
      hyperparameters: {},
      protocol: 'test protocol',
      status: 'ready',
    };

    vi.mocked(m1DemandService.fetchDemandMetrics).mockResolvedValue(distinctMetrics as any);
    vi.mocked(m1DemandService.fetchDemandForecast).mockResolvedValue(mockForecast as any);
    vi.mocked(m1DemandService.fetchDemandModel).mockResolvedValue(mockModel as any);
  });

  it('renders all distinct dynamic numbers from /metrics without any hardcoded values', async () => {
    render(
      <MemoryRouter>
        <DemandForecastPage />
      </MemoryRouter>
    );

    // Wait for async loads to complete
    await waitFor(() => {
      expect(screen.getByTestId('metric-pooled-bias')).toBeDefined();
    });

    // 1. Assert MAE and RMSE reflect mocked numbers (8.88 and 7.77)
    const maeEl = screen.getByTestId('metric-mae');
    expect(maeEl.textContent).toContain('8.880 Mn kg');

    const rmseEl = screen.getByTestId('metric-rmse');
    expect(rmseEl.textContent).toContain('7.770 Mn kg');

    const rmseNEl = screen.getByTestId('metric-rmse-n');
    expect(rmseNEl.textContent).toContain('n=999');

    // 2. Assert Bias reflects mocked numbers (+9.99 and +5.55)
    const pooledBiasEl = screen.getByTestId('metric-pooled-bias');
    expect(pooledBiasEl.textContent).toContain('+9.99 Mn kg');

    const testBiasEl = screen.getByTestId('metric-test-bias');
    expect(testBiasEl.textContent).toContain('+5.55 Mn kg');

    // 3. Assert share of actuals below forecast reflects mocked numbers (42.1% and 33.3%)
    const sharePooledEl = screen.getByTestId('metric-share-below-pooled');
    expect(sharePooledEl.textContent).toContain('42.1%');

    const shareTestEl = screen.getByTestId('metric-share-below-test');
    expect(shareTestEl.textContent).toContain('33.3%');

    // 4. Assert Observed Coverages reflect mocked numbers (42.1%, 35.7%, 28.9%, 61.2%)
    expect(screen.getByTestId('metric-cov80-overall').textContent).toContain('42.1%');
    expect(screen.getByTestId('metric-cov80-test').textContent).toContain('35.7%');
    expect(screen.getByTestId('metric-cov50-overall').textContent).toContain('28.9%');
    expect(screen.getByTestId('metric-cov90-overall').textContent).toContain('61.2%');

    // 5. Assert Asymmetry Offsets reflect mocked numbers ([-2.34, +1.56])
    expect(screen.getByTestId('offset-80').textContent).toContain('[-2.34, +1.56]');
    expect(screen.getByTestId('offset-50').textContent).toContain('[-1.23, +0.45]');
    expect(screen.getByTestId('offset-90').textContent).toContain('[-3.45, +2.67]');

    // 6. Assert non-dismissible retrospective demo banner is rendered for past dates
    const retroBanner = screen.getByTestId('banner-retrospective-demo');
    expect(retroBanner).toBeDefined();
    expect(retroBanner.textContent).toContain('Retrospective demo: model data ends 2024-12');

    // 7. Assert direct 12-month model note is present
    expect(screen.getByTestId('note-direct-12m')).toBeDefined();
  });
});
