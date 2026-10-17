import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health';
import apiV1Router from './routes/apiV1';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(helmet());
  app.use(express.json());
  app.use('/api/health', healthRouter);
  app.use('/api/v1', apiV1Router);
  app.use(errorHandler);

  return app;
}
