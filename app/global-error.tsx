'use client';

/**
 * Global Error Boundary — catches unhandled errors in the root layout.
 * This file MUST be named global-error.tsx and placed in the app/ directory.
 * It replaces the entire <html> tag when an error occurs.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Report error to console (and Sentry if available)
  if (typeof window !== 'undefined') {
    console.error('[GlobalError]', error.message, error.stack);
    // Fire-and-forget error report to our API
    try {
      fetch('/api/admin/crm/error-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'critical',
          source: 'global-error-boundary',
          message: error.message,
          stack: error.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {}
  }

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: '#fafafa' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            background: 'white',
            borderRadius: '16px',
            padding: '3rem 2rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #eee',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p style={{ color: '#999', fontSize: '0.75rem', fontFamily: 'monospace', margin: '0 0 1.5rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#2D6A4F',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
