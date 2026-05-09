/**
 * Error tracking utilities for frontend monitoring
 */

export interface APIErrorLog {
  level: 'error' | 'critical' | 'warning';
  source: string;
  message: string;
  method: string;
  path: string;
  statusCode?: number;
  response?: any;
  stack?: string;
  timestamp?: string;
}

/**
 * Wrapper for fetch with automatic error tracking
 */
export async function fetchWithErrorTracking(
  url: string,
  options: RequestInit & { skipErrorLogging?: boolean } = {}
) {
  const { skipErrorLogging, ...fetchOptions } = options;
  const startTime = performance.now();

  try {
    const response = await fetch(url, fetchOptions);
    const duration = performance.now() - startTime;

    // Log slow requests
    if (duration > 5000) {
      logError({
        level: 'warning',
        source: 'api-slow-request',
        message: `Slow API request: ${fetchOptions.method || 'GET'} ${url} took ${duration.toFixed(0)}ms`,
        method: fetchOptions.method || 'GET',
        path: url,
        context: { duration },
      });
    }

    // Log failed responses
    if (!response.ok && !skipErrorLogging) {
      const contentType = response.headers.get('content-type');
      let responseData: any = null;

      try {
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch {
        responseData = 'Could not parse response';
      }

      logError({
        level: response.status >= 500 ? 'critical' : 'error',
        source: 'api-error',
        message: `API Error: ${response.status} ${response.statusText} - ${url}`,
        method: fetchOptions.method || 'GET',
        path: url,
        statusCode: response.status,
        response: responseData,
      });
    }

    return response;
  } catch (err) {
    if (!skipErrorLogging) {
      logError({
        level: 'critical',
        source: 'api-network-error',
        message: `Network error on ${fetchOptions.method || 'GET'} ${url}: ${err instanceof Error ? err.message : String(err)}`,
        method: fetchOptions.method || 'GET',
        path: url,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    throw err;
  }
}

/**
 * Log error to backend
 */
export async function logError(payload: Omit<APIErrorLog, 'timestamp'> & { context?: any }) {
  try {
    await fetch('/api/admin/crm/error-logs/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        path: payload.path || window.location.pathname,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      }),
    });
  } catch {
    // Silently fail if error logging fails
    console.error('Failed to report error:', payload);
  }
}

/**
 * Monitor page performance
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Log Core Web Vitals
  if ('PerformanceObserver' in window) {
    try {
      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          const value = (entry as any).value;
          if (value > 0.1) {
            logError({
              level: 'warning',
              source: 'performance-cls',
              message: `High Cumulative Layout Shift: ${value.toFixed(3)}`,
              path: window.location.pathname,
              context: { cls: value },
            });
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // Ignore if not supported
    }

    try {
      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const delay = (entry as any).processingDuration;
          if (delay > 100) {
            logError({
              level: 'warning',
              source: 'performance-fid',
              message: `High First Input Delay: ${delay.toFixed(0)}ms`,
              path: window.location.pathname,
              context: { fid: delay },
            });
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {
      // Ignore if not supported
    }

    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry.renderTime > 2500) {
          logError({
            level: 'warning',
            source: 'performance-lcp',
            message: `High Largest Contentful Paint: ${lastEntry.renderTime.toFixed(0)}ms`,
            path: window.location.pathname,
            context: { lcp: lastEntry.renderTime },
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // Ignore if not supported
    }
  }
}
