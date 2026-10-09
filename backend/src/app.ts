import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use('/api/health', healthRouter);

  return app;
}
