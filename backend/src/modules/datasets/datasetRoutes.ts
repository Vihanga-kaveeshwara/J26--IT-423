import { Router } from 'express';
import {
  listDatasetsController,
  getDatasetDetailsController,
  activateDatasetController,
  validateDatasetContentController,
  uploadDatasetController,
} from './datasetController';
import { authenticateJWT } from '../../middleware/authentication';

const router = Router();

router.get('/', authenticateJWT, listDatasetsController);
router.post('/upload', authenticateJWT, uploadDatasetController);
router.post('/validate', authenticateJWT, validateDatasetContentController);
router.get('/:id', authenticateJWT, getDatasetDetailsController);
router.post('/:id/activate', authenticateJWT, activateDatasetController);

export default router;
