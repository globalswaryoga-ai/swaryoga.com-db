'use client';

/**
 * Global Client Error Catcher
 * Catches unhandled errors and promise rejections in the browser,
 * reports them to the error logging API.
 * 
 * Add this component once in the root layout.
 */

import { useEffect } from 'react';

// Prevent duplicate reports for the same error
const reportedErrors = new Set<string>();

function reportError(level: 'error' | 'critical', source: string, message: string, stack?: string) {
  const key = `${source}:${message}`;
  if (reportedErrors.has(key)) return;
  reportedErrors.add(key);
  // Clear old entries to prevent memory leak
  if (reportedErrors.size > 100) reportedErrors.clear();

  try {
    fetch('/api/admin/crm/error-logs/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        source,
        message,
        stack,
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        context: {
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined,
          online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      }),
    }).catch(() => {});
  } catch {}
}

export default function ErrorCatcher() {
  useEffect(() => {
    const handleDeploymentChunkRecovery = (msg: string) => {
      if (
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch dynamically imported module')
      ) {
        if (typeof window !== 'undefined') {
          const lastReload = sessionStorage.getItem('swar_chunk_recovery_reload');
          const now = Date.now();
          // Rate-limit recovery to at most once every 30 seconds
          if (!lastReload || now - Number(lastReload) > 30000) {
            sessionStorage.setItem('swar_chunk_recovery_reload', String(now));
            console.log('[Deployment Auto-Recovery] Detected updated deployment chunk. Performing clean refresh...');
            window.location.reload();
            return true;
          }
        }
      }
      return false;
    };

    // Catch uncaught errors
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (handleDeploymentChunkRecovery(msg)) return;

      // Skip errors from browser extensions or third-party scripts
      if (event.filename && !event.filename.includes(window.location.origin)) return;
      reportError('error', 'window.onerror', event.message, event.error?.stack);
    };

    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason || 'Unknown promise rejection');
      if (handleDeploymentChunkRecovery(message)) return;

      const stack = reason instanceof Error ? reason.stack : undefined;
      reportError('error', 'unhandledrejection', message, stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null; // This component renders nothing
}
