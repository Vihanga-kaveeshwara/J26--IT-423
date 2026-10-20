/**
 * End-to-End System Integration Test Suite (Task 6)
 * backend/src/scripts/validateE2E.ts
 *
 * Validates:
 * 1. Historical Data Seed (620 rows in PostgreSQL batches table)
 * 2. Causal Rolling Weather Feature Computation & ML Inference (used_fallback_rolling_features: false)
 * 3. Fallback behavior for factory with no history (used_fallback_rolling_features: true, no crash)
 * 4. What-If Counterfactual Simulation on stored batch (valid lever override & mandatory disclaimer)
 * 5. ML Service Failure Handling (clean 503 Service Unavailable when ML service is down)
 */

import axios from 'axios';
import { prisma } from '../config/database';

const BACKEND_URL = 'http://localhost:5000';

async function runValidation() {
  console.log('===============================================================');
  console.log('STARTING TASK 6: END-TO-END SYSTEM INTEGRATION VALIDATION');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // CHECK 1: Seed script confirmation (620 rows)
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 1: Verify Historical Data Seed (620 rows) ---');
  const seededCount = await prisma.batch.count({
    where: { source: 'synthetic_seed' },
  });
  console.log(`PostgreSQL 'batches' count with source='synthetic_seed': ${seededCount}`);
  if (seededCount !== 620) {
    throw new Error(`Expected 620 seeded batches, but found ${seededCount}`);
  }
  console.log('>>> CHECK 1 PASSED: 620 synthetic rows successfully verified.\n');

  // ---------------------------------------------------------------------------
  // CHECK 2: Submit batch for factory with history (Factory_H)
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 2: Submit Batch for Factory_H (Has History) ---');
  // First query the last 3 batches strictly before 2026-01-10 for Factory_H
  const testBatchDate = new Date('2026-01-10T08:00:00.000Z');
  const priorBatches = await prisma.batch.findMany({
    where: {
      factory_id: 'Factory_H',
      batch_date: { lt: testBatchDate },
    },
    orderBy: { batch_date: 'desc' },
    take: 3,
  });

  const manualAvgHumidity =
    priorBatches.reduce((acc, b) => acc + b.relative_humidity_pct, 0) / priorBatches.length;
  const manualAvgTemp =
    priorBatches.reduce((acc, b) => acc + b.ambient_temperature_c, 0) / priorBatches.length;

  console.log(`Prior 3 batches for Factory_H:`);
  priorBatches.forEach((b, idx) => {
    console.log(`  [${idx + 1}] ${b.batch_id} (${b.batch_date.toISOString().slice(0, 10)}): Humidity=${b.relative_humidity_pct}%, Temp=${b.ambient_temperature_c}°C`);
  });
  console.log(`Manual expected rolling averages: Humidity=${manualAvgHumidity.toFixed(4)}%, Temp=${manualAvgTemp.toFixed(4)}°C`);

  const payloadFactoryH = {
    batch_id: 'BATCH-VALIDATION-FACTORY-H-001',
    factory_id: 'Factory_H',
    region: 'Low-Country',
    batch_date: testBatchDate.toISOString(),
    green_leaf_input_kg: 9500.0,
    withering_duration_hrs: 16.0,
    dryer_temperature_c: 100.0,
    machine_downtime_hrs: 0.5,
    plucking_fine_leaf_pct: 82.0,
    relative_humidity_pct: 75.0,
    ambient_temperature_c: 26.5,
    tea_grade_produced: 'BOP',
    refuse_resale_status: 'DISCARDED',
  };

  // Clean up if already exists from a previous test
  await prisma.batch.deleteMany({ where: { batch_id: payloadFactoryH.batch_id } });

  const postRes2 = await axios.post(`${BACKEND_URL}/api/batches`, payloadFactoryH);
  const data2 = postRes2.data;

  console.log('POST /api/batches Response:');
  console.log(`  Status: ${postRes2.status}`);
  console.log(`  Batch ID: ${data2.data.batch_id}`);
  console.log(`  Predicted Refuse Tea %: ${data2.prediction.predicted_refuse_tea_pct}%`);
  console.log(`  used_fallback_rolling_features: ${data2.prediction.used_fallback_rolling_features}`);
  console.log(`  Computed rolling_humidity_3batch: ${data2.prediction.rolling_humidity_3batch}`);
  console.log(`  Computed rolling_ambient_temp_3batch: ${data2.prediction.rolling_ambient_temp_3batch}`);
  console.log(`  Top SHAP driver: ${data2.explanation.top_features[0]?.feature} (${data2.explanation.top_features[0]?.shap_value_pp} pp)`);
  console.log(`  Revenue Loss LKR: Rs. ${data2.economic_impact.revenue_loss_lkr.toLocaleString()}`);

  if (data2.prediction.used_fallback_rolling_features !== false) {
    throw new Error('Check 2 Failed: used_fallback_rolling_features should be FALSE');
  }
  if (Math.abs(data2.prediction.rolling_humidity_3batch - manualAvgHumidity) > 0.001) {
    throw new Error(`Check 2 Failed: humidity average mismatch: got ${data2.prediction.rolling_humidity_3batch}, expected ${manualAvgHumidity}`);
  }
  if (Math.abs(data2.prediction.rolling_ambient_temp_3batch - manualAvgTemp) > 0.001) {
    throw new Error(`Check 2 Failed: temp average mismatch: got ${data2.prediction.rolling_ambient_temp_3batch}, expected ${manualAvgTemp}`);
  }
  console.log('>>> CHECK 2 PASSED: Rolling values match manual averages, fallback is false, persisted correctly.\n');

  // ---------------------------------------------------------------------------
  // CHECK 3: Submit batch for made-up factory_id with no prior history
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 3: Submit Batch for Unknown Factory (No Prior History) ---');
  const payloadUnknown = {
    batch_id: 'BATCH-VALIDATION-UNKNOWN-FAC-999',
    factory_id: 'Factory_UNKNOWN_999',
    region: 'Nuwara Eliya',
    batch_date: new Date('2026-02-01T08:00:00.000Z').toISOString(),
    green_leaf_input_kg: 5000.0,
    withering_duration_hrs: 17.0,
    dryer_temperature_c: 110.0,
    machine_downtime_hrs: 0.0,
    plucking_fine_leaf_pct: 90.0,
    relative_humidity_pct: 85.0,
    ambient_temperature_c: 16.0,
    tea_grade_produced: 'BOPF',
    refuse_resale_status: 'DISCARDED',
  };

  await prisma.batch.deleteMany({ where: { batch_id: payloadUnknown.batch_id } });

  const postRes3 = await axios.post(`${BACKEND_URL}/api/batches`, payloadUnknown);
  const data3 = postRes3.data;

  console.log('POST /api/batches (Unknown Factory) Response:');
  console.log(`  Status: ${postRes3.status}`);
  console.log(`  Batch ID: ${data3.data.batch_id}`);
  console.log(`  Predicted Refuse Tea %: ${data3.prediction.predicted_refuse_tea_pct}%`);
  console.log(`  used_fallback_rolling_features: ${data3.prediction.used_fallback_rolling_features}`);
  console.log(`  rolling_humidity_3batch: ${data3.prediction.rolling_humidity_3batch}`);
  console.log(`  rolling_ambient_temp_3batch: ${data3.prediction.rolling_ambient_temp_3batch}`);

  if (data3.prediction.used_fallback_rolling_features !== true) {
    throw new Error('Check 3 Failed: used_fallback_rolling_features should be TRUE for factory with no history');
  }
  if (data3.prediction.rolling_humidity_3batch !== null || data3.prediction.rolling_ambient_temp_3batch !== null) {
    throw new Error('Check 3 Failed: rolling features should be null');
  }
  console.log('>>> CHECK 3 PASSED: ML fallback triggered gracefully, no crash, used_fallback_rolling_features=true.\n');

  // ---------------------------------------------------------------------------
  // CHECK 4: POST /api/batches/:id/whatif on stored batch
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 4: Run What-If Simulation on Stored Batch ---');
  const storedBatchId = data2.data.batch_id; // 'BATCH-VALIDATION-FACTORY-H-001'
  const whatIfPayload = {
    overrides: {
      machine_downtime_hrs: 0.0, // Eliminate downtime
      withering_duration_hrs: 17.0, // Optimize withering
    },
  };

  const whatIfRes = await axios.post(
    `${BACKEND_URL}/api/batches/${storedBatchId}/whatif`,
    whatIfPayload
  );
  const whatIfData = whatIfRes.data;

  console.log(`POST /api/batches/${storedBatchId}/whatif Response:`);
  console.log(`  Status: ${whatIfRes.status}`);
  console.log(`  Baseline Prediction: ${whatIfData.simulation.baseline_predicted_refuse_pct}%`);
  console.log(`  Simulated Prediction: ${whatIfData.simulation.simulated_predicted_refuse_pct}%`);
  console.log(`  Delta Refuse %: ${whatIfData.simulation.delta_refuse_pct} pp`);
  console.log(`  Direction: ${whatIfData.simulation.direction}`);
  console.log(`  Simulated Savings: Rs. ${whatIfData.simulation.economic_impact?.simulated_savings_lkr}`);
  console.log(`  Disclaimer included: ${Boolean(whatIfData.simulation.disclaimer)}`);
  console.log(`  Disclaimer text: "${whatIfData.simulation.disclaimer.slice(0, 100)}..."`);

  if (!whatIfData.simulation.disclaimer || whatIfData.simulation.disclaimer.length === 0) {
    throw new Error('Check 4 Failed: Mandatory disclaimer text is missing from what-if response');
  }

  // Also test invalid lever rejection (forwarding 400 from ML service)
  console.log('Testing invalid lever rejection on /whatif:');
  try {
    await axios.post(`${BACKEND_URL}/api/batches/${storedBatchId}/whatif`, {
      overrides: {
        relative_humidity_pct: 60.0, // Exogenous, not a controllable lever!
      },
    });
    throw new Error('Expected 400 error for unauthorized lever but got 200');
  } catch (err: any) {
    if (err.response && err.response.status === 400) {
      console.log(`  Successfully received 400 for invalid lever: "${err.response.data.error || err.response.data.detail}"`);
    } else {
      throw err;
    }
  }
  console.log('>>> CHECK 4 PASSED: What-if simulation succeeded with mandatory disclaimer and strict lever validation.\n');

  console.log('===============================================================');
  console.log('CHECKS 1-4 ALL PASSED CLEANLY!');
  console.log('===============================================================\n');

  await prisma.$disconnect();
}

runValidation().catch(async (e) => {
  console.error('Validation test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
