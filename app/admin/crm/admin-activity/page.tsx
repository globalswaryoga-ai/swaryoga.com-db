'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';

interface AdminUser {
  userId: string;
  name: string;
  email: string;
}

interface ActivityData {
  userId: string;
  period: string;
  dateRange: { start: string; end: string };
  summary: {
    leadsCreated: number;
    leadsAssigned: number;
    leadsConverted: number;
    conversionRate: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    messagesFailed: number;
    deliveryRate: number;
    readRate: number;
    templatesSent: number;
    notesAdded: number;
    followupsCreated: number;
    followupsCompleted: number;
    salesRecorded: number;
    totalSalesAmount: number;
    loginCount: number;
    lastLogin: string | null;
  };
  leadsByStatus: Record<string, number>;
  salesByStatus: Array<{ status: string; count: number; total: number }>;
  messagesByDay: Array<{ date: string; count: number }>;
  recentActivity: {
    notes: any[];
    followups: any[];
    sales: any[];
  };
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  trend 
}: { 
  label: string; 
  value: string | number; 
  icon: string; 
  trend?: { value: number; positive: boolean } 
}) {
  return (
    <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-5 hover:border-orange-500/60 hover:bg-slate-900/80 transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-center justify-between">
        <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">{icon}</div>
        {trend && (
          <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
            trend.positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-black text-white">{value}</div>
        <div className="text-sm font-semibold text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ label, value, max, color = 'green' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    blue: 'bg-indigo-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <span className="text-sm font-bold text-white">{value} / {max}</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Activity Line Chart (SVG)
function ActivityChart({ data, height = 150 }: { data: Array<{ date: string; count: number }>; height?: number }) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-500">
        No activity data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.count), 1);
  const width = Math.max(data.length * 50, 400);
  const padding = 40;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((d.count / maxValue) * (height - padding * 2));
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {/* Grid */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = height - padding - ((pct / 100) * (height - padding * 2));
          return (
            <g key={pct}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#334155" strokeWidth="1" />
              <text x={8} y={y + 4} fontSize="10" fill="#64748b">{Math.round(maxValue * pct / 100)}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaD} fill="url(#greenGradient)" opacity="0.3" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="3" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#22c55e" stroke="#000" strokeWidth="2" />
            <text x={p.x} y={height - 10} fontSize="9" fill="#94a3b8" textAnchor="middle">{p.date.slice(-5)}</text>
          </g>
        ))}
        {/* Gradient definition */}
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function AdminActivityPage() {
  const router = useRouter();
  const token = useAuth();

  useEffect(() => { if (!checkIsSuperAdmin()) router.replace('/admin/crm'); }, [router]);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch admin users
  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const users = (data?.data || data?.users || []).map((u: any) => ({
            userId: u.userId || u._id || '',
            name: u.name || u.email || 'Unknown',
            email: u.email || '',
          }));
          setAdminUsers(users);
          if (users.length > 0 && !selectedUserId) {
            setSelectedUserId(users[0].userId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin users:', err);
      }
    };

    fetchUsers();
  }, [token]);

  // Fetch activity data
  const fetchActivity = useCallback(async () => {
    if (!token || !selectedUserId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/crm/admin-activity?userId=${encodeURIComponent(selectedUserId)}&period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch activity');
      }

      const data = await res.json();
      if (data.success) {
        setActivity(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, [token, selectedUserId, period]);

  useEffect(() => {
    if (selectedUserId) {
      fetchActivity();
    }
  }, [selectedUserId, period, fetchActivity]);

  // Export handler
  const handleExport = async () => {
    if (!token || !selectedUserId) return;
    setExporting(true);

    try {
      const res = await fetch(
        `/api/admin/crm/admin-activity?userId=${encodeURIComponent(selectedUserId)}&period=${period}&view=export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_activity_${selectedUserId}_${period}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const selectedUser = adminUsers.find(u => u.userId === selectedUserId);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-orange-500/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/crm')}
              className="p-2 rounded-xl bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-all"
            >
              <i className="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Admin Activity
              </h1>
              <p className="text-sm text-slate-500">Performance & Progress Tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-2 border-orange-500/40 rounded-xl hover:border-orange-500/70 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-sm font-black">
                  {selectedUser?.name?.charAt(0) || '?'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-bold text-white">{selectedUser?.name || 'Select User'}</div>
                  <div className="text-xs text-slate-500">{selectedUser?.email || ''}</div>
                </div>
                <i className={`ph-bold ph-caret-down text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border-2 border-orange-500/40 rounded-2xl shadow-xl shadow-orange-500/10 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-800">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Users</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {adminUsers.map((user) => (
                      <button
                        key={user.userId}
                        onClick={() => {
                          setSelectedUserId(user.userId);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-green-600/10 transition-all text-left ${
                          selectedUserId === user.userId ? 'bg-green-600/20' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-lg font-black">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{user.name}</div>
                          <div className="text-xs text-slate-500 truncate">{user.email}</div>
                        </div>
                        {selectedUserId === user.userId && (
                          <i className="ph-bold ph-check-circle text-green-400 text-xl"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Period Buttons */}
            <div className="flex bg-slate-900 border-2 border-orange-500/30 rounded-xl p-1">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    period === p
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting || !activity}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/30"
            >
              <i className={`ph-bold ${exporting ? 'ph-spinner animate-spin' : 'ph-export'} text-lg`}></i>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <i className="ph-bold ph-warning text-xl"></i>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <i className="ph-bold ph-x"></i>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500">Loading activity data...</p>
          </div>
        ) : activity ? (
          <div className="space-y-8">
            {/* Summary Stats Grid */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                📊 Summary ({activity.period})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard label="Leads Created" value={activity.summary.leadsCreated} icon="👥" />
                <StatCard label="Leads Assigned" value={activity.summary.leadsAssigned} icon="📋" />
                <StatCard label="Leads Converted" value={activity.summary.leadsConverted} icon="🎯" />
                <StatCard label="Conversion Rate" value={`${activity.summary.conversionRate}%`} icon="📈" />
                <StatCard label="Messages Sent" value={activity.summary.messagesSent} icon="💬" />
                <StatCard label="Delivery Rate" value={`${activity.summary.deliveryRate}%`} icon="✅" />
              </div>
            </section>

            {/* WhatsApp Activity */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                📱 WhatsApp Activity
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Message Stats */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Message Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-black text-green-400">{activity.summary.messagesSent}</div>
                      <div className="text-xs text-slate-500 mt-1">Total Sent</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-black text-indigo-400">{activity.summary.messagesDelivered}</div>
                      <div className="text-xs text-slate-500 mt-1">Delivered</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-black text-purple-400">{activity.summary.messagesRead}</div>
                      <div className="text-xs text-slate-500 mt-1">Read</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-black text-red-400">{activity.summary.messagesFailed}</div>
                      <div className="text-xs text-slate-500 mt-1">Failed</div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Messages Over Time</h3>
                  <ActivityChart data={activity.messagesByDay} />
                </div>
              </div>
            </section>

            {/* Leads & Sales */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                💼 Leads & Sales Performance
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leads by Status */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Leads by Status</h3>
                  {Object.entries(activity.leadsByStatus || {}).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(activity.leadsByStatus || {}).map(([status, count]) => {
                        const total = Object.values(activity.leadsByStatus || {}).reduce((a, b) => a + b, 0);
                        return (
                          <ProgressBar 
                            key={status} 
                            label={status.charAt(0).toUpperCase() + status.slice(1)} 
                            value={count} 
                            max={total} 
                            color={status === 'customer' ? 'green' : status === 'lead' ? 'blue' : 'orange'}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">No leads data</div>
                  )}
                </div>

                {/* Sales Summary */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Sales Performance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                      <div className="text-3xl font-black text-green-400">{activity.summary.salesRecorded}</div>
                      <div className="text-xs text-slate-400 mt-1">Sales Recorded</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 rounded-xl p-4 border border-orange-500/30">
                      <div className="text-3xl font-black text-orange-400">
                        ₹{activity.summary.totalSalesAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Total Amount</div>
                    </div>
                  </div>
                  {activity.salesByStatus.length > 0 && (
                    <div className="space-y-2">
                      {activity.salesByStatus.map((s) => (
                        <div key={s.status} className="flex items-center justify-between py-2 border-b border-slate-800/50">
                          <span className="text-sm text-slate-400 capitalize">{s.status}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">{s.count} sales</span>
                            <span className="text-xs text-slate-500 ml-2">₹{s.total.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Work Activity (Notes, Followups) */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                ✏️ Work Activity
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Notes Added" value={activity.summary.notesAdded} icon="📝" />
                <StatCard label="Followups Created" value={activity.summary.followupsCreated} icon="📅" />
                <StatCard label="Followups Completed" value={activity.summary.followupsCompleted} icon="✅" />
                <StatCard label="Templates Sent" value={activity.summary.templatesSent} icon="📋" />
              </div>
            </section>

            {/* Login & Session */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                🔐 Login Activity
              </h2>
              <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black text-green-400">{activity.summary.loginCount}</div>
                    <div className="text-sm text-slate-500 mt-1">Total Logins ({activity.period})</div>
                  </div>
                  <div className="text-center border-x border-slate-800">
                    <div className="text-lg font-bold text-white">
                      {activity.summary.lastLogin 
                        ? new Date(activity.summary.lastLogin).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short', year: 'numeric' 
                          })
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Last Login Date</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {activity.summary.lastLogin 
                        ? new Date(activity.summary.lastLogin).toLocaleTimeString('en-IN', { 
                            hour: '2-digit', minute: '2-digit' 
                          })
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Last Login Time</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-4">
                🕐 Recent Activity
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Notes */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-5 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <i className="ph-bold ph-note-pencil text-green-400"></i>
                    Recent Notes
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activity.recentActivity.notes.length > 0 ? (
                      activity.recentActivity.notes.map((note: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/50 rounded-xl p-3 text-sm">
                          <div className="text-white line-clamp-2">{note.note}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {note.leadId?.name || 'Unknown'} • {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-sm text-center py-4">No recent notes</div>
                    )}
                  </div>
                </div>

                {/* Recent Followups */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-5 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <i className="ph-bold ph-calendar-check text-indigo-400"></i>
                    Recent Followups
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activity.recentActivity.followups.length > 0 ? (
                      activity.recentActivity.followups.map((followup: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/50 rounded-xl p-3 text-sm">
                          <div className="text-white">{followup.title || 'Followup'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              followup.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {followup.status}
                            </span>
                            <span className="text-xs text-slate-500">
                              {followup.dueAt ? new Date(followup.dueAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-sm text-center py-4">No recent followups</div>
                    )}
                  </div>
                </div>

                {/* Recent Sales */}
                <div className="bg-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-5 hover:border-orange-500/50 transition-all">
                  <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <i className="ph-bold ph-currency-inr text-orange-400"></i>
                    Recent Sales
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activity.recentActivity.sales.length > 0 ? (
                      activity.recentActivity.sales.map((sale: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/50 rounded-xl p-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold">₹{sale.saleAmount?.toLocaleString() || 0}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              sale.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {sale.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {sale.customerName || 'Customer'} • {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-sm text-center py-4">No recent sales</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            Select an admin user to view activity
          </div>
        )}
      </main>
    </div>
  );
}
