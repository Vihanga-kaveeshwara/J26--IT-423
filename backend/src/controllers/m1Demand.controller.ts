/**
 * M1 Demand Forecasting Controller
 * backend/src/controllers/m1Demand.controller.ts
 *
 * Handles HTTP requests for M1 Tea Export Demand Forecasting:
 * - GET /api/demand-forecast: Generate forecasts for a month range (from, to) up to 12 months
 * - GET /api/demand-forecast/model: Model metadata and training configuration
 * - GET /api/demand-forecast/metrics: Backtest validation and calibration metrics
 */

import { Request, Response } from 'express';
import {
  predictDemand,
  getModelInfo,
  getMetrics,
  M1ServiceError,
} from '../services/m1DemandService';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Generate a list of YYYY-MM string months inclusive from start to end.
 */
export function generateMonthList(from: string, to: string): string[] {
  const [fromY, fromM] = from.split('-').map(Number);
  const [toY, toM] = to.split('-').map(Number);

  const months: string[] = [];
  let y = fromY;
  let m = fromM;

  while (y < toY || (y === toY && m <= toM)) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    months.push(`${y}-${mm}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return months;
}

/**
 * GET /api/demand-forecast
 * Query parameters:
 *   - from: YYYY-MM (e.g. "2025-01")
 *   - to: YYYY-MM (e.g. "2025-03")
 *
 * Defaults to 2025-01 through 2025-03 if not specified.
 * Validates format, chronological order, and enforces max 12 months.
 */
export async function getDemandForecast(req: Request, res: Response): Promise<void> {
  try {
    const fromQuery = req.query.from as string | undefined;
    const toQuery = req.query.to as string | undefined;

    // Default to next quarter if omitted
    const from = fromQuery ? fromQuery.trim() : '2025-01';
    const to = toQuery ? toQuery.trim() : '2025-03';

    // 1. Validate format
    if (!MONTH_REGEX.test(from)) {
      res.status(400).json({
        success: false,
        error: `Invalid "from" month format "${from}". Expected YYYY-MM (e.g. 2025-01)`,
      });
      return;
    }

    if (!MONTH_REGEX.test(to)) {
      res.status(400).json({
        success: false,
        error: `Invalid "to" month format "${to}". Expected YYYY-MM (e.g. 2025-12)`,
      });
      return;
    }

    // 2. Validate chronological order
    if (from > to) {
      res.status(400).json({
        success: false,
        error: `"from" month (${from}) cannot be after "to" month (${to})`,
      });
      return;
    }

    // 3. Generate consecutive target months
    const targetMonths = generateMonthList(from, to);

    // 4. Validate max 12 months
    if (targetMonths.length > 12) {
      res.status(400).json({
        success: false,
        error: `Requested range spans ${targetMonths.length} months. Maximum 12 months allowed per forecast request.`,
      });
      return;
    }

    // 5. Call ML service
    const mlResponse = await predictDemand(targetMonths);

    // 6. Return ML service response unchanged plus a small meta block
    res.json({
      ...mlResponse,
      meta: {
        from,
        to,
        requested_months_count: targetMonths.length,
        generated_at_utc: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof M1ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        detail: error.detail,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while fetching demand forecast',
    });
  }
}

/**
 * GET /api/demand-forecast/model
 * Fetches model info, training metadata, and architecture details.
 */
export async function getDemandModel(_req: Request, res: Response): Promise<void> {
  try {
    const modelInfo = await getModelInfo();
    res.json(modelInfo);
  } catch (error: any) {
    if (error instanceof M1ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        detail: error.detail,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while fetching model info',
    });
  }
}

/**
 * GET /api/demand-forecast/metrics
 * Fetches backtest validation metrics, interval calibrations, and bias observations.
 */
export async function getDemandMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getMetrics();
    res.json(metrics);
  } catch (error: any) {
    if (error instanceof M1ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        detail: error.detail,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while fetching metrics',
    });
  }
}
