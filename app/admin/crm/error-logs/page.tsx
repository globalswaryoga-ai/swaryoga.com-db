'use client';

/**
 * Error Logs Dashboard — Super Admin only.
 * Shows error statistics and recent error logs from the anti-bug system.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Bug, RefreshCw, Shield, Clock, TrendingUp, Filter, CheckCircle, XCircle } from 'lucide-react';

interface ErrorLog {
  _id: string;
  timestamp: string;
  level: 'error' | 'critical' | 'warning';
  source: string;
  message: string;
  stack?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  resolved?: boolean;
}

interface ErrorStats {
  total: number;
  critical: number;
  errors: number;
  warnings: number;
  topSources: { source: string; count: number }[];
}

export default function ErrorLogsPage() {
  const token = useAuth();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/admin/crm/error-logs?stats=true&hours=${hours}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/crm/error-logs?hours=${hours}&limit=100${levelFilter ? `&level=${levelFilter}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        if (s.success) setStats(s.data);
      }
      if (logsRes.ok) {
        const l = await logsRes.json();
        if (l.success) setLogs(l.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch error logs:', err);
    } finally {
      setLoading(false);
    }
  }, [token, hours, levelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const levelColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    error: 'bg-orange-100 text-orange-700 border-orange-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const levelDots: Record<string, string> = {
    critical: 'bg-red-500',
    error: 'bg-orange-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <Bug className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Error Logs</h1>
            <p className="text-sm text-gray-500">Anti-bug monitoring dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Time filter */}
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last 7 days</option>
          </select>
          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All Levels</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium text-red-500 uppercase">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-medium text-orange-500 uppercase">Errors</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.errors}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium text-yellow-600 uppercase">Warnings</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
          </div>
        </div>
      )}

      {/* Top Error Sources */}
      {stats && stats.topSources.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Top Error Sources
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.topSources.map((s) => (
              <span
                key={s.source}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700"
              >
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {s.source}
                <span className="text-gray-400">({s.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No errors state */}
      {!loading && logs.length === 0 && (
        <div className="bg-white rounded-xl border border-green-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">All Clear!</h3>
          <p className="text-sm text-gray-500">No errors in the last {hours} hours. System is healthy.</p>
        </div>
      )}

      {/* Error Logs List */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Recent Errors ({logs.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log._id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${levelDots[log.level] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${levelColors[log.level] || 'bg-gray-100 text-gray-600'}`}>
                        {log.level}
                      </span>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {log.source}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mt-1 truncate">
                      {log.message}
                    </p>
                    
                    {/* Expanded details */}
                    {expandedLog === log._id && (
                      <div className="mt-3 space-y-2">
                        {log.userId && (
                          <p className="text-xs text-gray-500">
                            <strong>User:</strong> {log.userId}
                          </p>
                        )}
                        {log.path && (
                          <p className="text-xs text-gray-500">
                            <strong>Path:</strong> {log.path}
                          </p>
                        )}
                        {log.method && (
                          <p className="text-xs text-gray-500">
                            <strong>Method:</strong> {log.method}
                          </p>
                        )}
                        {log.ip && (
                          <p className="text-xs text-gray-500">
                            <strong>IP:</strong> {log.ip}
                          </p>
                        )}
                        {log.stack && (
                          <pre className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-40 border border-gray-100 whitespace-pre-wrap break-all">
                            {log.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
