import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  RotateCcw,
  Eye,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import api from '../../../services/api';

interface DatasetItem {
  id: string;
  versionTag: string;
  fileName: string;
  description: string;
  isActive: boolean;
  recordCount: number;
  uploadedAt: string;
  status: string;
}

interface ValidationReport {
  isValid: boolean;
  totalRecordsChecked: number;
  columnsDetected: string[];
  missingRequiredColumns: string[];
  anomalies: string[];
  warnings: string[];
}

export const DatasetManagementPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<{
    dataset: DatasetItem;
    preview: Array<Record<string, string>>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Upload Form State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; datasets: DatasetItem[] }>('/v1/datasets');
      setDatasets(res.data.datasets);
    } catch {
      // Fallback local list
      setDatasets([
        {
          id: 'ds-001',
          versionTag: 'M4-DS-v1.0',
          fileName: 'export_supply.csv',
          description: 'Active baseline: 12 quarters Ceylon Tea harvest quantities and costs.',
          isActive: true,
          recordCount: 36,
          uploadedAt: '2026-03-01T10:00:00Z',
          status: 'VALIDATED',
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
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handlePreview = async (id: string) => {
    try {
      const res = await api.get<{
        success: boolean;
        dataset: DatasetItem;
        preview: Array<Record<string, string>>;
      }>(`/v1/datasets/${id}`);
      setSelectedDataset({ dataset: res.data.dataset, preview: res.data.preview });
    } catch {
      const ds = datasets.find((d) => d.id === id);
      if (ds) {
        setSelectedDataset({
          dataset: ds,
          preview: [
            {
              supply_id: 'SUP-20241-TEA-BOP',
              quarter: '2024Q1',
              tea_grade_id: 'TEA-BOP',
              tea_grade: 'BOP Black Tea',
              available_quantity_kg: '133900',
              unit_supply_cost_usd_per_kg: '3.287',
              data_source_type: 'SYNTHETIC_DEMO',
            },
            {
              supply_id: 'SUP-20241-TEA-OP',
              quarter: '2024Q1',
              tea_grade_id: 'TEA-OP',
              tea_grade: 'OP Black Tea',
              available_quantity_kg: '156000',
              unit_supply_cost_usd_per_kg: '3.384',
              data_source_type: 'SYNTHETIC_DEMO',
            },
          ],
        });
      }
    }
  };

  const handleActivate = async (id: string, versionTag: string) => {
    try {
      await api.post(`/v1/datasets/${id}/activate`);
      setActionMessage(`Dataset version ${versionTag} is now the active operational baseline.`);
      fetchDatasets();
    } catch {
      setDatasets((prev) =>
        prev.map((d) => ({
          ...d,
          isActive: d.id === id,
        }))
      );
      setActionMessage(`Dataset version ${versionTag} is now activated (cached local state).`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);

      // Validate immediately with backend
      try {
        const res = await api.post<{ success: boolean; report: ValidationReport }>('/v1/datasets/validate', {
          csvContent: text,
        });
        setValidationReport(res.data.report);
      } catch {
        // Simple client-side fallback validation
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const headers = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) || [];
        const required = ['tea_grade_id', 'available_quantity_kg'];
        const missing = required.filter((r) => !headers.includes(r));
        setValidationReport({
          isValid: missing.length === 0,
          totalRecordsChecked: Math.max(0, lines.length - 1),
          columnsDetected: headers,
          missingRequiredColumns: missing,
          anomalies: missing.length > 0 ? [`Missing required columns: ${missing.join(', ')}`] : [],
          warnings: ['Demo client-side validation check applied.'],
        });
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (!csvText || !uploadedFileName) return;
    setIsUploading(true);
    try {
      await api.post('/v1/datasets/upload', {
        fileName: uploadedFileName,
        csvContent: csvText,
        description: `Imported supply dataset: ${uploadedFileName}`,
      });
      setActionMessage(`Successfully uploaded and validated ${uploadedFileName}.`);
      setUploadedFileName('');
      setCsvText('');
      setValidationReport(null);
      fetchDatasets();
    } catch (err: unknown) {
      setActionMessage('Failed to upload dataset. Ensure headers match the specification.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15B]">
            <Database className="h-4 w-4" />
            <span>Dataset Pipeline & Version Control</span>
          </div>
          <h1 className="mt-1 font-serif-ceylon text-3xl font-bold text-[#123D2B]">
            Dataset Management
          </h1>
          <p className="mt-1 text-xs text-[#778278] md:text-sm">
            Inspect, validate, version, and activate Ceylon Tea export supply and logistics datasets.
          </p>
        </div>

        <button
          onClick={fetchDatasets}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-[#202922] shadow-sm transition hover:bg-[#F8F5ED]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Datasets</span>
        </button>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Dataset Version Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8F0E5] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
            Registered Dataset Versions
          </h3>
          <p className="text-xs text-[#778278]">
            Active datasets are immediately consumed by the M4 PuLP solver during scenario execution.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-[#F8F5ED] text-[#202922]">
              <tr>
                <th className="p-4 font-semibold">Version Tag</th>
                <th className="p-4 font-semibold">Source File</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold">Records</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-semibold text-[#123D2B]">{ds.versionTag}</div>
                    <div className="text-[11px] text-[#778278]">{new Date(ds.uploadedAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4 font-mono text-[#286B45]">{ds.fileName}</td>
                  <td className="p-4 max-w-xs truncate text-[#778278]">{ds.description}</td>
                  <td className="p-4 font-medium">{ds.recordCount} rows</td>
                  <td className="p-4">
                    {ds.isActive ? (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Active Baseline</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                        Archived / Candidate
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handlePreview(ds.id)}
                      className="inline-flex items-center space-x-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#202922] hover:bg-gray-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#778278]" />
                      <span>Preview</span>
                    </button>
                    {!ds.isActive && (
                      <button
                        onClick={() => handleActivate(ds.id, ds.versionTag)}
                        className="inline-flex items-center space-x-1 rounded-lg bg-[#286B45] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#123D2B]"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Activate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Preview Drawer */}
      {selectedDataset && (
        <div className="rounded-2xl border border-[#C6A15B]/40 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-[#C6A15B]" />
                <h3 className="font-serif-ceylon text-lg font-bold text-[#123D2B]">
                  Dataset Preview: {selectedDataset.dataset.versionTag} ({selectedDataset.dataset.fileName})
                </h3>
              </div>
              <p className="text-xs text-[#778278]">Showing first 10 sample records from the validated file.</p>
            </div>
            <button
              onClick={() => setSelectedDataset(null)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              Close Preview
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F5ED] text-[#202922]">
                <tr>
                  {Object.keys(selectedDataset.preview[0] || {}).map((col) => (
                    <th key={col} className="p-2.5 font-semibold font-mono text-[11px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedDataset.preview.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 font-mono text-[11px]">
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="p-2.5">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Uploader & Column Validation Card */}
      <div className="rounded-2xl border border-[#E8F0E5] bg-white p-6 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#123D2B]">
            <Upload className="h-4 w-4 text-[#286B45]" />
            <span>Upload & Validate New Research Dataset</span>
          </div>
          <p className="mt-1 text-xs text-[#778278]">
            Upload custom CSV files to test alternative harvest supply curves, freight tariffs, or demand projections.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* File Drag and Drop */}
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-[#F8F5ED]/50 p-6 text-center hover:border-[#286B45]">
            <FileCheck className="h-10 w-10 text-[#286B45]/60 mb-2" />
            <p className="text-xs font-semibold text-[#123D2B]">
              {uploadedFileName || 'Select or drop a CSV dataset file'}
            </p>
            <p className="mt-1 text-[11px] text-[#778278]">
              Supports .csv format. Max 5MB file size.
            </p>
            <label className="mt-4 cursor-pointer rounded-xl bg-[#286B45] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#123D2B]">
              <span>Browse CSV Files</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Validation Feedback */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-slate-50 p-4">
            <div>
              <h4 className="text-xs font-bold text-[#123D2B]">Schema & Integrity Validation</h4>
              {validationReport ? (
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    {validationReport.isValid ? (
                      <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>Schema Validation Passed ({validationReport.totalRecordsChecked} records verified)</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-red-700 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span>Validation Failed: Missing Required Columns</span>
                      </span>
                    )}
                  </div>

                  {validationReport.missingRequiredColumns.length > 0 && (
                    <div className="rounded-lg bg-red-100/60 p-2 text-red-800 text-[11px]">
                      Required: {validationReport.missingRequiredColumns.join(', ')}
                    </div>
                  )}

                  <div className="text-[11px] text-[#778278]">
                    Columns detected: {validationReport.columnsDetected.slice(0, 5).join(', ')}
                    {validationReport.columnsDetected.length > 5 && ` (+${validationReport.columnsDetected.length - 5} more)`}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center space-x-2 text-xs text-[#778278]">
                  <Info className="h-4 w-4 text-[#C6A15B]" />
                  <span>Choose a CSV file to inspect columns and integrity automatically.</span>
                </div>
              )}
            </div>

            <button
              onClick={handleUploadSubmit}
              disabled={!validationReport?.isValid || isUploading}
              className="mt-4 w-full rounded-xl bg-[#123D2B] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#286B45] disabled:opacity-40"
            >
              {isUploading ? 'Registering Version...' : 'Confirm Upload & Register Version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DatasetManagementPage;
