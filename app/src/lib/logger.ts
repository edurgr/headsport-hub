/**
 * Structured logging utility for Athlete Hub
 * Provides consistent logging across the application
 */

export interface LogContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  requestId?: string;
  endpoint?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  error?: any;
  status?: string;
  responseTime?: number;
  checks?: number;
  memoryUsed?: number;
  profilesCount?: number;
  statusCode?: number;
  errorCode?: string;
  errorType?: string;
  stack?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      return JSON.stringify(logEntry, null, 2);
    }

    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    console.error(
      this.formatMessage(LogLevel.ERROR, message, {
        ...context,
        error: errorInfo,
      }),
    );
  }

  // Convenience methods for common use cases
  apiRequest(endpoint: string, method: string, userId?: string): LogContext {
    return {
      endpoint,
      action: method,
      userId,
      requestId: Math.random().toString(36).substring(7),
    };
  }

  authEvent(action: string, userId?: string, userEmail?: string): LogContext {
    return {
      action,
      userId,
      userEmail,
      resource: 'auth',
    };
  }

  dataEvent(
    action: string,
    resource: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): LogContext {
    return {
      action,
      resource,
      userId,
      metadata,
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logApiRequest = (endpoint: string, method: string, userId?: string) =>
  logger.info(`API ${method} ${endpoint}`, logger.apiRequest(endpoint, method, userId));

export const logAuthEvent = (action: string, userId?: string, userEmail?: string) =>
  logger.info(`Auth: ${action}`, logger.authEvent(action, userId, userEmail));

export const logDataEvent = (
  action: string,
  resource: string,
  userId?: string,
  metadata?: Record<string, any>,
) =>
  logger.info(`Data: ${action} ${resource}`, logger.dataEvent(action, resource, userId, metadata));

export const logError = (message: string, error?: Error | unknown, context?: LogContext) =>
  logger.error(message, error, context);

export const logWarning = (message: string, context?: LogContext) => logger.warn(message, context);

// Health check logger
export const logHealthCheck = (component: string, status: 'healthy' | 'error', details?: any) =>
  logger.info(`Health check: ${component}`, {
    resource: 'health',
    action: 'check',
    metadata: { component, status, details },
  });
