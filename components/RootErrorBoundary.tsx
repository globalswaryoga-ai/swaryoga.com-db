'use client';

import React, { ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log to console
    console.error('Root Error Boundary Caught:', error, errorInfo);

    // Update state with error details
    this.setState(prev => ({
      ...prev,
      errorInfo,
    }));

    // Send to error logging API
    try {
      fetch('/api/admin/crm/error-logs/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'critical',
          source: 'RootErrorBoundary',
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          path: typeof window !== 'undefined' ? window.location.pathname : '/',
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }),
      }).catch(() => {});
    } catch {}
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <html>
          <body>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              backgroundColor: '#f8f9fa',
              padding: '20px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              <div style={{
                maxWidth: '600px',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  marginBottom: '16px',
                }}>
                  Oops, something went wrong
                </h1>
                <p style={{
                  fontSize: '16px',
                  color: '#666',
                  marginBottom: '24px',
                  lineHeight: '1.5',
                }}>
                  We encountered an unexpected error. Our team has been notified and is working on a fix.
                </p>

                <details style={{
                  marginBottom: '24px',
                  textAlign: 'left',
                  backgroundColor: '#f3f4f6',
                  padding: '16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}>
                  <summary style={{
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Error Details (for debugging)
                  </summary>
                  <pre style={{
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    color: '#333',
                  }}>
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                    {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                  </pre>
                </details>

                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    backgroundColor: '#2d6a4f',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                  onMouseOver={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#1f4d37';
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#2d6a4f';
                  }}
                >
                  Go to Home
                </button>
              </div>
            </div>
          </body>
        </html>
      );
    }

    return this.props.children;
  }
}
