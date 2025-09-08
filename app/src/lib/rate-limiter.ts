import { NextRequest } from 'next/server';

// Simple in-memory rate limiter (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // 15 minutes
};

const adminConfig: RateLimitConfig = {
  maxRequests: 200, // 200 requests for admin
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = defaultConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const ip = getClientIP(req);
  const now = Date.now();
  // const windowStart = now - config.windowMs;

  // Limpiar entradas expiradas
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < now) {
      requestCounts.delete(key);
    }
  }

  const key = `${ip}:${Math.floor(now / config.windowMs)}`;
  const current = requestCounts.get(key) || { count: 0, resetTime: now + config.windowMs };

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }

  current.count++;
  requestCounts.set(key, current);

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

export function adminRateLimit(req: NextRequest) {
  return rateLimit(req, adminConfig);
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}

// Función para verificar rate limit en APIs
export function checkRateLimit(req: NextRequest, isAdmin = false) {
  const result = isAdmin ? adminRateLimit(req) : rateLimit(req);

  if (!result.allowed) {
    return {
      success: false,
      error: 'Too many requests',
      status: 429,
      headers: {
        'X-RateLimit-Limit': isAdmin
          ? adminConfig.maxRequests.toString()
          : defaultConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    };
  }

  return {
    success: true,
    headers: {
      'X-RateLimit-Limit': isAdmin
        ? adminConfig.maxRequests.toString()
        : defaultConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
    },
  };
}
