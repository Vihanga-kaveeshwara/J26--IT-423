/**
 * Batch Routes
 * backend/src/routes/batchRoutes.ts
 *
 * Maps Express endpoints:
 * - POST /api/batches: Create new batch with real-time ML inference
 * - GET /api/batches: Paginated and filterable batch history
 * - GET /api/batches/:id: Retrieve specific batch by ID or code
 * - POST /api/batches/:id/whatif: Run counterfactual what-if simulation
 */

import { Router } from 'express';
import {
  createBatch,
  getBatches,
  getBatchById,
  runBatchWhatIf,
} from '../controllers/batchController';

const router = Router();

router.post('/', createBatch);
router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/:id/whatif', runBatchWhatIf);

export default router;
