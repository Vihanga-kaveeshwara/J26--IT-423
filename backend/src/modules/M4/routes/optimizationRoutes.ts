import { Router } from 'express';
import {
  runOptimizationController,
  listOptimizationRunsController,
  getOptimizationRunByIdController,
  getOptimizationRunResultsController,
} from '../controllers/optimizationController';
import {
  listScenariosController,
  getScenarioByIdController,
  createScenarioController,
  updateScenarioController,
  deleteScenarioController,
} from '../controllers/scenarioController';
import { authenticateJWT } from '../../../middleware/authentication';

const router = Router();

// Optimization Runs
router.post('/optimization-runs', authenticateJWT, runOptimizationController);
router.get('/optimization-runs', authenticateJWT, listOptimizationRunsController);
router.get('/optimization-runs/:id', authenticateJWT, getOptimizationRunByIdController);
router.get('/optimization-runs/:id/results', authenticateJWT, getOptimizationRunResultsController);

// Scenarios CRUD
router.get('/scenarios', authenticateJWT, listScenariosController);
router.post('/scenarios', authenticateJWT, createScenarioController);
router.get('/scenarios/:id', authenticateJWT, getScenarioByIdController);
router.put('/scenarios/:id', authenticateJWT, updateScenarioController);
router.delete('/scenarios/:id', authenticateJWT, deleteScenarioController);

export default router;
