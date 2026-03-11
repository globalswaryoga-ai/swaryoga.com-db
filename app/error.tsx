'use client';

/**
 * Error boundary for regular pages (not root layout).
 * Catches errors in page components and shows a recovery UI.
 */

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PageError]', error.message, error.stack);
    // Fire-and-forget error report
    try {
      fetch('/api/admin/crm/error-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source: 'page-error-boundary',
          message: error.message,
          stack: error.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {}
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="text-5xl mb-4">🐛</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Oops! Something broke
        </h2>
        <p className="text-gray-500 text-sm mb-1">
          This error has been automatically reported to our team.
        </p>
        {error.digest && (
          <p className="text-gray-400 text-xs font-mono mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <p className="text-gray-400 text-xs bg-gray-50 rounded-lg p-3 mb-6 font-mono text-left break-all max-h-24 overflow-auto">
          {error.message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors border border-gray-200"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
