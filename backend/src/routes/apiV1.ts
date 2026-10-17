import { Router } from 'express';
import authRouter from '../modules/auth/authRoutes';

const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);

// Base status
apiV1Router.get('/status', (_req, res) => {
  res.json({
    success: true,
    platform: 'Ceylon Intelligence',
    component: 'M4 — Prescriptive Export & Logistics Optimization Engine',
    version: '1.0.0',
    status: 'online',
  });
});

export default apiV1Router;
