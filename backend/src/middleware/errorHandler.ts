import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
  const message = err.message || 'Internal Server Error';
  const detail = err.detail || undefined;

  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${statusCode} - ${message}`, err.stack || err);
  } else {
    console.warn(`[CLIENT/INTEGRATION ERROR] ${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(detail ? { detail } : {}),
  });
}
