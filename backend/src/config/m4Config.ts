import dotenv from 'dotenv';

dotenv.config();

export const m4Config = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || 'ceylon-intelligence-tea-export-jwt-secret-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tea_export_db',
  optimizationServiceUrl: process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:8001',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
