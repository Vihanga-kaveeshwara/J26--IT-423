import { Request, Response } from 'express';
import { optimizationService } from '../services/optimizationService';
import { OptimizationRunRequest } from '../types/optimizationTypes';

export async function runOptimizationController(req: Request, res: Response): Promise<void> {
  const body = req.body as OptimizationRunRequest;

  if (!body.demand || body.demand.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Optimization scenario must include at least one valid market demand record.',
    });
    return;
  }

  if (!body.supply || body.supply.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Optimization scenario must include tea supply availability.',
    });
    return;
  }

  try {
    const result = await optimizationService.dispatchOptimization(body, req.user?.id);
    res.status(200).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      status: 'Failed',
      message: `Failed to execute optimization solver: ${msg}`,
    });
  }
}

export function listOptimizationRunsController(_req: Request, res: Response): void {
  const runs = optimizationService.listRuns();
  res.json({
    success: true,
    runs,
  });
}

export function getOptimizationRunByIdController(req: Request, res: Response): void {
  const { id } = req.params;
  const run = optimizationService.getRunById(id);
  if (!run) {
    res.status(404).json({ success: false, message: 'Optimization run not found' });
    return;
  }
  res.json({
    success: true,
    run,
  });
}

export function getOptimizationRunResultsController(req: Request, res: Response): void {
  const { id } = req.params;
  const allocations = optimizationService.getRunAllocations(id);
  res.json({
    success: true,
    runId: id,
    allocations,
  });
}
