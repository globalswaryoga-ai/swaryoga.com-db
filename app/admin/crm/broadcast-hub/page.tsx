'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Radio,
  QrCode,
  CalendarClock,
  Users,
  Send,
  PhoneCall,
  FileText,
  FileEdit,
  Sparkles,
  BarChart3,
  PieChart,
  ArrowRight,
  Search,
  Layers,
} from 'lucide-react';

type BroadcastTabKey = 'all' | 'campaigns' | 'templates' | 'reports';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'campaigns' | 'templates' | 'reports';
}

const broadcastPages: PageCard[] = [
  // ── 1. Broadcast Campaigns ──
  {
    label: 'Meta WhatsApp Broadcast',
    description: 'Launch official Meta WhatsApp broadcasts, filter recipient segments, select approved templates, and send.',
    href: '/admin/crm/broadcast',
    icon: Radio,
    gradient: 'from-purple-600 to-indigo-600',
    badge: 'Meta Broadcast',
    category: 'campaigns',
  },
  {
    label: 'QR WhatsApp Broadcast',
    description: 'Send broadcasts directly through connected QR WhatsApp numbers, bulk contact lists, and group blasts.',
    href: '/admin/crm/qr/broadcast',
    icon: QrCode,
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'QR WhatsApp',
    category: 'campaigns',
  },
  {
    label: 'Scheduled Broadcasts',
    description: 'Queue scheduled messages, recurring announcements, morning reminders, and timed calendar blasts.',
    href: '/admin/crm/scheduled-messages',
    icon: CalendarClock,
    gradient: 'from-blue-600 to-indigo-700',
    badge: 'Scheduled',
    category: 'campaigns',
  },
  {
    label: 'Group Automated Scheduler',
    description: 'Automated scheduler for recurring messages, student group updates, and daily Sadhana reminders.',
    href: '/admin/crm/qr/group-scheduler',
    icon: Users,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'Group Automation',
    category: 'campaigns',
  },
  {
    label: 'Telegram Channel Broadcast',
    description: 'Broadcast mass updates, class links, and announcements directly to Telegram channels and groups.',
    href: '/admin/crm/telegram/broadcast',
    icon: Send,
    gradient: 'from-sky-500 to-blue-600',
    badge: 'Telegram',
    category: 'campaigns',
  },
  {
    label: 'AI Voice Call Broadcast',
    description: 'Run automated bulk voice calling campaigns for event invitations, urgent alerts, and payment reminders.',
    href: '/admin/crm/calls/broadcasts',
    icon: PhoneCall,
    gradient: 'from-indigo-600 to-violet-700',
    badge: 'Voice Broadcast',
    category: 'campaigns',
  },

  // ── 2. Templates & Builders ──
  {
    label: 'Template Library',
    description: 'Central repository of pre-approved message templates across Meta, QR WhatsApp, Email, and SMS.',
    href: '/admin/crm/templates',
    icon: FileText,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'All Templates',
    category: 'templates',
  },
  {
    label: 'Visual Template Builder',
    description: 'Interactive WYSIWYG editor to create rich message templates with variables, dynamic tags, and media headers.',
    href: '/admin/crm/templates/builder',
    icon: FileEdit,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'WYSIWYG Builder',
    category: 'templates',
  },
  {
    label: 'Meta Cloud Templates',
    description: 'Manage official WhatsApp Business Cloud API templates, submit for Meta approval, and review statuses.',
    href: '/admin/crm/meta/templates',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-600',
    badge: 'Meta Official',
    category: 'templates',
  },
  {
    label: 'Quick Send Template',
    description: 'Instant single-recipient template sender for quick tests, one-off alerts, and preview validation.',
    href: '/admin/crm/send-template',
    icon: Send,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Quick Sender',
    category: 'templates',
  },

  // ── 3. Analytics & Reports ──
  {
    label: 'Broadcast Operations Dashboard',
    description: 'Real-time delivery rates, read receipts, active campaign queues, failure diagnostics, and cost analysis.',
    href: '/admin/crm/broadcast-dashboard',
    icon: BarChart3,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Live Dashboard',
    category: 'reports',
  },
  {
    label: 'Broadcast Reports Center',
    description: 'Detailed CSV exportable reports, campaign logs, read percentages, opt-out tracking, and historical metrics.',
    href: '/admin/crm/broadcast/reports',
    icon: PieChart,
    gradient: 'from-orange-500 to-red-600',
    badge: 'Delivery Reports',
    category: 'reports',
  },
];

const tabFilters: { key: BroadcastTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'campaigns', label: 'Broadcast Campaigns', count: (l) => l.filter(p => p.category === 'campaigns').length },
  { key: 'templates', label: 'Templates & Builder', count: (l) => l.filter(p => p.category === 'templates').length },
  { key: 'reports', label: 'Analytics & Reports', count: (l) => l.filter(p => p.category === 'reports').length },
];

function BroadcastHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<BroadcastTabKey>('all');
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
    const tab = searchParams.get('tab') as BroadcastTabKey;
    if (tab && ['all', 'campaigns', 'templates', 'reports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: BroadcastTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/broadcast-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = broadcastPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-fuchsia-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <Radio className="w-8 h-8 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Broadcast WhatsApp & Templates</h1>
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 uppercase tracking-wider">
                  Mass Outreach Hub
                </span>
              </div>
              <p className="text-sm text-pink-100 mt-1.5 max-w-2xl leading-relaxed">
                Unified messaging center for Meta & QR WhatsApp broadcasts, visual template builders, scheduled group messages, and live delivery reports.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search broadcasts, templates & reports..."
              className="w-full bg-white/15 backdrop-blur-md border border-white/25 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition shadow-inner"
            />
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-pink-200 block">Broadcast Channels</span>
            <span className="text-lg font-extrabold text-white">Meta & QR WA</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-purple-200 block">Template Engines</span>
            <span className="text-lg font-extrabold text-white">Cloud HSM + QR</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-yellow-200 block">Delivery Throughput</span>
            <span className="text-lg font-extrabold text-white">Instant & Scheduled</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-cyan-200 block">Reports & SLA</span>
            <span className="text-lg font-extrabold text-white">Live Read Status</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(broadcastPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-purple-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-purple-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-gray-200 group-hover:scale-105 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {card.badge && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-purple-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open module</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No broadcast modules found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> modules in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {broadcastPages.length} Broadcast & Template Modules</div>
      </div>
    </div>
  );
}

export default function BroadcastHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      }
    >
      <BroadcastHubContent />
    </Suspense>
  );
}
