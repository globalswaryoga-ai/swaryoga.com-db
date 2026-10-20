'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
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
  QrCode,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  GraduationCap,
  Video,
  Globe,
  Calendar,
  Layers,
  Building2,
  Landmark,
  Share2,
  Monitor,
  Moon,
  Search,
  Filter,
  Plus,
  ExternalLink,
  Activity,
  CreditCard,
  Bot,
  Flame,
  Heart,
  RefreshCw,
} from 'lucide-react';

interface CRMStats {
  totalLeads: number;
  totalSales: number;
  totalMessages: number;
  metaMessagesSent: number;
  qrWhatsappMessagesSent: number;
  conversionRate: number;
  leadsByStatus?: Record<string, number>;
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

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge: string;
  category: 'growth' | 'communication' | 'experience' | 'system';
}

const HUB_CARDS: HubCard[] = [
  // Growth & Sales
  {
    title: 'Leads Management',
    description: 'Central pipeline tracking all leads from Meta Ads, QR WhatsApp, and custom website forms.',
    href: '/admin/crm/leads-hub',
    icon: Users,
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Universal Pipeline',
    category: 'growth',
  },
  {
    title: 'Sales & Transactions',
    description: 'Real-time sales ledgers, student receipts, payments, and automated financial records.',
    href: '/admin/crm/sales',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Revenue Tracker',
    category: 'growth',
  },
  {
    title: 'Workshop Management',
    description: 'Student batches, cohort scheduling, multilingual admissions, and Zoom class timelines.',
    href: '/admin/crm/workshop-hub',
    icon: GraduationCap,
    gradient: 'from-teal-600 to-cyan-600',
    badge: 'Cohorts & Batches',
    category: 'growth',
  },
  {
    title: 'Banking & Finance',
    description: 'Bank statement auto-parsing, Tally Prime synchronization, cash books, and accounting ledgers.',
    href: '/admin/crm/banking-hub',
    icon: Landmark,
    gradient: 'from-cyan-600 to-blue-600',
    badge: 'Tally & Ledgers',
    category: 'growth',
  },

  // Communication & AI
  {
    title: 'Communication Hub',
    description: 'Unified omnichannel inbox combining Meta Cloud API, QR WhatsApp, AI Voice Calls, SMS & Telegram.',
    href: '/admin/crm/communication-hub',
    icon: MessageCircle,
    gradient: 'from-purple-600 to-indigo-600',
    badge: 'Omnichannel Inbox',
    category: 'communication',
  },
  {
    title: 'Meta WhatsApp',
    description: 'Official Meta Cloud API console with verified green tick delivery and HSM templates.',
    href: '/admin/crm/meta',
    icon: MessageCircle,
    gradient: 'from-green-600 to-emerald-700',
    badge: 'Official Cloud API',
    category: 'communication',
  },
  {
    title: 'QR WhatsApp Inbox',
    description: 'Live phone pairing bridge, multi-device chat console, contact tags, and quick-reply presets.',
    href: '/admin/crm/qr',
    icon: QrCode,
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'Multi-Device QR',
    category: 'communication',
  },
  {
    title: 'Broadcast WhatsApp',
    description: 'Automated mass campaigns, recurring class broadcasts, group blast sequences, and delivery logs.',
    href: '/admin/crm/broadcast-hub',
    icon: Radio,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'Campaign Blasts',
    category: 'communication',
  },
  {
    title: 'Automation & AI',
    description: 'Visual drag-and-drop chatflow builder, intelligent knowledge base RAG bots, and auto-responders.',
    href: '/admin/crm/automation-hub',
    icon: Zap,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Visual Chatflow & Bots',
    category: 'communication',
  },

  // Experience & Learning
  {
    title: 'Community Studio',
    description: 'Interactive sadhak discussion channels (L1–L5, Aahar, Garbh Sanskar), feeds, and rich posts.',
    href: '/admin/crm/community-hub',
    icon: Globe,
    gradient: 'from-indigo-600 to-blue-600',
    badge: 'Sadhak Channels',
    category: 'experience',
  },
  {
    title: 'Zoom Management',
    description: 'Participant attendance tracking, in/out timestamps, grades (A–E), and cloud recording vault.',
    href: '/admin/crm/zoom-hub',
    icon: Video,
    gradient: 'from-sky-500 to-blue-600',
    badge: 'Live Attendance & Vault',
    category: 'experience',
  },
  {
    title: 'E-Learning Academy',
    description: '19-language video courses, student progress analytics, certificates, and Bunny Stream CDN delivery.',
    href: '/admin/crm/e-learning/dashboard',
    icon: GraduationCap,
    gradient: 'from-emerald-600 to-teal-600',
    badge: 'Multi-Lingual Courses',
    category: 'experience',
  },
  {
    title: 'Life Planner',
    description: 'Ayurvedic Ritucharya routines, vision boards, daily habits, tasks, and sadhana goals tracker.',
    href: '/admin/crm/planner',
    icon: Calendar,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'Ritucharya & Goals',
    category: 'experience',
  },
  {
    title: 'KP Astro Studio',
    description: 'Professional astrologer workbench with ruling planets, 1–249 horary prashna, and matchmaking.',
    href: '/admin/crm/kp-astro',
    icon: Moon,
    gradient: 'from-violet-600 to-purple-700',
    badge: '1–249 Horary Engine',
    category: 'experience',
  },

  // Platform & System
  {
    title: 'Website Management',
    description: 'Website signups, student login records, contact submissions, and public catalog settings.',
    href: '/admin/crm/web-admin',
    icon: Monitor,
    gradient: 'from-orange-500 to-amber-600',
    badge: 'Public Portal Admin',
    category: 'system',
  },
  {
    title: 'Social Media Hub',
    description: 'Multi-platform social inbox for Instagram DM, Facebook Messenger, and central video media assets.',
    href: '/admin/crm/social-hub',
    icon: Share2,
    gradient: 'from-fuchsia-600 to-pink-600',
    badge: 'Instagram & Facebook',
    category: 'system',
  },
  {
    title: 'CRM & Tenants',
    description: 'Multi-tenant organization management, custom subdomains, subscription plan bundles, and staff roles.',
    href: '/admin/crm/tenants-hub',
    icon: Building2,
    gradient: 'from-cyan-600 to-teal-700',
    badge: 'SaaS Multi-Tenant',
    category: 'system',
  },
  {
    title: 'Reports & Analytics',
    description: 'Comprehensive business intelligence, executive metrics, and one-click PDF/CSV data exports.',
    href: '/admin/crm/reports-hub',
    icon: BarChart3,
    gradient: 'from-blue-600 to-indigo-700',
    badge: 'Data Exports & Charts',
    category: 'system',
  },
  {
    title: 'CRM Settings',
    description: 'System operational parameters, automated welcome replies, team roles, and API credentials.',
    href: '/admin/crm/settings-hub',
    icon: Settings,
    gradient: 'from-slate-700 to-slate-900',
    badge: 'Preferences & APIs',
    category: 'system',
  },
];

export default function CRMDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [planBundles, setPlanBundles] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'growth' | 'communication' | 'experience' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Load tenant plan bundles for plan-aware dashboard rendering
  useEffect(() => {
    async function loadPlanBundles() {
      try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
        if (!token) return;
        const accRes = await fetch('/api/crm-site/account', { headers: { Authorization: `Bearer ${token}` } });
        if (!accRes.ok) return;
        const acc = await accRes.json();
        const slug = acc?.profile?.tenantSlug;
        let keys: string[] = [];
        if (slug) {
          const tRes = await fetch(`/api/tenants/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (tRes.ok) {
            const tj = await tRes.json();
            keys = tj?.tenant?.moduleKeys || tj?.tenant?.enabledModules || [];
          }
        }
        if (!keys.length) {
          const ss = await fetch('/api/crm-site/setup-status', { headers: { Authorization: `Bearer ${token}` } });
          if (ss.ok) {
            const sd = await ss.json();
            const tier = sd?.planId || '';
            if (tier) {
              const pr = await fetch('/api/admin/tenants/plans');
              if (pr.ok) {
                const pd = await pr.json();
                const mp = (pd?.data?.plans || []).find((p: any) => p.tier === tier);
                if (mp?.defaultGroups?.length) keys = mp.defaultGroups;
              }
            }
          }
        }
        setPlanBundles(new Set(keys));
      } catch {}
    }
    loadPlanBundles();
  }, []);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('admin_user');
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';

      if (!userStr) {
        setIsSuperAdmin(checkIsSuperAdmin());
        setUserName(fallbackUserId || 'there');
        return;
      }

      const u = JSON.parse(userStr);
      const userId = (u?.userId as string) || fallbackUserId;
      setIsSuperAdmin(checkIsSuperAdmin());
      setUserName(u?.name || u?.userId || fallbackUserId || 'there');
    } catch {
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';
      setIsSuperAdmin(checkIsSuperAdmin());
      setUserName(fallbackUserId || 'there');
    }
  }, []);

  // Check setup status
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/crm-site/setup-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const superAdmin = data.isSuperAdmin || checkIsSuperAdmin();
          setSetupPaid(data.setupPaid || superAdmin);

          if (!superAdmin && (data.isFirstLogin || searchParams.get('showSetup') === 'true')) {
            setShowWelcome(true);
          }

          if (searchParams.get('setup') === 'complete') {
            setSetupPaid(true);
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

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (!token) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/crm/analytics?view=overview', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('admin_user');
        router.push(getLoginPath());
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.data?.overview) {
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
          conversionRate: parseFloat(conversionRate),
          leadsByStatus: overview.leadsByStatus || {},
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) setDashboardData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, [token, isSuperAdmin]);

  const filteredHubs = useMemo(() => {
    return HUB_CARDS.filter((card) => {
      const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
      const matchesSearch =
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Top Gradient Signature Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome && !setupPaid && !isSuperAdmin}
        onClose={() => setShowWelcome(false)}
        userName={userName}
        onProceedToPayment={() => {
          setShowWelcome(false);
          setSetupPaid(true);
        }}
      />

      {/* Setup Checklist Banner */}
      {!loading && !setupPaid && !isSuperAdmin && (
        <PageSetupChecklist
          currentPath="/admin/crm"
          onPaymentClick={() => setShowWelcome(true)}
          className="mx-4 mt-4 md:mx-6"
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowAddUser(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Add Admin User</h2>
              </div>
              <button onClick={() => setShowAddUser(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Username</label>
                <input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="e.g., manager1"
                  disabled={createUserBusy}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="manager@swaryoga.com"
                  disabled={createUserBusy}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Initial Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="Enter strong password"
                  disabled={createUserBusy}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Access Privileges</label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={permissionMode === 'selected'}
                      onChange={() => setPermissionMode('selected')}
                      disabled={createUserBusy}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">Custom permissions</span>
                  </label>
                  {permissionMode === 'selected' && (
                    <div className="ml-6 flex gap-4">
                      {(['crm', 'whatsapp', 'email'] as const).map((p) => (
                        <label key={p} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPermissions[p]}
                            onChange={() => toggleSelectedPermission(p)}
                            disabled={createUserBusy}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          {p.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={permissionMode === 'all'}
                      onChange={() => setPermissionMode('all')}
                      disabled={createUserBusy}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">Super Admin (full system access)</span>
                  </label>
                </div>
              </div>

              {createUserMsg && (
                <p className={`text-xs font-semibold p-2.5 rounded-lg ${createUserMsg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {createUserMsg}
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={createAdminUser}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-60"
                disabled={createUserBusy}
              >
                {createUserBusy ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Container */}
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-7">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 sm:p-8 text-white shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Bunny Database Active
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Swar Yoga Enterprise CRM
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {(() => {
                  const h = new Date().getHours();
                  if (h < 12) return 'Good morning';
                  if (h < 17) return 'Good afternoon';
                  return 'Good evening';
                })()}, <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">{userName || 'Administrator'}</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Welcome to your command center. Monitor real-time lead inflows, WhatsApp communications, cohort admissions, and revenue across all active hubs.
              </p>
            </div>

            {/* Quick Hero Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                title="Refresh real-time stats"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <Link
                href="/admin/crm/leads?action=create"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lead</span>
              </Link>

              {isSuperAdmin && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Add Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => fetchStats(true)} className="text-xs font-bold underline hover:no-underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── 4 Main Live KPI Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Leads */}
          <Link
            href="/admin/crm/leads-hub"
            className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                  Total Leads
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? '—' : Number(stats?.totalLeads || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Verified Inbound Prospects</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Universal Pipeline
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Card 2: Sales */}
          <Link
            href="/admin/crm/sales"
            className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Sales & Revenue
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? '—' : `₹${Number(stats?.totalSales || 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Recorded Workshop Enrolments</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-semibold group-hover:text-emerald-700">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Revenue Ledgers
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Card 3: Conversion Rate */}
          <Link
            href="/admin/crm/funnel"
            className="group bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                  Conversion
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? '—' : `${stats?.conversionRate || 0}%`}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Pipeline Stage Efficiency</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-600 font-semibold group-hover:text-amber-700">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Funnel Milestones
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Card 4: Omnichannel Messages */}
          <Link
            href="/admin/crm/communication-hub"
            className="group bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                  All Messages
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? '—' : Number(stats?.totalMessages || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                QR: {stats?.qrWhatsappMessagesSent || 0} • Meta: {stats?.metaMessagesSent || 0}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-semibold group-hover:text-purple-700">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                WhatsApp & Chat Bridge
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>

        {/* ── Super Admin Multi-Currency & Platform Vitals (If Super Admin) ── */}
        {isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Super Admin Multi-Currency & Platform Vitals
              </h2>
              <span className="text-xs font-semibold text-slate-400">Platform Global Aggregates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 text-white shadow-md shadow-indigo-500/10">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">INR Indian Revenue</span>
                <p className="text-2xl sm:text-3xl font-black mt-1">₹{Number(dashboardData.currencyBreakdown?.INR || 0).toLocaleString()}</p>
                <span className="text-[11px] text-indigo-100/80 mt-1 block">Razorpay & UPI Volume</span>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md shadow-emerald-500/10">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">USD International</span>
                <p className="text-2xl sm:text-3xl font-black mt-1">${Number(dashboardData.currencyBreakdown?.USD || 0).toLocaleString()}</p>
                <span className="text-[11px] text-emerald-100/80 mt-1 block">Global Stripe & PayPal</span>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white shadow-md shadow-purple-500/10">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-100">NPR Nepal Revenue</span>
                <p className="text-2xl sm:text-3xl font-black mt-1">Rs {Number(dashboardData.currencyBreakdown?.NPR || 0).toLocaleString()}</p>
                <span className="text-[11px] text-purple-100/80 mt-1 block">eSewa & Khalti Admissions</span>
              </div>
            </div>

            {/* Platform Quick Vitals Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform Users</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{Number(dashboardData?.totalUsers || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sign-ins</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{Number(dashboardData?.totalSignins || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{Number(dashboardData?.totalOrders || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed Orders</span>
                <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{Number(dashboardData?.completedOrders || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Orders</span>
                <p className="text-xl font-extrabold text-amber-700 mt-0.5">{Number(dashboardData?.pendingOrders || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total Volume USD</span>
                <p className="text-xl font-extrabold text-indigo-700 mt-0.5">${Number(dashboardData?.totalAmountUSD || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Operational Workspace Hubs (The 17 Modules from Sidebar) ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                CRM Modules & Action Hubs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every sidebar module has dedicated quick-action cards, analytics, and toolsets.
              </p>
            </div>

            {/* Search Filter for Cards */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition shadow-2xs"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-slate-200">
            {[
              { key: 'all', label: 'All 17 Hubs', count: HUB_CARDS.length },
              { key: 'growth', label: 'Leads & Sales', count: HUB_CARDS.filter(h => h.category === 'growth').length },
              { key: 'communication', label: 'Omnichannel & AI', count: HUB_CARDS.filter(h => h.category === 'communication').length },
              { key: 'experience', label: 'Community & Learning', count: HUB_CARDS.filter(h => h.category === 'experience').length },
              { key: 'system', label: 'Platform & Admin', count: HUB_CARDS.filter(h => h.category === 'system').length },
            ].map((tab) => {
              const active = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHubs.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:scale-105 transition-transform duration-200`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200/80">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                      {card.title}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <span>Open Hub</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs pt-4 pb-6 flex items-center justify-center gap-3">
          <span>Swar Yoga CRM Suite</span>
          <span>•</span>
          <span>Bunny Database Architecture</span>
          <span>•</span>
          <span>v2.5 Live</span>
        </div>
      </div>
    </div>
  );
}
