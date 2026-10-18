import { Router, Request, Response } from 'express';
import {
  checkMLServiceHealth,
  trainModels,
  predictDemandAndLogistics,
  getModelMetadata,
  getModelMetrics,
} from '../../services/mlService';

const mlRouter = Router();

// ML health check
mlRouter.get('/health', async (_req: Request, res: Response) => {
  const isHealthy = await checkMLServiceHealth();
  res.json({
    success: true,
    service: 'Ceylon Intelligence ML Service',
    status: isHealthy ? 'online' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

// Trigger ML Model Training
mlRouter.post('/train', async (req: Request, res: Response) => {
  try {
    const result = await trainModels(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Model training failed',
    });
  }
});

// Run AI ML Inference
mlRouter.post('/predict', async (req: Request, res: Response) => {
  try {
    const { market, tea_grade, quarter, route_id, estimated_transit_days } = req.body;
    if (!market || !tea_grade) {
      return res.status(400).json({
        success: false,
        message: 'market and tea_grade are required parameters',
      });
    }

    const result = await predictDemandAndLogistics({
      market,
      tea_grade,
      quarter: quarter || '2026Q2',
      route_id,
      estimated_transit_days,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Prediction inference failed',
    });
  }
});

// Get Model Metadata & Architecture
mlRouter.get('/model', async (_req: Request, res: Response) => {
  try {
    const result = await getModelMetadata();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch model metadata',
    });
  }
});

// Get Model Evaluation Metrics (R2, MAE, RMSE)
mlRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const result = await getModelMetrics();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch evaluation metrics',
    });
  }
});

export default mlRouter;
