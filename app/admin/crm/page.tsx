'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface CRMStats {
  totalLeads: number;
  totalSales: number;
  totalMessages: number;
  metaMessagesSent: number;
  qrWhatsappMessagesSent: number;
  conversionRate: number;
}

export default function CRMDashboard() {
  const router = useRouter();
  const token = useAuth();
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Keep access rules consistent with `/admin/dashboard`.
    // Super admin: userId === 'admin' OR permissions includes 'all'.
    try {
      const userStr = localStorage.getItem('admin_user');
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';

      if (!userStr) {
        setIsSuperAdmin(fallbackUserId === 'admin');
        return;
      }

      const u = JSON.parse(userStr);
      const userId = (u?.userId as string) || fallbackUserId;
      const permissions: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin(userId === 'admin' || permissions.includes('all'));
    } catch {
      // If parsing fails, fall back to the plain userId.
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';
      setIsSuperAdmin(fallbackUserId === 'admin');
    }
  }, []);

  useEffect(() => {
    // Don't attempt fetch if token isn't loaded yet
    if (token === null) return;

    const fetchStats = async () => {
      if (!token) {
        setLoading(false);
        setError('Authentication required');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Never log auth tokens (even partially) in production.
        if (process.env.NODE_ENV !== 'production') {
          console.log('[CRM Dashboard] Fetching analytics (token present):', Boolean(token));
        }
        
        const response = await fetch('/api/admin/crm/analytics?view=overview', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (process.env.NODE_ENV !== 'production') {
          console.log('[CRM Dashboard] Analytics API response status:', response.status);
        }

        if (response.status === 401 || response.status === 403) {
          console.error('[CRM Dashboard] Auth failure:', response.status);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('[CRM Dashboard] Analytics API error:', { status: response.status, data: errorData });
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[CRM Dashboard] Analytics response data:', data);
        }
        
        // Check if response has the expected structure
        if (!data.data || !data.data.overview) {
          console.warn('[CRM Dashboard] Unexpected response structure:', data);
          setError('Analytics data unavailable. Please refresh.');
          setLoading(false);
          return;
        }

        const overview = data.data.overview;
        const totalCustomers = overview.leadsByStatus?.customer || 0;
        const totalLeads = overview.totalLeads || 0;
        const conversionRate = totalLeads > 0 ? ((totalCustomers / totalLeads) * 100).toFixed(1) : '0';

        setStats({
          totalLeads: overview.totalLeads,
          totalSales: overview.totalSales || 0,
          totalMessages: overview.totalMessages || 0,
          metaMessagesSent: overview.metaMessagesSent || 0,
          qrWhatsappMessagesSent: overview.qrWhatsappMessagesSent || 0,
          conversionRate: parseFloat(conversionRate as string),
        });
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[CRM Dashboard] Fetch error:', errorMessage, err);
        setError(errorMessage || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, router]);

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Header with Dropdowns */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="flex items-center gap-3">
                <img src="/logo.png" alt="Swar Yoga" className="w-8 h-8 rounded-lg" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  CRM
                </h1>
              </Link>
              
              {/* Header Menu Items */}
              <div className="hidden md:flex items-center gap-1 ml-6">
                {/* Leads Dropdown */}
                <div className="relative group">
                  <button className="px-3 py-2 text-purple-200 hover:text-white hover:bg-purple-600/30 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium">
                    👥 Leads
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-purple-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/admin/crm/leads" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm rounded-t-lg">👥 All Leads</Link>
                    <Link href="/admin/crm/leads-followup" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm">📞 Lead Followup</Link>
                    <Link href="/admin/crm/meta" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm">🟢 Meta WhatsApp</Link>
                    <Link href="/admin/crm/qr" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm">💚 QR WhatsApp</Link>
                    <Link href="/admin/crm/sales" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm">💰 Sales</Link>
                    <Link href="/admin/crm/messages" className="flex items-center gap-2 px-4 py-2.5 text-purple-100 hover:bg-purple-600/30 hover:text-white text-sm rounded-b-lg">💬 Messages</Link>
                  </div>
                </div>

                {/* Community Dropdown */}
                <div className="relative group">
                  <button className="px-3 py-2 text-green-200 hover:text-white hover:bg-green-600/30 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium">
                    🌍 Community
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-green-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/admin/crm/community" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm rounded-t-lg">🏠 Dashboard</Link>
                    <Link href="/admin/community" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm">📝 Posts</Link>
                    <Link href="/admin/crm/send-template" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm">📨 Send Template</Link>
                    <Link href="/admin/crm/broadcast" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm">📢 Broadcast</Link>
                    <Link href="/admin/crm/reports/meta" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm">🟢 Meta Reports</Link>
                    <Link href="/admin/crm/reports/qr" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm">💚 QR Reports</Link>
                    <Link href="/admin/crm/whatsapp-groups" className="flex items-center gap-2 px-4 py-2.5 text-green-100 hover:bg-green-600/30 hover:text-white text-sm rounded-b-lg">👥 Groups</Link>
                  </div>
                </div>

                {/* Device & Users */}
                <div className="relative group">
                  <button className="px-3 py-2 text-cyan-200 hover:text-white hover:bg-cyan-600/30 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium">
                    📱 Devices
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-cyan-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/admin/crm/devices" className="flex items-center gap-2 px-4 py-2.5 text-cyan-100 hover:bg-cyan-600/30 hover:text-white text-sm rounded-t-lg">📱 Device Control</Link>
                    <Link href="/admin/crm/devices/settings" className="flex items-center gap-2 px-4 py-2.5 text-cyan-100 hover:bg-cyan-600/30 hover:text-white text-sm">⚙️ Settings</Link>
                    <Link href="/admin/crm/users/profile" className="flex items-center gap-2 px-4 py-2.5 text-cyan-100 hover:bg-cyan-600/30 hover:text-white text-sm rounded-b-lg">👤 User Profiles</Link>
                  </div>
                </div>

                {/* Admin Dropdown */}
                <div className="relative group">
                  <button className="px-3 py-2 text-red-200 hover:text-white hover:bg-red-600/30 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium">
                    🔐 Admin
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-red-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/admin/crm/users" className="flex items-center gap-2 px-4 py-2.5 text-red-100 hover:bg-red-600/30 hover:text-white text-sm rounded-t-lg">👨‍💼 Admin Users</Link>
                    <Link href="/admin/crm/permissions" className="flex items-center gap-2 px-4 py-2.5 text-red-100 hover:bg-red-600/30 hover:text-white text-sm">✅ Permissions</Link>
                    <Link href="/admin/crm/analytics" className="flex items-center gap-2 px-4 py-2.5 text-red-100 hover:bg-red-600/30 hover:text-white text-sm">📈 Analytics</Link>
                    <Link href="/admin/crm/media" className="flex items-center gap-2 px-4 py-2.5 text-red-100 hover:bg-red-600/30 hover:text-white text-sm rounded-b-lg">🖼️ Media</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600 text-sm"
                  title="Go to Admin Dashboard"
                >
                  Admin Dashboard
                </Link>
              )}
              <Link
                href="/"
                className="px-3 py-2 bg-purple-600/60 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
              >
                🏠 Home
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  localStorage.removeItem('adminUser');
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  router.push('/admin/login');
                }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      <div className="flex">
        <aside className="w-56 bg-slate-800/50 backdrop-blur border-r border-purple-500/20 min-h-screen p-4 fixed left-0 top-16 overflow-y-auto">
          <nav className="space-y-2">
            {/* Main Links */}
            {[
              { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
              { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
              { href: '/admin/crm/meta', label: 'Meta WhatsApp', icon: '🟢' },
              { href: '/admin/crm/qr', label: 'QR WhatsApp', icon: '💚' },
              { href: '/admin/crm/send-template', label: 'Send Template', icon: '📨' },
              { href: '/admin/crm/broadcast', label: 'Broadcast', icon: '📢' },
              { href: '/admin/crm/reports/meta', label: 'Meta Reports', icon: '📊' },
              { href: '/admin/crm/reports/qr', label: 'QR Reports', icon: '📈' },
              { href: '/admin/crm/sales', label: 'Sales', icon: '💰' },
              { href: '/admin/crm/community', label: 'Community', icon: '🌍' },
              { href: '/admin/crm/devices', label: 'Devices', icon: '📱' },
              { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
              { href: '/admin/crm/chatbot', label: 'Chatbot (AI)', icon: '🤖' },
              { href: '/admin/crm/investment', label: 'Investment', icon: '💹' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-600/30 text-purple-100 hover:text-white transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-56 flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-purple-200">Manage your yoga business with our CRM system</p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-slate-700/50 backdrop-blur rounded-xl p-6 animate-pulse h-24" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-950 border-2 border-red-500 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-red-200 font-semibold mb-2">Failed to Load Dashboard Stats</h3>
                  <p className="text-red-300 text-sm mb-4">{error}</p>
                  <div className="text-red-400 text-xs mb-4">
                    <p>💡 Tips:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Check your browser console (F12) for detailed error logs</li>
                      <li>Ensure the API server is running</li>
                      <li>Try refreshing the page</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                color="from-green-500 to-green-700"
                href="/admin/crm/sales"
              />
              <StatCard
                label="Meta Messages"
                value={stats.metaMessagesSent}
                icon="💬"
                color="from-purple-500 to-purple-600"
                href="/admin/crm/meta"
              />
              <StatCard
                label="QR WhatsApp Messages"
                value={stats.qrWhatsappMessagesSent}
                icon="💚"
                color="from-emerald-500 to-teal-600"
                href="/admin/crm/qr"
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
                  href="/admin/crm/meta"
                  className="block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                >
                  🟢 Meta Inbox
                </Link>
                <Link
                  href="/admin/crm/qr"
                  className="block bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                >
                  🟢 QR WhatsApp Inbox
                </Link>
                <Link
                  href="/admin/crm/sales"
                  className="block bg-[#1E7F43] hover:bg-[#166235] text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
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
      <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white cursor-pointer transition-colors hover:opacity-90 shadow-lg`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl drop-shadow-md">{icon}</span>
          <span className="text-xs bg-white/30 px-2 py-1 rounded-full font-medium">↗</span>
        </div>
        <div className="text-3xl font-bold mb-1 drop-shadow-sm">{value}</div>
        <div className="text-white text-sm font-medium drop-shadow-sm">{label}</div>
      </div>
    </Link>
  );
}
