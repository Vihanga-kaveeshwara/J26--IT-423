/**
 * M1 Demand Forecasting Backend Test Suite
 * backend/src/scripts/testM1Demand.ts
 *
 * Tests the M1 Demand Forecast endpoints and service error handling:
 * 1. Validation errors (invalid date format, invalid order, range > 12 months) -> 400
 * 2. Success flow (mocking ML service response) -> 200 with unchanged data + meta block
 * 3. ML Service down (503 response with descriptive message)
 * 4. 422 Passthrough (Pydantic validation failure forwarded cleanly)
 * 5. Metadata endpoints (/model and /metrics) -> 200
 */

import http from 'http';
import axios from 'axios';
import { createApp } from '../app';
import { config } from '../config/env';

// Dummy ML Service mock response payloads
const mockPredictDemandResponse = {
  success: true,
  model_version: 'm1_demand_forecast_v1',
  latest_actual_month: '2024-12',
  disclaimer:
    'Advisory demand forecasts based on direct 12-month model (forecast origin is 12 months prior).',
  warnings: [
    'Direct 12-month lag forecast: each month is predicted from actual data 12 months prior.',
  ],
  overrides_applied: [],
  predictions: [
    {
      target_month: '2025-01',
      forecast_origin_month: '2024-01',
      data_cutoff_used: '2024-12',
      horizon_months: 12,
      point_forecast_mn_kg: 21.4,
      uses_appended_data: false,
      interval_50: {
        lower_mn_kg: 19.8,
        upper_mn_kg: 23.0,
        width_mn_kg: 3.2,
        nominal_coverage_pct: 50.0,
      },
      interval_80: {
        lower_mn_kg: 18.2,
        upper_mn_kg: 24.6,
        width_mn_kg: 6.4,
        nominal_coverage_pct: 80.0,
      },
      component_forecasts: {
        seasonal_mean_3yr_mn_kg: 21.2,
        ets_mn_kg: 21.5,
        xgboost_mn_kg: 21.4,
      },
    },
    {
      target_month: '2025-02',
      forecast_origin_month: '2024-02',
      data_cutoff_used: '2024-12',
      horizon_months: 12,
      point_forecast_mn_kg: 22.1,
      uses_appended_data: false,
      interval_50: {
        lower_mn_kg: 20.5,
        upper_mn_kg: 23.7,
        width_mn_kg: 3.2,
        nominal_coverage_pct: 50.0,
      },
      interval_80: {
        lower_mn_kg: 18.9,
        upper_mn_kg: 25.3,
        width_mn_kg: 6.4,
        nominal_coverage_pct: 80.0,
      },
      component_forecasts: {
        seasonal_mean_3yr_mn_kg: 21.9,
        ets_mn_kg: 22.2,
        xgboost_mn_kg: 22.1,
      },
    },
    {
      target_month: '2025-03',
      forecast_origin_month: '2024-03',
      data_cutoff_used: '2024-12',
      horizon_months: 12,
      point_forecast_mn_kg: 23.5,
      uses_appended_data: false,
      interval_50: {
        lower_mn_kg: 21.9,
        upper_mn_kg: 25.1,
        width_mn_kg: 3.2,
        nominal_coverage_pct: 50.0,
      },
      interval_80: {
        lower_mn_kg: 20.3,
        upper_mn_kg: 26.7,
        width_mn_kg: 6.4,
        nominal_coverage_pct: 80.0,
      },
      component_forecasts: {
        seasonal_mean_3yr_mn_kg: 23.1,
        ets_mn_kg: 23.6,
        xgboost_mn_kg: 23.5,
      },
    },
  ],
};

const mockModelInfoResponse = {
  success: true,
  model_name: 'tea_demand_forecast_champion',
  model_version: 'm1_demand_forecast_v1',
  model_architecture: 'Equal-weight ensemble (Seasonal Mean 3yr + ETS + XGBoost)',
  training_date_utc: '2026-10-20T19:00:00Z',
  data_cutoff_date: '2024-12',
  cleaned_data_sha256: '9a9b1c2d3e4f',
  features: ['lag_12', 'lag_13', 'lag_24', 'rolling_mean_3', 'rolling_mean_12'],
  hyperparameters: { max_depth: 3, n_estimators: 100 },
  protocol: 'direct_12m_step_ahead',
  status: 'production_ready',
};

const mockMetricsResponse = {
  success: true,
  model_version: '1.0.0',
  backtest_metrics: {
    evaluation_protocol: 'Direct 12-month-ahead rolling origin (2012-2024, 152 origins)',
    n_origins: 152,
    mae: 1.73426,
    rmse: 2.2366,
    mape_pct: 8.05,
    bias_mn_kg: 0.7477,
  },
  interval_calibration: {
    variant: 'a_expanding_window_empirical_quantiles',
  },
  observed_backtest_coverage: {
    n_origins: 81,
    n_test_origins: 23,
    nominal_80_overall_pct: 67.9,
    nominal_80_test_phase_pct: 60.9,
    nominal_90_overall_pct: 79.0,
    nominal_90_test_phase_pct: 78.3,
    nominal_50_overall_pct: 51.9,
    nominal_50_test_phase_pct: 39.1,
  },
  bias_and_asymmetry: {
    n_pooled_origins: 152,
    n_test_origins: 23,
    n_fixed_offset_errors: 152,
    pooled_bias_mn_kg: 0.75,
    test_phase_2023_2024_bias_mn_kg: 1.77,
    share_actuals_below_point_forecast_pooled_pct: 63.8,
    share_actuals_below_point_forecast_test_phase_pct: 78.3,
    interval_symmetry: 'asymmetric (calibrated via empirical error quantiles to adjust for positive over-forecast bias)',
    sign_convention: 'point forecast + offset: lower_bound = max(0, point_pred + lower_offset_mn_kg), upper_bound = point_pred + upper_offset_mn_kg (where signed error e = actual - forecast)',
    asymmetry_offsets: {
      nominal_50: { lower_offset_mn_kg: -1.97, upper_offset_mn_kg: 0.56 },
      nominal_80: { lower_offset_mn_kg: -3.25, upper_offset_mn_kg: 1.86 },
      nominal_90: { lower_offset_mn_kg: -4.16, upper_offset_mn_kg: 2.35 },
    },
    protocol_note: 'Direct h=12 forecasting: target T is forecast from data up to T-12 only.',
  },
  known_limitations: [
    'Model operates on direct 12-month lag.',
  ],
};

let mockMode: 'normal' | '422_error' | 'offline' = 'normal';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('Starting M1 Demand Forecasting Backend Test Suite');
  console.log('===============================================================\n');

  // 1. Start Mock ML Service
  const mockMlServer = http.createServer((req, res) => {
    if (mockMode === 'offline') {
      req.socket.destroy();
      return;
    }

    if (mockMode === '422_error') {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          detail: [
            {
              loc: ['body', 'target_months', 0],
              msg: 'Target month 2024-05 is earlier than minimum allowed origin window',
              type: 'value_error',
            },
          ],
        })
      );
      return;
    }

    if (req.method === 'POST' && req.url === '/api/ml/predict-demand') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockPredictDemandResponse));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/ml/model') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockModelInfoResponse));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/ml/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockMetricsResponse));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve) => mockMlServer.listen(0, '127.0.0.1', () => resolve()));
  const mockPort = (mockMlServer.address() as any).port;
  const mockMlUrl = `http://127.0.0.1:${mockPort}`;
  console.log(`Mock ML Service running on ${mockMlUrl}`);

  // Point config.mlServiceUrl to mock
  (config as any).mlServiceUrl = mockMlUrl;

  // 2. Start Express App
  const app = createApp();
  const expressServer = http.createServer(app);
  await new Promise<void>((resolve) => expressServer.listen(0, '127.0.0.1', () => resolve()));
  const appPort = (expressServer.address() as any).port;
  const backendBaseUrl = `http://127.0.0.1:${appPort}`;
  console.log(`Backend Express App running on ${backendBaseUrl}\n`);

  let passed = 0;
  let total = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] Check ${total}: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] Check ${total}: ${name}`);
      console.error('       Error:', err.message || err);
      throw err;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // Group 1: Input Validation Errors (400)
    // ------------------------------------------------------------------------
    console.log('--- 1. Validation Error Tests ---');

    await testCase('Reject invalid "from" month format (e.g. 2025/01)', async () => {
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025/01&to=2025-03`);
        throw new Error('Expected 400 Bad Request');
      } catch (err: any) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected status 400, got ${err.response?.status}`);
        }
        if (!err.response.data.error.includes('Invalid "from" month format')) {
          throw new Error(`Unexpected error message: ${err.response.data.error}`);
        }
      }
    });

    await testCase('Reject invalid "to" month format (e.g. 2025-13)', async () => {
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-01&to=2025-13`);
        throw new Error('Expected 400 Bad Request');
      } catch (err: any) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected status 400, got ${err.response?.status}`);
        }
        if (!err.response.data.error.includes('Invalid "to" month format')) {
          throw new Error(`Unexpected error message: ${err.response.data.error}`);
        }
      }
    });

    await testCase('Reject "from" month after "to" month (2025-05 > 2025-02)', async () => {
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-05&to=2025-02`);
        throw new Error('Expected 400 Bad Request');
      } catch (err: any) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected status 400, got ${err.response?.status}`);
        }
        if (!err.response.data.error.includes('cannot be after')) {
          throw new Error(`Unexpected error message: ${err.response.data.error}`);
        }
      }
    });

    await testCase('Reject horizon greater than 12 months (e.g. 14 months)', async () => {
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-01&to=2026-02`);
        throw new Error('Expected 400 Bad Request');
      } catch (err: any) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected status 400, got ${err.response?.status}`);
        }
        if (!err.response.data.error.includes('Maximum 12 months allowed')) {
          throw new Error(`Unexpected error message: ${err.response.data.error}`);
        }
      }
    });

    // ------------------------------------------------------------------------
    // Group 2: Successful Forecast & Metadata Calls (200)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Successful Inference & Metadata Tests ---');

    await testCase('GET /api/demand-forecast returns unchanged ML response plus meta block', async () => {
      const res = await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-01&to=2025-03`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = res.data;

      if (data.model_version !== 'm1_demand_forecast_v1') {
        throw new Error(`Unexpected model_version: ${data.model_version}`);
      }
      if (data.predictions.length !== 3) {
        throw new Error(`Expected 3 predictions, got ${data.predictions.length}`);
      }
      if (!data.meta || data.meta.from !== '2025-01' || data.meta.to !== '2025-03') {
        throw new Error(`Invalid meta block: ${JSON.stringify(data.meta)}`);
      }
      if (data.meta.requested_months_count !== 3) {
        throw new Error(`Invalid requested_months_count in meta: ${data.meta.requested_months_count}`);
      }
      if (!data.disclaimer || !data.latest_actual_month) {
        throw new Error('Missing disclaimer or latest_actual_month');
      }
    });

    await testCase('GET /api/demand-forecast defaults to next quarter (2025-01..2025-03)', async () => {
      const res = await axios.get(`${backendBaseUrl}/api/demand-forecast`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (res.data.meta.from !== '2025-01' || res.data.meta.to !== '2025-03') {
        throw new Error(`Default range incorrect: ${JSON.stringify(res.data.meta)}`);
      }
    });

    await testCase('GET /api/demand-forecast/model returns model architecture and metadata', async () => {
      const res = await axios.get(`${backendBaseUrl}/api/demand-forecast/model`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (res.data.model_name !== 'tea_demand_forecast_champion') {
        throw new Error(`Unexpected model_name: ${res.data.model_name}`);
      }
    });

    await testCase('GET /api/demand-forecast/metrics returns validation metrics & calibrations', async () => {
      const res = await axios.get(`${backendBaseUrl}/api/demand-forecast/metrics`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (Math.abs(res.data.backtest_metrics.mae - 1.73426) > 0.01) {
        throw new Error(`MAE mismatch: ${res.data.backtest_metrics.mae}`);
      }
      if (!res.data.observed_backtest_coverage || !res.data.bias_and_asymmetry) {
        throw new Error('Missing coverage or bias blocks');
      }
      if (res.data.backtest_metrics.n_origins !== 152) {
        throw new Error(`n_origins mismatch: ${res.data.backtest_metrics.n_origins}`);
      }
      if (!res.data.bias_and_asymmetry.asymmetry_offsets?.nominal_80) {
        throw new Error('Missing asymmetry_offsets for nominal_80');
      }
    });

    // ------------------------------------------------------------------------
    // Group 3: 422 Passthrough
    // ------------------------------------------------------------------------
    console.log('\n--- 3. 422 Passthrough Test ---');

    await testCase('Forward 422 Unprocessable Entity error detail from ML service', async () => {
      mockMode = '422_error';
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-01&to=2025-03`);
        throw new Error('Expected 422 Unprocessable Entity');
      } catch (err: any) {
        if (!err.response || err.response.status !== 422) {
          throw new Error(`Expected status 422, got ${err.response?.status}`);
        }
        if (!err.response.data.detail) {
          throw new Error('Missing detail in 422 passthrough response');
        }
      } finally {
        mockMode = 'normal';
      }
    });

    // ------------------------------------------------------------------------
    // Group 4: ML Service Down (503)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. ML Service Down (503) Test ---');

    await testCase('Return 503 with clear message when ML service is offline', async () => {
      // Point config.mlServiceUrl to an unopened port
      (config as any).mlServiceUrl = 'http://127.0.0.1:59999';
      try {
        await axios.get(`${backendBaseUrl}/api/demand-forecast?from=2025-01&to=2025-03`);
        throw new Error('Expected 503 Service Unavailable');
      } catch (err: any) {
        if (!err.response || err.response.status !== 503) {
          throw new Error(`Expected status 503, got ${err.response?.status}`);
        }
        if (!err.response.data.error.includes('unavailable')) {
          throw new Error(`Error message missing unavailable notice: ${err.response.data.error}`);
        }
      } finally {
        (config as any).mlServiceUrl = mockMlUrl;
      }
    });

    console.log('\n===============================================================');
    console.log(`ALL ${passed}/${total} BACKEND TESTS PASSED CLEANLY!`);
    console.log('===============================================================\n');
  } finally {
    mockMlServer.close();
    expressServer.close();
  }
}

runTestSuite().catch((e) => {
  console.error('Backend test failure:', e);
  process.exit(1);
});
