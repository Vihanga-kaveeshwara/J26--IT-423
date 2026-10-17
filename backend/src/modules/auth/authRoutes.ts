import { Router } from 'express';
import {
  loginController,
  logoutController,
  getMeController,
  getDevSeedAccounts,
} from './authController';
import { authenticateJWT } from '../../middleware/authentication';

const router = Router();

router.post('/login', loginController);
router.post('/logout', logoutController);
router.get('/me', authenticateJWT, getMeController);
router.get('/seed-accounts', getDevSeedAccounts);

export default router;
