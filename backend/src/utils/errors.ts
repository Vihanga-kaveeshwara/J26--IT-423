export class AppError extends Error {
  public statusCode: number;
  public detail?: any;

  constructor(statusCode: number, message: string, detail?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.detail = detail;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MLServiceUnavailableError extends AppError {
  constructor(message = 'ML inference service is currently unavailable or unreachable', detail?: any) {
    super(503, message, detail);
    this.name = 'MLServiceUnavailableError';
  }
}

export class MLValidationError extends AppError {
  constructor(message = 'ML service validation failed', detail?: any) {
    super(400, message, detail);
    this.name = 'MLValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', detail?: any) {
    super(404, message, detail);
    this.name = 'NotFoundError';
  }
}
