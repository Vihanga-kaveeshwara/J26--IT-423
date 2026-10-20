/**
 * Historical Data Seed Script for M2 Component Batches
 * backend/src/scripts/seedHistoricalBatches.ts
 *
 * Imports 620 historical production runs from M2_refuse_tea_synthetic_dataset.csv
 * into PostgreSQL 'batches' table with source='synthetic_seed'.
 * Idempotent: Safe to execute repeatedly without generating duplicates.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';

const CSV_PATH = path.resolve(
  __dirname,
  '../../../ml-service/training/dataset/M2_refuse_tea_synthetic_dataset.csv'
);

interface BatchCSVRow {
  batch_id: string;
  factory_id: string;
  region: string;
  elevation_band: string;
  batch_date: Date;
  month: number;
  season: string;
  green_leaf_input_kg: number;
  made_tea_output_kg: number;
  refuse_tea_kg: number;
  refuse_tea_pct: number;
  plucking_fine_leaf_pct: number;
  withering_duration_hrs: number;
  dryer_temperature_c: number;
  machine_downtime_hrs: number;
  ambient_temperature_c: number;
  relative_humidity_pct: number;
  tea_grade_produced: string;
  refuse_resale_status: string;
  source: string;
}

export async function seedHistoricalBatches(): Promise<number> {
  console.info('===============================================================');
  console.info('SEEDING HISTORICAL TEA PRODUCTION BATCHES (M2 COMPONENT)');
  console.info('===============================================================');
  console.info(`Reading source CSV: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV dataset not found at expected path: ${CSV_PATH}`);
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0].split(',').map((h) => h.trim());

  console.info(`Found ${lines.length - 1} records in CSV. Header: ${header.join(', ')}`);

  const batchRecords: BatchCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < header.length) continue;

    const rowObj: Record<string, string> = {};
    header.forEach((h, idx) => {
      rowObj[h] = cols[idx];
    });

    batchRecords.push({
      batch_id: rowObj['batch_id'],
      factory_id: rowObj['factory_id'],
      region: rowObj['region'],
      elevation_band: rowObj['elevation_band'],
      batch_date: new Date(`${rowObj['batch_date']}T00:00:00.000Z`),
      month: parseInt(rowObj['month'], 10),
      season: rowObj['season'],
      green_leaf_input_kg: parseFloat(rowObj['green_leaf_input_kg']),
      made_tea_output_kg: parseFloat(rowObj['made_tea_output_kg']),
      refuse_tea_kg: parseFloat(rowObj['refuse_tea_kg']),
      refuse_tea_pct: parseFloat(rowObj['refuse_tea_pct']),
      plucking_fine_leaf_pct: parseFloat(rowObj['plucking_fine_leaf_pct']),
      withering_duration_hrs: parseFloat(rowObj['withering_duration_hrs']),
      dryer_temperature_c: parseFloat(rowObj['dryer_temperature_c']),
      machine_downtime_hrs: parseFloat(rowObj['machine_downtime_hrs']),
      ambient_temperature_c: parseFloat(rowObj['ambient_temperature_c']),
      relative_humidity_pct: parseFloat(rowObj['relative_humidity_pct']),
      tea_grade_produced: rowObj['tea_grade_produced'],
      refuse_resale_status: rowObj['refuse_resale_status'],
      source: 'synthetic_seed',
    });
  }

  console.info(`Parsed ${batchRecords.length} records. Executing idempotent database upsert...`);

  // Idempotency: Clean existing synthetic seeds and reinsert in a transaction
  const count = await prisma.$transaction(async (tx) => {
    const deleted = await tx.batch.deleteMany({
      where: { source: 'synthetic_seed' },
    });
    console.info(`Cleared ${deleted.count} existing synthetic seed records.`);

    const created = await tx.batch.createMany({
      data: batchRecords.map((r) => ({
        batch_id: r.batch_id,
        factory_id: r.factory_id,
        region: r.region,
        elevation_band: r.elevation_band,
        batch_date: r.batch_date,
        month: r.month,
        season: r.season,
        source: r.source,
        green_leaf_input_kg: r.green_leaf_input_kg,
        withering_duration_hrs: r.withering_duration_hrs,
        dryer_temperature_c: r.dryer_temperature_c,
        machine_downtime_hrs: r.machine_downtime_hrs,
        plucking_fine_leaf_pct: r.plucking_fine_leaf_pct,
        relative_humidity_pct: r.relative_humidity_pct,
        ambient_temperature_c: r.ambient_temperature_c,
        tea_grade_produced: r.tea_grade_produced,
        refuse_resale_status: r.refuse_resale_status,
        made_tea_output_kg: r.made_tea_output_kg,
        refuse_tea_kg: r.refuse_tea_kg,
        actual_refuse_tea_pct: r.refuse_tea_pct,
      })),
    });

    return created.count;
  });

  console.info(`Successfully seeded ${count} historical batches into PostgreSQL.`);
  console.info('===============================================================');
  return count;
}

if (require.main === module) {
  seedHistoricalBatches()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Seeding failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
