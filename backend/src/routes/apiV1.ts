import { Router } from 'express';
import authRouter from '../modules/auth/authRoutes';
import dashboardRouter from '../modules/M4/routes/dashboardRoutes';
import datasetRouter from '../modules/datasets/datasetRoutes';
import optimizationRouter from '../modules/M4/routes/optimizationRoutes';

const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/dashboard', dashboardRouter);
apiV1Router.use('/datasets', datasetRouter);
apiV1Router.use('/M4', optimizationRouter);

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
