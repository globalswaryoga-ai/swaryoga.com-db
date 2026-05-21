'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth-client';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unchecked';
  message: string;
  lastCheck?: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  overallStatus: 'healthy' | 'warning' | 'error';
  checkedAt: string;
  components: HealthStatus[];
  recommendations: string[];
}

export default function HealthReportPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  async function checkHealth() {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('/api/admin/crm/qr/health-check', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Error checking health:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'error':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-300';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Checking system health...</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg mb-4">Failed to load health report</p>
          <button
            onClick={checkHealth}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const healthyCount = health.components.filter((c) => c.status === 'healthy').length;
  const totalCount = health.components.length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          {getStatusIcon(health.overallStatus)} QR WhatsApp System Health Report
        </h1>
        <p className="text-gray-600 mb-8">
          Complete status of all broadcast, merge, and deduplication systems
        </p>

        {/* Overall Status Card */}
        <div className={`border-2 rounded-lg p-8 mb-8 ${getOverallStatusColor(health.overallStatus)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold capitalize mb-2">{health.overallStatus}</h2>
              <p className="text-sm opacity-75">
                Last checked: {new Date(health.checkedAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold mb-2">
                {healthyCount}/{totalCount}
              </div>
              <p className="text-lg">Components Healthy</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto-refresh every minute</span>
          </label>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? '🔄 Checking...' : '🔄 Check Now'}
          </button>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {health.components.map((component) => (
            <div
              key={component.name}
              className={`border-2 rounded-lg p-6 ${getStatusColor(component.status)}`}
            >
              <h3 className="text-lg font-bold mb-3">
                {getStatusIcon(component.status)} {component.name}
              </h3>

              <p className="text-sm mb-4">{component.message}</p>

              {component.details && Object.keys(component.details).length > 0 && (
                <details className="text-xs mt-4 pt-4 border-t border-current border-opacity-25">
                  <summary className="cursor-pointer font-semibold mb-3">
                    📊 Details
                  </summary>
                  <div className="bg-black bg-opacity-10 p-3 rounded space-y-1">
                    {Object.entries(component.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4">
                        <span className="font-semibold">{key}:</span>
                        <span className="text-right">
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">💡 Recommendations</h3>
            <ul className="space-y-3">
              {health.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-blue-600 font-bold flex-shrink-0">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guide */}
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">📖 Status Guide</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <span>Error</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❓</span>
              <span>Unchecked</span>
            </div>
          </div>

          <p className="text-sm text-gray-700">
            ✅ = Safe to use | ⚠️ = Monitor | ❌ = Fix before use
          </p>
        </div>
      </div>
    </div>
  );
}
