/**
 * Security Monitor — centralized logging for security events
 * 
 * Provides structured security event logging that can be piped to
 * console (dev) or a monitoring service (production).
 * 
 * Usage in API routes:
 *   import { securityLog } from '@/lib/security/monitor';
 *   securityLog.warn('BRUTE_FORCE', { ip, attempts: 5 });
 */

export type SecuritySeverity = 'info' | 'warn' | 'critical';

export interface SecurityEvent {
  severity: SecuritySeverity;
  code: string;
  message: string;
  ip?: string;
  path?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

// In-memory ring buffer (last 500 events) for diagnostic endpoint
const EVENT_BUFFER_SIZE = 500;
const eventBuffer: SecurityEvent[] = [];

function pushEvent(event: SecurityEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length > EVENT_BUFFER_SIZE) {
    eventBuffer.shift();
  }
}

function log(severity: SecuritySeverity, code: string, detail?: { ip?: string; path?: string; meta?: Record<string, unknown> }): void {
  const event: SecurityEvent = {
    severity,
    code,
    message: `[SECURITY:${severity.toUpperCase()}] ${code}`,
    ip: detail?.ip,
    path: detail?.path,
    meta: detail?.meta,
    timestamp: new Date().toISOString(),
  };

  pushEvent(event);

  // Structured console output
  const logFn = severity === 'critical' ? console.error : severity === 'warn' ? console.warn : console.log;
  logFn(event.message, { ip: event.ip, path: event.path, ...(event.meta || {}) });
}

export const securityLog = {
  info: (code: string, detail?: { ip?: string; path?: string; meta?: Record<string, unknown> }) => log('info', code, detail),
  warn: (code: string, detail?: { ip?: string; path?: string; meta?: Record<string, unknown> }) => log('warn', code, detail),
  critical: (code: string, detail?: { ip?: string; path?: string; meta?: Record<string, unknown> }) => log('critical', code, detail),

  /** Get recent events (for admin diagnostic endpoint) */
  getRecent(count = 50): SecurityEvent[] {
    return eventBuffer.slice(-count);
  },

  /** Get counts by severity in the last N minutes */
  getSummary(minutes = 60): Record<SecuritySeverity, number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const summary: Record<SecuritySeverity, number> = { info: 0, warn: 0, critical: 0 };
    for (const e of eventBuffer) {
      if (e.timestamp >= cutoff) {
        summary[e.severity]++;
      }
    }
    return summary;
  },
};
