'use client';

/**
 * CRM-specific error boundary.
 * Shows branded error UI within the CRM layout.
 */

import { useEffect } from 'react';

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CRM Error]', error.message, error.stack);
    // Get auth token for logged error 
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    try {
      fetch('/api/admin/crm/error-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          level: 'error',
          source: 'crm-error-boundary',
          message: error.message,
          stack: error.stack,
          url: window.location.href,
        }),
      }).catch(() => {});
    } catch {}
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-lg w-full text-center bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          CRM Error
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Something went wrong in the CRM. This has been automatically logged for investigation.
        </p>
        
        {/* Error details (collapsed) */}
        <details className="text-left mb-6">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-mono text-gray-500 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-gray-400 mt-1">
                ID: {error.digest}
              </p>
            )}
          </div>
        </details>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/admin/crm'}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors border border-gray-200"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
