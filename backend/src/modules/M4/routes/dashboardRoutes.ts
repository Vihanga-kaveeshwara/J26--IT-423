import { Router } from 'express';
import { getDashboardSummary, getDashboardActivity } from '../controllers/dashboardController';
import { authenticateJWT } from '../../../middleware/authentication';

const router = Router();

router.get('/summary', authenticateJWT, getDashboardSummary);
router.get('/recent-activity', authenticateJWT, getDashboardActivity);

export default router;
