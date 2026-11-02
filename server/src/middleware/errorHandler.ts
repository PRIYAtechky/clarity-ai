import { Request, Response, NextFunction } from 'express';
import { config, maskApiKey } from '../config.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  let message = err.message || 'An unexpected internal error occurred.';
  const statusCode = err.status || err.statusCode || 500;

  // Mask any occurrences of the API key in the error message
  if (config.geminiApiKey && message.includes(config.geminiApiKey)) {
    message = message.replace(new RegExp(config.geminiApiKey, 'g'), maskApiKey(config.geminiApiKey));
  }

  // Never expose raw stack traces to clients in responses
  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
  });
}
