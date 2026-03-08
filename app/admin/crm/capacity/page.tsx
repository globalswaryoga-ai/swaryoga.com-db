'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Database,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
  ArrowUpRight,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface SystemUtilization {
  tenantCount: number;
  tenantPercent: number;
  totalLeads: number;
  leadsPercent: number;
  totalStorageMB: number;
  storagePercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface GrowthProjection {
  dailyGrowthRate: number;
  projectedAt30Days: number;
  projectedAt60Days: number;
  projectedAt90Days: number;
  willExceedCapacityAt: number | null;
}

interface TenantUtilization {
  tenantSlug: string;
  plan: string;
  leadsUsed: number;
  leadsLimit: number;
  leadsPercent: number;
  storagePercent: number;
  usersPercent: number;
  shouldUpgrade: boolean;
  suggestedPlan: string | null;
  alerts: string[];
}

interface CapacityData {
  system: SystemUtilization;
  projection: GrowthProjection;
  recentAlerts: any[];
  topTenants: TenantUtilization[];
}

const STATUS_STYLES = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
};

export default function CapacityDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CapacityData | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/capacity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch capacity data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCapacityCheck = async () => {
    setRunning(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/capacity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-swar-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error || 'Failed to load capacity data'}</p>
        <button onClick={fetchData} className="mt-4 text-swar-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { system, projection, recentAlerts, topTenants } = data;
  const statusStyle = STATUS_STYLES[system.status];
  const StatusIcon = statusStyle.icon;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-swar-primary" />
            System Capacity
          </h1>
          <p className="text-sm text-gray-500">Auto-scaling for 100 → 1000 users</p>
        </div>
        <button
          onClick={runCapacityCheck}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-swar-primary text-white text-sm font-semibold rounded-xl hover:bg-swar-primary-hover transition disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run Check
        </button>
      </div>

      {/* System Status Banner */}
      <div className={`flex items-center gap-4 p-4 rounded-2xl mb-6 ${statusStyle.bg}`}>
        <StatusIcon className={`w-8 h-8 ${statusStyle.text}`} />
        <div>
          <h2 className={`font-bold ${statusStyle.text}`}>
            System Status: {system.status.toUpperCase()}
          </h2>
          <p className="text-sm text-gray-600">
            {system.tenantCount} tenants | {system.totalLeads.toLocaleString()} leads | {(system.totalStorageMB / 1024).toFixed(1)}GB storage
          </p>
        </div>
      </div>

      {/* Capacity Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tenants */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Tenants</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {system.tenantCount} <span className="text-base font-normal text-gray-400">/ 1,000</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${system.tenantPercent > 85 ? 'bg-red-500' : system.tenantPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, system.tenantPercent)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{system.tenantPercent.toFixed(1)}% capacity</p>
        </div>

        {/* Leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total Leads</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {(system.totalLeads / 1000).toFixed(0)}K <span className="text-base font-normal text-gray-400">/ 5M</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${system.leadsPercent > 85 ? 'bg-red-500' : system.leadsPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, system.leadsPercent)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{system.leadsPercent.toFixed(2)}% capacity</p>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <HardDrive className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Storage</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {(system.totalStorageMB / 1024).toFixed(1)}GB <span className="text-base font-normal text-gray-400">/ 500GB</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${system.storagePercent > 85 ? 'bg-red-500' : system.storagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, system.storagePercent)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{system.storagePercent.toFixed(2)}% capacity</p>
        </div>
      </div>

      {/* Growth Projection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 rounded-xl">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Growth Projection</h3>
            <p className="text-sm text-gray-500">~{projection.dailyGrowthRate.toFixed(1)} new users/day</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">30 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{projection.projectedAt30Days}</div>
            <div className="text-xs text-gray-400">tenants</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">60 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{projection.projectedAt60Days}</div>
            <div className="text-xs text-gray-400">tenants</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">90 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{projection.projectedAt90Days}</div>
            <div className="text-xs text-gray-400">tenants</div>
          </div>
        </div>

        {projection.willExceedCapacityAt && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-sm text-amber-700">
              ⚠️ At current growth rate, capacity will be reached in <strong>{projection.willExceedCapacityAt} days</strong>
            </p>
          </div>
        )}
      </div>

      {/* Top Tenants Needing Upgrade */}
      {topTenants.filter(t => t.shouldUpgrade).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Tenants Approaching Limits</h3>
          </div>

          <div className="space-y-3">
            {topTenants.filter(t => t.shouldUpgrade).map((tenant) => (
              <div key={tenant.tenantSlug} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{tenant.tenantSlug}</p>
                  <p className="text-xs text-gray-500">
                    {tenant.plan} → {tenant.suggestedPlan} | Leads: {tenant.leadsPercent.toFixed(0)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {tenant.alerts.map((alert, i) => (
                    <span key={i} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      {alert}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentAlerts.map((alert: any, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>{alert.type}</span>
                  {alert.tenantSlug && <span className="text-gray-400">({alert.tenantSlug})</span>}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
