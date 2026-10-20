/**
 * M1 Tea Export Demand Forecast Routes
 * backend/src/routes/m1Demand.routes.ts
 *
 * Maps Express endpoints:
 * - GET /api/demand-forecast: Query forecast for date range (?from=YYYY-MM&to=YYYY-MM)
 * - GET /api/demand-forecast/model: Model metadata and configuration
 * - GET /api/demand-forecast/metrics: Backtest metrics and calibration details
 */

import { Router } from 'express';
import {
  getDemandForecast,
  getDemandModel,
  getDemandMetrics,
} from '../controllers/m1Demand.controller';

const router = Router();

router.get('/', getDemandForecast);
router.get('/model', getDemandModel);
router.get('/metrics', getDemandMetrics);

export default router;
