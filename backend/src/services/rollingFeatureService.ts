/**
 * Rolling Feature Calculation Service
 * backend/src/services/rollingFeatureService.ts
 *
 * Implements causal trailing 3-batch rolling weather averages strictly before
 * the target batch's date, exactly matching the preprocessing.py specification:
 * - Query: Batches for factoryId where batch_date < targetDate ORDER BY batch_date DESC LIMIT 3
 * - Behavior: min_periods=1 (averages 1, 2, or 3 prior rows).
 * - If 0 prior rows exist, returns { rolling_humidity_3batch: null, rolling_ambient_temp_3batch: null }
 *   so the ML service applies its own documented historical dataset fallback.
 */

import { prisma } from '../config/database';

export interface RollingFeaturesResult {
  rolling_humidity_3batch: number | null;
  rolling_ambient_temp_3batch: number | null;
  prior_batches_count: number;
}

/**
 * Computes causal trailing rolling weather averages for a specific factory
 * strictly prior to the current batch date.
 *
 * @param factoryId Factory identifier string (e.g. 'Factory_H')
 * @param batchDate Date of the current batch (strictly non-inclusive upper bound)
 */
export async function computeRollingFeatures(
  factoryId: string,
  batchDate: Date
): Promise<RollingFeaturesResult> {
  const priorBatches = await prisma.batch.findMany({
    where: {
      factory_id: factoryId,
      batch_date: {
        lt: batchDate,
      },
    },
    orderBy: {
      batch_date: 'desc',
    },
    take: 3,
    select: {
      relative_humidity_pct: true,
      ambient_temperature_c: true,
      batch_date: true,
      batch_id: true,
    },
  });

  if (priorBatches.length === 0) {
    return {
      rolling_humidity_3batch: null,
      rolling_ambient_temp_3batch: null,
      prior_batches_count: 0,
    };
  }

  const sumHumidity = priorBatches.reduce((acc, b) => acc + b.relative_humidity_pct, 0);
  const sumAmbientTemp = priorBatches.reduce((acc, b) => acc + b.ambient_temperature_c, 0);

  const avgHumidity = sumHumidity / priorBatches.length;
  const avgAmbientTemp = sumAmbientTemp / priorBatches.length;

  return {
    rolling_humidity_3batch: Math.round(avgHumidity * 10000) / 10000,
    rolling_ambient_temp_3batch: Math.round(avgAmbientTemp * 10000) / 10000,
    prior_batches_count: priorBatches.length,
  };
}
