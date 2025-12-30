// lib/security/requestLogger.ts
// Comprehensive request logging for debugging and security monitoring

import type { NextRequest } from 'next/server';

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  responseTime?: number;
  userId?: string;
  error?: string;
  requestSize?: number;
  responseSize?: number;
}

class RequestLogger {
  private logs: RequestLog[] = [];
  private maxLogs: number = 10000;
  private logFile: string = '/tmp/api-requests.log';

  log(logEntry: RequestLog): void {
    this.logs.push(logEntry);

    // Trim old logs if exceeded max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to file in production
    if (process.env.NODE_ENV === 'production') {
      this.logToFile(logEntry);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry);
    }
  }

  private logToConsole(entry: RequestLog): void {
    const color = entry.statusCode && entry.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(
      `${color}[${entry.timestamp}] ${entry.method} ${entry.path} - ${entry.statusCode} - ${entry.responseTime}ms${reset}`
    );
    if (entry.error) {
      console.error(`  Error: ${entry.error}`);
    }
  }

  private logToFile(entry: RequestLog): void {
    // In production, send to logging service
    // For now, we'll just track important logs
    if (entry.statusCode && entry.statusCode >= 500) {
      console.error(`[ERROR] ${JSON.stringify(entry)}`);
    }
  }

  getLogs(filter?: { path?: string; statusCode?: number; limit?: number }): RequestLog[] {
    let result = [...this.logs];

    if (filter?.path) {
      result = result.filter((log) => log.path.includes(filter.path!));
    }

    if (filter?.statusCode) {
      result = result.filter((log) => log.statusCode === filter.statusCode);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  getStatistics(): {
    totalRequests: number;
    byStatus: Record<number, number>;
    byPath: Record<string, number>;
    avgResponseTime: number;
    errorRate: number;
  } {
    const stats = {
      totalRequests: this.logs.length,
      byStatus: {} as Record<number, number>,
      byPath: {} as Record<string, number>,
      avgResponseTime: 0,
      errorRate: 0,
    };

    let totalTime = 0;
    let errorCount = 0;

    for (const log of this.logs) {
      // Status codes
      if (log.statusCode) {
        stats.byStatus[log.statusCode] = (stats.byStatus[log.statusCode] || 0) + 1;
      }

      // Paths
      stats.byPath[log.path] = (stats.byPath[log.path] || 0) + 1;

      // Response time
      if (log.responseTime) {
        totalTime += log.responseTime;
      }

      // Errors
      if (log.statusCode && log.statusCode >= 400) {
        errorCount++;
      }
    }

    stats.avgResponseTime = this.logs.length > 0 ? totalTime / this.logs.length : 0;
    stats.errorRate = this.logs.length > 0 ? (errorCount / this.logs.length) * 100 : 0;

    return stats;
  }

  clear(): void {
    this.logs = [];
  }
}

export const requestLogger = new RequestLogger();

/**
 * Create a logging wrapper for API handlers
 */
export function withRequestLogging<T extends NextRequest, R>(
  handler: (req: T) => Promise<R>
): (req: T) => Promise<R> {
  return async (req: T) => {
    const startTime = Date.now();
    const path = new URL(req.url).pathname;

    try {
      const response = await handler(req);
      const responseTime = Date.now() - startTime;

      requestLogger.log({
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        ip: req.ip || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        statusCode: (response as any).status || 200,
        responseTime,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      requestLogger.log({
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        ip: req.ip || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        statusCode: 500,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}

export default requestLogger;
