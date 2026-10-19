'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Settings,
  User,
  Users,
  MessageSquare,
  Plug,
  Zap,
  Sliders,
  Workflow,
  Database,
  CreditCard,
  HardDrive,
  Sparkles,
  ArrowRight,
  Search,
  ShieldCheck,
  Palette,
  FileSpreadsheet,
} from 'lucide-react';

type SettingsTabKey = 'all' | 'general' | 'channels' | 'data' | 'billing';

interface SettingsCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  category: 'general' | 'channels' | 'data' | 'billing';
  badge: string;
  scope: string;
}

const settingsCards: SettingsCard[] = [
  // ── 1. General & Team ──
  {
    label: 'CRM Core Preferences',
    description: 'Working hours, automated welcome greetings, off-hours responder, chat rate limits, and auto-close timers.',
    href: '/admin/crm/settings',
    icon: Settings,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    category: 'general',
    badge: 'Core Config',
    scope: 'System',
  },
  {
    label: 'Admin Profile & Security',
    description: 'Personal profile details, email addresses, password security, session timeout, and multi-factor authentication.',
    href: '/admin/crm/profile',
    icon: User,
    gradient: 'from-purple-600 via-pink-600 to-rose-600',
    category: 'general',
    badge: 'My Account',
    scope: 'Personal',
  },
  {
    label: 'Team Members & Staff Roles',
    description: 'Invite support agents, assign role permissions (Super Admin, Manager, Agent), and view active staff logins.',
    href: '/admin/crm/team',
    icon: Users,
    gradient: 'from-indigo-600 via-violet-600 to-blue-700',
    category: 'general',
    badge: 'Permissions',
    scope: 'Organization',
  },

  // ── 2. Channels & Integrations ──
  {
    label: 'Meta WhatsApp Business API',
    description: 'Configure Cloud API credentials, phone number IDs, verify tokens, and monitor live inbound webhook payloads.',
    href: '/admin/crm/whatsapp/settings',
    icon: MessageSquare,
    gradient: 'from-emerald-500 via-teal-600 to-green-600',
    category: 'channels',
    badge: 'WhatsApp',
    scope: 'API Token',
  },
  {
    label: 'Channel Connections',
    description: 'Manage external API keys, Email SMTP configs, SMS gateway providers, Telegram bot tokens, and Zoom apps.',
    href: '/admin/crm/connections',
    icon: Plug,
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    category: 'channels',
    badge: 'Webhooks',
    scope: 'Multi-API',
  },
  {
    label: 'Extensions & Integration Hub',
    description: 'Connect third-party plugins, webhook endpoints, chatbot builders, e-learning suites, and community forums.',
    href: '/admin/crm/integration-hub',
    icon: Zap,
    gradient: 'from-amber-500 via-orange-600 to-yellow-500',
    category: 'channels',
    badge: 'Ecosystem',
    scope: 'Plugins',
  },

  // ── 3. Data & Automation Rules ──
  {
    label: 'Custom Fields & Form Schema',
    description: 'Create custom contact fields, questionnaire attributes, and extra lead parameters for enrollment forms.',
    href: '/admin/crm/custom-fields',
    icon: Sliders,
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    category: 'data',
    badge: 'Form Builder',
    scope: 'Fields',
  },
  {
    label: 'Lead Assignment Rules',
    description: 'Automated lead distribution engine: configure round-robin allocation, least-busy routing, and territory rules.',
    href: '/admin/crm/lead-assignment-settings',
    icon: Workflow,
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    category: 'data',
    badge: 'Routing',
    scope: 'Automation',
  },
  {
    label: 'Data Management & Backups',
    description: 'Database health check, export full CSV archives, purge orphaned test records, and trigger manual backups.',
    href: '/admin/crm/settings/data-management',
    icon: Database,
    gradient: 'from-rose-500 via-pink-600 to-red-600',
    category: 'data',
    badge: 'Maintenance',
    scope: 'Storage',
  },

  // ── 4. Billing, Capacity & Branding ──
  {
    label: 'Plan Subscription & Tiers',
    description: 'Review active plan features (Basic, Copper, Silver, Golden, Diamond), view module bundles, and upgrade tiers.',
    href: '/admin/crm/subscription',
    icon: CreditCard,
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    category: 'billing',
    badge: 'Plan Tier',
    scope: 'Billing',
  },
  {
    label: 'Storage Quota & Capacity',
    description: 'Inspect live disk storage consumption, database collection sizes, media vault limits, and top assets.',
    href: '/admin/crm/capacity',
    icon: HardDrive,
    gradient: 'from-blue-600 via-indigo-700 to-slate-800',
    category: 'billing',
    badge: 'Disk Space',
    scope: 'Cloud DB',
  },
  {
    label: 'White-Label Branding',
    description: 'Upload custom brand logos, customize color palettes, set custom domain names, and brand invoice PDFs.',
    href: '/admin/crm/branding',
    icon: Palette,
    gradient: 'from-fuchsia-600 via-pink-600 to-purple-700',
    category: 'billing',
    badge: 'White-Label',
    scope: 'Theme',
  },
];

const tabFilters: { key: SettingsTabKey; label: string; count: (list: SettingsCard[]) => number }[] = [
  { key: 'all', label: 'All Settings (12)', count: (l) => l.length },
  { key: 'general', label: 'General & Team', count: (l) => l.filter(p => p.category === 'general').length },
  { key: 'channels', label: 'Channels & Integrations', count: (l) => l.filter(p => p.category === 'channels').length },
  { key: 'data', label: 'Data & Rules', count: (l) => l.filter(p => p.category === 'data').length },
  { key: 'billing', label: 'Billing & Branding', count: (l) => l.filter(p => p.category === 'billing').length },
];

function SettingsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('all');
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
    const tab = searchParams.get('tab') as SettingsTabKey;
    if (tab && ['all', 'general', 'channels', 'data', 'billing'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: SettingsTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/settings-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = settingsCards.filter((card) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-950/20 relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">System Settings Hub</h1>
                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30 uppercase tracking-wider">
                  Admin Configuration
                </span>
              </div>
              <p className="text-sm text-indigo-200/80 mt-1.5 max-w-2xl leading-relaxed">
                Central control panel for organization preferences, staff permissions, WhatsApp API integrations, custom fields, data security, and white-label branding.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings, keys, roles..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/15 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
        </div>

        {/* Security & System Status Badge Row */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs text-indigo-200">
          <span className="font-semibold text-white">Security & Status:</span>
          <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" /> 2FA & Auth Active
          </span>
          <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-cyan-300">
            <Plug className="w-3.5 h-3.5" /> Webhooks Listening
          </span>
          <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-purple-300">
            <Database className="w-3.5 h-3.5" /> Encrypted DB
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(settingsCards);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {card.scope}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                <span>Configure Setting</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No settings found</h3>
          <p className="text-sm text-gray-500 mt-1">Try searching with a different keyword or setting name.</p>
        </div>
      )}
    </div>
  );
}

export default function SettingsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SettingsHubContent />
    </Suspense>
  );
}
