import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health';
import m1DemandRouter from './routes/m1Demand.routes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use('/api/health', healthRouter);
  app.use('/api/demand-forecast', m1DemandRouter);

  return app;
}
