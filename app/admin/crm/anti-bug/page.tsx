'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle,
  Activity,
  Bug,
  CheckCircle2,
  Clock3,
  Database,
  Radio,
  RefreshCw,
  Shield,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

type EndpointCheck = {
  path: string;
  status: number | null;
  ok: boolean;
  message: string;
  timeMs: number;
};

type AntiBugReport = {
  status: 'healthy' | 'warning' | 'critical';
  generatedAt: string;
  windowHours: number;
  checks: {
    mongodb: { ok: boolean; latencyMs: number; error?: string };
    bridge: {
      ok: boolean;
      status: number;
      message: string;
      connected: boolean;
      url: string;
      urlValid: boolean;
      urlError?: string;
      endpoints: Record<string, EndpointCheck>;
    };
    config: {
      hasMongoUri: boolean;
      hasJwtSecret: boolean;
      hasBridgeUrl: boolean;
      hasBridgeSecret: boolean;
      hasWhatsAppToken: boolean;
    };
  };
  errorStats: {
    last1h: {
      total: number;
      critical: number;
      errors: number;
      warnings: number;
      topSources: { source: string; count: number }[];
    };
    last24h: {
      total: number;
      critical: number;
      errors: number;
      warnings: number;
      topSources: { source: string; count: number }[];
    };
    qrRecentCount: number;
    qrCriticalCount: number;
  };
  qrStats: {
    totalSettingsDocs: number;
    ownBridgeCount: number;
    sharedEnabledCount: number;
    connectedPhoneCount: number;
    permanentTenantCount: number;
    missingSecretCount: number;
    sharedWithoutBridgeCount: number;
    totalSessionChats: number;
    totalSessionMessages: number;
    uniqueConnectedPhones: number;
  };
  provisioningStats: {
    totalAdminUsers: number;
    missingSettingsCount: number;
    missingTenantSlugCount: number;
    missingPermanentIdCount: number;
    missingSecretCount: number;
    missingCompartmentCount: number;
    missingTenantCount: number;
    missingCrmTenantCount: number;
    missingTenantSetupCount: number;
    sampleMissingSettingsUsers: string[];
    sampleMissingTenantSlugUsers: string[];
    sampleMissingPermanentIdUsers: string[];
    sampleMissingCompartmentUsers: string[];
    sampleMissingCrmTenantSlugs: string[];
    sampleMissingTenantSetupSlugs: string[];
  };
  recommendations: string[];
  recentQrErrors: Array<{
    _id: string;
    timestamp: string;
    level: 'error' | 'critical' | 'warning';
    source: string;
    message: string;
    path?: string;
    method?: string;
    userId?: string;
  }>;
};

const statusStyles = {
  healthy: {
    badge: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
  },
  critical: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: TriangleAlert,
    iconColor: 'text-red-600',
  },
} as const;

export default function AntiBugPage() {
  const token = useAuth();
  const [report, setReport] = useState<AntiBugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/crm/anti-bug?hours=${hours}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load anti-bug diagnostics');
      }

      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load anti-bug diagnostics');
    } finally {
      setLoading(false);
    }
  }, [token, hours]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const interval = setInterval(fetchReport, 30000);
    return () => clearInterval(interval);
  }, [fetchReport]);

  const statusMeta = useMemo(() => {
    if (!report) return statusStyles.healthy;
    return statusStyles[report.status];
  }, [report]);

  const StatusIcon = statusMeta.icon;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <Shield className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Anti-Bug Center</h1>
            <p className="text-sm text-gray-500">Super Admin diagnostics for CRM, QR WhatsApp, and bridge health</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/admin/crm/error-logs"
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Bug className="h-4 w-4" />
            Error Logs
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${report.status === 'healthy' ? 'bg-green-50' : report.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <StatusIcon className={`h-6 w-6 ${statusMeta.iconColor}`} />
                </div>
                <div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold uppercase ${statusMeta.badge}`}>
                    {report.status}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Generated {new Date(report.generatedAt).toLocaleString()} · Window {report.windowHours}h
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[11px] uppercase text-gray-500 font-semibold">Mongo</p>
                  <p className={`text-sm font-bold mt-1 ${report.checks.mongodb.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {report.checks.mongodb.ok ? 'Healthy' : 'Down'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{report.checks.mongodb.latencyMs} ms</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[11px] uppercase text-gray-500 font-semibold">Bridge</p>
                  <p className={`text-sm font-bold mt-1 ${report.checks.bridge.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {report.checks.bridge.ok ? 'Reachable' : 'Problem'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{report.checks.bridge.connected ? 'WhatsApp connected' : 'Not connected'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[11px] uppercase text-gray-500 font-semibold">QR Errors</p>
                  <p className="text-sm font-bold mt-1 text-orange-600">{report.errorStats.qrRecentCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Recent in window</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[11px] uppercase text-gray-500 font-semibold">Connected Phones</p>
                  <p className="text-sm font-bold mt-1 text-indigo-600">{report.qrStats.connectedPhoneCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Saved QR senders</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Error Rate 1h</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{report.errorStats.last1h.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {report.errorStats.last1h.critical} critical · {report.errorStats.last1h.errors} errors
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock3 className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Error Rate 24h</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{report.errorStats.last24h.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {report.errorStats.last24h.critical} critical · {report.errorStats.last24h.warnings} warnings
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold uppercase text-gray-500">QR Storage</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{report.qrStats.totalSessionChats}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    chats · {report.qrStats.totalSessionMessages} messages
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Core checks
                </h2>

                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">MongoDB</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Latency {report.checks.mongodb.latencyMs} ms
                          {report.checks.mongodb.error ? ` · ${report.checks.mongodb.error}` : ''}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${report.checks.mongodb.ok ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {report.checks.mongodb.ok ? 'OK' : 'FAIL'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">WhatsApp bridge</p>
                        <p className="text-xs text-gray-500 mt-1 break-all">
                          {report.checks.bridge.message}
                          {report.checks.bridge.url ? ` · ${report.checks.bridge.url}` : ''}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${report.checks.bridge.ok ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {report.checks.bridge.ok ? 'OK' : 'FAIL'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {Object.values(report.checks.bridge.endpoints).map((endpoint) => (
                        <div key={endpoint.path} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-700">{endpoint.path}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${endpoint.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {endpoint.status ?? 'ERR'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">{endpoint.message} · {endpoint.timeMs} ms</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Config essentials</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(report.checks.config).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                          <p className="text-[10px] uppercase text-gray-500 font-semibold">{key}</p>
                          <p className={`text-xs font-bold mt-1 ${value ? 'text-green-600' : 'text-red-600'}`}>{value ? 'present' : 'missing'}</p>
                        </div>
                      ))}
                    </div>
                    {!report.checks.bridge.urlValid && report.checks.bridge.urlError && (
                      <p className="text-xs text-red-600 mt-3">Bridge URL issue: {report.checks.bridge.urlError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  QR isolation stats
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    ['Settings docs', report.qrStats.totalSettingsDocs],
                    ['Own bridge', report.qrStats.ownBridgeCount],
                    ['Shared enabled', report.qrStats.sharedEnabledCount],
                    ['Permanent tenant', report.qrStats.permanentTenantCount],
                    ['Unique phones', report.qrStats.uniqueConnectedPhones],
                    ['Saved senders', report.qrStats.connectedPhoneCount],
                    ['Missing secrets', report.qrStats.missingSecretCount],
                    ['Shared fallback', report.qrStats.sharedWithoutBridgeCount],
                    ['Session chats', report.qrStats.totalSessionChats],
                    ['Session messages', report.qrStats.totalSessionMessages],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase font-semibold text-gray-500">{label}</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Signup provisioning health
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    ['CRM admins', report.provisioningStats.totalAdminUsers],
                    ['Missing tenantSlug', report.provisioningStats.missingTenantSlugCount],
                    ['Missing settings', report.provisioningStats.missingSettingsCount],
                    ['Missing compartments', report.provisioningStats.missingCompartmentCount],
                    ['Missing crm_tenants', report.provisioningStats.missingCrmTenantCount],
                    ['Missing tenant_setup', report.provisioningStats.missingTenantSetupCount],
                    ['Missing tenant IDs', report.provisioningStats.missingPermanentIdCount],
                    ['Missing QR secrets', report.provisioningStats.missingSecretCount],
                    ['Missing tenants', report.provisioningStats.missingTenantCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase font-semibold text-gray-500">{label}</p>
                      <p className={`text-xl font-bold mt-1 ${Number(value) > 0 && String(label).startsWith('Missing') ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['Missing settings users', report.provisioningStats.sampleMissingSettingsUsers],
                    ['Missing tenantSlug', report.provisioningStats.sampleMissingTenantSlugUsers],
                    ['Missing tenant IDs', report.provisioningStats.sampleMissingPermanentIdUsers],
                    ['Missing compartments', report.provisioningStats.sampleMissingCompartmentUsers],
                    ['Missing crm_tenants', report.provisioningStats.sampleMissingCrmTenantSlugs],
                    ['Missing tenant_setup', report.provisioningStats.sampleMissingTenantSetupSlugs],
                  ].map(([label, items]: [string, string[]]) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
                      {(items as string[]).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(items as string[]).map((item) => (
                            <span key={item} className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-[11px] border border-red-100">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-green-600">No gaps found.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Recommendations
                </h2>
                <div className="space-y-3">
                  {report.recommendations.map((item, index) => (
                    <div key={`${index}-${item.slice(0, 20)}`} className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-sm text-gray-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {report.errorStats.last24h.topSources.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Top error sources
                  </h2>
                  <div className="space-y-2">
                    {report.errorStats.last24h.topSources.slice(0, 8).map((source) => (
                      <div key={source.source} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                        <span className="text-xs text-gray-700 truncate">{source.source}</span>
                        <span className="text-xs font-bold text-red-600">{source.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recent QR / bridge errors
                </h2>

                {report.recentQrErrors.length === 0 ? (
                  <div className="rounded-xl border border-green-100 bg-green-50 text-green-700 px-3 py-4 text-sm">
                    No QR or bridge errors found in this window. Nice — the bug gremlins are currently unemployed.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {report.recentQrErrors.map((item) => (
                      <div key={item._id || `${item.timestamp}-${item.source}`} className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.level === 'critical' ? 'bg-red-100 text-red-700' : item.level === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.level}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold">{item.source}</span>
                        </div>
                        <p className="text-sm text-gray-800 break-words">{item.message}</p>
                        <p className="text-[11px] text-gray-500 mt-2">
                          {new Date(item.timestamp).toLocaleString()}
                          {item.userId ? ` · user ${item.userId}` : ''}
                          {item.method ? ` · ${item.method}` : ''}
                        </p>
                        {item.path && <p className="text-[11px] text-gray-500 mt-1 break-all">{item.path}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}