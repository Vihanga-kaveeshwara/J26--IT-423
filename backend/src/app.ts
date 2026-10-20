import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health';
import batchRouter from './routes/batchRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());

  // Mount API routers
  app.use('/api/health', healthRouter);
  app.use('/api/batches', batchRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
