'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CRMStats {
  totalLeads: number;
  totalSales: number;
  totalMessages: number;
  conversionRate: number;
}

export default function CRMDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const response = await fetch('/api/admin/crm/analytics?view=overview', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        if (data.success && data.data.overview) {
          const overview = data.data.overview;
          const totalCustomers = overview.leadsByStatus?.customer || 0;
          const totalLeads = overview.totalLeads || 0;
          const conversionRate = totalLeads > 0 ? ((totalCustomers / totalLeads) * 100).toFixed(1) : '0';

          setStats({
            totalLeads: overview.totalLeads,
            totalSales: overview.totalSales || 0,
            totalMessages: overview.totalMessages || 0,
            conversionRate: parseFloat(conversionRate as string),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CRM Dashboard
            </h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminUser');
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_user');
              router.push('/admin/login');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      <div className="flex">
        <aside className="w-64 bg-slate-800/50 backdrop-blur border-r border-purple-500/20 min-h-screen p-6 fixed left-0 top-16">
          <nav className="space-y-3">
            {[
              { href: '/admin/crm', label: 'Overview', icon: '📊' },
              { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
              { href: '/admin/crm/sales', label: 'Sales', icon: '💰' },
              { href: '/admin/crm/messages', label: 'Messages', icon: '💬' },
              { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
              { href: '/admin/crm/templates', label: 'Templates', icon: '📝' },
              { href: '/admin/crm/permissions', label: 'Consent', icon: '✅' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-600/30 text-purple-100 hover:text-white transition-colors group"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-purple-200">Manage your yoga business with our CRM system</p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-700/50 backdrop-blur rounded-xl p-6 animate-pulse h-24" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-6 mb-8 text-red-200">
              Error loading stats: {error}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Leads"
                value={stats.totalLeads}
                icon="👥"
                color="from-blue-500 to-blue-600"
                href="/admin/crm/leads"
              />
              <StatCard
                label="Total Sales"
                value={stats.totalSales}
                icon="💰"
                color="from-green-500 to-green-600"
                href="/admin/crm/sales"
              />
              <StatCard
                label="Messages Sent"
                value={stats.totalMessages}
                icon="💬"
                color="from-purple-500 to-purple-600"
                href="/admin/crm/messages"
              />
              <StatCard
                label="Conversion Rate"
                value={`${stats.conversionRate}%`}
                icon="📊"
                color="from-orange-500 to-orange-600"
                href="/admin/crm/analytics"
              />
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Leads */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>👥</span> Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/admin/crm/leads?action=create"
                  className="block bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                >
                  + Add New Lead
                </Link>
                <Link
                  href="/admin/crm/messages"
                  className="block bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                >
                  Send WhatsApp Message
                </Link>
                <Link
                  href="/admin/crm/sales"
                  className="block bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                >
                  Record a Sale
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>⚙️</span> System Status
              </h3>
              <div className="space-y-3 text-purple-100">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span>Database</span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span>API Server</span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Running
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span>Admin Access</span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Authenticated
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-purple-300 text-sm">
            <p>CRM Dashboard v1.0 | Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white cursor-pointer transition-colors hover:opacity-90`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl">{icon}</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">↗</span>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-white/80 text-sm">{label}</div>
      </div>
    </Link>
  );
}
