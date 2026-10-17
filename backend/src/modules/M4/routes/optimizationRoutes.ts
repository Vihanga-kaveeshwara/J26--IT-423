import { Router } from 'express';
import {
  runOptimizationController,
  listOptimizationRunsController,
  getOptimizationRunByIdController,
  getOptimizationRunResultsController,
} from '../controllers/optimizationController';
import { authenticateJWT } from '../../../middleware/authentication';

const router = Router();

router.post('/optimization-runs', authenticateJWT, runOptimizationController);
router.get('/optimization-runs', authenticateJWT, listOptimizationRunsController);
router.get('/optimization-runs/:id', authenticateJWT, getOptimizationRunByIdController);
router.get('/optimization-runs/:id/results', authenticateJWT, getOptimizationRunResultsController);

export default router;
