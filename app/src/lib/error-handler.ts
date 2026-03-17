import { NextResponse } from 'next/server';

import { logger } from './logger';

export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  action?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public context?: ErrorContext;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    context?: ErrorContext,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: ErrorContext) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super(message, 404, 'NOT_FOUND_ERROR', context);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', context?: ErrorContext) {
    super(message, 409, 'CONFLICT_ERROR', context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: ErrorContext) {
    super(message, 429, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, context?: ErrorContext): NextResponse {
  const requestId = context?.requestId || Math.random().toString(36).substring(7);

  if (error instanceof AppError) {
    logger.error(`${error.name}: ${error.message}`, error, {
      ...context,
      requestId,
      statusCode: error.statusCode,
      errorCode: error.code,
    });

    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          requestId,
        },
      },
      { status: error.statusCode },
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };

    logger.error('Supabase error', error, {
      ...context,
      requestId,
      errorCode: supabaseError.code,
    });

    // Map common Supabase errors to appropriate HTTP status codes
    const statusCode = getSupabaseErrorStatusCode(supabaseError.code);

    return NextResponse.json(
      {
        error: {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          requestId,
        },
      },
      { status: statusCode },
    );
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    logger.error(`Unhandled error: ${error.message}`, error, {
      ...context,
      requestId,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          requestId,
        },
      },
      { status: 500 },
    );
  }

  // Handle unknown errors
  logger.error('Unknown error type', error, {
    ...context,
    requestId,
    errorType: typeof error,
  });

  return NextResponse.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId,
      },
    },
    { status: 500 },
  );
}

/**
 * Map Supabase error codes to HTTP status codes
 */
function getSupabaseErrorStatusCode(code: string): number {
  switch (code) {
    case 'PGRST116': // No rows found
      return 404;
    case 'PGRST202': // Invalid request
    case 'PGRST203': // Invalid range
      return 400;
    case 'PGRST301': // JWT expired / insufficient privileges
      return 403;
    case 'PGRST204': // Invalid body
      return 422;
    default:
      return 500;
  }
}

/**
 * Extract error context from Next.js request
 */
export function getErrorContext(request: Request): ErrorContext {
  const url = new URL(request.url);

  return {
    endpoint: url.pathname,
    action: request.method,
    requestId: Math.random().toString(36).substring(7),
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  };
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>,
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const errorContext = getErrorContext(request);
      return handleApiError(error, errorContext);
    }
  };
}
