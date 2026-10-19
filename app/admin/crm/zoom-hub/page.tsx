'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Video,
  BarChart3,
  Globe,
  KeyRound,
  CheckCircle2,
  PlayCircle,
  Users,
  ArrowRight,
  Search,
  Sparkles,
  Layers,
  Settings,
  Calendar,
} from 'lucide-react';

type ZoomTabKey = 'all' | 'analytics' | 'recordings' | 'config';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'analytics' | 'recordings' | 'config';
}

const zoomPages: PageCard[] = [
  // ── 1. Analytics & Live ──
  {
    label: 'Zoom Meeting Analytics',
    description: 'Paste any meeting ID to get participant attendance, in/out timestamps, attendance grades (A-E), and exportable A4 reports.',
    href: '/admin/crm/zoom-analytics',
    icon: BarChart3,
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Live Analytics',
    category: 'analytics',
  },
  {
    label: 'Live Meetings Monitor',
    description: 'Real-time Zoom meeting dashboard, active sessions monitor, host controls, and instant room launch.',
    href: '/admin/zoom',
    icon: PlayCircle,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'Live Monitor',
    category: 'analytics',
  },
  {
    label: 'Direct Zoom Batch Registration',
    description: 'Direct Zoom meeting registrations, instant link delivery, calendar invites, and passcode automations.',
    href: '/admin/crm/new-registration/zoom-meet',
    icon: Users,
    gradient: 'from-purple-500 to-pink-600',
    badge: 'Batch Registration',
    category: 'analytics',
  },
  {
    label: 'Sadhana Program',
    description: 'Automated Zoom sadhana rooms, countdown timers, video playback durations, and automated bot participant joiners.',
    href: '/admin/crm/sadhana-programs',
    icon: Video,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Automated Zoom',
    category: 'analytics',
  },
  {
    label: 'Sadhana Scheduler',
    description: 'Recurring Zoom morning and evening meeting schedules, automated calendar triggers, and AI chat bot reminders.',
    href: '/admin/crm/sadhana-scheduler',
    icon: Calendar,
    gradient: 'from-teal-600 to-cyan-600',
    badge: 'Zoom Schedule',
    category: 'analytics',
  },

  // ── 2. Recordings & Vault ──
  {
    label: 'Recording Management Vault',
    description: 'Cloud recordings vault, Bunny Stream and YouTube synchronization, storage policies, and student delivery.',
    href: '/admin/crm/recording-management',
    icon: Video,
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'Cloud Recordings',
    category: 'recordings',
  },
  {
    label: 'Pending Zoom Shares & Approvals',
    description: 'Review and approve recorded class shares, community discussion links, and student recording access.',
    href: '/admin/community/pending-zoom-shares',
    icon: CheckCircle2,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Approvals',
    category: 'recordings',
  },

  // ── 3. Configuration & Credentials ──
  {
    label: 'Community Zoom Setup',
    description: 'Map Zoom meeting IDs to community channels for automated cloud recording sync and student publication.',
    href: '/admin/crm/community/zoom-setting',
    icon: Globe,
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'Community Sync',
    category: 'config',
  },
  {
    label: 'Zoom API & Server Setup',
    description: 'Server-to-Server OAuth credentials, webhook event endpoints, API token verification, and connection diagnostics.',
    href: '/admin/crm/zoom-setup',
    icon: KeyRound,
    gradient: 'from-slate-600 to-gray-800',
    badge: 'API Credentials',
    category: 'config',
  },
];

const tabFilters: { key: ZoomTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'analytics', label: 'Analytics & Live', count: (l) => l.filter(p => p.category === 'analytics').length },
  { key: 'recordings', label: 'Cloud Recordings', count: (l) => l.filter(p => p.category === 'recordings').length },
  { key: 'config', label: 'Configuration & API', count: (l) => l.filter(p => p.category === 'config').length },
];

function ZoomHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ZoomTabKey>('all');
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
    const tab = searchParams.get('tab') as ZoomTabKey;
    if (tab && ['all', 'analytics', 'recordings', 'config'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: ZoomTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/zoom-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = zoomPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Zoom Management</h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Live & Recordings
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Unified operations center for live Zoom sessions, participant attendance analytics, cloud recordings vault, and community automated syncing.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search zoom modules..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(zoomPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
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
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open module</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No zoom modules found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> modules in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {zoomPages.length} Zoom Management Modules</div>
      </div>
    </div>
  );
}

export default function ZoomHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <ZoomHubContent />
    </Suspense>
  );
}
