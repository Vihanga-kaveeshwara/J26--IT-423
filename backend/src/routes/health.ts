import { Router } from 'express';
import { checkMLServiceHealth } from '../services/mlService';

const router = Router();

router.get('/', async (_request, response) => {
  const mlServiceAvailable = await checkMLServiceHealth();
  response.json({
    success: true,
    message: 'Backend is running',
    mlService: mlServiceAvailable ? 'available' : 'unavailable',
  });
});

export default router;
