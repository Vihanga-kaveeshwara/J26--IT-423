import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[API Error] ${statusCode} - ${message}`, err.details || '');

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details,
    timestamp: new Date().toISOString(),
  });
}
