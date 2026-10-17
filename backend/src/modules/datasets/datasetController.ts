import { Request, Response } from 'express';
import { datasetService } from './datasetService';

export function listDatasetsController(_req: Request, res: Response): void {
  const list = datasetService.listDatasets();
  res.json({
    success: true,
    datasets: list,
  });
}

export function getDatasetDetailsController(req: Request, res: Response): void {
  const id = String(req.params.id);
  const result = datasetService.getDataset(id);
  if (!result) {
    res.status(404).json({ success: false, message: 'Dataset version not found' });
    return;
  }
  res.json({
    success: true,
    ...result,
  });
}

export function activateDatasetController(req: Request, res: Response): void {
  const id = String(req.params.id);
  const success = datasetService.activateDataset(id);
  if (!success) {
    res.status(404).json({ success: false, message: 'Dataset not found for activation' });
    return;
  }
  res.json({
    success: true,
    message: `Dataset ${id} is now activated as the operational baseline.`,
  });
}

export function validateDatasetContentController(req: Request, res: Response): void {
  const { csvContent } = req.body;
  if (!csvContent || typeof csvContent !== 'string') {
    res.status(400).json({ success: false, message: 'Valid CSV text content is required' });
    return;
  }

  const report = datasetService.validateCsvContent(csvContent);
  res.json({
    success: true,
    report,
  });
}

export function uploadDatasetController(req: Request, res: Response): void {
  const { fileName, csvContent, description } = req.body;
  if (!fileName || !csvContent) {
    res.status(400).json({ success: false, message: 'File name and CSV content are required' });
    return;
  }

  const report = datasetService.validateCsvContent(csvContent);
  if (!report.isValid) {
    res.status(422).json({
      success: false,
      message: 'Dataset failed validation. Please resolve column or row errors before uploading.',
      report,
    });
    return;
  }

  const newDataset = datasetService.registerUploadedDataset(
    fileName,
    report.totalRecordsChecked,
    description || 'User-uploaded tea export dataset'
  );

  res.status(201).json({
    success: true,
    message: 'Dataset successfully uploaded and validated.',
    dataset: newDataset,
    report,
  });
}
