import { datasetService } from './datasetService';

async function testDatasetValidation() {
  console.log('--- Running Dataset Validation & CSV Integrity Tests ---');

  // Test 1: Valid CSV
  const validCsv = `quarter,tea_grade_id,tea_grade,available_quantity_kg,unit_supply_cost_usd_per_kg
2024Q1,TEA-BOP,BOP Black Tea,120000,3.25
2024Q1,TEA-OP,OP Black Tea,140000,3.50`;

  const reportValid = datasetService.validateCsvContent(validCsv);
  if (!reportValid.isValid || reportValid.totalRecordsChecked !== 2) {
    throw new Error('Test 1 Failed: Valid CSV was rejected');
  }
  console.log('✓ Test 1 Passed: Valid CSV parsed and verified');

  // Test 2: Missing Required Column (available_quantity_kg missing)
  const invalidCsv = `quarter,tea_grade_id,tea_grade,unit_supply_cost_usd_per_kg
2024Q1,TEA-BOP,BOP Black Tea,3.25`;

  const reportInvalid = datasetService.validateCsvContent(invalidCsv);
  if (reportInvalid.isValid || !reportInvalid.missingRequiredColumns.includes('available_quantity_kg')) {
    throw new Error('Test 2 Failed: Missing required column was not flagged');
  }
  console.log('✓ Test 2 Passed: Missing required column flagged correctly');

  // Test 3: Malformed Row (Column count mismatch)
  const malformedCsv = `quarter,tea_grade_id,available_quantity_kg
2024Q1,TEA-BOP,120000
2024Q1,TEA-OP`;

  const reportMalformed = datasetService.validateCsvContent(malformedCsv);
  if (reportMalformed.anomalies.length === 0) {
    throw new Error('Test 3 Failed: Malformed row was not detected');
  }
  console.log('✓ Test 3 Passed: Row column count anomaly detected');

  // Test 4: Dataset Activation
  const activeSuccess = datasetService.activateDataset('ds-001');
  if (!activeSuccess) {
    throw new Error('Test 4 Failed: Dataset activation failed');
  }
  const datasets = datasetService.listDatasets();
  const ds1 = datasets.find((d) => d.id === 'ds-001');
  if (!ds1?.isActive) {
    throw new Error('Test 4 Failed: Target dataset is not active');
  }
  console.log('✓ Test 4 Passed: Dataset activation and version switching verified');

  console.log('All Dataset Management Tests Passed Successfully!');
}

testDatasetValidation().catch((err) => {
  console.error('Dataset test error:', err);
  process.exit(1);
});
