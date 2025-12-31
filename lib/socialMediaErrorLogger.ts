/**
 * Social Media Error Logger
 * 
 * Centralized error logging and monitoring for social media operations
 * Provides structured logging with error categorization and user-friendly messages
 */

import mongoose from 'mongoose';
import { connectDB } from './db';

export interface LogEntry {
  timestamp: Date;
  operation: 'analytics_sync' | 'post_publish' | 'account_connect' | 'scheduler' | 'webhook';
  platform: string;
  accountId?: string;
  accountMongoId?: string;
  status: 'success' | 'error' | 'warning' | 'retry';
  message: string;
  rawError?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

// In-memory log buffer (for development/monitoring)
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 1000;

/**
 * Log an operation with standardized format
 */
export function logSocialMediaOperation(entry: Omit<LogEntry, 'timestamp'>): void {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date(),
  };

  // Add to buffer
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  // Always log to console in development
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    const icon = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      retry: '🔄',
    }[entry.status];

    console.log(
      `${icon} [${entry.operation}] ${entry.platform}${entry.accountId ? ` (${entry.accountId})` : ''}: ${entry.message}`
    );

    if (entry.rawError && process.env.DEBUG_SOCIAL_MEDIA) {
      console.log(`   Raw error: ${entry.rawError}`);
    }
  }

  // Send to monitoring service if configured
  if (process.env.SOCIAL_MEDIA_LOG_WEBHOOK) {
    sendToMonitoring(logEntry).catch((err) => {
      console.error('Failed to send log to monitoring:', err);
    });
  }
}

/**
 * Get recent logs for monitoring dashboard
 */
export function getRecentLogs(
  limit: number = 50,
  filters?: Partial<LogEntry>
): LogEntry[] {
  let logs = [...logBuffer].reverse();

  if (filters?.operation) {
    logs = logs.filter((l) => l.operation === filters.operation);
  }
  if (filters?.platform) {
    logs = logs.filter((l) => l.platform === filters.platform);
  }
  if (filters?.status) {
    logs = logs.filter((l) => l.status === filters.status);
  }

  return logs.slice(0, limit);
}

/**
 * Get error summary for monitoring
 */
export function getErrorSummary(timeWindowMinutes: number = 60) {
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const errors = logBuffer.filter((l) => l.timestamp >= cutoff && l.status === 'error');

  const byPlatform: Record<string, number> = {};
  const byOperation: Record<string, number> = {};

  for (const error of errors) {
    byPlatform[error.platform] = (byPlatform[error.platform] || 0) + 1;
    byOperation[error.operation] = (byOperation[error.operation] || 0) + 1;
  }

  return {
    totalErrors: errors.length,
    timeWindow: `${timeWindowMinutes} minutes`,
    byPlatform,
    byOperation,
    recentErrors: errors.slice(-5),
  };
}

/**
 * Send log entry to external monitoring service
 */
async function sendToMonitoring(entry: LogEntry): Promise<void> {
  if (!process.env.SOCIAL_MEDIA_LOG_WEBHOOK) return;

  try {
    await fetch(process.env.SOCIAL_MEDIA_LOG_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        environment: process.env.NODE_ENV,
        deployment: process.env.VERCEL_ENV || process.env.RAILWAY_ENVIRONMENT || 'unknown',
      }),
    });
  } catch (error) {
    // Silently fail to avoid log loops
  }
}

/**
 * Create error report for debugging
 */
export function createErrorReport(platform: string, accountId?: string) {
  const platformErrors = logBuffer.filter(
    (l) =>
      l.platform === platform &&
      (!accountId || l.accountId === accountId) &&
      l.status === 'error'
  );

  const errorPatterns: Record<string, number> = {};
  const recentErrors: string[] = [];

  for (const error of platformErrors) {
    if (error.rawError) {
      const key = error.rawError.substring(0, 50);
      errorPatterns[key] = (errorPatterns[key] || 0) + 1;
    }
    recentErrors.push(`${error.timestamp.toISOString()}: ${error.message}`);
  }

  return {
    platform,
    accountId,
    totalErrors: platformErrors.length,
    errorPatterns,
    recentErrors: recentErrors.slice(-5),
    firstError: platformErrors[0]?.timestamp,
    lastError: platformErrors[platformErrors.length - 1]?.timestamp,
    recommendations: generateRecommendations(platform, errorPatterns),
  };
}

/**
 * Generate recommendations based on error patterns
 */
function generateRecommendations(
  platform: string,
  errorPatterns: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  const errorStr = Object.keys(errorPatterns).join(' ');

  if (errorStr.includes('token') || errorStr.includes('unauthorized')) {
    recommendations.push(`Reconnect ${platform} account - token may be expired`);
  }

  if (errorStr.includes('permission') || errorStr.includes('scope')) {
    recommendations.push(`Request additional permissions for ${platform} app`);
  }

  if (errorStr.includes('rate') || errorStr.includes('quota')) {
    recommendations.push(`${platform} rate limit reached - implement backoff retry logic`);
  }

  if (errorStr.includes('invalid')) {
    recommendations.push(`Verify ${platform} account ID and credentials are correct`);
  }

  if (recommendations.length === 0) {
    recommendations.push(`Check ${platform} API status and network connectivity`);
  }

  return recommendations;
}

/**
 * Analytics for social media operations
 */
export function getOperationMetrics(operation?: 'analytics_sync' | 'post_publish') {
  const logsToAnalyze = operation ? logBuffer.filter((l) => l.operation === operation) : logBuffer;

  const total = logsToAnalyze.length;
  const successful = logsToAnalyze.filter((l) => l.status === 'success').length;
  const failed = logsToAnalyze.filter((l) => l.status === 'error').length;
  const warnings = logsToAnalyze.filter((l) => l.status === 'warning').length;
  const retries = logsToAnalyze.filter((l) => l.status === 'retry').length;

  const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) : '0.00';

  return {
    operation,
    total,
    successful,
    failed,
    warnings,
    retries,
    successRate: `${successRate}%`,
  };
}

/**
 * Clear old logs (called periodically to free memory)
 */
export function clearOldLogs(hoursAgo: number = 24): number {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const initialLength = logBuffer.length;

  let i = 0;
  while (i < logBuffer.length && logBuffer[i].timestamp < cutoff) {
    i++;
  }

  logBuffer.splice(0, i);
  return initialLength - logBuffer.length;
}
