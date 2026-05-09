import { useCallback, useEffect } from 'react';

export interface ErrorLogPayload {
  level: 'critical' | 'error' | 'warning';
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  path?: string;
  timestamp?: string;
}

/**
 * Hook to log errors to the backend error tracking system
 */
export function useErrorLogger() {
  const logError = useCallback(async (payload: ErrorLogPayload) => {
    try {
      await fetch('/api/admin/crm/error-logs/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: payload.timestamp || new Date().toISOString(),
          path: payload.path || window.location.pathname,
          userAgent: navigator.userAgent,
          ip: undefined, // Backend will track actual IP
        }),
      });
    } catch (err) {
      // Fallback logging if error service fails
      console.error('Failed to log error:', err);
    }
  }, []);

  // Catch unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError({
        level: 'error',
        source: 'unhandled-promise-rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: { reason: event.reason },
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [logError]);

  // Catch global errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError({
        level: 'error',
        source: 'global-error',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [logError]);

  return { logError };
}
