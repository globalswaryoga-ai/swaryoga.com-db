'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Building2,
  Shield,
  UsersRound,
  HardDrive,
  CreditCard,
  Crown,
  ArrowRight,
  Search,
  Sparkles,
  Layers,
  Database,
  Receipt,
  FileCheck2,
} from 'lucide-react';

type TenantTabKey = 'all' | 'organizations' | 'staff' | 'billing-capacity';

interface TenantCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  category: 'organizations' | 'staff' | 'billing-capacity';
  badge: string;
  scope: string;
}

const tenantCards: TenantCard[] = [
  // ── 1. Organizations & Plans ──
  {
    label: 'All Tenant Organizations',
    description: 'Master list of all active tenant websites, databases, custom subdomains, subscription statuses, and lead limits.',
    href: '/admin/crm/tenants',
    icon: Building2,
    gradient: 'from-cyan-600 via-teal-600 to-emerald-600',
    category: 'organizations',
    badge: 'Directory',
    scope: 'Tenants',
  },
  {
    label: 'Plan Bundles & Tiers',
    description: 'Configure and inspect module bundles for Basic, Copper, Silver, Golden, and Diamond subscription tiers.',
    href: '/admin/crm/tenants-plan',
    icon: Layers,
    gradient: 'from-teal-600 via-emerald-600 to-green-700',
    category: 'organizations',
    badge: 'Tiers & Modules',
    scope: 'Plans',
  },
  {
    label: 'Super Admin Control Center',
    description: 'Global system overview, root administrator tools, sign-in audits, cross-tenant statistics, and emergency controls.',
    href: '/admin/crm/super-admin',
    icon: Crown,
    gradient: 'from-purple-600 via-indigo-600 to-violet-700',
    category: 'organizations',
    badge: 'Super Admin',
    scope: 'Platform',
  },

  // ── 2. Staff, Roles & Access ──
  {
    label: 'Multi-Tenant CRM Users',
    description: 'Manage staff credentials, assigned organizations, user passwords, permission boundaries, and active sessions.',
    href: '/admin/crm/crm-users',
    icon: UsersRound,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    category: 'staff',
    badge: 'User Accounts',
    scope: 'Logins',
  },
  {
    label: 'Role Permissions & Security',
    description: 'Inspect assigned role matrices, enforce 2FA verification, audit login history, and restrict module access.',
    href: '/admin/crm/permissions',
    icon: Shield,
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    category: 'staff',
    badge: 'Access Rules',
    scope: 'Security',
  },
  {
    label: 'Staff Activity & Audit Logs',
    description: 'Detailed audit trail of all staff administrative actions, customer modifications, and data exports.',
    href: '/admin/crm/admin-activity',
    icon: FileCheck2,
    gradient: 'from-violet-600 via-fuchsia-600 to-pink-600',
    category: 'staff',
    badge: 'Compliance',
    scope: 'Audit Trail',
  },

  // ── 3. Billing, Invoices & Capacity ──
  {
    label: 'Storage & Database Capacity',
    description: 'Track per-tenant Bunny Database storage sizes, disk storage usage, media asset consumption, and overflow limits.',
    href: '/admin/crm/capacity',
    icon: HardDrive,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    category: 'billing-capacity',
    badge: 'Disk Space',
    scope: 'Database',
  },
  {
    label: 'Billing & Invoice History',
    description: 'Multi-tenant subscription invoices, payment reconciliations, GST tax breakdowns, and automated receipts.',
    href: '/admin/crm/billing-history',
    icon: Receipt,
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    category: 'billing-capacity',
    badge: 'Invoicing',
    scope: 'Finance',
  },
  {
    label: 'Database Migration & Health',
    description: 'Execute database schema syncs, tenant collection backups, index rebuilds, and systemic integrity diagnostics.',
    href: '/admin/crm/database-migration',
    icon: Database,
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    category: 'billing-capacity',
    badge: 'Maintenance',
    scope: 'DevOps',
  },
];

const tabFilters: { key: TenantTabKey; label: string; count: (list: TenantCard[]) => number }[] = [
  { key: 'all', label: 'All Modules (9)', count: (l) => l.length },
  { key: 'organizations', label: 'Organizations & Plans', count: (l) => l.filter(p => p.category === 'organizations').length },
  { key: 'staff', label: 'Staff & Security', count: (l) => l.filter(p => p.category === 'staff').length },
  { key: 'billing-capacity', label: 'Billing & Capacity', count: (l) => l.filter(p => p.category === 'billing-capacity').length },
];

function TenantsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TenantTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || localStorage.getItem('crm_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    try {
      jwtDecode(token);
      setIsAuthenticated(true);
    } catch {
      router.push(getLoginPath());
    }
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TenantTabKey;
    if (tab && ['all', 'organizations', 'staff', 'billing-capacity'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: TenantTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/tenants-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = tenantCards.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.scope.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Signature Gradient Top Accent ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 rounded-full" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-950/20 relative overflow-hidden border border-cyan-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">CRM & Tenants Hub</h1>
                <span className="bg-cyan-500/20 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full border border-cyan-400/30 uppercase tracking-wider">
                  Multi-Tenant Architecture
                </span>
              </div>
              <p className="text-sm text-cyan-200/80 mt-1.5 max-w-2xl leading-relaxed">
                Central multi-tenant administration. Manage tenant organizations, plan tiers, CRM staff accounts, storage quotas, and billing reconciliations.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-cyan-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenants, plans, staff..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/15 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
            />
          </div>
        </div>

        {/* Multi-Tenant Metrics Strip */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-cyan-200 block">SaaS Architecture</span>
            <span className="text-lg font-extrabold text-white">Multi-Tenant</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-teal-200 block">Plan Tiers</span>
            <span className="text-lg font-extrabold text-white">5 Tiers</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200 block">Database Isolation</span>
            <span className="text-lg font-extrabold text-white">Per-Tenant DB</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-blue-200 block">Global Control</span>
            <span className="text-lg font-extrabold text-white">Super Admin</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(tenantCards);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-cyan-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {card.scope}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-700 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-cyan-700" />
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-cyan-700 group-hover:text-cyan-800">
                <span>Manage Module</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No tenant modules found</h3>
          <p className="text-sm text-gray-500 mt-1">Try searching with a different keyword or module name.</p>
        </div>
      )}
      </div>
    </div>
  );
}

export default function TenantsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
        </div>
      }
    >
      <TenantsHubContent />
    </Suspense>
  );
}
