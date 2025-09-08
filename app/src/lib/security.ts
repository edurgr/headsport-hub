import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

/**
 * Rate limiting middleware
 */
export function rateLimit(identifier: string): boolean {
  const now = Date.now();
  const key = `rate_limit_${identifier}`;

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * Get client IP for rate limiting
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';

  return email.toLowerCase().trim().substring(0, 254); // RFC 5321 limit
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate role
 */
export function isValidRole(role: string): role is 'athlete' | 'manager' | 'admin' {
  return ['athlete', 'manager', 'admin'].includes(role);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate product category
 */
export function isValidProductCategory(category: string): boolean {
  const validCategories = [
    'accessories',
    'bindings',
    'boots',
    'goggles',
    'helmet',
    'skis',
    'snowboard',
  ];
  return validCategories.includes(category);
}

/**
 * Validate order status
 */
export function isValidOrderStatus(status: string): boolean {
  const validStatuses = ['pending_approval', 'approved', 'rejected', 'cancelled'];
  return validStatuses.includes(status);
}

/**
 * Sanitize and validate order item
 */
export function sanitizeOrderItem(item: any) {
  return {
    product: {
      id: sanitizeString(item.product?.id || ''),
      name: sanitizeString(item.product?.name || ''),
      sku: sanitizeString(item.product?.sku || ''),
      vertical_number: sanitizeString(item.product?.vertical_number || ''),
      category: isValidProductCategory(item.product?.category)
        ? item.product.category
        : 'accessories',
    },
    quantity: Math.max(1, Math.min(100, parseInt(item.quantity) || 1)),
    length_cm: item.length_cm ? sanitizeString(item.length_cm) : undefined,
    boot_size: item.boot_size ? sanitizeString(item.boot_size) : undefined,
    binding_color: item.binding_color ? sanitizeString(item.binding_color) : undefined,
  };
}

/**
 * Sanitize shipping address
 */
export function sanitizeShippingAddress(address: any) {
  return {
    name: sanitizeString(address.name || ''),
    addressLine1: sanitizeString(address.addressLine1 || address.address || ''),
    addressLine2: address.addressLine2 ? sanitizeString(address.addressLine2) : null,
    city: sanitizeString(address.city || ''),
    state: sanitizeString(address.state || ''),
    postalCode: sanitizeString(address.postalCode || ''),
    country: sanitizeString(address.country || 'US'),
    phone: address.phone ? sanitizeString(address.phone) : null,
    isPreferred: address.isPreferred || false,
  };
}

/**
 * Create secure error response
 */
export function createSecureErrorResponse(message: string, status: number = 400) {
  // Don't expose internal details in production
  const isProduction = process.env.NODE_ENV === 'production';

  return NextResponse.json(
    {
      error: isProduction ? 'Request failed' : message,
      ...(isProduction ? {} : { details: message }),
    },
    { status }
  );
}

/**
 * Validate request body size
 */
export function validateBodySize(body: string, maxSize: number = 1024 * 1024): boolean {
  return Buffer.byteLength(body, 'utf8') <= maxSize;
}

/**
 * Zod schemas for validation
 */
export const schemas = {
  email: z.string().email().max(254),
  role: z.enum(['athlete', 'manager', 'admin']),
  uuid: z.string().uuid(),
  productCategory: z.enum([
    'accessories',
    'bindings',
    'boots',
    'goggles',
    'helmet',
    'skis',
    'snowboard',
  ]),
  orderStatus: z.enum(['pending_approval', 'approved', 'rejected', 'cancelled']),

  profile: z.object({
    email: z.string().email().max(254),
    name: z.string().min(1).max(100),
    role: z.enum(['athlete', 'manager', 'admin']),
    organization: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
  }),

  orderItem: z.object({
    product: z.object({
      id: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      sku: z.string().min(1).max(50),
      vertical_number: z.string().min(1).max(50),
      category: z.enum([
        'accessories',
        'bindings',
        'boots',
        'goggles',
        'helmet',
        'skis',
        'snowboard',
      ]),
    }),
    quantity: z.number().min(1).max(100),
    length_cm: z.string().optional(),
    boot_size: z.string().optional(),
    binding_color: z.string().optional(),
  }),

  shippingAddress: z.object({
    name: z.string().min(1).max(100),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().min(2).max(50),
    phone: z.string().max(20).optional().nullable(),
    isPreferred: z.boolean().optional(),
  }),
};

/**
 * Validate request with Zod schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map(e => e.message).join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Security headers for responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
