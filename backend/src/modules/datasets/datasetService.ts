import fs from 'fs';
import path from 'path';

export interface DatasetVersionItem {
  id: string;
  versionTag: string;
  fileName: string;
  description: string;
  isActive: boolean;
  recordCount: number;
  uploadedAt: string;
  status: 'VALIDATED' | 'PENDING' | 'INVALID';
  errorsCount: number;
}

export interface ValidationReport {
  datasetId: string;
  isValid: boolean;
  totalRecordsChecked: number;
  columnsDetected: string[];
  missingRequiredColumns: string[];
  anomalies: string[];
  warnings: string[];
}

class DatasetService {
  private mockDir = path.resolve(__dirname, '../../../../datasets/mock');

  private registeredDatasets: DatasetVersionItem[] = [
    {
      id: 'ds-001',
      versionTag: 'M4-DS-v1.0',
      fileName: 'export_supply.csv',
      description: 'Active baseline: 12 quarters Ceylon Tea harvest quantities and costs.',
      isActive: true,
      recordCount: 36,
      uploadedAt: '2026-03-01T10:00:00Z',
      status: 'VALIDATED',
      errorsCount: 0,
    },
    {
      id: 'ds-002',
      versionTag: 'M1-MOCK-v1.0',
      fileName: 'm1_demand_forecasts.csv',
      description: 'Synthetic M1 demand forecasts across 5 markets and 3 tea grades.',
      isActive: true,
      recordCount: 180,
      uploadedAt: '2026-03-01T10:05:00Z',
      status: 'VALIDATED',
      errorsCount: 0,
    },
    {
      id: 'ds-003',
      versionTag: 'M2-MOCK-v1.0',
      fileName: 'shipping_routes.csv',
      description: 'Maritime freight rates, transit days, and risk scores from Colombo Port.',
      isActive: true,
      recordCount: 7,
      uploadedAt: '2026-03-01T10:10:00Z',
      status: 'VALIDATED',
      errorsCount: 0,
    },
    {
      id: 'ds-004',
      versionTag: 'M4-DS-v0.9-BETA',
      fileName: 'export_supply_beta.csv',
      description: 'Archived preliminary harvest estimates (historical rollback candidate).',
      isActive: false,
      recordCount: 24,
      uploadedAt: '2026-02-15T14:30:00Z',
      status: 'VALIDATED',
      errorsCount: 0,
    },
  ];

  listDatasets(): DatasetVersionItem[] {
    return this.registeredDatasets;
  }

  getDataset(id: string): { dataset: DatasetVersionItem; preview: Array<Record<string, string>> } | null {
    const ds = this.registeredDatasets.find((d) => d.id === id);
    if (!ds) return null;

    // Load CSV preview from disk if available
    const filePath = path.join(this.mockDir, ds.fileName);
    let preview: Array<Record<string, string>> = [];
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim());
        preview = lines.slice(1, 11).map((line) => {
          const vals = line.split(',');
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = (vals[idx] || '').trim();
          });
          return obj;
        });
      }
    }

    return { dataset: ds, preview };
  }

  activateDataset(id: string): boolean {
    const target = this.registeredDatasets.find((d) => d.id === id);
    if (!target) return false;

    // Set all to inactive, activate target
    this.registeredDatasets.forEach((d) => {
      d.isActive = d.id === id;
    });
    return true;
  }

  validateCsvContent(csvContent: string): ValidationReport {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return {
        datasetId: 'upload-temp',
        isValid: false,
        totalRecordsChecked: 0,
        columnsDetected: [],
        missingRequiredColumns: ['quarter', 'tea_grade_id', 'available_quantity_kg'],
        anomalies: ['Uploaded file is completely empty.'],
        warnings: [],
      };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const required = ['tea_grade_id', 'available_quantity_kg'];
    const missing = required.filter((r) => !headers.includes(r));

    const anomalies: string[] = [];
    const warnings: string[] = [];
    let checked = 0;

    for (let i = 1; i < lines.length; i++) {
      checked++;
      const cols = lines[i].split(',');
      if (cols.length !== headers.length) {
        anomalies.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, found ${cols.length})`);
      }
    }

    return {
      datasetId: `ds-upload-${Date.now()}`,
      isValid: missing.length === 0 && anomalies.length === 0,
      totalRecordsChecked: checked,
      columnsDetected: headers,
      missingRequiredColumns: missing,
      anomalies,
      warnings: missing.length === 0 ? ['Validated synthetic data labels detected.'] : [],
    };
  }

  registerUploadedDataset(fileName: string, recordCount: number, description: string): DatasetVersionItem {
    const newDs: DatasetVersionItem = {
      id: `ds-${Date.now()}`,
      versionTag: `M4-UPLOAD-v${(this.registeredDatasets.length + 1).toFixed(1)}`,
      fileName,
      description,
      isActive: false,
      recordCount,
      uploadedAt: new Date().toISOString(),
      status: 'VALIDATED',
      errorsCount: 0,
    };
    this.registeredDatasets.unshift(newDs);
    return newDs;
  }
}

export const datasetService = new DatasetService();
