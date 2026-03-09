'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

type ProviderStatus = 'healthy' | 'degraded' | 'unhealthy';

type HealthData = {
  timestamp: string;
  providers: {
    meta: {
      status: ProviderStatus;
      successRate: number;
      consecutiveFailures: number;
      circuitOpen: boolean;
      liveCheck: { healthy: boolean; error?: string };
    };
    qr_bridge: {
      status: ProviderStatus;
      successRate: number;
      consecutiveFailures: number;
      circuitOpen: boolean;
      liveCheck: { connected: boolean; status: string; error?: string };
    };
  };
  circuitBreakers: { meta: boolean; qr_bridge: boolean };
  queuedMessages: number;
  summary: {
    allHealthy: boolean;
    primaryProvider: string;
    hasBackup: boolean;
  };
};

const statusColors: Record<ProviderStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

const statusLabels: Record<ProviderStatus, string> = {
  healthy: '🟢 Healthy',
  degraded: '🟡 Degraded',
  unhealthy: '🔴 Unhealthy',
};

export function WhatsAppHealthStatus({ compact = false }: { compact?: boolean }) {
  const token = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/admin/crm/whatsapp/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success && data.data) {
        setHealth(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <span className="animate-pulse">⏳</span>
        <span>Checking WhatsApp...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <span>❌</span>
        <span>Health check failed: {error}</span>
      </div>
    );
  }

  if (!health) return null;

  // Compact view for header/navbar
  if (compact) {
    const allHealthy = health.summary.allHealthy;
    const queueCount = health.queuedMessages;
    
    return (
      <div className="flex items-center gap-2">
        <span 
          className={`w-2 h-2 rounded-full ${allHealthy ? 'bg-green-500' : 'bg-yellow-500'}`}
          title={allHealthy ? 'All WhatsApp providers healthy' : 'Some providers have issues'}
        />
        <span className="text-xs text-gray-600">
          WhatsApp: {allHealthy ? '✓' : '⚠'}
        </span>
        {queueCount > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
            {queueCount} queued
          </span>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">WhatsApp Integration Health</h3>
        <button 
          onClick={fetchHealth}
          className="text-indigo-500 text-sm hover:underline"
        >
          🔄 Refresh
        </button>
      </div>
      
      {/* Summary */}
      <div className={`mb-4 p-3 rounded ${health.summary.allHealthy ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${health.summary.allHealthy ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="font-medium">
            {health.summary.allHealthy ? 'All Systems Operational' : 'Some Issues Detected'}
          </span>
        </div>
        {health.summary.hasBackup && (
          <p className="text-sm text-gray-600 mt-1">
            ✓ Backup provider available for automatic failover
          </p>
        )}
        <p className="text-sm text-gray-600">
          Primary: <strong>{health.summary.primaryProvider.toUpperCase()}</strong>
        </p>
      </div>
      
      {/* Provider Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Meta Cloud API */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">☁️ Meta Cloud API</h4>
            <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[health.providers.meta.status]}`}>
              {health.providers.meta.status}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <p>Success Rate: {Math.round(health.providers.meta.successRate * 100)}%</p>
            <p>Failures: {health.providers.meta.consecutiveFailures}</p>
            {health.providers.meta.circuitOpen && (
              <p className="text-red-500 font-medium">⚠ Circuit Breaker OPEN</p>
            )}
            <p className={health.providers.meta.liveCheck.healthy ? 'text-green-600' : 'text-red-600'}>
              Live: {health.providers.meta.liveCheck.healthy ? '✓ Connected' : '✗ ' + (health.providers.meta.liveCheck.error || 'Disconnected')}
            </p>
          </div>
        </div>
        
        {/* QR Bridge */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">📱 QR WhatsApp</h4>
            <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[health.providers.qr_bridge.status]}`}>
              {health.providers.qr_bridge.status}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <p>Success Rate: {Math.round(health.providers.qr_bridge.successRate * 100)}%</p>
            <p>Failures: {health.providers.qr_bridge.consecutiveFailures}</p>
            {health.providers.qr_bridge.circuitOpen && (
              <p className="text-red-500 font-medium">⚠ Circuit Breaker OPEN</p>
            )}
            <p className={health.providers.qr_bridge.liveCheck.connected ? 'text-green-600' : 'text-red-600'}>
              Live: {health.providers.qr_bridge.liveCheck.connected 
                ? '✓ Connected' 
                : '✗ ' + (health.providers.qr_bridge.liveCheck.status || 'Disconnected')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Message Queue */}
      {health.queuedMessages > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded">
          <p className="text-sm">
            📦 <strong>{health.queuedMessages}</strong> messages queued for retry
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-400 mt-4">
        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}

export default WhatsAppHealthStatus;
