/**
 * React Unit Test for DemandForecastPage
 * frontend/src/pages/DemandForecastPage.test.tsx
 *
 * Verifies the 3-Layer Structure for Non-Technical Users:
 * - Layer 1: Headline monthly predictions, likely ranges, and plain chart
 * - Layer 2: "How reliable is this?" card with status chip and zero jargon
 * - Layer 3: Collapsible Technical Details (closed by default, contains full metrics when expanded)
 * - Asserts distinct mocked metrics (bias: 9.99, mae: 8.88, coverage: 42.1%) appear in DOM
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('DemandForecastPage 3-Layer Architecture & Dynamic Metrics', () => {
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
          interval_90: { lower_mn_kg: 22.05, upper_mn_kg: 28.17, width_mn_kg: 6.12, nominal_coverage_pct: 90 },
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

  it('renders Layer 1 and Layer 2 in plain language, keeps technical section collapsed by default, and reveals dynamic metrics when expanded', async () => {
    render(
      <MemoryRouter>
        <DemandForecastPage />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId('layer-1-forecast')).toBeDefined();
    });

    // =========================================================================
    // 1. Layer 1 Assertions: Plain Language Headlines & Cards
    // =========================================================================
    // One-line explanation under title
    expect(screen.getByText('Each month is predicted from data 12 months earlier.')).toBeDefined();

    // Retrospective demo banner (1 short sentence)
    const retroBanner = screen.getByTestId('banner-retrospective-demo');
    expect(retroBanner).toBeDefined();
    expect(retroBanner.textContent).toContain('Demo using past data: model data ends 2024-12. These months are not future forecasts.');

    // Monthly Card format: "<Month>: about X mn kg. Likely range: L to U mn kg"
    expect(screen.getByText(/about 25\.50/i)).toBeDefined();
    expect(screen.getByText(/Likely range:/i)).toBeDefined();
    expect(screen.getByText(/23\.16 to 27\.06 mn kg/i)).toBeDefined();

    // =========================================================================
    // 2. Layer 2 Assertions: "How reliable is this?" Plain Card
    // =========================================================================
    const reliableCard = screen.getByTestId('card-how-reliable');
    expect(reliableCard).toBeDefined();

    // Status chip
    const statusChip = screen.getByTestId('chip-use-with-caution');
    expect(statusChip.textContent).toContain('Use with caution');

    // Sentence 1: Coverage (assert dynamic numbers 42.1% and 35.7%)
    const covSentence = screen.getByTestId('sentence-coverage');
    expect(covSentence.textContent).toContain('In past tests the real value fell inside this range about 42.1% of the time (about 35.7% in 2023-24), not the 80% it aims for.');

    // Sentence 2: Bias (assert dynamic numbers 9.99 mn kg and 5.55 mn kg)
    const biasSentence = screen.getByTestId('sentence-bias');
    expect(biasSentence.textContent).toContain('The model tends to forecast a bit too high: on average 9.99 mn kg (5.55 mn kg in 2023-24).');

    // Sentence 3: Error (assert dynamic numbers 8.88 mn kg and 12.3%)
    const errSentence = screen.getByTestId('sentence-error');
    expect(errSentence.textContent).toContain('Typical error is about 8.88 mn kg per month (12.3%).');

    // =========================================================================
    // 3. Layer 3 Assertions: Collapsed by Default, Expandable
    // =========================================================================
    // Initially, technical details content should NOT be in the DOM
    expect(screen.queryByTestId('technical-details-content')).toBeNull();

    const toggleBtn = screen.getByTestId('toggle-technical-details');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Expand Layer 3 by clicking the toggle
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    // Now technical details content must be visible in the DOM
    const techContent = screen.getByTestId('technical-details-content');
    expect(techContent).toBeDefined();

    // Full backend disclaimer
    const disclaimerEl = screen.getByTestId('text-backend-disclaimer');
    expect(disclaimerEl.textContent).toContain('Mocked dynamic backend disclaimer test.');

    // Direct 12-month model note
    expect(screen.getByTestId('note-direct-12m')).toBeDefined();

    // MAE, RMSE and sample size n
    expect(screen.getByTestId('metric-mae').textContent).toContain('8.880 Mn kg');
    expect(screen.getByTestId('metric-rmse').textContent).toContain('7.770 Mn kg');
    expect(screen.getByTestId('metric-rmse-n').textContent).toContain('n=999');

    // Detailed Bias & Coverage metrics inside technical section
    expect(screen.getByTestId('metric-pooled-bias').textContent).toContain('+9.99 Mn kg');
    expect(screen.getByTestId('metric-test-bias').textContent).toContain('+5.55 Mn kg');
    expect(screen.getByTestId('metric-share-below-pooled').textContent).toContain('42.1%');
    expect(screen.getByTestId('metric-share-below-test').textContent).toContain('33.3%');
    expect(screen.getByTestId('metric-cov80-overall').textContent).toContain('42.1%');
    expect(screen.getByTestId('metric-cov80-test').textContent).toContain('35.7%');
    expect(screen.getByTestId('metric-cov50-overall').textContent).toContain('28.9%');
    expect(screen.getByTestId('metric-cov90-overall').textContent).toContain('61.2%');

    // Asymmetry offsets
    expect(screen.getByTestId('offset-80').textContent).toContain('[-2.34, +1.56]');
    expect(screen.getByTestId('offset-50').textContent).toContain('[-1.23, +0.45]');
    expect(screen.getByTestId('offset-90').textContent).toContain('[-3.45, +2.67]');
  });
});
