import dotenv from 'dotenv';

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: requiredEnv('DATABASE_URL'),
  mlServiceUrl: requiredEnv('ML_SERVICE_URL'),
};
