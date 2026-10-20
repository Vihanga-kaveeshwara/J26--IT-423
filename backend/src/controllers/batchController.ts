/**
 * Batch Controller
 * backend/src/controllers/batchController.ts
 *
 * Implements M2 integration workflows:
 * - POST /api/batches: Causal rolling feature computation -> predict -> explain -> economic impact -> persist
 * - GET /api/batches: Paginated, filtered list of batches
 * - GET /api/batches/:id: Retrieve single batch by UUID or batch_id
 * - POST /api/batches/:id/whatif: Constrained counterfactual simulation for a stored batch
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { computeRollingFeatures } from '../services/rollingFeatureService';
import {
  predictRefuseTea,
  explainRefuseTea,
  calculateEconomicImpact,
  runWhatIfSimulation,
  MLBatchOperationalData,
  MLWhatIfRequest,
} from '../services/mlService';
import { AppError, NotFoundError } from '../utils/errors';

/**
 * Helper to look up a batch either by UUID id or batch_id string.
 */
async function findBatchByIdOrCode(idOrCode: string) {
  let batch = await prisma.batch.findUnique({
    where: { id: idOrCode },
  });

  if (!batch) {
    batch = await prisma.batch.findUnique({
      where: { batch_id: idOrCode },
    });
  }

  return batch;
}

/**
 * POST /api/batches
 * Accepts raw operational batch parameters, calculates causal trailing weather features,
 * calls ML predict, explain, and economic impact, persists the record, and returns results.
 */
export async function createBatch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      batch_id,
      factory_id,
      region,
      elevation_band,
      batch_date,
      green_leaf_input_kg,
      withering_duration_hrs,
      dryer_temperature_c,
      machine_downtime_hrs,
      plucking_fine_leaf_pct,
      relative_humidity_pct,
      ambient_temperature_c,
      tea_grade_produced,
      refuse_resale_status,
      season,
      month,
      total_dry_tea_kg,
    } = req.body;

    // Validate required fields
    if (!factory_id || !region || !tea_grade_produced) {
      throw new AppError(400, 'factory_id, region, and tea_grade_produced are required');
    }

    if (
      green_leaf_input_kg == null ||
      withering_duration_hrs == null ||
      dryer_temperature_c == null ||
      plucking_fine_leaf_pct == null ||
      relative_humidity_pct == null ||
      ambient_temperature_c == null
    ) {
      throw new AppError(
        400,
        'Missing operational inputs: green_leaf_input_kg, withering_duration_hrs, dryer_temperature_c, plucking_fine_leaf_pct, relative_humidity_pct, and ambient_temperature_c are required'
      );
    }

    const parsedBatchDate = batch_date ? new Date(batch_date) : new Date();
    if (isNaN(parsedBatchDate.getTime())) {
      throw new AppError(400, `Invalid batch_date format: ${batch_date}`);
    }

    const assignedBatchId =
      batch_id || `BATCH-${factory_id.toUpperCase().replace(/\s+/g, '_')}-${Date.now()}`;

    // 1. Compute rolling weather features strictly before batchDate (causal constraint)
    const rolling = await computeRollingFeatures(String(factory_id), parsedBatchDate);

    const derivedMonth = month ? Number(month) : parsedBatchDate.getMonth() + 1;

    // 2. Build payload for ML inference
    const operationalData: MLBatchOperationalData = {
      green_leaf_input_kg: Number(green_leaf_input_kg),
      withering_duration_hrs: Number(withering_duration_hrs),
      dryer_temperature_c: Number(dryer_temperature_c),
      machine_downtime_hrs: Number(machine_downtime_hrs ?? 0.0),
      plucking_fine_leaf_pct: Number(plucking_fine_leaf_pct),
      relative_humidity_pct: Number(relative_humidity_pct),
      ambient_temperature_c: Number(ambient_temperature_c),
      region: String(region),
      tea_grade_produced: String(tea_grade_produced),
      season: season ? String(season) : null,
      month: derivedMonth,
      rolling_humidity_3batch: rolling.rolling_humidity_3batch,
      rolling_ambient_temp_3batch: rolling.rolling_ambient_temp_3batch,
    };

    // 3. Call ML /predict
    const predictResult = await predictRefuseTea(operationalData);

    // 4. Call ML /explain (same operational input)
    const explainResult = await explainRefuseTea(operationalData);

    // 5. Call ML /economic-impact
    const resaleStatus = refuse_resale_status || 'DISCARDED';
    const economicResult = await calculateEconomicImpact({
      green_leaf_input_kg: operationalData.green_leaf_input_kg,
      predicted_refuse_pct: predictResult.predicted_refuse_tea_pct,
      tea_grade_produced: operationalData.tea_grade_produced,
      refuse_resale_status: resaleStatus,
      total_dry_tea_kg: total_dry_tea_kg ? Number(total_dry_tea_kg) : null,
    });

    // 6. Persist combined record to PostgreSQL batches table
    const created = await prisma.batch.create({
      data: {
        batch_id: assignedBatchId,
        factory_id: String(factory_id),
        region: String(region),
        elevation_band: elevation_band ? String(elevation_band) : null,
        batch_date: parsedBatchDate,
        month: derivedMonth,
        season: operationalData.season,
        source: 'operator_submitted',
        green_leaf_input_kg: operationalData.green_leaf_input_kg,
        withering_duration_hrs: operationalData.withering_duration_hrs,
        dryer_temperature_c: operationalData.dryer_temperature_c,
        machine_downtime_hrs: operationalData.machine_downtime_hrs,
        plucking_fine_leaf_pct: operationalData.plucking_fine_leaf_pct,
        relative_humidity_pct: operationalData.relative_humidity_pct,
        ambient_temperature_c: operationalData.ambient_temperature_c,
        tea_grade_produced: operationalData.tea_grade_produced,
        refuse_resale_status: resaleStatus,
        rolling_humidity_3batch: rolling.rolling_humidity_3batch,
        rolling_ambient_temp_3batch: rolling.rolling_ambient_temp_3batch,
        used_fallback_rolling_features: predictResult.used_fallback_rolling_features,
        predicted_refuse_tea_pct: predictResult.predicted_refuse_tea_pct,
        top_shap_drivers: explainResult.top_features as any,
        mitigations: explainResult.mitigations as any,
        economic_impact: economicResult as any,
      },
    });

    // 7. Return combined prediction + explanation + economic impact + used_fallback_rolling_features
    res.status(201).json({
      success: true,
      data: created,
      prediction: {
        predicted_refuse_tea_pct: predictResult.predicted_refuse_tea_pct,
        used_fallback_rolling_features: predictResult.used_fallback_rolling_features,
        rolling_humidity_3batch: rolling.rolling_humidity_3batch,
        rolling_ambient_temp_3batch: rolling.rolling_ambient_temp_3batch,
        prior_batches_count: rolling.prior_batches_count,
        latency_ms: predictResult.latency_ms,
      },
      explanation: {
        base_value_pct: explainResult.base_value_pct,
        top_features: explainResult.top_features,
        mitigations: explainResult.mitigations,
        latency_ms: explainResult.latency_ms,
      },
      economic_impact: economicResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches
 * Paginated list of batches with optional filtering by factory_id, region, source, and date range.
 */
export async function getBatches(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;

    const { factory_id, region, source, start_date, end_date } = req.query;

    const where: any = {};

    if (factory_id) {
      where.factory_id = String(factory_id);
    }
    if (region) {
      where.region = String(region);
    }
    if (source) {
      where.source = String(source);
    }

    if (start_date || end_date) {
      where.batch_date = {};
      if (start_date) {
        where.batch_date.gte = new Date(String(start_date));
      }
      if (end_date) {
        where.batch_date.lte = new Date(String(end_date));
      }
    }

    const [total, batches] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        orderBy: { batch_date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: batches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/:id
 * Retrieve a single batch by UUID or batch_id.
 */
export async function getBatchById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);
    const batch = await findBatchByIdOrCode(id);

    if (!batch) {
      throw new NotFoundError(`Batch not found with id or code: ${id}`);
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/batches/:id/whatif
 * Re-predicts counterfactual process adjustments for a stored batch.
 * Passes the batch's raw baseline values, overrides from req.body, and returns simulation.
 */
export async function runBatchWhatIf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);
    const { overrides } = req.body;

    if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
      throw new AppError(
        400,
        'Request body must include an "overrides" dictionary with at least one controllable lever.'
      );
    }

    const batch = await findBatchByIdOrCode(id);
    if (!batch) {
      throw new NotFoundError(`Batch not found with id or code: ${id}`);
    }

    // Determine rolling weather features: use stored values or compute if absent
    let rollingHumidity = batch.rolling_humidity_3batch;
    let rollingTemp = batch.rolling_ambient_temp_3batch;
    if (rollingHumidity == null || rollingTemp == null) {
      const computed = await computeRollingFeatures(batch.factory_id, batch.batch_date);
      rollingHumidity = computed.rolling_humidity_3batch;
      rollingTemp = computed.rolling_ambient_temp_3batch;
    }

    const totalDry =
      batch.made_tea_output_kg && batch.refuse_tea_kg
        ? batch.made_tea_output_kg + batch.refuse_tea_kg
        : null;

    const whatifPayload: MLWhatIfRequest = {
      green_leaf_input_kg: batch.green_leaf_input_kg,
      withering_duration_hrs: batch.withering_duration_hrs,
      dryer_temperature_c: batch.dryer_temperature_c,
      machine_downtime_hrs: batch.machine_downtime_hrs,
      plucking_fine_leaf_pct: batch.plucking_fine_leaf_pct,
      relative_humidity_pct: batch.relative_humidity_pct,
      ambient_temperature_c: batch.ambient_temperature_c,
      region: batch.region,
      tea_grade_produced: batch.tea_grade_produced,
      season: batch.season,
      month: batch.month,
      rolling_humidity_3batch: rollingHumidity,
      rolling_ambient_temp_3batch: rollingTemp,
      refuse_resale_status: batch.refuse_resale_status,
      total_dry_tea_kg: totalDry,
      overrides,
    };

    const simulation = await runWhatIfSimulation(whatifPayload);

    res.json({
      success: true,
      batch_id: batch.batch_id,
      simulation,
    });
  } catch (error) {
    next(error);
  }
}
