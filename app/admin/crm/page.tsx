'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import WelcomeModal from '@/components/admin/crm/WelcomeModal';
import PageSetupChecklist from '@/components/admin/crm/PageSetupChecklist';
import {
  X,
  UserPlus,
  Users,
  TrendingUp,
  DollarSign,
  MessageCircle,
  BarChart3,
  Radio,
  FileText,
  ArrowUpRight,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface CRMStats {
  totalLeads: number;
  totalSales: number;
  totalMessages: number;
  metaMessagesSent: number;
  qrWhatsappMessagesSent: number;
  conversionRate: number;
}

interface DashboardData {
  totalUsers: number;
  totalSignins: number;
  totalMessages: number;
  totalOrders: number;
  totalAmountUSD: number;
  completedOrders: number;
  pendingOrders: number;
  currencyBreakdown: { INR: number; USD: number; NPR: number };
}

export default function CRMDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Welcome & Setup state
  const [showWelcome, setShowWelcome] = useState(false);
  const [setupPaid, setSetupPaid] = useState(false);
  const [userName, setUserName] = useState('');

  // Add User Modal State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissionMode, setPermissionMode] = useState<'selected' | 'all'>('selected');
  const [selectedPermissions, setSelectedPermissions] = useState({ crm: true, whatsapp: false, email: false });
  const [createUserBusy, setCreateUserBusy] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState('');

  // Dashboard data for super admins
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalSignins: 0,
    totalMessages: 0,
    totalOrders: 0,
    totalAmountUSD: 0,
    completedOrders: 0,
    pendingOrders: 0,
    currencyBreakdown: { INR: 0, USD: 0, NPR: 0 },
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('admin_user');
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';

      if (!userStr) {
        setIsSuperAdmin(fallbackUserId === 'admin');
        setUserName(fallbackUserId || 'there');
        return;
      }

      const u = JSON.parse(userStr);
      const userId = (u?.userId as string) || fallbackUserId;
      const permissions: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin(userId === 'admin' || permissions.includes('all'));
      setUserName(u?.name || u?.userId || fallbackUserId || 'there');
    } catch {
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';
      setIsSuperAdmin(fallbackUserId === 'admin');
      setUserName(fallbackUserId || 'there');
    }
  }, []);

  // Check setup status and show welcome modal for first-time users
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!token) return;
      
      try {
        const res = await fetch('/api/crm-site/setup-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setSetupPaid(data.setupPaid);
          
          // Show welcome modal for first login or if setup param is present
          if (data.isFirstLogin || searchParams.get('showSetup') === 'true') {
            setShowWelcome(true);
          }
          
          // Handle successful payment return
          if (searchParams.get('setup') === 'complete') {
            setSetupPaid(true);
            // Clean up URL
            router.replace('/admin/crm');
          }
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
      }
    };
    
    checkSetupStatus();
  }, [token, searchParams, router]);

  const toggleSelectedPermission = (key: 'crm' | 'whatsapp' | 'email') => {
    setSelectedPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const createAdminUser = useCallback(async () => {
    if (!newUserId || !newEmail || !newPassword) {
      setCreateUserMsg('Please fill all required fields');
      return;
    }
    setCreateUserBusy(true);
    setCreateUserMsg('');
    try {
      const permissions = permissionMode === 'all' ? ['all'] : Object.entries(selectedPermissions)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: newUserId, email: newEmail, password: newPassword, permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setCreateUserMsg(`User "${newUserId}" created successfully!`);
      setNewUserId('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      setCreateUserMsg(err.message || 'Error creating user');
    } finally {
      setCreateUserBusy(false);
    }
  }, [newUserId, newEmail, newPassword, permissionMode, selectedPermissions, token]);

  useEffect(() => {
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

        const response = await fetch('/api/admin/crm/analytics?view=overview', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          // Token expired or invalid — clear session and redirect to login.
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('admin_user');
          router.push(getLoginPath());
          return;
        }
        if (response.status === 403) {
          // Authenticated but lacks permission — show error, don't clear session.
          throw new Error('You do not have permission to view analytics.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data.overview) {
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
        setError(errorMessage || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, router]);

  useEffect(() => {
    if (!token || !isSuperAdmin) return;

    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setDashboardData(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, [token, isSuperAdmin]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleProceedToPayment = () => {
    // Payment is handled inside WelcomeModal
    // This will be called after successful payment
    setShowWelcome(false);
    setSetupPaid(true);
  };

  return (
    <>
      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome && !setupPaid}
        onClose={handleCloseWelcome}
        userName={userName}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* Setup Checklist Banner */}
      {!loading && !setupPaid && (
        <PageSetupChecklist
          currentPath="/admin/crm"
          onPaymentClick={() => setShowWelcome(true)}
          className="mx-4 mt-4 md:mx-6"
        />
      )}
      {/* Add User Modal */}
      {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddUser(false)} />
            <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Add Admin User</h2>
                <button onClick={() => setShowAddUser(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., usercrm1"
                    disabled={createUserBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="user@example.com"
                    disabled={createUserBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter strong password"
                    disabled={createUserBusy}
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={permissionMode === 'selected'}
                        onChange={() => setPermissionMode('selected')}
                        disabled={createUserBusy}
                      />
                      <span className="text-sm">Custom permissions</span>
                    </label>
                    {permissionMode === 'selected' && (
                      <div className="ml-6 flex gap-4">
                        {(['crm', 'whatsapp', 'email'] as const).map((p) => (
                          <label key={p} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[p]}
                              onChange={() => toggleSelectedPermission(p)}
                              disabled={createUserBusy}
                            />
                            {p.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={permissionMode === 'all'}
                        onChange={() => setPermissionMode('all')}
                        disabled={createUserBusy}
                      />
                      <span className="text-sm">Super Admin (all permissions)</span>
                    </label>
                  </div>
                </div>

                {createUserMsg && (
                  <p className={`text-sm ${createUserMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {createUserMsg}
                  </p>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createAdminUser}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={createUserBusy}
                >
                  {createUserBusy ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Add User for super admins */}
          {isSuperAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User</span>
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => window.location.reload()} className="ml-auto underline text-sm">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {/* Skeleton greeting */}
              <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
              {/* Skeleton stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse" />
                      <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              {/* Skeleton quick actions */}
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mt-8" />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse mb-3" />
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Welcome Greeting */}
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const h = new Date().getHours();
                    if (h < 12) return 'Good morning';
                    if (h < 17) return 'Good afternoon';
                    return 'Good evening';
                  })()}, {userName || 'there'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
              </div>

              {/* Main Stats - Flat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BigStatCard
                  label="Total Leads"
                  value={stats?.totalLeads || 0}
                  icon={Users}
                  color="blue"
                  href="/admin/crm/leads"
                />
                <BigStatCard
                  label="Total Sales"
                  value={stats?.totalSales || 0}
                  icon={DollarSign}
                  color="green"
                  href="/admin/crm/sales"
                />
                {/* Meta Messages - API returns 0 for non-superadmin */}
                <BigStatCard
                  label="Meta Messages"
                  value={stats?.metaMessagesSent || 0}
                  icon={MessageCircle}
                  color="purple"
                  href="/admin/crm/meta"
                />
                <BigStatCard
                  label="Conversion Rate"
                  value={`${stats?.conversionRate || 0}%`}
                  icon={TrendingUp}
                  color="orange"
                  href="/admin/crm/analytics"
                />
              </div>

              {/* Super Admin Stats */}
              {isSuperAdmin && (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mt-8">Platform Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <SmallStatCard label="Total Users" value={dashboardData.totalUsers} />
                    <SmallStatCard label="Total Logins" value={dashboardData.totalSignins} />
                    <SmallStatCard label="Total Orders" value={dashboardData.totalOrders} />
                    <SmallStatCard label="Completed" value={dashboardData.completedOrders} />
                    <SmallStatCard label="Pending" value={dashboardData.pendingOrders} />
                    <SmallStatCard label="Revenue (USD)" value={`$${(dashboardData.totalAmountUSD || 0).toFixed(0)}`} />
                  </div>

                  {/* Currency Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <RevenueCard label="INR Revenue" value={dashboardData.currencyBreakdown?.INR || 0} currency="₹" color="blue" />
                    <RevenueCard label="USD Revenue" value={dashboardData.currencyBreakdown?.USD || 0} currency="$" color="green" />
                    <RevenueCard label="NPR Revenue" value={dashboardData.currencyBreakdown?.NPR || 0} currency="Rs" color="purple" />
                  </div>
                </>
              )}

              {/* Quick Actions */}
              <h2 className="text-lg font-bold text-gray-900 mt-8">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <QuickActionCard href="/admin/crm/leads?action=create" icon={UserPlus} label="Add Lead" color="blue" />
                <QuickActionCard href="/admin/crm/meta" icon={MessageCircle} label="WhatsApp" color="green" />
                <QuickActionCard href="/admin/crm/sales" icon={DollarSign} label="Sales" color="emerald" />
                <QuickActionCard href="/admin/crm/broadcast" icon={Radio} label="Broadcast" color="pink" />
                <QuickActionCard href="/admin/crm/calls" icon={UserPlus} label="Call Workflows" color="emerald" />
                <QuickActionCard href="/admin/crm/templates" icon={FileText} label="Templates" color="orange" />
                <QuickActionCard href="/admin/crm/analytics" icon={BarChart3} label="Analytics" color="purple" />
                <QuickActionCard href="/admin/crm/settings" icon={Settings} label="Auto Config" color="gray" />
              </div>

              {/* Footer */}
              <div className="text-center text-gray-400 text-sm pt-8 pb-4">
                Dashboard v2.0 | {new Date().toLocaleDateString()}
              </div>
            </>
          )}
        </div>
    </>
  );
}

// Big Stat Card Component — flat white card with colored icon
function BigStatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange';
  href: string;
}) {
  const iconBg = {
    blue: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-amber-50 text-amber-600',
  };

  return (
    <Link href={href}>
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 group">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${iconBg[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
      </div>
    </Link>
  );
}

// Small Stat Card Component
function SmallStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// Revenue Card Component
function RevenueCard({
  label,
  value,
  currency,
  color,
}: {
  label: string;
  value: number;
  currency: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'border-l-indigo-500 bg-indigo-50',
    green: 'border-l-green-500 bg-green-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };
  const textColors = {
    blue: 'text-indigo-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
  };

  return (
    <div className={`rounded-xl p-5 border-l-4 ${colors[color]}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>
        {currency}{value.toFixed(2)}
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    blue: 'hover:bg-indigo-50 hover:border-indigo-200',
    green: 'hover:bg-emerald-50 hover:border-emerald-200',
    emerald: 'hover:bg-emerald-50 hover:border-emerald-200',
    pink: 'hover:bg-pink-50 hover:border-pink-200',
    orange: 'hover:bg-amber-50 hover:border-amber-200',
    purple: 'hover:bg-purple-50 hover:border-purple-200',
    gray: 'hover:bg-gray-50 hover:border-gray-300',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-indigo-600 bg-indigo-50',
    green: 'text-emerald-600 bg-emerald-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    pink: 'text-pink-600 bg-pink-50',
    orange: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-100',
  };

  return (
    <Link href={href}>
      <div className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm transition-all cursor-pointer ${bgColors[color] || bgColors.blue}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
      </div>
    </Link>
  );
}
