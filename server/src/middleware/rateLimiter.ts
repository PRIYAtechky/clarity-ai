import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding rate limiter per client IP
 */
export function rateLimiter(limit: number = 60, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= limit) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again shortly.',
        retryAfterMs: record.resetTime - now,
      });
      return;
    }

    record.count++;
    next();
  };
}
