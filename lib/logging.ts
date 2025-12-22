/**
 * Swar Yoga - Request and Error Logging Utilities
 * © 2025 Swar Yoga. All rights reserved.
 * 
 * Provides structured logging for API requests, responses, and errors
 * with request ID tracking, execution time measurement, and context preservation.
 */

import { NextRequest } from 'next/server';

/**
 * Request context information
 */
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  ip?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
}

/**
 * Request log entry
 */
export interface RequestLog {
  timestamp: string;
  context: RequestContext;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
}

/**
 * In-memory request log store (limited size for performance)
 */
class LogStore {
  private logs: RequestLog[] = [];
  private readonly maxSize = 1000; // Keep last 1000 logs in memory

  push(log: RequestLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxSize) {
      this.logs.shift(); // Remove oldest log
    }
  }

  getLogs(limit: number = 100): RequestLog[] {
    return this.logs.slice(-limit);
  }

  getLogsByUserId(userId: string, limit: number = 50): RequestLog[] {
    return this.logs
      .filter(log => log.context.userId === userId)
      .slice(-limit);
  }

  getLogsByRequestId(requestId: string): RequestLog[] {
    return this.logs.filter(log => log.context.requestId === requestId);
  }

  clear(): void {
    this.logs = [];
  }

  size(): number {
    return this.logs.length;
  }
}

const logStore = new LogStore();

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Extract user agent
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Create request context from Next.js request
 */
export function createRequestContext(
  request: NextRequest,
  requestId?: string,
  userId?: string
): RequestContext {
  const url = new URL(request.url);
  return {
    requestId: requestId || generateRequestId(),
    method: request.method,
    path: url.pathname,
    ip: getClientIp(request),
    userId,
    userAgent: getUserAgent(request),
  };
}

/**
 * Log API request
 */
export function logRequest(
  context: RequestContext,
  message: string = 'Request received',
  details?: Record<string, any>
): void {
  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    context,
    level: 'info',
    message,
    details,
  };

  logStore.push(log);

  // Console output in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${context.requestId}] ${context.method} ${context.path}`, {
      ip: context.ip,
      userId: context.userId,
      ...details,
    });
  }
}

/**
 * Log API response
 */
export function logResponse(
  context: RequestContext,
  statusCode: number,
  duration: number,
  message: string = 'Request completed'
): void {
  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    context: { ...context, statusCode, duration },
    level: statusCode >= 400 ? 'warn' : 'info',
    message,
  };

  logStore.push(log);

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[${context.requestId}] ↳ ${statusCode} (${duration}ms)`
    );
  }
}

/**
 * Log error with context
 */
export function logApiError(
  context: RequestContext,
  error: Error | string,
  statusCode: number = 500,
  details?: Record<string, any>
): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    context: { ...context, statusCode },
    level: 'error',
    message: errorMessage,
    details: {
      ...details,
      stack: errorStack,
    },
  };

  logStore.push(log);

  // Always log errors
  console.error(`[${context.requestId}] ERROR:`, {
    message: errorMessage,
    statusCode,
    ip: context.ip,
    userId: context.userId,
    path: context.path,
    ...details,
  });
}

/**
 * Get logs for debugging/monitoring
 */
export function getLogs(limit: number = 100): RequestLog[] {
  return logStore.getLogs(limit);
}

/**
 * Get logs for specific user
 */
export function getUserLogs(userId: string, limit: number = 50): RequestLog[] {
  return logStore.getLogsByUserId(userId, limit);
}

/**
 * Get logs for specific request
 */
export function getRequestLogs(requestId: string): RequestLog[] {
  return logStore.getLogsByRequestId(requestId);
}

/**
 * Get logging statistics
 */
export function getLogStats(): {
  totalLogs: number;
  recentErrors: number;
  recentWarnings: number;
} {
  const logs = logStore.getLogs(1000);
  const recentErrors = logs.filter(l => l.level === 'error').length;
  const recentWarnings = logs.filter(l => l.level === 'warn').length;

  return {
    totalLogs: logs.length,
    recentErrors,
    recentWarnings,
  };
}

/**
 * Clear all logs (use with caution)
 */
export function clearLogs(): void {
  logStore.clear();
}

/**
 * Measure request execution time
 */
export class Timer {
  private startTime = Date.now();

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get elapsed time and reset timer
   */
  reset(): number {
    const elapsed = this.elapsed();
    this.startTime = Date.now();
    return elapsed;
  }

  /**
   * Log duration with message
   */
  logDuration(context: RequestContext, message: string = 'Operation'): void {
    const duration = this.elapsed();
    console.log(`[${context.requestId}] ${message} took ${duration}ms`);
  }
}

/**
 * Safe JSON serializer for logging (prevents circular references)
 */
export function safeStringify(obj: any, space: number = 0): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
}
