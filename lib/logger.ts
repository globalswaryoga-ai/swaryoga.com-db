/**
 * @fileoverview Structured Logger for API routes and server-side code.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.info('leads', 'Lead created', { leadId: '123', phone: '91...' });
 *   logger.error('whatsapp', 'Message send failed', error, { to: '91...' });
 *   logger.warn('auth', 'Token near expiry', { userId });
 *
 * Each log line is JSON so it can be parsed by Vercel / CloudWatch / any
 * log aggregator. Extend `emitLog` when you integrate Sentry, Datadog, etc.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogDomain =
  | 'auth'
  | 'leads'
  | 'whatsapp'
  | 'whatsapp-bridge'
  | 'meta-webhook'
  | 'payments'
  | 'chatbot'
  | 'broadcasting'
  | 'crm'
  | 'tenant'
  | 'storage'
  | 'api'
  | 'db'
  | 'general';

interface StructuredLog {
  ts: string;
  level: LogLevel;
  domain: LogDomain;
  msg: string;
  /** Milliseconds since epoch — useful for log sorting */
  epoch: number;
  /** Extra context attached by the caller */
  ctx?: Record<string, unknown>;
  /** Error message (only for level=error) */
  err?: string;
  /** Error stack trace (only for level=error) */
  stack?: string;
}

// ── Configuration ───────────────────────────────────────────
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

// ── Core Emitter ────────────────────────────────────────────
function emitLog(entry: StructuredLog) {
  const line = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'debug':
      console.debug(line);
      break;
    default:
      console.log(line);
  }

  // ── Future integrations ──
  // Sentry:   if (entry.level === 'error') Sentry.captureMessage(entry.msg, { extra: entry });
  // Datadog:  ddClient.log(entry);
}

// ── Public API ──────────────────────────────────────────────
function log(
  level: LogLevel,
  domain: LogDomain,
  msg: string,
  errorOrCtx?: Error | Record<string, unknown>,
  ctx?: Record<string, unknown>,
) {
  if (!shouldLog(level)) return;

  const now = new Date();
  const entry: StructuredLog = {
    ts: now.toISOString(),
    level,
    domain,
    msg,
    epoch: now.getTime(),
  };

  if (errorOrCtx instanceof Error) {
    entry.err = errorOrCtx.message;
    entry.stack = errorOrCtx.stack;
    if (ctx) entry.ctx = ctx;
  } else if (errorOrCtx) {
    entry.ctx = errorOrCtx;
  }

  emitLog(entry);
}

export const logger = {
  debug: (domain: LogDomain, msg: string, ctx?: Record<string, unknown>) =>
    log('debug', domain, msg, ctx),

  info: (domain: LogDomain, msg: string, ctx?: Record<string, unknown>) =>
    log('info', domain, msg, ctx),

  warn: (domain: LogDomain, msg: string, ctx?: Record<string, unknown>) =>
    log('warn', domain, msg, ctx),

  /** Pass an Error object as the 3rd arg, optional extra context as 4th */
  error: (
    domain: LogDomain,
    msg: string,
    error?: Error | unknown,
    ctx?: Record<string, unknown>,
  ) => {
    const err =
      error instanceof Error
        ? error
        : error
          ? new Error(String(error))
          : undefined;
    log('error', domain, msg, err, ctx);
  },
};

/**
 * Convenience: wrap an async API handler so uncaught errors are logged
 * and returned as a standard JSON error response.
 *
 * Usage:
 *   export const GET = withErrorLogging('leads', async (req) => { ... });
 */
export function withErrorLogging(
  domain: LogDomain,
  handler: (req: Request, ...args: any[]) => Promise<Response>,
) {
  return async function (req: Request, ...args: any[]) {
    try {
      return await handler(req, ...args);
    } catch (err) {
      logger.error(domain, `Unhandled error in ${req.method} ${new URL(req.url).pathname}`, err, {
        method: req.method,
        url: req.url,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  };
}
