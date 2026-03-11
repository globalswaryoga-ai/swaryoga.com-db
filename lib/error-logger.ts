/**
 * @fileoverview Centralized API Error Logger
 * Logs all API errors to MongoDB `error_logs` collection for debugging.
 * Also sends critical errors to Sentry if configured.
 *
 * Usage:
 *   import { logApiError, logCriticalError } from '@/lib/error-logger';
 *   await logApiError('whatsapp/send', error, { userId, phone });
 */

import { connectDB } from '@/lib/db';

// ── Error Log Schema ──
interface ErrorLogEntry {
  timestamp: Date;
  level: 'error' | 'critical' | 'warning';
  source: string;       // e.g. 'api/admin/crm/whatsapp/qr-bridge'
  message: string;
  stack?: string;
  userId?: string;
  method?: string;       // GET, POST, etc.
  path?: string;         // request path
  statusCode?: number;
  metadata?: Record<string, any>;
  userAgent?: string;
  ip?: string;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Module-level model cache
let ErrorLogModel: any = null;

async function getErrorLogModel() {
  if (ErrorLogModel) return ErrorLogModel;

  const mongoose = (await import('mongoose')).default;
  await connectDB();

  // Use CRM database for error logs
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  const crmConn = mongoose.connection.useDb(crmDbName, { useCache: true });

  const schema = new mongoose.Schema(
    {
      timestamp: { type: Date, default: Date.now, index: true },
      level: {
        type: String,
        enum: ['error', 'critical', 'warning'],
        default: 'error',
        index: true,
      },
      source: { type: String, required: true, index: true },
      message: { type: String, required: true },
      stack: String,
      userId: { type: String, index: true },
      method: String,
      path: String,
      statusCode: Number,
      metadata: { type: mongoose.Schema.Types.Mixed },
      userAgent: String,
      ip: String,
      resolved: { type: Boolean, default: false },
      resolvedAt: Date,
      resolvedBy: String,
    },
    {
      timestamps: false,
      // Auto-delete after 30 days to prevent unbounded growth
      expireAfterSeconds: 30 * 24 * 60 * 60,
    }
  );

  // TTL index on timestamp
  schema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  ErrorLogModel = crmConn.models.error_log || crmConn.model('error_log', schema, 'error_logs');
  return ErrorLogModel;
}

/**
 * Log an API error to MongoDB.
 * Fire-and-forget — never throws.
 */
export async function logApiError(
  source: string,
  error: unknown,
  extra?: Partial<Omit<ErrorLogEntry, 'timestamp' | 'source' | 'message' | 'stack' | 'level'>>
): Promise<void> {
  try {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const Model = await getErrorLogModel();
    await Model.create({
      timestamp: new Date(),
      level: 'error',
      source,
      message: msg,
      stack,
      ...extra,
    });

    // Also report to Sentry if available
    if (typeof globalThis !== 'undefined' && (globalThis as any).__SENTRY__) {
      try {
        const Sentry = (globalThis as any).__SENTRY__;
        Sentry.captureException?.(error instanceof Error ? error : new Error(msg), {
          tags: { source },
          extra,
        });
      } catch {}
    }
  } catch (logErr) {
    // Never let the logger crash the app
    console.error('[ErrorLogger] Failed to log error:', logErr);
  }
}

/**
 * Log a critical error — same as logApiError but with level='critical'.
 */
export async function logCriticalError(
  source: string,
  error: unknown,
  extra?: Partial<Omit<ErrorLogEntry, 'timestamp' | 'source' | 'message' | 'stack' | 'level'>>
): Promise<void> {
  try {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const Model = await getErrorLogModel();
    await Model.create({
      timestamp: new Date(),
      level: 'critical',
      source,
      message: msg,
      stack,
      ...extra,
    });
  } catch (logErr) {
    console.error('[ErrorLogger] Failed to log critical error:', logErr);
  }
}

/**
 * Log a warning (non-fatal issues like deprecations, slow queries).
 */
export async function logWarning(
  source: string,
  message: string,
  extra?: Partial<Omit<ErrorLogEntry, 'timestamp' | 'source' | 'message' | 'stack' | 'level'>>
): Promise<void> {
  try {
    const Model = await getErrorLogModel();
    await Model.create({
      timestamp: new Date(),
      level: 'warning',
      source,
      message,
      ...extra,
    });
  } catch (logErr) {
    console.error('[ErrorLogger] Failed to log warning:', logErr);
  }
}

/**
 * Get recent error logs (for the admin error dashboard).
 */
export async function getRecentErrors(opts?: {
  limit?: number;
  level?: 'error' | 'critical' | 'warning';
  source?: string;
  since?: Date;
  resolved?: boolean;
}): Promise<ErrorLogEntry[]> {
  const Model = await getErrorLogModel();
  const filter: any = {};
  if (opts?.level) filter.level = opts.level;
  if (opts?.source) filter.source = { $regex: opts.source, $options: 'i' };
  if (opts?.since) filter.timestamp = { $gte: opts.since };
  if (opts?.resolved !== undefined) filter.resolved = opts.resolved;

  return Model.find(filter)
    .sort({ timestamp: -1 })
    .limit(opts?.limit || 50)
    .lean();
}

/**
 * Get error statistics (counts by level and source).
 */
export async function getErrorStats(since?: Date): Promise<{
  total: number;
  critical: number;
  errors: number;
  warnings: number;
  topSources: { source: string; count: number }[];
}> {
  const Model = await getErrorLogModel();
  const filter: any = since ? { timestamp: { $gte: since } } : {};

  const [counts, topSources] = await Promise.all([
    Model.aggregate([
      { $match: filter },
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]),
    Model.aggregate([
      { $match: { ...filter, level: { $in: ['error', 'critical'] } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c._id] = c.count;

  return {
    total: Object.values(countMap).reduce((a, b) => a + b, 0),
    critical: countMap.critical || 0,
    errors: countMap.error || 0,
    warnings: countMap.warning || 0,
    topSources: topSources.map((s: any) => ({ source: s._id, count: s.count })),
  };
}
